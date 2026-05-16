import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoHabitacion,
  EstadoTareaLimpieza,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';
import { EventsGateway } from '../events/events.gateway';
import {
  AsignarTareaDto,
  CompletarTareaDto,
  CreateTareaDto,
  RegistrarUsoProductoDto,
} from './limpieza.dto';

@Injectable()
export class LimpiezaService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  findAll(
    user: JwtPayload,
    sedeIdQuery?: number,
    estado?: EstadoTareaLimpieza,
  ) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const where: any = { sedeId, ...(estado ? { estado } : {}) };
    // Cualquier limpiadora ve TODAS las tareas de su sede — la auto-
    // asignación queda como hint visual (campo `asignadaA`), pero
    // cualquier limpiadora puede tomarlas. El filtro por sede ya está
    // arriba con resolveSedeId(), que para LIMPIEZA usa su sedeId fijo.
    return this.prisma.tareaLimpieza.findMany({
      where,
      include: {
        habitacion: { include: { piso: true } },
        asignadaA: { select: { id: true, nombre: true, username: true } },
        fotos: true,
        productosUsados: { include: { producto: true } },
      },
      orderBy: { creadaEn: 'desc' },
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const t = await this.prisma.tareaLimpieza.findUnique({
      where: { id },
      include: {
        habitacion: { include: { piso: true } },
        asignadaA: { select: { id: true, nombre: true, username: true } },
        fotos: true,
        productosUsados: { include: { producto: true } },
      },
    });
    if (!t) throw new NotFoundException('Tarea no encontrada');
    // Solo se requiere pertenecer a la misma sede. Cualquier limpiadora
    // de la sede puede ver/operar cualquier tarea — la asignación es
    // solo una sugerencia inicial del sistema.
    enforceSede(user, t.sedeId);
    return t;
  }

  async create(dto: CreateTareaDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    const hab = await this.prisma.habitacion.findUnique({
      where: { id: dto.habitacionId },
    });
    if (!hab || hab.sedeId !== sedeId)
      throw new BadRequestException('Habitación inválida');

    return this.prisma.tareaLimpieza.create({
      data: {
        sedeId,
        habitacionId: hab.id,
        asignadaAId: dto.asignadaAId,
        notas: dto.notas,
      },
    });
  }

  async asignar(id: number, dto: AsignarTareaDto, user: JwtPayload) {
    const t = await this.findOne(id, user);
    if (t.estado !== EstadoTareaLimpieza.PENDIENTE)
      throw new BadRequestException('Solo se puede reasignar si está PENDIENTE');
    return this.prisma.tareaLimpieza.update({
      where: { id: t.id },
      data: { asignadaAId: dto.asignadaAId },
    });
  }

  async iniciar(id: number, user: JwtPayload) {
    const t = await this.findOne(id, user);

    // Idempotente: si ya está EN_PROCESO y la tiene el mismo usuario,
    // devuelve el estado actual (así cliente con cache viejo no se rompe).
    if (t.estado === EstadoTareaLimpieza.EN_PROCESO) {
      if (t.asignadaAId === user.sub) return t;
      throw new BadRequestException(
        `${t.asignadaA?.nombre || 'Otro usuario'} ya está limpiando esta habitación`,
      );
    }

    if (t.estado === EstadoTareaLimpieza.COMPLETADA)
      throw new BadRequestException('Esta tarea ya fue completada');

    if (t.estado === EstadoTareaLimpieza.CANCELADA)
      throw new BadRequestException('Esta tarea fue cancelada');

    if (t.estado !== EstadoTareaLimpieza.PENDIENTE)
      throw new BadRequestException('Tarea no está pendiente');

    // Quien la inicia se vuelve la dueña real de la tarea — aunque el
    // sistema haya pre-asignado a otra limpiadora al crearla, la persona
    // que efectivamente la trabaja es la que aparece como asignada.
    const dataToUpdate: any = {
      estado: EstadoTareaLimpieza.EN_PROCESO,
      iniciadaEn: new Date(),
      asignadaAId: user.sub,
    };

    await this.prisma.tareaLimpieza.update({
      where: { id: t.id },
      data: dataToUpdate,
    });

    // Devuelve la tarea completa (con piso, fotos, productos) para que
    // el cliente móvil/web pueda deserializar sin errores de schema.
    const actualizada = await this.findOne(id, user);

    this.events.emitToSede(t.sedeId, 'limpieza:iniciada', {
      tareaId: actualizada.id,
      habitacionNumero: actualizada.habitacion.numero,
      porUsuario: actualizada.asignadaA?.nombre || user.username,
    });

    return actualizada;
  }

  async subirFotos(id: number, files: Express.Multer.File[], user: JwtPayload) {
    const t = await this.findOne(id, user);
    if (!files?.length) throw new BadRequestException('No hay archivos');

    await this.prisma.fotoLimpieza.createMany({
      data: files.map((f) => ({
        tareaId: t.id,
        path: `/uploads/limpieza/${f.filename}`,
      })),
    });
    const actualizada = await this.findOne(id, user);

    this.events.emitToSede(t.sedeId, 'limpieza:fotos', {
      tareaId: t.id,
      habitacionNumero: t.habitacion.numero,
      porUsuario: actualizada.asignadaA?.nombre || user.username,
      cantidadFotos: files.length,
      totalFotos: actualizada.fotos.length,
    });

    return actualizada;
  }

  async registrarUso(
    id: number,
    dto: RegistrarUsoProductoDto,
    user: JwtPayload,
  ) {
    const t = await this.findOne(id, user);
    const producto = await this.prisma.productoLimpieza.findUnique({
      where: { id: dto.productoId },
    });
    if (!producto || producto.sedeId !== t.sedeId)
      throw new BadRequestException('Producto inválido');
    if (producto.stock < dto.cantidad)
      throw new BadRequestException('Stock insuficiente');

    return this.prisma.$transaction(async (tx) => {
      const uso = await tx.usoProductoLimpieza.create({
        data: {
          tareaId: t.id,
          productoId: producto.id,
          cantidad: dto.cantidad,
        },
        // Incluye el producto para que el cliente pueda mostrar nombre + unidad
        include: { producto: true },
      });
      // Bug fix: decrement atómico con guard para evitar stock negativo en
      // carrera (dos limpiadoras consumiendo el mismo producto a la vez).
      const updated = await tx.productoLimpieza.updateMany({
        where: { id: producto.id, stock: { gte: dto.cantidad } },
        data: { stock: { decrement: dto.cantidad } },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          `Stock insuficiente para "${producto.nombre}" (otra persona acaba de consumirlo)`,
        );
      }
      return uso;
    });
  }

  async completar(id: number, dto: CompletarTareaDto, user: JwtPayload) {
    const t = await this.findOne(id, user);
    if (t.estado === EstadoTareaLimpieza.COMPLETADA)
      throw new BadRequestException('Ya completada');
    if (!t.fotos.length)
      throw new BadRequestException('Debes subir al menos una foto de evidencia');

    // Si la limpiadora seleccionó implementos para llevar a lavandería,
    // los validamos antes de la transacción para no abortar a mitad.
    const unidadesIds = dto?.unidadesALavanderia ?? [];
    if (unidadesIds.length > 0) {
      const unidades = await this.prisma.implementoUnidad.findMany({
        where: { id: { in: unidadesIds }, habitacionId: t.habitacionId },
      });
      if (unidades.length !== unidadesIds.length) {
        throw new BadRequestException(
          'Algunos implementos no existen o no pertenecen a esta habitación',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tareaLimpieza.update({
        where: { id: t.id },
        data: {
          estado: EstadoTareaLimpieza.COMPLETADA,
          completadaEn: new Date(),
          notas: dto?.notas ?? t.notas,
        },
      });
      await tx.habitacion.update({
        where: { id: t.habitacionId },
        data: { estado: EstadoHabitacion.DISPONIBLE },
      });

      // Mover los implementos marcados a EN_LAVANDERIA + registrar
      // movimientos para auditoría. La habitación queda con menos
      // implementos hasta que el admin confirme el retorno.
      for (const unidadId of unidadesIds) {
        const unidad = await tx.implementoUnidad.findUnique({
          where: { id: unidadId },
        });
        if (!unidad) continue;
        await tx.implementoUnidad.update({
          where: { id: unidadId },
          data: { estado: 'EN_LAVANDERIA' },
        });
        await tx.movimientoImplemento.create({
          data: {
            unidadId,
            estadoAnterior: unidad.estado,
            estadoNuevo: 'EN_LAVANDERIA',
            usuarioId: user.sub,
            tareaLimpiezaId: t.id,
          },
        });
      }
    });

    // Devuelve la tarea completa (con piso, fotos, productos) para el cliente
    const actualizada = await this.findOne(id, user);

    this.events.emitToSede(t.sedeId, 'limpieza:completada', {
      tareaId: t.id,
      habitacionNumero: t.habitacion.numero,
      porUsuario: t.asignadaA?.nombre || user.username,
    });

    return actualizada;
  }
}
