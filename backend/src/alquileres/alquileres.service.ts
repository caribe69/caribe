import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoAlquiler,
  EstadoHabitacion,
  EstadoTareaLimpieza,
  EstadoTurno,
  MetodoPago,
  TipoMovimiento,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';
import { SettingsService } from '../settings/settings.service';
import {
  AgregarConsumoDto,
  AnularAlquilerDto,
  CreateAlquilerDto,
  ExtenderAlquilerDto,
  FinalizarAlquilerDto,
} from './alquiler.dto';

@Injectable()
export class AlquileresService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  /**
   * Busca un cliente por DNI. Primero en historial local; si no existe
   * consulta api externa configurada (apisperu/reniec).
   */
  async buscarCliente(user: JwtPayload, dni: string) {
    if (!dni || !/^\d{8}$/.test(dni))
      throw new BadRequestException('DNI inválido (8 dígitos)');
    const sedeId = resolveSedeId(user);

    const previos = await this.prisma.alquiler.findMany({
      where: { sedeId, clienteDni: dni },
      orderBy: { creadoEn: 'desc' },
      select: {
        clienteNombre: true,
        clienteTelefono: true,
        creadoEn: true,
      },
      take: 20,
    });
    if (previos.length > 0) {
      const u = previos[0];
      return {
        fuente: 'local',
        encontrado: true,
        frecuente: true,
        dni,
        nombre: u.clienteNombre,
        telefono: u.clienteTelefono,
        visitas: previos.length,
        ultimaVisita: u.creadoEn,
      };
    }

    const cfg = await this.settings.getDniConfig();
    if (!cfg.token)
      return {
        fuente: 'ninguna',
        encontrado: false,
        dni,
        error: 'No hay token configurado',
      };
    if (!cfg.url)
      return {
        fuente: 'ninguna',
        encontrado: false,
        dni,
        error: 'No hay URL de API configurada',
      };

    try {
      // Detectar proveedor según la URL configurada
      const isPerudevs = /perudevs\.com/i.test(cfg.url);
      const url = isPerudevs
        ? `${cfg.url}?document=${dni}&key=${encodeURIComponent(cfg.token)}`
        : `${cfg.url}/${dni}?token=${encodeURIComponent(cfg.token)}`;

      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) {
        // Capturar el cuerpo de la respuesta upstream para diagnosticar
        // (token inválido, plan vencido, endpoint cambiado, etc.)
        let detalleUpstream: string | null = null;
        try {
          const txt = await resp.text();
          // Si es JSON, intentamos extraer mensaje legible
          try {
            const j = JSON.parse(txt);
            detalleUpstream =
              j.message || j.mensaje || j.error || j.detail || txt;
          } catch {
            detalleUpstream = txt;
          }
        } catch {
          /* sin body */
        }
        const hint =
          resp.status === 401 || resp.status === 403
            ? 'Token inválido o sin permisos'
            : resp.status === 404
              ? 'URL incorrecta o DNI no existe en la fuente'
              : resp.status === 429
                ? 'Plan agotado o demasiadas consultas'
                : `HTTP ${resp.status}`;
        return {
          fuente: 'api_error',
          encontrado: false,
          dni,
          statusCode: resp.status,
          error: hint,
          detalle: detalleUpstream
            ? String(detalleUpstream).slice(0, 300)
            : null,
        };
      }
      const data: any = await resp.json();

      // perudevs devuelve { estado, mensaje, resultado: {...} }
      // apisperu devuelve directamente los campos en el root
      const r = data.resultado || data;

      const nombre = (
        r.nombre_completo ||
        [
          r.nombres,
          r.apellido_paterno || r.apellidoPaterno,
          r.apellido_materno || r.apellidoMaterno,
        ]
          .filter(Boolean)
          .join(' ')
      )
        .toString()
        .trim();

      if (!nombre) return { fuente: 'api_vacio', encontrado: false, dni };

      // Extraer fecha nacimiento - perudevs: "DD/MM/YYYY", apisperu: ISO
      let fechaNacimiento: string | null = null;
      let edad: number | null = null;
      const rawFecha =
        r.fecha_nacimiento || r.fechaNacimiento || r.fecNacimiento;
      if (rawFecha) {
        let d: Date | null = null;
        // Formato DD/MM/YYYY (perudevs)
        const m = String(rawFecha).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
          d = new Date(
            Number(m[3]),
            Number(m[2]) - 1,
            Number(m[1]),
          );
        } else {
          d = new Date(rawFecha);
        }
        if (d && !isNaN(d.getTime())) {
          fechaNacimiento = d.toISOString();
          const hoy = new Date();
          edad = hoy.getFullYear() - d.getFullYear();
          const antes =
            hoy.getMonth() < d.getMonth() ||
            (hoy.getMonth() === d.getMonth() && hoy.getDate() < d.getDate());
          if (antes) edad -= 1;
        }
      }

      return {
        fuente: 'reniec',
        encontrado: true,
        frecuente: false,
        dni,
        nombre: nombre.toUpperCase(),
        telefono: null,
        visitas: 0,
        fechaNacimiento,
        edad,
        genero: r.genero || r.sexo || null,
      };
    } catch (err: any) {
      const msg = err?.name === 'TimeoutError' || err?.name === 'AbortError'
        ? 'Tiempo de espera agotado (8s) — la API no respondió'
        : err?.cause?.code === 'ENOTFOUND'
          ? 'No se pudo resolver el dominio — revisa la URL'
          : err?.message || 'Error de red al consultar la API';
      return {
        fuente: 'api_error',
        encontrado: false,
        dni,
        error: msg,
      };
    }
  }

  /**
   * Busca datos de empresa por RUC. Primero revisa si hay alquileres
   * previos con ese RUC (empresa recurrente); si no, consulta apisperu (SUNAT).
   */
  async buscarRuc(user: JwtPayload, ruc: string) {
    if (!ruc || !/^(10|15|17|20)\d{9}$/.test(ruc))
      throw new BadRequestException(
        'RUC inválido (11 dígitos, debe empezar con 10/15/17/20)',
      );

    // Bug fix: un RUC es nacional (SUNAT). Si se cargó manualmente en
    // sede 1, la sede 2 debe poder reutilizar esa razón social/dirección
    // sin volver a tipearla. Búsqueda global por RUC ignorando sede.
    void resolveSedeId(user); // valida que el user tenga acceso, pero no filtra

    // 1. Empresa recurrente: busca en historial GLOBAL (todas las sedes)
    const previos = await this.prisma.alquiler.findMany({
      where: { clienteRuc: ruc, tipoComprobante: 'FACTURA' },
      orderBy: { creadoEn: 'desc' },
      select: {
        clienteRazonSocial: true,
        clienteDireccionFiscal: true,
        creadoEn: true,
      },
      take: 20,
    });
    if (previos.length > 0) {
      const u = previos[0];
      return {
        fuente: 'local',
        encontrado: true,
        recurrente: true,
        ruc,
        razonSocial: u.clienteRazonSocial || '',
        direccion: u.clienteDireccionFiscal || '',
        estado: 'ACTIVO',
        condicion: 'HABIDO',
        visitas: previos.length,
        ultimaVisita: u.creadoEn,
      };
    }

    // 2. Consulta SUNAT via apisperu
    const cfg = await this.settings.getRucConfig();
    if (!cfg.token)
      return {
        fuente: 'ninguna',
        encontrado: false,
        ruc,
        mensaje:
          'No hay token de API RUC configurado (Configuración → APIs).',
      };

    try {
      const url = `${cfg.url}/${ruc}?token=${encodeURIComponent(cfg.token)}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) {
        let detalleUpstream: string | null = null;
        try {
          const txt = await resp.text();
          try {
            const j = JSON.parse(txt);
            detalleUpstream =
              j.message || j.mensaje || j.error || j.detail || txt;
          } catch {
            detalleUpstream = txt;
          }
        } catch {
          /* sin body */
        }
        const hint =
          resp.status === 401 || resp.status === 403
            ? 'Token inválido o sin permisos'
            : resp.status === 404
              ? 'URL incorrecta o RUC no existe en SUNAT'
              : resp.status === 429
                ? 'Plan agotado o demasiadas consultas'
                : `HTTP ${resp.status}`;
        return {
          fuente: 'api_error',
          encontrado: false,
          ruc,
          statusCode: resp.status,
          error: hint,
          detalle: detalleUpstream
            ? String(detalleUpstream).slice(0, 300)
            : null,
        };
      }
      const data: any = await resp.json();
      const razonSocial =
        data.razonSocial || data.razon_social || data.nombreComercial;
      if (!razonSocial)
        return { fuente: 'api_vacio', encontrado: false, ruc };
      return {
        fuente: 'sunat',
        encontrado: true,
        recurrente: false,
        ruc,
        razonSocial: razonSocial.trim().toUpperCase(),
        nombreComercial: data.nombreComercial || null,
        direccion: (data.direccion || data.direccionCompleta || '').trim(),
        estado: data.estado || null, // ACTIVO / BAJA / SUSPENSION
        condicion: data.condicion || null, // HABIDO / NO HABIDO
      };
    } catch (err: any) {
      const msg =
        err?.name === 'TimeoutError' || err?.name === 'AbortError'
          ? 'Tiempo de espera agotado (8s) — la API SUNAT no respondió'
          : err?.cause?.code === 'ENOTFOUND'
            ? 'No se pudo resolver el dominio — revisa la URL'
            : err?.message || 'Error de red al consultar SUNAT';
      return {
        fuente: 'api_error',
        encontrado: false,
        ruc,
        error: msg,
      };
    }
  }

  /** Actualiza los datos fiscales de un alquiler (boleta ↔ factura con RUC) */
  async actualizarDatosFiscales(
    id: number,
    dto: {
      tipoComprobante: 'BOLETA' | 'FACTURA';
      ruc?: string | null;
      razonSocial?: string | null;
      direccionFiscal?: string | null;
    },
    user: JwtPayload,
  ) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado === EstadoAlquiler.ANULADO)
      throw new BadRequestException('Alquiler anulado');

    if (dto.tipoComprobante === 'FACTURA') {
      if (!dto.ruc || !/^(10|15|17|20)\d{9}$/.test(dto.ruc))
        throw new BadRequestException('RUC inválido para factura');
      if (!dto.razonSocial || dto.razonSocial.length < 3)
        throw new BadRequestException('Razón social requerida');
    }

    return this.prisma.alquiler.update({
      where: { id: alquiler.id },
      data: {
        tipoComprobante: dto.tipoComprobante,
        clienteRuc: dto.tipoComprobante === 'FACTURA' ? dto.ruc : null,
        clienteRazonSocial:
          dto.tipoComprobante === 'FACTURA' ? dto.razonSocial : null,
        clienteDireccionFiscal:
          dto.tipoComprobante === 'FACTURA'
            ? dto.direccionFiscal || null
            : null,
      },
      include: {
        habitacion: { include: { piso: true } },
        consumos: { include: { producto: true } },
        creadoPor: { select: { id: true, nombre: true, username: true } },
      },
    });
  }

  findAll(
    user: JwtPayload,
    sedeIdQuery?: number,
    estado?: EstadoAlquiler,
  ) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.alquiler.findMany({
      where: { sedeId, ...(estado ? { estado } : {}) },
      include: {
        habitacion: { include: { piso: true } },
        consumos: { include: { producto: true } },
        creadoPor: { select: { id: true, nombre: true, username: true } },
        cobradoPor: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 200,
    });
  }

  /** Historial completo con rango de fechas para reportes */
  async historial(
    user: JwtPayload,
    desde: string | undefined,
    hasta: string | undefined,
    sedeIdQuery?: number,
  ) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const where: any = { sedeId };
    // HOTELERO / CAJERO solo ven sus propios alquileres
    if (user.rol !== 'SUPERADMIN' && user.rol !== 'ADMIN_SEDE') {
      where.creadoPorId = user.sub;
    }
    if (desde || hasta) {
      where.creadoEn = {};
      if (desde) where.creadoEn.gte = new Date(desde);
      if (hasta) {
        const h = new Date(hasta);
        h.setHours(23, 59, 59, 999);
        where.creadoEn.lte = h;
      }
    }
    return this.prisma.alquiler.findMany({
      where,
      include: {
        habitacion: { include: { piso: true } },
        sede: { select: { nombre: true } },
        consumos: { include: { producto: true } },
        creadoPor: { select: { nombre: true, username: true } },
        cobradoPor: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 5000,
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const a = await this.prisma.alquiler.findUnique({
      where: { id },
      include: {
        habitacion: { include: { piso: true } },
        consumos: { include: { producto: true } },
        creadoPor: { select: { id: true, nombre: true, username: true } },
        anuladoPor: { select: { id: true, nombre: true, username: true } },
        cobradoPor: { select: { id: true, nombre: true, username: true } },
      },
    });
    if (!a) throw new NotFoundException('Alquiler no encontrado');
    enforceSede(user, a.sedeId);
    return a;
  }

  async create(dto: CreateAlquilerDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);

    // Bug fix: si la sede fue pausada (activa=false), bloqueamos crear
    // alquileres. El frontend lo ocultaba pero un POST directo lo
    // dejaba pasar.
    const sede = await this.prisma.sede.findUnique({ where: { id: sedeId } });
    if (!sede) throw new BadRequestException('Sede inválida');
    if (!sede.activa)
      throw new ForbiddenException(
        `La sede "${sede.nombre}" está pausada. Pedile al admin que la reactive antes de operar.`,
      );

    const hab = await this.prisma.habitacion.findUnique({
      where: { id: dto.habitacionId },
    });
    if (!hab || hab.sedeId !== sedeId)
      throw new BadRequestException('Habitación inválida');
    if (hab.estado !== EstadoHabitacion.DISPONIBLE)
      throw new ConflictException(
        `Habitación no disponible (estado: ${hab.estado})`,
      );

    // ── Reservas: la franja no puede chocar con una reserva PENDIENTE de
    // otra persona. La reserva que estamos cumpliendo (reservaId) sí se permite.
    const inicioReq = new Date(dto.fechaIngreso);
    const finReq = new Date(dto.fechaSalida);
    const reservaChoque = await this.prisma.reserva.findFirst({
      where: {
        habitacionId: hab.id,
        estado: 'PENDIENTE',
        ...(dto.reservaId ? { id: { not: dto.reservaId } } : {}),
        inicio: { lt: finReq },
        fin: { gt: inicioReq },
      },
      orderBy: { inicio: 'asc' },
    });
    if (reservaChoque) {
      const f = (d: Date) =>
        d.toLocaleString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      throw new ConflictException(
        `La habitación está reservada de ${f(reservaChoque.inicio)} a ${f(reservaChoque.fin)} (${reservaChoque.clienteNombre}). Elige otra habitación u horario.`,
      );
    }

    // Si es un check-in de reserva, validarla.
    let reservaCumplir: { id: number; adelanto: any } | null = null;
    if (dto.reservaId) {
      const r = await this.prisma.reserva.findUnique({
        where: { id: dto.reservaId },
      });
      if (!r || r.habitacionId !== hab.id || r.sedeId !== sedeId)
        throw new BadRequestException('Reserva inválida para esta habitación');
      if (r.estado !== 'PENDIENTE')
        throw new BadRequestException(
          `La reserva ya está ${r.estado.toLowerCase()}`,
        );
      reservaCumplir = { id: r.id, adelanto: r.adelanto };
    }

    const turno = await this.prisma.turnoCaja.findFirst({
      where: {
        sedeId,
        usuarioId: user.sub,
        estado: EstadoTurno.ABIERTO,
      },
    });
    if (!turno)
      throw new BadRequestException(
        'No tienes turno de caja abierto. Abre caja primero.',
      );

    const pagadoNow = dto.pagado !== false; // default true
    return this.prisma.$transaction(async (tx) => {
      const alquiler: any = await tx.alquiler.create({
        data: {
          sedeId,
          habitacionId: hab.id,
          turnoCajaId: turno.id, // ← INGRESO pertenece a ESTE turno (politica: turno de apertura)
          clienteNombre: dto.clienteNombre,
          clienteDni: dto.clienteDni,
          clienteTelefono: dto.clienteTelefono,
          clienteFechaNacimiento: dto.clienteFechaNacimiento
            ? new Date(dto.clienteFechaNacimiento)
            : null,
          fechaIngreso: new Date(dto.fechaIngreso),
          fechaSalida: new Date(dto.fechaSalida),
          precioHabitacion: dto.precioHabitacion,
          total: dto.precioHabitacion,
          metodoPago: dto.metodoPago,
          notas: dto.notas,
          pagado: pagadoNow,
          montoPagado: pagadoNow ? dto.precioHabitacion : 0,
          pagadoEn: pagadoNow ? new Date() : null,
          turnoPagoId: pagadoNow ? turno.id : null,
          cobradoPorId: pagadoNow ? user.sub : null,
          amenitiesEntregados: dto.amenitiesEntregados ?? false,
          conCochera: dto.conCochera ?? false,
          modoLlegada: dto.modoLlegada ?? null,
          tipoComprobante: dto.tipoComprobante || 'BOLETA',
          clienteRuc: dto.clienteRuc || null,
          clienteRazonSocial: dto.clienteRazonSocial || null,
          clienteDireccionFiscal: dto.clienteDireccionFiscal || null,
          deseaEmitirSunat: dto.deseaEmitirSunat ?? false,
          creadoPorId: user.sub,
        },
      });

      await tx.habitacion.update({
        where: { id: hab.id },
        data: { estado: EstadoHabitacion.OCUPADA },
      });

      // Registrar pago si fue creado como pagado
      if (pagadoNow) {
        await tx.pagoAlquiler.create({
          data: {
            alquilerId: alquiler.id,
            turnoCajaId: turno.id,
            usuarioId: user.sub,
            monto: dto.precioHabitacion,
            metodoPago: dto.metodoPago,
          },
        });
      }

      // Check-in de reserva: marcarla CUMPLIDA y, si tenía adelanto y el
      // alquiler quedó como deuda (pagado=false), registrarlo como pago parcial
      // para que el saldo a cobrar ya lo descuente.
      if (reservaCumplir) {
        await tx.reserva.update({
          where: { id: reservaCumplir.id },
          data: { estado: 'CUMPLIDA', alquilerId: alquiler.id },
        });
        const adelanto = Number(reservaCumplir.adelanto || 0);
        if (adelanto > 0 && !pagadoNow) {
          const total = Number(alquiler.total);
          const monto = Math.min(adelanto, total);
          await tx.pagoAlquiler.create({
            data: {
              alquilerId: alquiler.id,
              turnoCajaId: turno.id,
              usuarioId: user.sub,
              monto,
              metodoPago: dto.metodoPago,
            },
          });
          await tx.alquiler.update({
            where: { id: alquiler.id },
            data: {
              montoPagado: monto,
              pagado: monto >= total,
              pagadoEn: monto >= total ? new Date() : null,
              turnoPagoId: turno.id,
              cobradoPorId: user.sub,
            },
          });
        }
      }

      // Procesar CORTESÍAS (productos que se entregan gratis al alquiler)
      // Se crea un ConsumoProducto con esCortesia=true y subtotal=0.
      if (dto.cortesias && dto.cortesias.length > 0) {
        for (const cor of dto.cortesias) {
          const prod = await tx.producto.findUnique({
            where: { id: cor.productoId },
          });
          if (!prod) continue;
          if (!prod.esCortesia)
            throw new BadRequestException(
              `El producto "${prod.nombre}" no está marcado como cortesía.`,
            );
          if (prod.stock < cor.cantidad)
            throw new ConflictException(
              `Stock insuficiente para cortesía "${prod.nombre}" (hay ${prod.stock}, se piden ${cor.cantidad}).`,
            );
          await tx.consumoProducto.create({
            data: {
              alquilerId: alquiler.id,
              productoId: prod.id,
              cantidad: cor.cantidad,
              precioUnit: 0,
              subtotal: 0,
              esCortesia: true,
            },
          });
          await tx.producto.update({
            where: { id: prod.id },
            data: { stock: { decrement: cor.cantidad } },
          });
          await tx.movimientoStock.create({
            data: {
              productoId: prod.id,
              cantidad: -cor.cantidad,
              tipo: 'SALIDA_CORTESIA' as any,
              referencia: `Cortesía alquiler #${alquiler.id}`,
              usuarioId: user.sub,
            },
          });
        }
      }

      // Procesar IMPLEMENTOS (toallas/sábanas/controles prestados)
      if (dto.implementos && dto.implementos.length > 0) {
        for (const imp of dto.implementos) {
          const item = await tx.implemento.findUnique({
            where: { id: imp.implementoId },
          });
          if (!item) continue;
          if (item.sedeId !== alquiler.sedeId)
            throw new BadRequestException(
              `El implemento "${item.nombre}" no pertenece a esta sede.`,
            );
          if (item.stockDisponible < imp.cantidad)
            throw new ConflictException(
              `Stock insuficiente de "${item.nombre}" (disponible ${item.stockDisponible}, se piden ${imp.cantidad}).`,
            );
          await tx.asignacionImplemento.create({
            data: {
              alquilerId: alquiler.id,
              implementoId: item.id,
              cantidad: imp.cantidad,
            },
          });
          await tx.implemento.update({
            where: { id: item.id },
            data: { stockDisponible: { decrement: imp.cantidad } },
          });
        }
      }

      return alquiler;
    });
  }

  async agregarConsumo(
    alquilerId: number,
    dto: AgregarConsumoDto,
    user: JwtPayload,
  ) {
    const alquiler = await this.findOne(alquilerId, user);
    if (alquiler.estado !== EstadoAlquiler.ACTIVO)
      throw new BadRequestException('Alquiler no está activo');

    // Bug fix: chequeo explícito de pertenencia a sede para defensa en
    // profundidad (findOne ya lo hace, pero hacemos esto explícito).
    enforceSede(user, alquiler.sedeId);

    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });
    if (!producto || producto.sedeId !== alquiler.sedeId)
      throw new BadRequestException('Producto inválido');
    if (producto.stock < dto.cantidad)
      throw new ConflictException('Stock insuficiente');

    const precioUnit = Number(producto.precio);
    const subtotal = precioUnit * dto.cantidad;

    // Solo verificamos que tenga turno abierto para registrar el consumo,
    // pero NO cobramos automáticamente: el producto suma al saldo pendiente
    // y se cobra después con marcarPagado (botón "Cobrar productos").
    const turnoActual = await this.prisma.turnoCaja.findFirst({
      where: {
        sedeId: alquiler.sedeId,
        usuarioId: user.sub,
        estado: EstadoTurno.ABIERTO,
      },
    });
    if (!turnoActual)
      throw new BadRequestException(
        'No tienes turno de caja abierto. Abre caja primero.',
      );

    return this.prisma.$transaction(async (tx) => {
      const consumo = await tx.consumoProducto.create({
        data: {
          alquilerId: alquiler.id,
          productoId: producto.id,
          cantidad: dto.cantidad,
          precioUnit,
          subtotal,
        },
      });

      // Bug fix: usamos { decrement } atómico en lugar de read-then-write
      // y validamos que el stock no quede negativo. updateMany con where
      // gte cantidad nos da el lock optimista contra dos cajeros agregando
      // el mismo producto a la vez.
      const updated = await tx.producto.updateMany({
        where: { id: producto.id, stock: { gte: dto.cantidad } },
        data: { stock: { decrement: dto.cantidad } },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          `Stock insuficiente para "${producto.nombre}" (otro cajero acaba de descontarlo)`,
        );
      }

      await tx.movimientoStock.create({
        data: {
          productoId: producto.id,
          tipo: TipoMovimiento.SALIDA_VENTA,
          cantidad: -dto.cantidad,
          referencia: `Alquiler #${alquiler.id}`,
          usuarioId: user.sub,
        },
      });

      const totalProductosActual =
        Number(alquiler.totalProductos) + subtotal;
      const totalGeneral =
        Number(alquiler.precioHabitacion) + totalProductosActual;
      const yaPagado = Number(alquiler.montoPagado);
      // pagado=true solo si lo ya cobrado cubre el nuevo total.
      // Si antes estaba "pagado" pero ahora subió el total, pasa a false
      // para que aparezca el botón "Cobrar productos".
      const completo = yaPagado >= totalGeneral - 0.001;

      await tx.alquiler.update({
        where: { id: alquiler.id },
        data: {
          totalProductos: totalProductosActual,
          total: totalGeneral,
          pagado: completo,
          pagadoEn: completo ? alquiler.pagadoEn : null,
        },
      });

      return consumo;
    });
  }

  async finalizar(id: number, dto: FinalizarAlquilerDto, user: JwtPayload) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado !== EstadoAlquiler.ACTIVO)
      throw new BadRequestException('Alquiler no está activo');

    // Validación: NO se puede finalizar si hay saldo pendiente.
    // Cubre tanto el precio de la habitación como los consumos de productos.
    const total = Number((alquiler as any).total ?? 0);
    const precioHab = Number((alquiler as any).precioHabitacion ?? 0);
    const totalProductos = Number((alquiler as any).totalProductos ?? 0);
    const pagado = Number((alquiler as any).montoPagado ?? 0);
    const saldo = total - pagado;

    if (saldo > 0.01) {
      const saldoHab = Math.max(0, precioHab - pagado);
      const saldoProd = Math.max(0, totalProductos - Math.max(0, pagado - precioHab));
      const detalles: string[] = [];
      if (saldoHab > 0.01)
        detalles.push(`habitación S/ ${saldoHab.toFixed(2)}`);
      if (saldoProd > 0.01)
        detalles.push(`productos S/ ${saldoProd.toFixed(2)}`);
      throw new BadRequestException(
        `No se puede finalizar: falta pagar S/ ${saldo.toFixed(2)}` +
          (detalles.length ? ` (${detalles.join(' · ')})` : '') +
          '. Registra el cobro o regulariza el precio antes de cerrar la habitación.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const act = await tx.alquiler.update({
        where: { id: alquiler.id },
        data: {
          estado: EstadoAlquiler.FINALIZADO,
          fechaSalidaReal: new Date(),
          notas: dto?.notas ?? alquiler.notas,
        },
      });

      // Auto-transición: OCUPADA -> ALISTANDO + crear tarea de limpieza
      await tx.habitacion.update({
        where: { id: alquiler.habitacionId },
        data: { estado: EstadoHabitacion.ALISTANDO },
      });

      // Auto-devolver implementos prestados que aún no fueron devueltos
      // (toallas, sábanas, controles, etc.) — vuelven al stock disponible.
      const pendientes = await tx.asignacionImplemento.findMany({
        where: { alquilerId: alquiler.id, fechaDevolucion: null },
      });
      for (const asig of pendientes) {
        await tx.asignacionImplemento.update({
          where: { id: asig.id },
          data: { fechaDevolucion: new Date() },
        });
        await tx.implemento.update({
          where: { id: asig.implementoId },
          data: { stockDisponible: { increment: asig.cantidad } },
        });
      }

      // Auto-asignación: elige el usuario de LIMPIEZA activo con menos tareas pendientes
      const limpiadoras = await tx.usuario.findMany({
        where: {
          sedeId: alquiler.sedeId,
          rol: 'LIMPIEZA',
          activo: true,
        },
        select: {
          id: true,
          _count: {
            select: {
              tareasAsignadas: {
                where: {
                  estado: {
                    in: [
                      EstadoTareaLimpieza.PENDIENTE,
                      EstadoTareaLimpieza.EN_PROCESO,
                    ],
                  },
                },
              },
            },
          },
        },
      });

      let asignadaAId: number | null = null;
      if (limpiadoras.length > 0) {
        limpiadoras.sort(
          (a, b) => a._count.tareasAsignadas - b._count.tareasAsignadas,
        );
        asignadaAId = limpiadoras[0].id;
      }

      await tx.tareaLimpieza.create({
        data: {
          sedeId: alquiler.sedeId,
          habitacionId: alquiler.habitacionId,
          estado: EstadoTareaLimpieza.PENDIENTE,
          notas:
            asignadaAId == null
              ? `Post-alquiler #${alquiler.id} — sin limpiadora asignada (la sede no tiene personal de LIMPIEZA activo)`
              : `Post-alquiler #${alquiler.id}`,
          asignadaAId,
        },
      });

      return act;
    });
  }

  /**
   * Calcula cuánto costaría extender sin aplicar el cambio.
   * Devuelve { costo, nuevaFechaSalida, nuevoPrecioHabitacion, nuevoTotal }.
   */
  async cotizarExtension(id: number, dto: ExtenderAlquilerDto, user: JwtPayload) {
    const alquiler = await this.findOne(id, user);
    const habitacion = await this.prisma.habitacion.findUnique({
      where: { id: alquiler.habitacionId },
    });
    if (!habitacion) throw new NotFoundException('Habitación no encontrada');

    const precioUnidad =
      dto.tipo === 'HORA'
        ? Number(habitacion.precioHora)
        : Number(habitacion.precioNoche);
    const costoAuto = precioUnidad * dto.cantidad;
    // Si viene costoManual usarlo; si no, el automático
    const costo =
      dto.costoManual !== undefined && dto.costoManual !== null
        ? Number(dto.costoManual)
        : costoAuto;

    const fechaActual = new Date(alquiler.fechaSalida);
    const nuevaFechaSalida = new Date(fechaActual);
    if (dto.tipo === 'HORA') {
      nuevaFechaSalida.setHours(nuevaFechaSalida.getHours() + dto.cantidad);
    } else {
      nuevaFechaSalida.setDate(nuevaFechaSalida.getDate() + dto.cantidad);
    }

    const nuevoPrecioHabitacion = Number(alquiler.precioHabitacion) + costo;
    const nuevoTotal = Number(alquiler.totalProductos) + nuevoPrecioHabitacion;

    return {
      alquilerId: alquiler.id,
      tipo: dto.tipo,
      cantidad: dto.cantidad,
      precioUnidad,
      costoAuto,
      costo,
      manual: costo !== costoAuto,
      nuevaFechaSalida: nuevaFechaSalida.toISOString(),
      nuevoPrecioHabitacion,
      nuevoTotal,
    };
  }

  async extender(id: number, dto: ExtenderAlquilerDto, user: JwtPayload) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado !== EstadoAlquiler.ACTIVO)
      throw new BadRequestException('Solo puedes extender alquileres activos');

    const cot = await this.cotizarExtension(id, dto, user);

    return this.prisma.alquiler.update({
      where: { id: alquiler.id },
      data: {
        fechaSalida: new Date(cot.nuevaFechaSalida),
        precioHabitacion: cot.nuevoPrecioHabitacion,
        total: cot.nuevoTotal,
        notas: alquiler.notas
          ? `${alquiler.notas}\nExtendido ${dto.cantidad} ${dto.tipo === 'HORA' ? 'hora(s)' : 'día(s)'} (+S/ ${cot.costo.toFixed(2)})`
          : `Extendido ${dto.cantidad} ${dto.tipo === 'HORA' ? 'hora(s)' : 'día(s)'} (+S/ ${cot.costo.toFixed(2)})`,
      },
      include: {
        habitacion: { include: { piso: true } },
        consumos: { include: { producto: true } },
        creadoPor: { select: { id: true, nombre: true, username: true } },
      },
    });
  }

  /**
   * Registra un cobro (total o parcial). Si `monto` no se especifica,
   * cobra el saldo completo pendiente. Acumula en montoPagado.
   *
   * pagado=true solo cuando montoPagado >= total del alquiler.
   * El ingreso se registra en el turno ACTUAL del cajero (turnoPagoId).
   */
  async marcarPagado(id: number, user: JwtPayload, montoInput?: number) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado === EstadoAlquiler.ANULADO)
      throw new BadRequestException('Alquiler anulado');

    // Si pertenece a una reserva grupal, el cobro va por el endpoint
    // POST /reservas-grupales/:id/cobrar para que sea 1 solo pago consolidado.
    if (alquiler.reservaGrupalId) {
      throw new BadRequestException(
        `Este alquiler es parte de una reserva grupal (#${alquiler.reservaGrupalId}). Cobrá desde el panel de reservas grupales en lugar de cada habitación.`,
      );
    }

    const total = Number(alquiler.total);
    const yaPagado = Number(alquiler.montoPagado);
    const saldo = total - yaPagado;

    if (saldo <= 0.005)
      throw new BadRequestException('Ya está totalmente pagado');

    // Si no se pasa monto, cobra el saldo completo
    let monto = montoInput != null ? Number(montoInput) : saldo;
    if (!Number.isFinite(monto) || monto <= 0)
      throw new BadRequestException('El monto debe ser mayor a 0');
    // Bug fix: redondeamos a 2 decimales para evitar overpayments por
    // floating-point precision (antes saldo=100, monto=100.001 pasaba
    // la validación monto > saldo + 0.001 si los valores eran exactos).
    monto = Math.round(monto * 100) / 100;
    if (monto - saldo > 0.005)
      throw new BadRequestException(
        `El monto (S/ ${monto.toFixed(2)}) excede el saldo pendiente (S/ ${saldo.toFixed(2)})`,
      );

    const nuevoPagado = yaPagado + monto;
    const completo = nuevoPagado >= total - 0.005;

    // Turno actual del cajero (donde se recibe el dinero)
    const turnoActual = await this.prisma.turnoCaja.findFirst({
      where: {
        sedeId: alquiler.sedeId,
        usuarioId: user.sub,
        estado: EstadoTurno.ABIERTO,
      },
    });
    if (!turnoActual)
      throw new BadRequestException(
        'No tienes turno de caja abierto. Abre caja primero.',
      );

    return this.prisma.$transaction(async (tx) => {
      // Registrar el pago individual en el historial
      await tx.pagoAlquiler.create({
        data: {
          alquilerId: alquiler.id,
          turnoCajaId: turnoActual.id,
          usuarioId: user.sub,
          monto,
          metodoPago: alquiler.metodoPago,
        },
      });

      return tx.alquiler.update({
        where: { id: alquiler.id },
        data: {
          montoPagado: nuevoPagado,
          pagado: completo,
          pagadoEn: completo ? new Date() : alquiler.pagadoEn,
          cobradoPorId: user.sub,
          turnoPagoId: turnoActual.id,
          notas: alquiler.notas
            ? `${alquiler.notas}\n[Cobro S/ ${monto.toFixed(2)} · saldo S/ ${Math.max(0, total - nuevoPagado).toFixed(2)}]`
            : `[Cobro S/ ${monto.toFixed(2)} · saldo S/ ${Math.max(0, total - nuevoPagado).toFixed(2)}]`,
        },
        include: {
          habitacion: { include: { piso: true } },
          creadoPor: { select: { id: true, nombre: true, username: true } },
          cobradoPor: { select: { id: true, nombre: true, username: true } },
          pagos: true,
        },
      });
    });
  }

  async actualizarAmenities(
    id: number,
    dto: { entregados: boolean; notas?: string },
    user: JwtPayload,
  ) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado === EstadoAlquiler.ANULADO)
      throw new BadRequestException('Alquiler anulado');

    return this.prisma.alquiler.update({
      where: { id: alquiler.id },
      data: {
        amenitiesEntregados: dto.entregados,
        amenitiesNotas: dto.notas ?? alquiler.amenitiesNotas,
      },
    });
  }

  /** Actualiza cómo llegó el huésped (a pie / en vehículo). */
  async actualizarLlegada(id: number, modoLlegada: string, user: JwtPayload) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado === EstadoAlquiler.ANULADO)
      throw new BadRequestException('Alquiler anulado');
    const valor = modoLlegada === 'VEHICULO' ? 'VEHICULO' : modoLlegada === 'PIE' ? 'PIE' : null;
    return this.prisma.alquiler.update({
      where: { id: alquiler.id },
      data: { modoLlegada: valor },
    });
  }

  async anular(id: number, dto: AnularAlquilerDto, user: JwtPayload) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado === EstadoAlquiler.ANULADO)
      throw new BadRequestException('Ya anulado');
    if (!dto.motivo || dto.motivo.length < 3)
      throw new BadRequestException('Motivo requerido');

    return this.prisma.$transaction(async (tx) => {
      // 1. Devolver stock de productos consumidos (regulares y cortesías)
      for (const c of alquiler.consumos) {
        await tx.producto.update({
          where: { id: c.productoId },
          data: { stock: { increment: c.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: c.productoId,
            tipo: TipoMovimiento.ANULACION,
            cantidad: c.cantidad,
            referencia: `Anulación alquiler #${alquiler.id}`,
            usuarioId: user.sub,
          },
        });
      }

      // 2. Devolver implementos prestados al stock (toallas, controles, etc.)
      //    Bug fix: anular no los devolvía y quedaban "en uso" para siempre.
      const implementosPendientes = await tx.asignacionImplemento.findMany({
        where: { alquilerId: alquiler.id, fechaDevolucion: null },
      });
      for (const asig of implementosPendientes) {
        await tx.asignacionImplemento.update({
          where: { id: asig.id },
          data: {
            fechaDevolucion: new Date(),
            notas: asig.notas
              ? `${asig.notas} [devuelto por anulación]`
              : 'Devuelto por anulación del alquiler',
          },
        });
        await tx.implemento.update({
          where: { id: asig.implementoId },
          data: { stockDisponible: { increment: asig.cantidad } },
        });
      }

      // 3. Anular los PagoAlquiler huérfanos. No los borramos para preservar
      //    auditoría — los marcamos como anulados con flag y descripción.
      //    Si el esquema no tiene flag, los borramos para no descuadrar caja.
      //    Bug fix: antes los pagos parciales quedaban huérfanos descuadrando
      //    el reporte de caja.
      await tx.pagoAlquiler.deleteMany({
        where: { alquilerId: alquiler.id },
      });

      const act = await tx.alquiler.update({
        where: { id: alquiler.id },
        data: {
          estado: EstadoAlquiler.ANULADO,
          anuladoEn: new Date(),
          anuladoPorId: user.sub,
          motivoAnulacion: dto.motivo,
          // Bug fix: pagadoEn quedaba poblado aunque ya no esté pagado.
          pagado: false,
          montoPagado: 0,
          pagadoEn: null,
        },
      });

      // 4. Liberar habitación solo si no hay OTRO alquiler activo en ella.
      //    Bug fix: antes liberaba siempre y en caso de duplicado (carrera)
      //    dejaba la habitación DISPONIBLE con otro alquiler activo.
      const otroActivo = await tx.alquiler.count({
        where: {
          habitacionId: alquiler.habitacionId,
          estado: EstadoAlquiler.ACTIVO,
          id: { not: alquiler.id },
        },
      });
      if (otroActivo === 0) {
        await tx.habitacion.update({
          where: { id: alquiler.habitacionId },
          data: { estado: EstadoHabitacion.DISPONIBLE },
        });
      }

      return act;
    });
  }
}
