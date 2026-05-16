import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { TipoComprobanteSerie } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SunatSeriesService } from './sunat-series.service';

type TipoComprobanteNF = 1 | 2 | 3 | 4 | 7 | 8;

export interface NubeFactResponse {
  tipo_de_comprobante?: number;
  serie?: string;
  numero?: number;
  enlace?: string;
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
  aceptada_por_sunat?: boolean;
  sunat_description?: string | null;
  sunat_note?: string | null;
  sunat_responsecode?: string | null;
  sunat_soap_error?: string | null;
  cadena_para_codigo_qr?: string;
  codigo_hash?: string;
  anulado?: boolean;
  errors?: string;
  codigo?: number;
  [k: string]: any;
}

interface EmitirOpts {
  /** Si true, fuerza la emisión incluso si ya fue emitido (default false). */
  forzar?: boolean;
  /** Override de número (si no, se autocalcula MAX+1 por serie). */
  numeroOverride?: number;
}

@Injectable()
export class NubeFactService {
  private readonly log = new Logger(NubeFactService.name);
  constructor(
    private prisma: PrismaService,
    private sunatSeries: SunatSeriesService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Lectura de configuración (única fila id=1 en AppConfig)
  // ─────────────────────────────────────────────────────────
  private async getConfig() {
    const cfg = await this.prisma.appConfig.findUnique({ where: { id: 1 } });
    if (!cfg)
      throw new ServiceUnavailableException(
        'AppConfig no inicializado; abre /configuracion una vez antes.',
      );
    if (!cfg.nubefactRuta || !cfg.nubefactToken)
      throw new BadRequestException(
        'NubeFact no está configurado. Carga la ruta y el token en Configuración → Facturación electrónica.',
      );
    return cfg;
  }

  /** Solo verifica config existente, sin llamar al API. */
  async getStatus() {
    const cfg = await this.prisma.appConfig.findUnique({ where: { id: 1 } });
    return {
      configured: !!(cfg?.nubefactRuta && cfg?.nubefactToken),
      ruta: cfg?.nubefactRuta ? mask(cfg.nubefactRuta) : null,
      hasToken: !!cfg?.nubefactToken,
      serieFactura: cfg?.nubefactSerieFactura ?? 'F001',
      serieBoleta: cfg?.nubefactSerieBoleta ?? 'B001',
      igvHospedaje: cfg?.nubefactIgvHospedaje?.toString() ?? '10.5',
      igvProductos: cfg?.nubefactIgvProductos?.toString() ?? '18',
    };
  }

  // ─────────────────────────────────────────────────────────
  // POST genérico al endpoint NubeFact
  // ─────────────────────────────────────────────────────────
  private async post(body: any): Promise<NubeFactResponse> {
    const cfg = await this.getConfig();
    try {
      const res = await axios.post<NubeFactResponse>(cfg.nubefactRuta!, body, {
        headers: {
          Authorization: cfg.nubefactToken!,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      });
      return res.data;
    } catch (err) {
      const e = err as AxiosError<NubeFactResponse>;
      // Si NubeFact devuelve un error con cuerpo (4xx con `errors`), lo regresamos
      if (e.response?.data) {
        return e.response.data;
      }
      this.log.error(`NubeFact request falló: ${e.message}`);
      throw new ServiceUnavailableException(
        `No se pudo conectar con NubeFact: ${e.message}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // Test de conexión: hace un consultar_comprobante a un serie/numero
  // ficticio (B001-9999999). Si responde con error 24 (doc no existe)
  // significa que las credenciales son válidas.
  // ─────────────────────────────────────────────────────────
  async testConexion(): Promise<{
    ok: boolean;
    mensaje: string;
    raw?: NubeFactResponse;
  }> {
    const r = await this.post({
      operacion: 'consultar_comprobante',
      tipo_de_comprobante: 2,
      serie: 'TEST',
      numero: 99999999,
    });
    if (r.errors) {
      // Códigos 24 (doc no existe) o 20 (formato) son "buenos" — significa que auth pasó
      if (r.codigo === 24 || r.codigo === 20) {
        return {
          ok: true,
          mensaje:
            'Conexión OK. Credenciales válidas (NubeFact respondió como esperado a una consulta ficticia).',
          raw: r,
        };
      }
      // Códigos 10/11/12/50/51 son problemas reales
      return {
        ok: false,
        mensaje: `NubeFact rechazó la conexión (código ${r.codigo}): ${r.errors}`,
        raw: r,
      };
    }
    return { ok: true, mensaje: 'Conexión OK', raw: r };
  }

  // ─────────────────────────────────────────────────────────
  // Calcula el próximo número correlativo para una serie.
  // Toma el MAX(sunatNumero) de Alquiler y Venta con esa serie + 1.
  // ─────────────────────────────────────────────────────────
  async proximoNumero(serie: string): Promise<number> {
    const [maxAlq, maxVen] = await Promise.all([
      this.prisma.alquiler.aggregate({
        where: { sunatSerie: serie },
        _max: { sunatNumero: true },
      }),
      this.prisma.venta.aggregate({
        where: { sunatSerie: serie },
        _max: { sunatNumero: true },
      }),
    ]);
    const max = Math.max(maxAlq._max.sunatNumero ?? 0, maxVen._max.sunatNumero ?? 0);
    return max + 1;
  }

  // ─────────────────────────────────────────────────────────
  // Construir JSON para un Alquiler (boleta o factura)
  // ─────────────────────────────────────────────────────────
  private async mapAlquilerToComprobante(
    alquilerId: number,
    opts: EmitirOpts,
  ) {
    const alquiler = await this.prisma.alquiler.findUnique({
      where: { id: alquilerId },
      include: {
        habitacion: true,
        consumos: { include: { producto: true } },
        sede: true,
      },
    });
    if (!alquiler) throw new NotFoundException('Alquiler no encontrado');
    if (!opts.forzar && alquiler.sunatEmitido)
      throw new BadRequestException(
        `Este alquiler ya tiene comprobante emitido: ${alquiler.sunatSerie}-${alquiler.sunatNumero}. Usa forzar=true para reemitir.`,
      );

    const cfg = await this.getConfig();
    const esFactura = alquiler.tipoComprobante === 'FACTURA';
    const tipo: 1 | 2 = esFactura ? 1 : 2;

    // Serie + número provienen de SunatSerie por SEDE (incremento atómico).
    // Si opts.numeroOverride viene seteado (re-emisión), respetamos esa serie
    // y número exactos sin reservar nada nuevo.
    const tipoSerie: TipoComprobanteSerie = esFactura ? 'FACTURA' : 'BOLETA';
    let serie: string;
    let numero: number;
    let serieId: number | null = null;
    if (opts.numeroOverride != null) {
      if (!alquiler.sunatSerie)
        throw new BadRequestException(
          'No se puede re-emitir con un número específico si el alquiler no tiene serie previa.',
        );
      serie = alquiler.sunatSerie;
      numero = opts.numeroOverride;
    } else {
      const reservado = await this.sunatSeries.reservarSiguiente(
        alquiler.sedeId!,
        tipoSerie,
      );
      serie = reservado.serie;
      numero = reservado.numero;
      serieId = reservado.serieId;
    }

    // IGV: 10.5% habitación (hospedaje) · 18% productos
    const igvHospedajePct = Number(cfg.nubefactIgvHospedaje);
    const igvProductosPct = Number(cfg.nubefactIgvProductos);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // IMPORTANTE: el comprobante SOLO incluye el precio de la
    // habitación (alojamiento). Los consumos de productos NO se
    // emiten en la boleta/factura — son gasto interno del hotel.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    void igvProductosPct; // dejado por si se quiere reactivar productos

    const items: any[] = [];
    const precioHab = Number(alquiler.precioHabitacion);
    if (precioHab <= 0) {
      throw new BadRequestException(
        'El precio de la habitación debe ser mayor a 0 para emitir un comprobante.',
      );
    }
    const valorUnitario = precioHab / (1 + igvHospedajePct / 100);
    const igvHab = precioHab - valorUnitario;
    items.push({
      unidad_de_medida: 'ZZ',
      codigo: 'HOSP',
      codigo_producto_sunat: '90111500', // alojamiento en hoteles (SUNAT)
      descripcion: `ALOJAMIENTO ${(alquiler.habitacion.descripcion || 'HABITACION').toUpperCase()} Nº ${alquiler.habitacion.numero}`,
      cantidad: 1,
      valor_unitario: round2(valorUnitario),
      precio_unitario: round2(precioHab),
      descuento: '',
      subtotal: round2(valorUnitario),
      tipo_de_igv: 1,
      igv: round2(igvHab),
      total: round2(precioHab),
      anticipo_regularizacion: false,
    });

    // Totales agregados (solo habitación)
    const totalGravada = items.reduce((s, i) => s + i.subtotal, 0);
    const totalIgv = items.reduce((s, i) => s + i.igv, 0);
    const total = items.reduce((s, i) => s + i.total, 0);

    const body: any = {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: tipo,
      serie,
      numero,
      sunat_transaction: 1, // venta interna
      cliente_tipo_de_documento: esFactura ? 6 : 1, // 6=RUC, 1=DNI
      cliente_numero_de_documento: esFactura
        ? alquiler.clienteRuc || '00000000000'
        : alquiler.clienteDni || '00000000',
      cliente_denominacion: esFactura
        ? (alquiler.clienteRazonSocial || alquiler.clienteNombre).toUpperCase()
        : alquiler.clienteNombre.toUpperCase(),
      cliente_direccion: esFactura
        ? alquiler.clienteDireccionFiscal || alquiler.sede.direccion || '-'
        : alquiler.sede.direccion || '-',
      cliente_email: '',
      fecha_de_emision: formatDateDDMMYYYY(new Date()),
      moneda: 1, // PEN
      porcentaje_de_igv: igvHospedajePct,
      total_gravada: round2(totalGravada),
      total_igv: round2(totalIgv),
      total: round2(total),
      enviar_automaticamente_a_la_sunat: true,
      enviar_automaticamente_al_cliente: false,
      medio_de_pago: alquiler.metodoPago,
      condiciones_de_pago: 'CONTADO',
      formato_de_pdf: 'TICKET',
      items,
    };

    return {
      body,
      tipo,
      serie,
      numero,
      serieId,
      sedeId: alquiler.sedeId!,
      tipoSerie,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Emitir comprobante para un Alquiler (no se llama automático;
  // se llama desde un endpoint cuando el usuario quiera)
  // ─────────────────────────────────────────────────────────
  async emitirDesdeAlquiler(alquilerId: number, opts: EmitirOpts = {}) {
    let { body, serie, numero, tipo, serieId, sedeId, tipoSerie } =
      await this.mapAlquilerToComprobante(alquilerId, opts);

    // Hasta 10 reintentos avanzando correlativo si NubeFact dice "ya existe"
    // (código 23). Esto cubre el caso donde el correlativo local quedó
    // desincronizado respecto a NubeFact (porque hubo emisiones previas
    // fuera del sistema, o porque se cambió la serie a una que ya tenía
    // documentos en la nube).
    let resp = await this.post(body);
    let intentos = 0;
    while (
      resp.errors &&
      resp.codigo === 23 &&
      intentos < 10 &&
      serieId &&
      opts.numeroOverride == null
    ) {
      intentos++;
      const siguiente = await this.sunatSeries.reservarSiguiente(
        sedeId,
        tipoSerie,
        serie,
      );
      this.log.warn(
        `NubeFact código 23 para ${serie}-${numero}. Reintentando con ${serie}-${siguiente.numero} (intento ${intentos})`,
      );
      numero = siguiente.numero;
      body.numero = numero;
      resp = await this.post(body);
    }

    if (resp.errors && resp.codigo === 23 && opts.numeroOverride != null) {
      // Re-emisión explícita con número fijo → idempotencia clásica
      const consulta = await this.post({
        operacion: 'consultar_comprobante',
        tipo_de_comprobante: tipo,
        serie,
        numero,
      });
      await this.persistirEnAlquiler(alquilerId, serie, numero, consulta);
      return { ...consulta, _idempotent: true };
    }

    if (resp.errors) {
      // Persistir el intento fallido también (para debugging) sin marcar emitido
      await this.prisma.alquiler.update({
        where: { id: alquilerId },
        data: {
          sunatResponseCode: String(resp.codigo ?? ''),
          sunatDescripcion: resp.errors,
        },
      });
      throw new BadRequestException(
        `NubeFact rechazó tras ${intentos + 1} intento(s): [${resp.codigo}] ${resp.errors}`,
      );
    }

    await this.persistirEnAlquiler(alquilerId, serie, numero, resp);
    return resp;
  }

  private async persistirEnAlquiler(
    alquilerId: number,
    serie: string,
    numero: number,
    resp: NubeFactResponse,
  ) {
    await this.prisma.alquiler.update({
      where: { id: alquilerId },
      data: {
        sunatEmitido: true,
        sunatAceptada: resp.aceptada_por_sunat ?? null,
        sunatSerie: serie,
        sunatNumero: numero,
        sunatEnlace: resp.enlace ?? null,
        sunatEnlacePdf: resp.enlace_del_pdf ?? null,
        sunatEnlaceXml: resp.enlace_del_xml ?? null,
        sunatEnlaceCdr: resp.enlace_del_cdr ?? null,
        sunatHash: resp.codigo_hash ?? null,
        sunatQrCadena: resp.cadena_para_codigo_qr ?? null,
        sunatResponseCode: resp.sunat_responsecode ?? null,
        sunatDescripcion: resp.sunat_description ?? null,
        sunatEmitidoEn: new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // Emitir comprobante para una Venta directa (boleta solo, items productos)
  // ─────────────────────────────────────────────────────────
  async emitirDesdeVenta(ventaId: number, opts: EmitirOpts = {}) {
    const venta = await this.prisma.venta.findUnique({
      where: { id: ventaId },
      include: { items: { include: { producto: true } } },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (!opts.forzar && venta.sunatEmitido)
      throw new BadRequestException(
        `Esta venta ya tiene comprobante: ${venta.sunatSerie}-${venta.sunatNumero}.`,
      );

    const cfg = await this.getConfig();
    const tipo = 2; // boleta para ventas directas (rubro hotel, sin RUC)
    const tipoSerie: TipoComprobanteSerie = 'BOLETA';

    // Reservar serie + número de SunatSerie por sede
    let serie: string;
    let numero: number;
    let serieId: number | null = null;
    if (opts.numeroOverride != null) {
      serie = venta.sunatSerie || (cfg.nubefactSerieBoleta as string);
      numero = opts.numeroOverride;
    } else {
      const reservado = await this.sunatSeries.reservarSiguiente(
        venta.sedeId!,
        tipoSerie,
      );
      serie = reservado.serie;
      numero = reservado.numero;
      serieId = reservado.serieId;
    }
    const igvProductosPct = Number(cfg.nubefactIgvProductos);

    const items = venta.items.map((it) => {
      const sub = Number(it.subtotal);
      const total = sub * (1 + igvProductosPct / 100);
      const valorUnitarioSinIgv =
        Number(it.precioUnit) / (1 + igvProductosPct / 100);
      return {
        unidad_de_medida: 'NIU',
        codigo: String(it.producto.id),
        codigo_producto_sunat: '',
        descripcion: it.producto.nombre.toUpperCase(),
        cantidad: it.cantidad,
        valor_unitario: round2(valorUnitarioSinIgv),
        precio_unitario: round2(Number(it.precioUnit)),
        descuento: '',
        subtotal: round2(sub),
        tipo_de_igv: 1,
        igv: round2(total - sub),
        total: round2(total),
        anticipo_regularizacion: false,
      };
    });

    const totalGravada = items.reduce((s, i) => s + i.subtotal, 0);
    const totalIgv = items.reduce((s, i) => s + i.igv, 0);
    const total = items.reduce((s, i) => s + i.total, 0);

    const body: any = {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: tipo,
      serie,
      numero,
      sunat_transaction: 1,
      cliente_tipo_de_documento: '-',
      cliente_numero_de_documento: '00000000',
      cliente_denominacion: 'CLIENTES VARIOS',
      cliente_direccion: '-',
      fecha_de_emision: formatDateDDMMYYYY(new Date(venta.creadoEn)),
      moneda: 1,
      porcentaje_de_igv: igvProductosPct,
      total_gravada: round2(totalGravada),
      total_igv: round2(totalIgv),
      total: round2(total),
      enviar_automaticamente_a_la_sunat: true,
      enviar_automaticamente_al_cliente: false,
      medio_de_pago: venta.metodoPago,
      condiciones_de_pago: 'CONTADO',
      formato_de_pdf: 'TICKET',
      items,
    };

    let resp = await this.post(body);
    let intentos = 0;
    while (
      resp.errors &&
      resp.codigo === 23 &&
      intentos < 10 &&
      serieId &&
      opts.numeroOverride == null
    ) {
      intentos++;
      const siguiente = await this.sunatSeries.reservarSiguiente(
        venta.sedeId!,
        tipoSerie,
        serie,
      );
      this.log.warn(
        `NubeFact código 23 venta para ${serie}-${numero}. Reintentando con ${serie}-${siguiente.numero} (intento ${intentos})`,
      );
      numero = siguiente.numero;
      body.numero = numero;
      resp = await this.post(body);
    }

    if (resp.errors && resp.codigo === 23 && opts.numeroOverride != null) {
      const consulta = await this.post({
        operacion: 'consultar_comprobante',
        tipo_de_comprobante: tipo,
        serie,
        numero,
      });
      await this.persistirEnVenta(ventaId, serie, numero, consulta);
      return { ...consulta, _idempotent: true };
    }
    if (resp.errors) {
      await this.prisma.venta.update({
        where: { id: ventaId },
        data: {
          sunatResponseCode: String(resp.codigo ?? ''),
          sunatDescripcion: resp.errors,
        },
      });
      throw new BadRequestException(
        `NubeFact rechazó tras ${intentos + 1} intento(s): [${resp.codigo}] ${resp.errors}`,
      );
    }

    await this.persistirEnVenta(ventaId, serie, numero, resp);
    return resp;
  }

  private async persistirEnVenta(
    ventaId: number,
    serie: string,
    numero: number,
    resp: NubeFactResponse,
  ) {
    await this.prisma.venta.update({
      where: { id: ventaId },
      data: {
        sunatEmitido: true,
        sunatAceptada: resp.aceptada_por_sunat ?? null,
        sunatSerie: serie,
        sunatNumero: numero,
        sunatEnlace: resp.enlace ?? null,
        sunatEnlacePdf: resp.enlace_del_pdf ?? null,
        sunatEnlaceXml: resp.enlace_del_xml ?? null,
        sunatEnlaceCdr: resp.enlace_del_cdr ?? null,
        sunatHash: resp.codigo_hash ?? null,
        sunatQrCadena: resp.cadena_para_codigo_qr ?? null,
        sunatResponseCode: resp.sunat_responsecode ?? null,
        sunatDescripcion: resp.sunat_description ?? null,
        sunatEmitidoEn: new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // Consultar comprobante por serie/numero (sin tocar DB)
  // ─────────────────────────────────────────────────────────
  async consultarComprobante(
    tipo: TipoComprobanteNF,
    serie: string,
    numero: number,
  ): Promise<NubeFactResponse> {
    return this.post({
      operacion: 'consultar_comprobante',
      tipo_de_comprobante: tipo,
      serie,
      numero,
    });
  }

  // ─────────────────────────────────────────────────────────
  // Anular (comunicación de baja)
  // ─────────────────────────────────────────────────────────
  async anularComprobante(
    tipo: TipoComprobanteNF,
    serie: string,
    numero: number,
    motivo: string,
  ): Promise<NubeFactResponse> {
    if (!motivo || motivo.trim().length < 3)
      throw new BadRequestException('Motivo de anulación es obligatorio');
    return this.post({
      operacion: 'generar_anulacion',
      tipo_de_comprobante: tipo,
      serie,
      numero,
      motivo,
    });
  }

  async consultarAnulacion(
    tipo: TipoComprobanteNF,
    serie: string,
    numero: number,
  ): Promise<NubeFactResponse> {
    return this.post({
      operacion: 'consultar_anulacion',
      tipo_de_comprobante: tipo,
      serie,
      numero,
    });
  }

  /** Marca un alquiler/venta como anulado en SUNAT (luego de que la baja sea aceptada). */
  async marcarAlquilerAnulado(alquilerId: number) {
    return this.prisma.alquiler.update({
      where: { id: alquilerId },
      data: { sunatAnulada: true, sunatAnuladaEn: new Date() },
    });
  }
  async marcarVentaAnulada(ventaId: number) {
    return this.prisma.venta.update({
      where: { id: ventaId },
      data: { sunatAnulada: true, sunatAnuladaEn: new Date() },
    });
  }
}

// ─── helpers ─────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatDateDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function mask(s: string): string {
  if (s.length <= 16) return '***';
  return s.slice(0, 12) + '…' + s.slice(-4);
}
