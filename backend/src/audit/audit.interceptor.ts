import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

/**
 * Intercepta TODAS las requests HTTP y las loguea en audit_log
 * cuando son mutaciones (POST/PATCH/PUT/DELETE) sobre usuarios autenticados.
 * No loguea GETs (saturaría) ni endpoints ruidosos.
 */
const SKIP_PATHS: RegExp[] = [
  /^\/api\/chat\/.*$/,       // chat es muy ruidoso
  /^\/api\/events\/.*$/,
  /^\/api\/public\/.*$/,     // público, no necesita auditar
];

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();

    const method: string = req.method;
    const fullPath: string =
      (req.originalUrl || req.url || '').split('?')[0] || '';

    // Solo mutaciones
    if (!MUTATING_METHODS.has(method)) return next.handle();
    // Skip rutas ruidosas
    if (SKIP_PATHS.some((r) => r.test(fullPath))) return next.handle();

    const start = Date.now();
    const ip = extractIp(req);
    const ua = String(req.headers['user-agent'] || '').slice(0, 300);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const user = req.user; // jwt payload inyectado
          const duracionMs = Date.now() - start;
          const accion = resolveAccion(method);
          const { recurso, recursoId } = resolveRecurso(fullPath, data, req.body);
          this.audit.record({
            usuarioId: user?.sub ?? null,
            username: user?.username ?? null,
            rol: user?.rol ?? null,
            sedeId: user?.sedeId ?? null,
            accion,
            recurso,
            recursoId,
            metodo: method,
            path: fullPath.slice(0, 400),
            ip,
            userAgent: ua,
            detalle: summarizeBody(req.body),
            ok: true,
            statusCode: res.statusCode ?? null,
            duracionMs,
          });
        },
        error: (err) => {
          const user = req.user;
          const duracionMs = Date.now() - start;
          const status =
            (err?.status as number) || (err?.response?.statusCode as number) || 500;
          this.audit.record({
            usuarioId: user?.sub ?? null,
            username: user?.username ?? null,
            rol: user?.rol ?? null,
            sedeId: user?.sedeId ?? null,
            accion: resolveAccion(method),
            recurso: resolveRecurso(fullPath, null, req.body).recurso,
            metodo: method,
            path: fullPath.slice(0, 400),
            ip,
            userAgent: ua,
            detalle: {
              body: summarizeBody(req.body),
              error: err?.message || String(err),
            },
            ok: false,
            statusCode: status,
            duracionMs,
          });
        },
      }),
    );
  }
}

function extractIp(req: any): string {
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  const real = req.headers?.['x-real-ip'];
  if (real) return String(real);
  return (
    req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '—'
  ).replace('::ffff:', '');
}

function resolveAccion(method: string): string {
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PATCH':
    case 'PUT':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return method;
  }
}

function resolveRecurso(
  path: string,
  responseData?: any,
  body?: any,
): { recurso: string | null; recursoId: string | null } {
  // /api/alquileres/123/pago-parcial → recurso=alquileres, recursoId=123
  const m = path.match(/^\/api\/([a-z0-9-]+)(?:\/([^\/?]+))?/i);
  if (!m) return { recurso: null, recursoId: null };
  const recurso = m[1] || null;
  let recursoId = m[2] || null;
  // Si es un POST /api/xyz sin id en path, intenta sacar id del response
  if (!recursoId && responseData && typeof responseData === 'object') {
    if (typeof responseData.id === 'number' || typeof responseData.id === 'string') {
      recursoId = String(responseData.id);
    }
  }
  // Body override
  if (!recursoId && body && typeof body.id !== 'undefined') {
    recursoId = String(body.id);
  }
  return { recurso, recursoId };
}

/** Filtra campos sensibles del body antes de guardar */
function summarizeBody(body: any): any {
  if (!body || typeof body !== 'object') return null;
  const SENSITIVE = [
    'password',
    'passwordHash',
    'currentPassword',
    'newPassword',
    'apiDniToken',
    'apiRucToken',
  ];
  const clone: any = Array.isArray(body) ? [...body] : { ...body };
  for (const k of Object.keys(clone)) {
    if (SENSITIVE.includes(k)) clone[k] = '***';
  }
  // No guardar bodies enormes (archivos base64)
  const s = JSON.stringify(clone);
  if (s.length > 4000) {
    return { _truncated: true, _length: s.length, sample: s.slice(0, 500) };
  }
  return clone;
}

export { extractIp };
