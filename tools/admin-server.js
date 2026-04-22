const fs = require('fs');
const http = require('http');
const path = require('path');
const { exec } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const testimonialsPath = path.join(rootDir, 'data', 'testimonials.json');
const port = Number(process.env.PORT || 8090);
const host = '127.0.0.1';
const adminUrl = `http://${host}:${port}/admin-depoimentos.html`;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function send(response, status, body, type = 'text/plain; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

function clampRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(Math.round(parsed), 1), 5);
}

function normalizeTestimonial(item) {
  if (!item || typeof item !== 'object') return null;

  const author = String(item.author || '').trim();
  const text = String(item.text || '').trim();
  if (!author || !text) return null;

  return {
    author,
    age: String(item.age || 'Avaliação recente').trim(),
    rating: clampRating(item.rating),
    source: String(item.source || 'Google Reviews').trim(),
    text,
    active: item.active !== false
  };
}

function normalizePayload(payload) {
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.testimonials)
      ? payload.testimonials
      : [];

  return rawItems
    .map(normalizeTestimonial)
    .filter(Boolean);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy();
        reject(new Error('Arquivo grande demais.'));
      }
    });

    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    send(response, 403, 'Acesso negado.');
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      send(response, 404, 'Arquivo não encontrado.');
      return;
    }

    const type = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store'
    });
    response.end(file);
  });
}

async function handleApi(request, response) {
  if (request.url !== '/api/testimonials') {
    send(response, 404, JSON.stringify({ error: 'Rota não encontrada.' }), 'application/json; charset=utf-8');
    return;
  }

  if (request.method === 'GET') {
    try {
      const data = await fs.promises.readFile(testimonialsPath, 'utf8');
      send(response, 200, data, 'application/json; charset=utf-8');
    } catch (error) {
      send(response, 500, JSON.stringify({ error: 'Não foi possível ler os depoimentos.' }), 'application/json; charset=utf-8');
    }
    return;
  }

  if (request.method === 'POST') {
    try {
      const body = await readRequestBody(request);
      const items = normalizePayload(JSON.parse(body));

      if (!items.length) {
        send(response, 400, JSON.stringify({ error: 'Cadastre pelo menos um depoimento válido.' }), 'application/json; charset=utf-8');
        return;
      }

      await fs.promises.mkdir(path.dirname(testimonialsPath), { recursive: true });
      await fs.promises.writeFile(testimonialsPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
      send(response, 200, JSON.stringify({ ok: true, count: items.length }), 'application/json; charset=utf-8');
    } catch (error) {
      send(response, 400, JSON.stringify({ error: 'Não foi possível salvar os depoimentos.' }), 'application/json; charset=utf-8');
    }
    return;
  }

  send(response, 405, JSON.stringify({ error: 'Método não permitido.' }), 'application/json; charset=utf-8');
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) {
    handleApi(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`Admin de depoimentos pronto em ${adminUrl}`);
  console.log(`Salvando diretamente em ${testimonialsPath}`);
  console.log('Pressione Ctrl+C para encerrar.');

  if (process.platform === 'win32') {
    exec(`start "" "${adminUrl}"`);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`A porta ${port} já está em uso. Se o painel já estiver aberto, continue usando a aba atual.`);
    if (process.platform === 'win32') {
      exec(`start "" "${adminUrl}"`);
    }
    process.exit(1);
  }

  console.error(error.message);
  process.exit(1);
});
