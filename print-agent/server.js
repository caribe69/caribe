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
  let c = {};
  try {
    c = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    /* sin config aún */
  }
  // Defaults: impresora térmica (ESC/POS) por ser el caso del hotel (TM-T20III).
  return { impresora: null, copiasPorDefecto: 1, tipoImpresora: 'termica', ...c };
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

// ── Quitar acentos/ñ (ESC/POS por defecto imprime ASCII sin problemas) ────
function soloAscii(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[^\x00-\x7F]/g, '');
}

// ── Ticket ESC/POS para térmica (Epson TM-T20III y compatibles) ───────────
// Init + texto (48 cols Fuente A) + avance + corte parcial automático.
function escposBuffer(contenido, copias) {
  const ESC = 0x1b, GS = 0x1d;
  const init = Buffer.from([ESC, 0x40]); // ESC @ inicializar
  const cut = Buffer.from([GS, 0x56, 0x42, 0x00]); // GS V B 0 corte parcial con avance
  const feed = Buffer.from('\n\n\n\n', 'ascii');
  const body = Buffer.from(
    soloAscii(contenido).replace(/\r?\n/g, '\n') + '\n',
    'ascii',
  );
  const uno = Buffer.concat([init, body, feed, cut]);
  const n = Math.max(1, Math.min(10, Number(copias) || 1));
  return Buffer.concat(Array.from({ length: n }, () => uno));
}

// Envía bytes CRUDOS (RAW) a la impresora de Windows vía winspool (sin libs).
async function imprimirRawWin(impresora, buffer) {
  const tmp = path.join(os.tmpdir(), `solcaribe_escpos_${Date.now()}.bin`);
  fs.writeFileSync(tmp, buffer);
  const nombreEsc = String(impresora).replace(/'/g, "''");
  const tmpEsc = tmp.replace(/'/g, "''");
  const script = `
$ErrorActionPreference='Stop'
Add-Type -Language CSharp -TypeDefinition @'
using System;using System.IO;using System.Runtime.InteropServices;
public class RawPrinter{
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct DOCINFO{ [MarshalAs(UnmanagedType.LPWStr)]public string pDocName;[MarshalAs(UnmanagedType.LPWStr)]public string pOutputFile;[MarshalAs(UnmanagedType.LPWStr)]public string pDataType;}
 [DllImport("winspool.Drv",EntryPoint="OpenPrinterW",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool OpenPrinter(string p,out IntPtr h,IntPtr d);
 [DllImport("winspool.Drv",EntryPoint="ClosePrinter",SetLastError=true)] static extern bool ClosePrinter(IntPtr h);
 [DllImport("winspool.Drv",EntryPoint="StartDocPrinterW",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool StartDocPrinter(IntPtr h,int l,ref DOCINFO di);
 [DllImport("winspool.Drv",EntryPoint="EndDocPrinter",SetLastError=true)] static extern bool EndDocPrinter(IntPtr h);
 [DllImport("winspool.Drv",EntryPoint="StartPagePrinter",SetLastError=true)] static extern bool StartPagePrinter(IntPtr h);
 [DllImport("winspool.Drv",EntryPoint="EndPagePrinter",SetLastError=true)] static extern bool EndPagePrinter(IntPtr h);
 [DllImport("winspool.Drv",EntryPoint="WritePrinter",SetLastError=true)] static extern bool WritePrinter(IntPtr h,byte[] b,int n,out int w);
 public static void Send(string printer,byte[] bytes){ IntPtr h; if(!OpenPrinter(printer,out h,IntPtr.Zero)) throw new Exception("No se pudo abrir la impresora"); DOCINFO di=new DOCINFO(); di.pDocName="SolCaribe"; di.pDataType="RAW"; StartDocPrinter(h,1,ref di); StartPagePrinter(h); int w; WritePrinter(h,bytes,bytes.Length,out w); EndPagePrinter(h); EndDocPrinter(h); ClosePrinter(h);}
}
'@
[RawPrinter]::Send('${nombreEsc}', [System.IO.File]::ReadAllBytes('${tmpEsc}'))
`;
  try {
    await ps(script);
  } finally {
    fs.unlink(tmp, () => {});
  }
}

// Impresión por el driver (texto GDI) — para impresoras normales (no térmicas).
async function imprimirGDI(impresora, contenido, copias) {
  const tmp = path.join(os.tmpdir(), `solcaribe_ticket_${Date.now()}.txt`);
  fs.writeFileSync(tmp, contenido, 'utf8');
  try {
    const n = Math.max(1, Math.min(10, Number(copias) || 1));
    for (let i = 0; i < n; i++) {
      if (IS_WIN) {
        const nombreEsc = String(impresora).replace(/'/g, "''");
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

// Despacha según el tipo de impresora configurada.
async function imprimirTexto(impresora, contenido, copias, tipo) {
  if (tipo === 'normal') return imprimirGDI(impresora, contenido, copias);
  // térmica (por defecto): ESC/POS crudo
  if (IS_WIN) return imprimirRawWin(impresora, escposBuffer(contenido, copias));
  // Linux/Mac: manda el ESC/POS crudo por CUPS
  const tmp = path.join(os.tmpdir(), `solcaribe_escpos_${Date.now()}.bin`);
  fs.writeFileSync(tmp, escposBuffer(contenido, copias));
  try {
    await sh('lp', ['-d', impresora, '-o', 'raw', tmp]);
  } finally {
    fs.unlink(tmp, () => {});
  }
}

// ── Ticket de prueba (48 columnas, Fuente A del TM-T20III) ────────────────
function ticketPrueba(impresora) {
  const W = 48;
  const line = '-'.repeat(W);
  const center = (s) => {
    s = String(s).slice(0, W);
    return ' '.repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s;
  };
  return [
    line,
    center('HOTEL SOL CARIBE'),
    center('Agente de impresion'),
    line,
    'Impresora: ' + impresora,
    'Fecha: ' + new Date().toLocaleString('es-PE'),
    '',
    'Esta es una impresion de PRUEBA.',
    'Si la lees a lo ancho del papel, la',
    'impresora quedo configurada bien.',
    line,
    center('* * *'),
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
        tipoImpresora: cfg.tipoImpresora || 'termica',
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
      if (body.tipoImpresora === 'termica' || body.tipoImpresora === 'normal')
        cfg.tipoImpresora = body.tipoImpresora;
      guardarConfig(cfg);
      return json(res, 200, { ok: true, ...cfg });
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
      await imprimirTexto(impresora, contenido, copias, cfg.tipoImpresora);
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
      const tipoT = body.tipoImpresora || cfg.tipoImpresora;
      await imprimirTexto(impresora, ticketPrueba(impresora), 1, tipoT);
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
