import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Middleware for parsing JSON and urlencoded data
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Permissive CORS to allow access from any client device (PC, Tablet, Mobile)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Gas-Url');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// -------------------------------------------------------------
// Health Check Endpoint
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    storage: 'google-sheets-only',
    database: 'none',
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Google Apps Script Proxy Status Endpoint
// -------------------------------------------------------------
app.get('/api/gas/status', (req, res) => {
  res.json({
    configured: Boolean(process.env.GOOGLE_APPS_SCRIPT_URL),
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Google Apps Script Proxy Endpoint
// Proxies requests to Google Apps Script Web App to eliminate
// any browser CORS, redirect, or mixed-content issues across all devices.
// NO database or local file storage is used.
// -------------------------------------------------------------
app.all('/api/gas', async (req, res) => {
  try {
    const targetUrl =
      (req.query.url as string) ||
      (req.headers['x-gas-url'] as string) ||
      process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid Google Apps Script Web App URL (กรุณาระบุ GOOGLE_APPS_SCRIPT_URL ใน environment variable หรือตั้งค่าในแอป)',
      });
    }

    const method = req.method.toUpperCase();
    let finalFetchUrl = targetUrl;

    if (method === 'GET') {
      try {
        const parsedUrl = new URL(targetUrl);
        for (const [key, val] of Object.entries(req.query)) {
          if (key !== 'url' && val !== undefined) {
            parsedUrl.searchParams.set(key, String(val));
          }
        }
        finalFetchUrl = parsedUrl.toString();
      } catch {
        finalFetchUrl = targetUrl;
      }
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    let fetchOptions: RequestInit = {
      method,
      headers,
      redirect: 'follow',
    };

    if (method === 'POST') {
      headers['Content-Type'] = 'text/plain;charset=utf-8';
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(finalFetchUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.json(data);
    } else {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      } catch {
        return res.json({ success: response.ok, raw: text });
      }
    }
  } catch (err: any) {
    console.error('GAS Proxy Error:', err?.message || err);
    return res.status(502).json({
      success: false,
      error: `Proxy failed to communicate with Google Apps Script: ${err?.message || 'Unknown error'}`,
    });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Production Static Delivery
// -------------------------------------------------------------
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SICU Ward App Server running on http://0.0.0.0:${PORT} (Storage: Google Sheets only)`);
  });
}

startServer().catch((err) => {
  console.error('Fatal: Failed to start server:', err);
});
