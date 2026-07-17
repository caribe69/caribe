import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EstadoAlquiler } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resuelve el alcance de sedes:
   * - SUPERADMIN sin sedeId  → todas las sedes (null)
   * - SUPERADMIN con sedeId  → esa sede (+ sus edificios si es agrupador)
   * - ADMIN_SEDE             → su sede (+ edificios si es agrupador)
   */
  private async scopeSedeIds(
    user: JwtPayload,
    sedeIdQuery?: number,
  ): Promise<number[] | null> {
    if (user.rol === 'SUPERADMIN') {
      if (!sedeIdQuery) return null;
      return this.expandir(sedeIdQuery);
    }
    if (!user.sedeId) throw new ForbiddenException('Usuario sin sede asignada');
    return this.expandir(user.sedeId);
  }

  private async expandir(sedeId: number): Promise<number[]> {
    const edificios = await this.prisma.sede.findMany({
      where: { sedePadreId: sedeId },
      select: { id: true },
    });
    return edificios.length > 0
      ? [sedeId, ...edificios.map((e) => e.id)]
      : [sedeId];
  }

  private whereSede(sedeIds: number[] | null) {
    return sedeIds ? { sedeId: { in: sedeIds } } : {};
  }

  /**
   * Busca clientes por DNI o nombre (parcial). Agrega las estancias por
   * cliente: nº de visitas, total gastado, última visita.
   */
  async buscar(user: JwtPayload, q: string, sedeIdQuery?: number) {
    const termino = (q || '').trim();
    if (termino.length < 2)
      throw new BadRequestException('Escribe al menos 2 caracteres');

    const sedeIds = await this.scopeSedeIds(user, sedeIdQuery);

    const alquileres = await this.prisma.alquiler.findMany({
      where: {
        ...this.whereSede(sedeIds),
        estado: { not: EstadoAlquiler.ANULADO },
        OR: [
          { clienteDni: { contains: termino } },
          { clienteNombre: { contains: termino, mode: 'insensitive' } },
        ],
      },
      orderBy: { creadoEn: 'desc' },
      select: {
        clienteDni: true,
        clienteNombre: true,
        clienteTelefono: true,
        total: true,
        creadoEn: true,
      },
      take: 800,
    });

    // Agrupa por DNI
    const map = new Map<
      string,
      {
        dni: string;
        nombre: string;
        telefono: string | null;
        visitas: number;
        totalGastado: number;
        ultimaVisita: Date;
      }
    >();
    for (const a of alquileres) {
      const cur = map.get(a.clienteDni);
      if (cur) {
        cur.visitas += 1;
        cur.totalGastado += Number(a.total);
        // el primero (más reciente) ya fijó nombre/última visita
      } else {
        map.set(a.clienteDni, {
          dni: a.clienteDni,
          nombre: a.clienteNombre,
          telefono: a.clienteTelefono,
          visitas: 1,
          totalGastado: Number(a.total),
          ultimaVisita: a.creadoEn,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.ultimaVisita.getTime() - a.ultimaVisita.getTime())
      .slice(0, 40)
      .map((c) => ({ ...c, totalGastado: Number(c.totalGastado.toFixed(2)) }));
  }

  /**
   * Detalle de un cliente: resumen + todas sus estancias (con hora de
   * ingreso, salida real/prevista, habitación, sede, monto y estado).
   */
  async detalle(user: JwtPayload, dni: string, sedeIdQuery?: number) {
    if (!dni) throw new BadRequestException('DNI requerido');
    const sedeIds = await this.scopeSedeIds(user, sedeIdQuery);

    const estancias = await this.prisma.alquiler.findMany({
      where: {
        ...this.whereSede(sedeIds),
        clienteDni: dni,
        estado: { not: EstadoAlquiler.ANULADO },
      },
      orderBy: { fechaIngreso: 'desc' },
      select: {
        id: true,
        fechaIngreso: true,
        fechaSalida: true,
        fechaSalidaReal: true,
        creadoEn: true,
        total: true,
        precioHabitacion: true,
        totalProductos: true,
        estado: true,
        pagado: true,
        clienteNombre: true,
        clienteTelefono: true,
        sede: { select: { id: true, nombre: true } },
        habitacion: {
          select: { numero: true, piso: { select: { numero: true } } },
        },
      },
    });

    if (estancias.length === 0) {
      return {
        encontrado: false,
        dni,
        resumen: null,
        estancias: [],
      };
    }

    const totalGastado = estancias.reduce((s, e) => s + Number(e.total), 0);
    const reciente = estancias[0];
    const primera = estancias[estancias.length - 1];

    return {
      encontrado: true,
      dni,
      resumen: {
        nombre: reciente.clienteNombre,
        telefono: reciente.clienteTelefono,
        visitas: estancias.length,
        totalGastado: Number(totalGastado.toFixed(2)),
        primeraVisita: primera.fechaIngreso,
        ultimaVisita: reciente.fechaIngreso,
        activas: estancias.filter((e) => e.estado === EstadoAlquiler.ACTIVO)
          .length,
      },
      estancias: estancias.map((e) => ({
        id: e.id,
        fechaIngreso: e.fechaIngreso,
        fechaSalida: e.fechaSalida,
        fechaSalidaReal: e.fechaSalidaReal,
        creadoEn: e.creadoEn,
        total: Number(e.total),
        precioHabitacion: Number(e.precioHabitacion),
        totalProductos: Number(e.totalProductos),
        estado: e.estado,
        pagado: e.pagado,
        sedeNombre: e.sede.nombre,
        habitacionNumero: e.habitacion.numero,
        pisoNumero: e.habitacion.piso.numero,
      })),
    };
  }
}
