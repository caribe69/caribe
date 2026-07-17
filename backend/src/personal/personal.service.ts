import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { SettingsService } from '../settings/settings.service';
import { resolveSedeId } from '../common/sede-scope';

interface CrearPersonalInput {
  dni: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  fechaNacimiento?: Date | null;
  fechaIngreso?: Date | null;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  cargo?: string | null;
  notas?: string | null;
  sedeId?: number | null;
}

interface FotosInput {
  fotoPerfil?: string | null;
  fotoDniFrente?: string | null;
  fotoDniReverso?: string | null;
}

@Injectable()
export class PersonalService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async listar(user: JwtPayload, sedeIdQuery?: number) {
    const sedeFiltro =
      user.rol !== 'SUPERADMIN'
        ? resolveSedeId(user, sedeIdQuery)
        : sedeIdQuery || undefined;

    const where: any = {};
    if (sedeFiltro) {
      // Aparece en la sede si es su sede base O si su usuario tiene acceso
      // multisede a esa sede (así se ve sin necesidad de transferencias).
      where.OR = [
        { sedeId: sedeFiltro },
        { usuario: { sedesAcceso: { some: { sedeId: sedeFiltro } } } },
      ];
    }
    return this.prisma.personal.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            username: true,
            rol: true,
            activo: true,
            sedesAcceso: { select: { sedeId: true } },
          },
        },
        sede: { select: { id: true, nombre: true } },
      },
      orderBy: [{ activo: 'desc' }, { apellidoPaterno: 'asc' }],
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.personal.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            username: true,
            rol: true,
            activo: true,
            sedesAcceso: { select: { sedeId: true } },
          },
        },
        sede: { select: { id: true, nombre: true } },
      },
    });
    if (!p) throw new NotFoundException('Personal no encontrado');
    return p;
  }

  /** Sedes de acceso multisede del usuario vinculado a este personal. */
  async getSedesAcceso(id: number) {
    const personal = await this.findOne(id);
    if (!personal.usuarioId)
      return { usuarioId: null, multisede: false, sedeIds: [] as number[] };
    const rows = await this.prisma.usuarioSede.findMany({
      where: { usuarioId: personal.usuarioId },
      select: { sedeId: true },
    });
    const sedeIds = rows.map((r) => r.sedeId);
    return {
      usuarioId: personal.usuarioId,
      multisede: sedeIds.length >= 2,
      sedeIds,
    };
  }

  /**
   * Define las sedes a las que puede entrar el usuario vinculado (multisede).
   * Solo SUPERADMIN. Requiere que el personal tenga usuario vinculado.
   * - sedeIds con ≥2 sedes → activa multisede con ese conjunto.
   * - sedeIds con <2 → desactiva multisede (borra las filas).
   */
  async setSedesAcceso(id: number, sedeIds: number[], user: JwtPayload) {
    if (user.rol !== 'SUPERADMIN' && user.rol !== 'ADMIN_SEDE')
      throw new ForbiddenException(
        'No autorizado para gestionar el acceso multisede',
      );
    const personal = await this.findOne(id);
    if (!personal.usuarioId)
      throw new BadRequestException(
        'Este personal no tiene usuario vinculado. Crea o vincula un usuario primero.',
      );

    const uniq = Array.from(
      new Set((sedeIds || []).filter((n) => Number.isInteger(n))),
    );
    if (uniq.length > 0) {
      const existen = await this.prisma.sede.count({
        where: { id: { in: uniq } },
      });
      if (existen !== uniq.length)
        throw new BadRequestException('Alguna sede indicada no existe');
      // No se puede dar acceso a un AGRUPADOR (sede con edificios): se opera
      // en los edificios (hojas), no en el padre.
      const agrupadores = await this.prisma.sede.count({
        where: { id: { in: uniq }, edificios: { some: {} } },
      });
      if (agrupadores > 0)
        throw new BadRequestException(
          'No se puede dar acceso a una sede agrupadora; elige sus edificios.',
        );
    }

    const usuarioId = personal.usuarioId;
    await this.prisma.$transaction(async (tx) => {
      await tx.usuarioSede.deleteMany({ where: { usuarioId } });
      if (uniq.length >= 2) {
        await tx.usuarioSede.createMany({
          data: uniq.map((sedeId) => ({ usuarioId, sedeId })),
          skipDuplicates: true,
        });
      }
    });
    return this.getSedesAcceso(id);
  }

  async crear(dto: CrearPersonalInput, user: JwtPayload) {
    if (!dto.dni || !dto.nombre || !dto.apellidoPaterno)
      throw new BadRequestException('Faltan datos obligatorios');

    const existing = await this.prisma.personal.findUnique({
      where: { dni: dto.dni },
    });
    if (existing)
      throw new ConflictException(`Ya existe personal con DNI ${dto.dni}`);

    const sedeId =
      user.rol === 'SUPERADMIN'
        ? dto.sedeId ?? user.sedeId ?? null
        : resolveSedeId(user, dto.sedeId ?? undefined);

    return this.prisma.personal.create({
      data: {
        ...dto,
        sedeId,
      } as any,
    });
  }

  async actualizar(id: number, dto: Partial<CrearPersonalInput>) {
    await this.findOne(id);
    return this.prisma.personal.update({
      where: { id },
      data: dto as any,
    });
  }

  async actualizarFotos(id: number, fotos: FotosInput) {
    await this.findOne(id);
    const data: any = {};
    if (fotos.fotoPerfil !== undefined) data.fotoPerfil = fotos.fotoPerfil;
    if (fotos.fotoDniFrente !== undefined)
      data.fotoDniFrente = fotos.fotoDniFrente;
    if (fotos.fotoDniReverso !== undefined)
      data.fotoDniReverso = fotos.fotoDniReverso;
    return this.prisma.personal.update({ where: { id }, data });
  }

  /** Cuenta el historial operativo del usuario vinculado (lo que se perdería). */
  private async contarHistorial(usuarioId: number) {
    const [ventas, alqCreados, alqCobrados, turnos, pagos, movs] =
      await Promise.all([
        this.prisma.venta.count({ where: { usuarioId } }),
        this.prisma.alquiler.count({ where: { creadoPorId: usuarioId } }),
        this.prisma.alquiler.count({ where: { cobradoPorId: usuarioId } }),
        this.prisma.turnoCaja.count({ where: { usuarioId } }),
        this.prisma.pagoAlquiler.count({ where: { usuarioId } }),
        this.prisma.movimientoStock.count({ where: { usuarioId } }),
      ]);
    const alquileres = alqCreados + alqCobrados;
    const total = ventas + alquileres + turnos + pagos + movs;
    return { ventas, alquileres, turnos, total };
  }

  /** Valida la clave de eliminación configurada en Configuración. */
  private async validarClave(clave: string) {
    const configurada = await this.settings.claveEliminacionConfigurada();
    if (!configurada)
      throw new BadRequestException(
        'No hay clave de eliminación configurada. Defínela en Configuración → Seguridad.',
      );
    const ok = await this.settings.verificarClaveEliminacion(clave);
    if (!ok) throw new UnauthorizedException('Clave de eliminación incorrecta');
  }

  /**
   * Elimina el personal Y su usuario vinculado (limpieza total). Requiere la
   * clave de eliminación. Si el personal tiene historial (ventas/alquileres/
   * turnos), NO se elimina: se pide anularlo para conservar los registros.
   */
  async eliminar(id: number, clave: string) {
    await this.validarClave(clave);
    const personal = await this.findOne(id);

    if (personal.usuarioId) {
      const hist = await this.contarHistorial(personal.usuarioId);
      if (hist.total > 0) {
        throw new BadRequestException(
          `Este personal tiene historial (${hist.ventas} ventas, ${hist.alquileres} alquileres, ${hist.turnos} turnos de caja). ` +
            `No se puede eliminar sin perder esos registros. Usa "Anular" para desactivarlo y conservar el historial.`,
        );
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Primero el personal (libera el FK usuarioId), luego el usuario.
        await tx.personal.delete({ where: { id } });
        if (personal.usuarioId) {
          await tx.usuario.delete({ where: { id: personal.usuarioId } });
        }
      });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new BadRequestException(
          'Este personal tiene registros asociados. Usa "Anular" en su lugar.',
        );
      }
      throw e;
    }
    return { ok: true, eliminado: true };
  }

  /**
   * Anula (desactiva) el personal y su usuario: no podrá iniciar sesión, pero
   * se conserva todo su historial. Requiere la clave de eliminación.
   */
  async anular(id: number, clave: string) {
    await this.validarClave(clave);
    const personal = await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.personal.update({ where: { id }, data: { activo: false } });
      if (personal.usuarioId) {
        await tx.usuario.update({
          where: { id: personal.usuarioId },
          data: { activo: false },
        });
      }
    });
    return { ok: true, anulado: true };
  }

  /**
   * Crear usuario del sistema y vincularlo a este personal.
   * El username se autogenera a partir del DNI si no se especifica.
   */
  async crearUsuario(
    id: number,
    dto: { username?: string; password: string; rol: Rol },
  ) {
    const personal = await this.findOne(id);
    if (personal.usuarioId)
      throw new ConflictException(
        'Este personal ya tiene un usuario vinculado',
      );
    if (!dto.password || dto.password.length < 6)
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );

    const username = (dto.username?.trim() || personal.dni).toLowerCase();

    const exists = await this.prisma.usuario.findUnique({ where: { username } });
    if (exists)
      throw new ConflictException(`El username '${username}' ya está en uso`);

    // Normaliza el email: '' → null para no chocar con la constraint UNIQUE.
    // Si el correo ya está tomado por otra cuenta, NO rompemos: creamos el
    // usuario SIN correo (el correo sigue viviendo en el registro de Personal).
    // Así se evita el bug de "correo duplicado" al crear usuarios desde Personal.
    let email = personal.correo && personal.correo.trim()
      ? personal.correo.trim().toLowerCase()
      : null;
    if (email) {
      const emailExists = await this.prisma.usuario.findUnique({
        where: { email },
      });
      if (emailExists) email = null;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const nombreCompleto = [
      personal.nombre,
      personal.apellidoPaterno,
      personal.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            username,
            nombre: nombreCompleto,
            email,
            rol: dto.rol,
            sedeId: personal.sedeId,
            passwordHash,
            activo: true,
          },
        });
        await tx.personal.update({
          where: { id },
          data: { usuarioId: usuario.id },
        });
        return { usuario, personalId: id };
      });
    } catch (e: any) {
      // Mapeo de errores Prisma conocidos a mensajes claros
      if (e?.code === 'P2002') {
        const target = Array.isArray(e.meta?.target)
          ? (e.meta!.target as string[]).join(', ')
          : String(e.meta?.target || '');
        throw new ConflictException(
          `Ya existe un usuario con el mismo ${target || 'campo único'}`,
        );
      }
      if (e?.code === 'P2003') {
        throw new BadRequestException(
          'Referencia inválida (sede o relación). Revisa los datos del personal.',
        );
      }
      // Cualquier otro error: propagar con el mensaje real para no devolver 500 genérico
      throw new BadRequestException(
        `No se pudo crear el usuario: ${e?.message || 'error desconocido'}`,
      );
    }
  }

  async desvincularUsuario(id: number) {
    const personal = await this.findOne(id);
    if (!personal.usuarioId)
      throw new BadRequestException('No tiene usuario vinculado');
    return this.prisma.personal.update({
      where: { id },
      data: { usuarioId: null },
    });
  }

  /**
   * Busca usuarios existentes que coincidan con los datos del personal
   * (email o DNI como username) y que NO estén ya vinculados a otro
   * personal. Útil para ofrecer "vincular" en vez de "crear nuevo".
   */
  async usuarioExistenteParaPersonal(id: number) {
    const personal = await this.findOne(id);
    const where: any[] = [];
    if (personal.correo && personal.correo.trim())
      where.push({ email: personal.correo.trim().toLowerCase() });
    if (personal.dni) where.push({ username: personal.dni });
    if (where.length === 0) return null;

    const candidato = await this.prisma.usuario.findFirst({
      where: {
        OR: where,
        personalRecord: { is: null }, // no esté ya vinculado
      },
      select: {
        id: true,
        username: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        sedeId: true,
        sede: { select: { id: true, nombre: true } },
      },
    });
    return candidato;
  }

  /** Vincula un Usuario YA EXISTENTE a un Personal sin crear uno nuevo. */
  async vincularUsuarioExistente(id: number, usuarioId: number) {
    const personal = await this.findOne(id);
    if (personal.usuarioId)
      throw new ConflictException(
        'Este personal ya tiene un usuario vinculado',
      );
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { personalRecord: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.personalRecord)
      throw new ConflictException(
        `El usuario @${usuario.username} ya está vinculado a otro personal`,
      );

    return this.prisma.personal.update({
      where: { id },
      data: { usuarioId: usuario.id },
      include: {
        usuario: {
          select: { id: true, username: true, rol: true, activo: true },
        },
      },
    });
  }

  // ════════════════════════════════════════════════════════════
  // TRANSFERENCIA ENTRE SEDES
  // ════════════════════════════════════════════════════════════

  /**
   * Transfiere un Personal de su sede actual a otra sede.
   * Mantiene el mismo Personal e id de Usuario; solo cambia las sedeId.
   * Bloquea la operación si el usuario asociado tiene un turno de caja
   * abierto (debe cerrarlo primero).
   */
  async transferir(
    personalId: number,
    dto: { haciaSedeId: number; motivo: string },
    user: JwtPayload,
  ) {
    if (!dto.motivo || dto.motivo.trim().length < 3)
      throw new BadRequestException('Motivo de transferencia obligatorio');

    const personal = await this.findOne(personalId);
    if (!personal.sedeId)
      throw new BadRequestException(
        'Este personal no tiene sede asignada — primero asigna una al editar.',
      );
    if (personal.sedeId === dto.haciaSedeId)
      throw new BadRequestException(
        'El personal ya pertenece a esa sede.',
      );

    // Permisos: ADMIN_SEDE solo puede transferir DESDE o HACIA su propia sede
    if (user.rol === 'ADMIN_SEDE') {
      if (
        personal.sedeId !== user.sedeId &&
        dto.haciaSedeId !== user.sedeId
      ) {
        throw new ForbiddenException(
          'Solo puedes transferir personal desde o hacia tu sede.',
        );
      }
    }

    // Sede destino debe existir y estar activa
    const sedeDestino = await this.prisma.sede.findUnique({
      where: { id: dto.haciaSedeId },
    });
    if (!sedeDestino || !sedeDestino.activa)
      throw new BadRequestException('Sede destino no encontrada o inactiva');

    // Si tiene usuario, verificar que NO tenga turno de caja abierto
    if (personal.usuarioId) {
      const turnoAbierto = await this.prisma.turnoCaja.findFirst({
        where: {
          usuarioId: personal.usuarioId,
          estado: 'ABIERTO',
        },
        include: { sede: { select: { nombre: true } } },
      });
      if (turnoAbierto) {
        throw new BadRequestException(
          `${personal.nombre} ${personal.apellidoPaterno} tiene un turno de caja ABIERTO #${turnoAbierto.id} en la sede ${turnoAbierto.sede.nombre}. Debe cerrar caja antes de ser transferido.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const transferencia = await tx.transferenciaPersonal.create({
        data: {
          personalId: personalId,
          desdeSedeId: personal.sedeId,
          hastaSedeId: dto.haciaSedeId,
          motivo: dto.motivo.trim(),
          transferidoPorId: user.sub,
        },
        include: {
          desdeSede: { select: { id: true, nombre: true } },
          hastaSede: { select: { id: true, nombre: true } },
        },
      });
      await tx.personal.update({
        where: { id: personalId },
        data: { sedeId: dto.haciaSedeId },
      });
      if (personal.usuarioId) {
        await tx.usuario.update({
          where: { id: personal.usuarioId },
          data: { sedeId: dto.haciaSedeId },
        });
      }
      return { transferencia };
    });
  }

  /**
   * Historial completo del personal: lista de transferencias + métricas
   * agregadas por sede (ventas, alquileres, turnos cerrados), sumando
   * datos de todas las sedes donde el usuario asociado haya operado.
   * Accesible para SUPERADMIN y para ADMIN_SEDE cuyo sede haya tenido
   * al personal alguna vez.
   */
  async historialCompleto(personalId: number, user: JwtPayload) {
    const personal = await this.findOne(personalId);

    if (user.rol === 'ADMIN_SEDE' && user.sedeId != null) {
      const enSuSedeActualmente = personal.sedeId === user.sedeId;
      const huboTransferenciaConSuSede =
        await this.prisma.transferenciaPersonal.findFirst({
          where: {
            personalId,
            OR: [
              { desdeSedeId: user.sedeId },
              { hastaSedeId: user.sedeId },
            ],
          },
        });
      // También puede verlo si el personal tiene acceso multisede a su sede.
      const tieneAccesoASuSede = personal.usuarioId
        ? !!(await this.prisma.usuarioSede.findFirst({
            where: { usuarioId: personal.usuarioId, sedeId: user.sedeId },
          }))
        : false;
      if (
        !enSuSedeActualmente &&
        !huboTransferenciaConSuSede &&
        !tieneAccesoASuSede
      ) {
        throw new ForbiddenException(
          'Este personal nunca trabajó en tu sede; no puedes ver su historial.',
        );
      }
    }

    const transferencias = await this.prisma.transferenciaPersonal.findMany({
      where: { personalId },
      orderBy: { fechaEfectiva: 'asc' },
      include: {
        desdeSede: { select: { id: true, nombre: true } },
        hastaSede: { select: { id: true, nombre: true } },
        transferidoPor: {
          select: { id: true, nombre: true, username: true },
        },
      },
    });

    // Si no hay usuario vinculado, no podemos agregar métricas
    if (!personal.usuarioId) {
      return {
        personal,
        transferencias,
        porSede: [],
        totales: { ventas: 0, alquileres: 0, ingresos: 0, turnosCerrados: 0 },
      };
    }

    // Recopilar todas las sedes donde el usuario haya estado:
    // su sede base, transferencias, y las sedes de acceso multisede.
    const sedesIdsSet = new Set<number>();
    if (personal.sedeId) sedesIdsSet.add(personal.sedeId);
    for (const t of transferencias) {
      if (t.desdeSedeId) sedesIdsSet.add(t.desdeSedeId);
      sedesIdsSet.add(t.hastaSedeId);
    }
    const accesoMultisede = await this.prisma.usuarioSede.findMany({
      where: { usuarioId: personal.usuarioId },
      select: { sedeId: true },
    });
    for (const a of accesoMultisede) sedesIdsSet.add(a.sedeId);
    const sedesIds = Array.from(sedesIdsSet);

    const sedes = await this.prisma.sede.findMany({
      where: { id: { in: sedesIds } },
      select: { id: true, nombre: true },
    });

    const porSede: any[] = [];
    let totalVentas = 0;
    let totalAlquileres = 0;
    let totalIngresos = 0;
    let totalTurnos = 0;

    for (const sede of sedes) {
      const [ventas, alquileres, turnos] = await Promise.all([
        this.prisma.venta.findMany({
          where: {
            sedeId: sede.id,
            usuarioId: personal.usuarioId,
            estado: 'ACTIVA',
          },
          select: { total: true },
        }),
        this.prisma.alquiler.findMany({
          where: {
            sedeId: sede.id,
            creadoPorId: personal.usuarioId,
            estado: { not: 'ANULADO' },
          },
          select: { total: true, montoPagado: true },
        }),
        this.prisma.turnoCaja.count({
          where: {
            sedeId: sede.id,
            usuarioId: personal.usuarioId,
            estado: 'CERRADO',
          },
        }),
      ]);

      const sumaVentas = ventas.reduce((s, v) => s + Number(v.total), 0);
      const sumaAlquileres = alquileres.reduce(
        (s, a) => s + Number(a.total),
        0,
      );
      porSede.push({
        sede,
        ventas: { cantidad: ventas.length, total: sumaVentas },
        alquileres: { cantidad: alquileres.length, total: sumaAlquileres },
        turnosCerrados: turnos,
        ingresoTotal: sumaVentas + sumaAlquileres,
      });
      totalVentas += ventas.length;
      totalAlquileres += alquileres.length;
      totalIngresos += sumaVentas + sumaAlquileres;
      totalTurnos += turnos;
    }

    // Ordenar sedes por sede actual primero, después por ingreso
    porSede.sort((a, b) => {
      if (a.sede.id === personal.sedeId) return -1;
      if (b.sede.id === personal.sedeId) return 1;
      return b.ingresoTotal - a.ingresoTotal;
    });

    return {
      personal,
      transferencias,
      porSede,
      totales: {
        ventas: totalVentas,
        alquileres: totalAlquileres,
        ingresos: totalIngresos,
        turnosCerrados: totalTurnos,
      },
    };
  }
}
