// The Jev key never passes through a chat, a command line or a log.
// A one-shot page on this machine takes it and writes .runtime/jev.json; the
// caller (usually a coding agent) only ever learns saved: true or false.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {openUrl} from './platform.mjs';

import {validJevKey} from '../../shared/jev-provider.mjs';
export {KEY_SHAPE} from '../../shared/jev-provider.mjs';
// The owner's live non-secret settings: early exit on, both providers.
export const JEV_DEFAULTS = {rulebook: 'v2', mode: {codex: 'fastpath', claude: 'fastpath'}, theta: 0.9, deadlineMs: 1500, tier2kind: true};
export const STRICT_DEFAULTS = {open: 'on', ui: 'on'};

function writePrivate(file, data) {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 1), {mode: 0o600});
  fs.renameSync(temp, file);
}

export function saveJevKey(runtimeDir, key, backend = 'openrouter') {
  if (!validJevKey(key, backend)) return false;
  fs.mkdirSync(runtimeDir, {recursive: true});
  const file = path.join(runtimeDir, 'jev.json');
  let saved = {}; try { saved = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch { /* first key */ }
  // Settings someone already tuned survive a key change.
  writePrivate(file, {...JEV_DEFAULTS, ...saved, backend, key});
  const strict = path.join(runtimeDir, 'voice-strict.json');
  if (!fs.existsSync(strict)) writePrivate(strict, STRICT_DEFAULTS);
  return true;
}

export const hasJevKey = runtimeDir => { try { const saved = JSON.parse(fs.readFileSync(path.join(runtimeDir, 'jev.json'), 'utf8')); return validJevKey(String(saved.key || ''), saved.backend ?? 'openrouter'); } catch { return false; } };

const page = (body, note = '') => `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Agentic OS — Chave do Jev</title>
<style>body{font:16px system-ui;background:#0b0d12;color:#e8eaf0;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:460px;padding:24px}
input,select{width:100%;box-sizing:border-box;padding:12px;font:inherit;border-radius:8px;border:1px solid #39405a;background:#141826;color:inherit}
button{margin-top:12px;padding:10px 18px;font:inherit;border:0;border-radius:8px;background:#6d7cff;color:#fff;cursor:pointer}p{line-height:1.5;color:#aab0c4}.note{color:#ffb4a8}</style>
<main>${body}${note ? `<p class="note">${note}</p>` : ''}</main></html>`;
const form = note => page(`<h2>Configure o Jev</h2><p>A chave fica salva neste computador, em um arquivo usado pelo roteador de voz. O agente de código recebe apenas a confirmação de que a chave foi salva.</p>
<form method="post" autocomplete="off"><label for="backend">Provedor</label><select id="backend" name="backend"><option value="openrouter">OpenRouter</option><option value="typesafe">TypeSafe (direto)</option></select><label for="key">Chave do provedor</label><input id="key" type="password" name="key" required><button>Salvar chave</button></form>`, note);

export function collectJevKey({runtimeDir, timeoutMs = 5 * 60 * 1000, open = openUrl, announce = () => {}} = {}) {
  const token = crypto.randomBytes(24).toString('hex');
  return new Promise((resolve, reject) => {
    let done = false, timer;
    const finish = result => { if (done) return; done = true; clearTimeout(timer); server.close(); server.closeAllConnections?.(); resolve(result); };
    const server = http.createServer((req, res) => {
      const port = server.address().port, origin = `http://127.0.0.1:${port}`;
      // no-referrer makes browser form POSTs send Origin: null, failing our check below.
      // Keep the local form's origin while withholding referrers from other origins.
      const headers = {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"};
      const reply = (code, html) => { res.writeHead(code, headers); res.end(html); };
      const supplied = Buffer.from(String(req.url || '').slice(1)), wanted = Buffer.from(token);
      // Another local page cannot guess the path, and a browser always sends Origin on a cross-site POST.
      if (req.headers.host !== `127.0.0.1:${port}` || supplied.length !== wanted.length || !crypto.timingSafeEqual(supplied, wanted)) return reply(404, page('<h2>Página não encontrada</h2>'));
      if (req.method === 'GET') return reply(200, form(''));
      if (req.method !== 'POST' || req.headers.origin !== origin || !/^application\/x-www-form-urlencoded/i.test(req.headers['content-type'] || '')) return reply(403, page('<h2>Solicitação recusada</h2>'));
      let size = 0; const chunks = [];
      req.on('data', chunk => { size += chunk.length; if (size > 4096) { req.destroy(); return; } chunks.push(chunk); });
      req.on('end', () => {
        const fields = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
        const key = (fields.get('key') || '').trim(), backend = fields.get('backend') ?? 'openrouter';
        let saved = false; try { saved = saveJevKey(runtimeDir, key, backend); } catch { saved = false; }
        if (!saved) return reply(400, form('Não foi possível salvar a chave. Confira se a chave corresponde ao provedor escolhido.'));
        reply(200, page('<h2>Chave salva</h2><p>Você pode fechar esta aba e voltar ao agente de código.</p>'));
        res.once('finish', () => finish({saved: true}));
      });
    });
    server.once('error', reject);
    server.listen({host: '127.0.0.1', port: 0, exclusive: true}, () => {
      const url = `http://127.0.0.1:${server.address().port}/${token}`;
      timer = setTimeout(() => finish({saved: false, reason: 'timeout'}), timeoutMs);
      announce(url);
      try { open(url); } catch { /* the printed address is the fallback */ }
    });
  });
}
