/**
 * V2Ray Dash — Cloudflare Worker for Proxy Testing
 *
 * This Worker acts as a TCP/HTTP/TLS testing endpoint.
 * It receives test requests from the frontend and performs connectivity checks.
 *
 * Deploy: npx wrangler deploy
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' || path === '/health') {
      return new Response(JSON.stringify({
        status: 'ok', name: 'V2Ray Dash Tester', version: '1.0.0'
      }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (path === '/test' && request.method === 'POST') {
      return handleTest(request);
    }

    if (path === '/test/batch' && request.method === 'POST') {
      return handleBatchTest(request);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};

async function handleTest(request) {
  try {
    const body = await request.json();
    const { address, port, method = 'tcp', timeout = 5 } = body;

    if (!address) {
      return jsonResponse({ success: false, error: 'No address provided' }, 400);
    }

    const portNum = parseInt(port) || 443;
    const timeoutMs = Math.min(Math.max(timeout * 1000, 1000), 30000);
    let result;

    switch (method) {
      case 'tcp': result = await testTCP(address, portNum, timeoutMs); break;
      case 'http': result = await testHTTP(address, portNum, timeoutMs); break;
      case 'tls': result = await testTLS(address, portNum, timeoutMs); break;
      default: result = await testTCP(address, portNum, timeoutMs);
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

async function handleBatchTest(request) {
  try {
    const body = await request.json();
    const { targets } = body;

    if (!Array.isArray(targets) || targets.length === 0) {
      return jsonResponse({ success: false, error: 'No targets provided' }, 400);
    }

    const concurrency = 20;
    const results = [];

    for (let i = 0; i < targets.length; i += concurrency) {
      const chunk = targets.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (target) => {
          const portNum = parseInt(target.port) || 443;
          const timeoutMs = Math.min(Math.max((target.timeout || 5) * 1000, 1000), 30000);
          const result = await testTCP(target.address, portNum, timeoutMs).catch(e => ({
            success: false, error: e.message,
          }));
          return { address: target.address, port: portNum, ...result };
        })
      );
      results.push(...chunkResults);
    }

    return jsonResponse({ results });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

async function testTCP(address, port, timeoutMs) {
  const startTime = Date.now();
  try {
    const socket = await connect(address, port, {
      timeout: timeoutMs, secureTransport: 'off',
    });
    const ping = Date.now() - startTime;
    socket.close();
    return { success: true, ping: Math.round(ping), method: 'tcp', address, port };
  } catch (err) {
    return testHTTPFallback(address, port, timeoutMs, startTime);
  }
}

async function testHTTP(address, port, timeoutMs) {
  const startTime = Date.now();
  try {
    const protocol = port === 443 ? 'https' : 'http';
    const response = await fetch(`${protocol}://${address}:${port}/`, {
      method: 'HEAD', signal: AbortSignal.timeout(timeoutMs), redirect: 'follow',
    });
    const ping = Date.now() - startTime;
    return { success: true, ping: Math.round(ping), method: 'http', statusCode: response.status, address, port };
  } catch (err) {
    return { success: false, error: err.message || 'HTTP connection failed', ping: Date.now() - startTime, address, port };
  }
}

async function testHTTPFallback(address, port, timeoutMs, startTime) {
  for (const proto of [port === 443 ? 'https' : 'http', port === 443 ? 'http' : 'https']) {
    try {
      await fetch(`${proto}://${address}:${port}/`, {
        method: 'HEAD', signal: AbortSignal.timeout(timeoutMs),
      });
      return { success: true, ping: Math.round(Date.now() - startTime), method: 'http_fallback', address, port };
    } catch (e) { continue; }
  }
  return { success: false, error: 'TCP+HTTP failed', ping: Date.now() - startTime, address, port };
}

async function testTLS(address, port, timeoutMs) {
  const startTime = Date.now();
  try {
    const socket = await connect(address, port, {
      timeout: timeoutMs, secureTransport: 'starttls',
    });
    const ping = Date.now() - startTime;
    socket.close();
    return { success: true, ping: Math.round(ping), method: 'tls', address, port };
  } catch (err) {
    return { success: false, error: err.message || 'TLS handshake failed', ping: Date.now() - startTime, address, port };
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
