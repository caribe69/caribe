/**
 * Sol Caribe · Agente de Impresión local
 * ------------------------------------------------------------------
 * Puente entre la web (navegador) y una impresora de la PC.
 * - Corre en la propia PC del recepcionista (localhost).
 * - Sin dependencias: solo Node.js (módulos nativos).
 * - Interfaz web en http://localhost:9110 para elegir/guardar la
 *   impresora y hacer pruebas.
 * - La web envía los tickets a POST /api/print y el agente los manda
 *   a la impresora configurada (silencioso, sin diálogo).
 *
 * Windows: usa PowerShell (Get-Printer / Out-Printer) para listar e
 * imprimir. En otros sistemas usa `lp`/`lpstat` (CUPS) como respaldo.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.PRINT_AGENT_PORT || 9110);
const IS_WIN = process.platform === 'win32';
const CONFIG_PATH = path.join(__dirname, 'config.json');
const UI_PATH = path.join(__dirname, 'public', 'index.html');

// ── Estado / config persistida ────────────────────────────────────
const state = {
  version: '1.0.0',
  arrancadoEn: new Date().toISOString(),
  ultimos: [], // últimos trabajos (log en memoria)
};

function leerConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { impresora: null, copiasPorDefecto: 1 };
  }
}
function guardarConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}
function registrarTrabajo(entry) {
  state.ultimos.unshift({ ...entry, hora: new Date().toISOString() });
  state.ultimos = state.ultimos.slice(0, 30);
}

// ── Ejecutar PowerShell (o shell) devolviendo stdout ──────────────
function ps(comando) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', comando],
      { windowsHide: true, maxBuffer: 1024 * 1024 * 8 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(String(stdout || ''));
      },
    );
  });
}
function sh(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 8 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(String(stdout || ''));
    });
  });
}

// ── Listar impresoras ─────────────────────────────────────────────
async function listarImpresoras() {
  if (IS_WIN) {
    const out = await ps(
      'Get-Printer | Select-Object Name,PrinterStatus,Default,Type | ConvertTo-Json -Compress',
    );
    if (!out.trim()) return [];
    let data = JSON.parse(out);
    if (!Array.isArray(data)) data = [data];
    // PrinterStatus (Get-Printer) es numérico; lo mostramos legible.
    const ESTADOS = { 0: 'Lista', 1: 'Pausada', 2: 'Error', 3: 'En espera', 4: 'Ocupada', 5: 'Imprimiendo' };
    return data.map((p) => {
      const st = Number(p.PrinterStatus);
      return {
        nombre: p.Name,
        estado: ESTADOS[st] || (Number.isFinite(st) ? 'Lista' : String(p.PrinterStatus ?? '')),
        predeterminada: !!p.Default,
        tipo: '',
      };
    });
  }
  // Respaldo CUPS (Linux/Mac)
  const out = await sh('lpstat', ['-p']);
  return out
    .split('\n')
    .filter((l) => l.startsWith('printer '))
    .map((l) => ({ nombre: l.split(' ')[1], estado: '', predeterminada: false, tipo: '' }));
}

// ── Imprimir texto a una impresora por nombre ─────────────────────
async function imprimirTexto(impresora, contenido, copias) {
  const tmp = path.join(os.tmpdir(), `solcaribe_ticket_${Date.now()}.txt`);
  fs.writeFileSync(tmp, contenido, 'utf8');
  try {
    const n = Math.max(1, Math.min(10, Number(copias) || 1));
    for (let i = 0; i < n; i++) {
      if (IS_WIN) {
        const nombreEsc = String(impresora).replace(/'/g, "''");
        // Out-Printer imprime el texto en la impresora indicada, silencioso.
        await ps(
          `Get-Content -Raw -Encoding UTF8 -LiteralPath '${tmp.replace(/'/g, "''")}' | Out-Printer -Name '${nombreEsc}'`,
        );
      } else {
        await sh('lp', ['-d', impresora, tmp]);
      }
    }
  } finally {
    fs.unlink(tmp, () => {});
  }
}

// ── Ticket de prueba ──────────────────────────────────────────────
function ticketPrueba(impresora) {
  const line = '------------------------------';
  return [
    line,
    '       HOTEL SOL CARIBE',
    '     Agente de impresion',
    line,
    'Impresora: ' + impresora,
    'Fecha: ' + new Date().toLocaleString('es-PE'),
    '',
    'Esta es una impresion de PRUEBA.',
    'Si la lees, la impresora quedo',
    'configurada correctamente. :)',
    line,
    '',
    '',
  ].join('\n');
}

// ── Utilidades HTTP ───────────────────────────────────────────────
function cors(res, req) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function leerBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 5 * 1024 * 1024) req.destroy(); // 5MB tope
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// ── Servidor ──────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  cors(res, req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const ruta = url.pathname;

  try {
    // UI
    if (req.method === 'GET' && (ruta === '/' || ruta === '/index.html')) {
      const html = fs.readFileSync(UI_PATH);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // Estado
    if (req.method === 'GET' && ruta === '/api/status') {
      const cfg = leerConfig();
      return json(res, 200, {
        ok: true,
        sistema: IS_WIN ? 'windows' : process.platform,
        puerto: PORT,
        version: state.version,
        impresora: cfg.impresora,
        copiasPorDefecto: cfg.copiasPorDefecto ?? 1,
        arrancadoEn: state.arrancadoEn,
        ultimos: state.ultimos,
      });
    }

    // Listar impresoras
    if (req.method === 'GET' && ruta === '/api/printers') {
      const lista = await listarImpresoras();
      return json(res, 200, { ok: true, impresoras: lista });
    }

    // Guardar config
    if (req.method === 'POST' && ruta === '/api/config') {
      const body = await leerBody(req);
      const cfg = leerConfig();
      if (typeof body.impresora === 'string') cfg.impresora = body.impresora;
      if (body.copiasPorDefecto != null)
        cfg.copiasPorDefecto = Math.max(1, Math.min(10, Number(body.copiasPorDefecto) || 1));
      guardarConfig(cfg);
      return json(res, 200, { ok: true, impresora: cfg.impresora, copiasPorDefecto: cfg.copiasPorDefecto });
    }

    // Imprimir (desde la web)
    if (req.method === 'POST' && ruta === '/api/print') {
      const body = await leerBody(req);
      const cfg = leerConfig();
      const impresora = body.impresora || cfg.impresora;
      if (!impresora)
        return json(res, 400, { ok: false, error: 'No hay impresora configurada.' });
      const contenido = String(body.contenido ?? body.texto ?? '');
      if (!contenido.trim())
        return json(res, 400, { ok: false, error: 'Contenido vacío.' });
      const copias = body.copias ?? cfg.copiasPorDefecto ?? 1;
      await imprimirTexto(impresora, contenido, copias);
      registrarTrabajo({ ok: true, impresora, titulo: body.titulo || 'Ticket', copias });
      return json(res, 200, { ok: true });
    }

    // Prueba de impresión
    if (req.method === 'POST' && ruta === '/api/test') {
      const body = await leerBody(req);
      const cfg = leerConfig();
      const impresora = body.impresora || cfg.impresora;
      if (!impresora)
        return json(res, 400, { ok: false, error: 'Elige una impresora primero.' });
      await imprimirTexto(impresora, ticketPrueba(impresora), 1);
      registrarTrabajo({ ok: true, impresora, titulo: 'Prueba', copias: 1 });
      return json(res, 200, { ok: true });
    }

    json(res, 404, { ok: false, error: 'Ruta no encontrada' });
  } catch (e) {
    registrarTrabajo({ ok: false, error: String(e.message || e) });
    json(res, 500, { ok: false, error: String(e.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const cfg = leerConfig();
  console.log('');
  console.log('  Sol Caribe · Agente de Impresión');
  console.log('  --------------------------------');
  console.log('  Escuchando en:  http://localhost:' + PORT);
  console.log('  Impresora:      ' + (cfg.impresora || '(sin configurar)'));
  console.log('  Abre el navegador en esa dirección para configurar.');
  console.log('');
});
