import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoHabitacion,
  EstadoTareaLimpieza,
  Rol,
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
    // LIMPIEZA ve sus tareas asignadas + las no asignadas (puede "tomarlas")
    if (user.rol === Rol.LIMPIEZA) {
      where.OR = [{ asignadaAId: user.sub }, { asignadaAId: null }];
    }
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
    enforceSede(user, t.sedeId);
    if (user.rol === Rol.LIMPIEZA && t.asignadaAId !== user.sub)
      throw new ForbiddenException('Tarea no asignada a ti');
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
    if (t.estado !== EstadoTareaLimpieza.PENDIENTE)
      throw new BadRequestException('Tarea no está pendiente');

    // Auto-claim: si la tarea no estaba asignada, se asigna al que inicia
    const dataToUpdate: any = {
      estado: EstadoTareaLimpieza.EN_PROCESO,
      iniciadaEn: new Date(),
    };
    if (!t.asignadaAId) dataToUpdate.asignadaAId = user.sub;

    const actualizada = await this.prisma.tareaLimpieza.update({
      where: { id: t.id },
      data: dataToUpdate,
      include: {
        habitacion: true,
        asignadaA: { select: { id: true, nombre: true, username: true } },
      },
    });

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
      });
      await tx.productoLimpieza.update({
        where: { id: producto.id },
        data: { stock: producto.stock - dto.cantidad },
      });
      return uso;
    });
  }

  async completar(id: number, dto: CompletarTareaDto, user: JwtPayload) {
    const t = await this.findOne(id, user);
    if (t.estado === EstadoTareaLimpieza.COMPLETADA)
      throw new BadRequestException('Ya completada');
    if (!t.fotos.length)
      throw new BadRequestException('Debes subir al menos una foto de evidencia');

    const resultado = await this.prisma.$transaction(async (tx) => {
      const act = await tx.tareaLimpieza.update({
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
      return act;
    });

    this.events.emitToSede(t.sedeId, 'limpieza:completada', {
      tareaId: t.id,
      habitacionNumero: t.habitacion.numero,
      porUsuario: t.asignadaA?.nombre || user.username,
    });

    return resultado;
  }
}
