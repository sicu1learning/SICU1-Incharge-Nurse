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

    // Check if user accidentally pasted Google Sheets Spreadsheet URL instead of Web App URL
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      return res.status(400).json({
        success: false,
        error: 'URL ที่ระบุเป็น URL ของ Google Sheets Spreadsheet กรุณาสร้างและ Deploy Google Apps Script Web App แล้วนำ URL ที่ลงท้ายด้วย /exec มาใส่แทน',
      });
    }

    if (targetUrl.includes('/edit')) {
      return res.status(400).json({
        success: false,
        error: 'URL ที่ระบุเป็นหน้าจอแก้ไขโค้ด Apps Script (มี /edit) กรุณากดปุ่ม Deploy > Manage deployments > คัดลอก Web app URL ที่ลงท้ายด้วย /exec มาใส่แทน',
      });
    }

    const method = req.method.toUpperCase();
    const action = req.body?.action || req.query?.action;

    // Helper to perform a fetch to Google Apps Script
    const executeFetch = async (url: string, fetchMethod: string, bodyData?: any) => {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      const fetchOpts: RequestInit = {
        method: fetchMethod,
        headers,
        redirect: 'follow',
      };
      if (fetchMethod === 'POST') {
        headers['Content-Type'] = 'text/plain;charset=utf-8';
        fetchOpts.body = JSON.stringify(bodyData || {});
      }

      let resp: Response;
      try {
        resp = await fetch(url, fetchOpts);
      } catch (err: any) {
        // Retry once on network blip
        try {
          await new Promise((r) => setTimeout(r, 1000));
          resp = await fetch(url, fetchOpts);
        } catch (retryErr: any) {
          return {
            isHtml: false,
            status: 502,
            raw: '',
            data: {
              success: false,
              error: `ไม่สามารถเชื่อมต่อไปยัง Google Apps Script ได้ (Network error: ${retryErr?.message || 'fetch failed'})`,
            },
          };
        }
      }

      const text = await resp.text();

      // Check if response is HTML (e.g. Google Login redirect due to non-public permissions)
      if (text.trim().startsWith('<') || text.toLowerCase().includes('<!doctype') || text.toLowerCase().includes('<html')) {
        return {
          isHtml: true,
          status: resp.status,
          raw: text,
        };
      }

      try {
        const json = JSON.parse(text);
        return {
          isHtml: false,
          status: resp.status,
          data: json,
        };
      } catch {
        return {
          isHtml: false,
          status: resp.status,
          raw: text,
          data: { success: false, error: `Invalid response format from GAS: ${text.slice(0, 150)}` },
        };
      }
    };

    // 1. Initial attempt using incoming method
    let finalUrl = targetUrl;
    if (method === 'GET') {
      try {
        const parsed = new URL(targetUrl);
        for (const [key, val] of Object.entries(req.query)) {
          if (key !== 'url' && val !== undefined) {
            parsed.searchParams.set(key, String(val));
          }
        }
        finalUrl = parsed.toString();
      } catch {
        finalUrl = targetUrl;
      }
    }

    let result = await executeFetch(finalUrl, method, req.body);

    // If HTML received from a custom URL, try fallback to system configured GOOGLE_APPS_SCRIPT_URL
    if (result.isHtml && process.env.GOOGLE_APPS_SCRIPT_URL && targetUrl !== process.env.GOOGLE_APPS_SCRIPT_URL) {
      console.log('Custom GAS URL returned HTML, falling back to system GOOGLE_APPS_SCRIPT_URL');
      let fallbackUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
      if (method === 'GET') {
        try {
          const parsed = new URL(fallbackUrl);
          for (const [key, val] of Object.entries(req.query)) {
            if (key !== 'url' && val !== undefined) {
              parsed.searchParams.set(key, String(val));
            }
          }
          fallbackUrl = parsed.toString();
        } catch {}
      }
      const systemResult = await executeFetch(fallbackUrl, method, req.body);
      if (!systemResult.isHtml) {
        result = systemResult;
      }
    }

    // If still HTML received, return clear human-friendly diagnostic error
    if (result.isHtml) {
      let specificReason = 'กรุณาตรวจสอบว่าได้ตั้งค่า Deploy Web App ให้ "Who has access" เป็น "Anyone" และใช้ URL ที่ลงท้ายด้วย "/exec"';
      const rawLower = (result.raw || '').toLowerCase();
      if (rawLower.includes('accounts.google.com') || rawLower.includes('servicelogin')) {
        specificReason = 'ติดหน้าเข้าสู่ระบบของ Google (เนื่องจาก Deploy Web App โดยไม่ได้เลือก "Who has access" เป็น "Anyone" ทุกคน)';
      } else if (rawLower.includes('script function not found') || rawLower.includes('doget') || rawLower.includes('dopost')) {
        specificReason = 'ไม่พบฟังก์ชัน doGet หรือ doPost ใน Apps Script';
      }

      return res.status(400).json({
        success: false,
        error: `Google Apps Script ส่งกลับเป็นหน้าเว็บ HTML (${specificReason})`,
      });
    }

    // 2. Intelligent Auto-Fallback: If POST failed with "Unknown POST action", try GET or alternate actions
    if (
      result.data &&
      result.data.success === false &&
      typeof result.data.error === 'string' &&
      result.data.error.includes('Unknown')
    ) {
      // If action was getAllData or getState, try GET ?action=...
      if (action) {
        try {
          const getUrl = new URL(targetUrl);
          getUrl.searchParams.set('action', String(action));
          const getFallback = await executeFetch(getUrl.toString(), 'GET');
          if (!getFallback.isHtml && getFallback.data && getFallback.data.success !== false) {
            result = getFallback;
          } else if (action === 'getAllData') {
            // Try action=getState
            getUrl.searchParams.set('action', 'getState');
            const stateFallback = await executeFetch(getUrl.toString(), 'GET');
            if (!stateFallback.isHtml && stateFallback.data && stateFallback.data.success !== false) {
              result = stateFallback;
            } else {
              // Try POST action=getState
              const statePost = await executeFetch(targetUrl, 'POST', { action: 'getState' });
              if (!statePost.isHtml && statePost.data && statePost.data.success !== false) {
                result = statePost;
              }
            }
          }
        } catch {
          // keep original result
        }
      }
    }

    // Normalize legacy getState structure to uniform ward data if needed
    if (result.data && result.data.success && result.data.data && !result.data.activeShift) {
      const inner = result.data.data;
      result.data = {
        success: true,
        activeShift: inner.activeShift || null,
        patientStats: inner.patientStats || null,
        handoverItems: inner.handoverItems || [],
        pendingCharts: inner.pendingCharts || [],
        settings: inner.settings || {},
        shifts: inner.shifts || [],
        nurses: inner.nurses || [],
        valuableItems: inner.valuableItems || [],
        handoverHistory: inner.handoverHistory || [],
        timestamp: inner.updatedAt || new Date().toISOString(),
      };
    }

    return res.status(result.status || 200).json(result.data);
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
