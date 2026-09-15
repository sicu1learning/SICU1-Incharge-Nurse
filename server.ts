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
// Date & Error Sanitization Helpers for Google Sheets
// -------------------------------------------------------------
const ENG_MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function extractErrorMessage(err: any): string {
  if (!err) return 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  if (typeof err === 'string') {
    if (err === '[object Object]') return 'เกิดข้อผิดพลาดในการตอบสนองจาก Google Apps Script (Response format error)';
    return err;
  }
  if (err instanceof Error) {
    if (err.message && err.message !== '[object Object]') return err.message;
  }
  if (typeof err === 'object') {
    if (typeof err.error === 'string' && err.error !== '[object Object]') return err.error;
    if (typeof err.error === 'object' && err.error !== null) return extractErrorMessage(err.error);
    if (typeof err.message === 'string' && err.message !== '[object Object]') return err.message;
    if (typeof err.details === 'string') return err.details;
    try {
      const json = JSON.stringify(err);
      if (json !== '{}') return json;
    } catch {}
  }
  return String(err) === '[object Object]' ? 'เกิดข้อผิดพลาดในการประมวลผลข้อมูลจาก Google Sheets' : String(err);
}

function normalizeThaiDateString(raw: any): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // 1. DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    const day = String(parseInt(dmy[1], 10)).padStart(2, '0');
    const month = String(parseInt(dmy[2], 10)).padStart(2, '0');
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2500;
    else if (year < 2400) year += 543;
    return `${day}/${month}/${year}`;
  }

  // 2. English date strings e.g. "Tue Aug 01 2569 00:00:00 GMT+0700 (中南半島時間)"
  const eng =
    s.match(/([a-zA-Z]{3,9})\s+(\d{1,2})\s+(\d{4})/i) ||
    s.match(/(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})/i);
  if (eng) {
    let mStr = '';
    let dNum = 0;
    let yNum = 0;
    if (isNaN(Number(eng[1]))) {
      mStr = eng[1].toLowerCase();
      dNum = parseInt(eng[2], 10);
      yNum = parseInt(eng[3], 10);
    } else {
      dNum = parseInt(eng[1], 10);
      mStr = eng[2].toLowerCase();
      yNum = parseInt(eng[3], 10);
    }
    const mNum = ENG_MONTH_MAP[mStr];
    if (mNum && dNum && yNum) {
      if (yNum < 2400) yNum += 543;
      const day = String(dNum).padStart(2, '0');
      const month = String(mNum).padStart(2, '0');
      return `${day}/${month}/${yNum}`;
    }
  }

  // 3. ISO YYYY-MM-DD
  const iso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (iso) {
    let yNum = parseInt(iso[1], 10);
    const mNum = parseInt(iso[2], 10);
    const dNum = parseInt(iso[3], 10);
    if (yNum < 2400) yNum += 543;
    const day = String(dNum).padStart(2, '0');
    const month = String(mNum).padStart(2, '0');
    return `${day}/${month}/${yNum}`;
  }

  // 4. Embedded DD-MM-YYYY (e.g. shift-afternoon-13-09-2569)
  const emb = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (emb) {
    const day = String(parseInt(emb[1], 10)).padStart(2, '0');
    const month = String(parseInt(emb[2], 10)).padStart(2, '0');
    let year = parseInt(emb[3], 10);
    if (year < 2400) year += 543;
    return `${day}/${month}/${year}`;
  }

  return s;
}

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
    isSystemReady: Boolean(process.env.GOOGLE_APPS_SCRIPT_URL),
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
    const rawTargetUrl =
      (req.query.url as string) ||
      (req.headers['x-gas-url'] as string) ||
      process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!rawTargetUrl || !rawTargetUrl.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid Google Apps Script Web App URL (กรุณาระบุ GOOGLE_APPS_SCRIPT_URL ใน environment variable หรือตั้งค่าในแอป)',
      });
    }

    let targetUrl = rawTargetUrl.trim();

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
    let action = (req.body?.action || req.query?.action || '').trim();

    // Map testConnection to ping natively supported by Google Apps Script
    if (action === 'testConnection') {
      action = 'ping';
    }

    // Helper to perform a fetch to Google Apps Script with 18s timeout
    const executeFetch = async (url: string, fetchMethod: string, bodyData?: any) => {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      const fetchOpts: RequestInit = {
        method: fetchMethod,
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(18000),
      };
      if (fetchMethod === 'POST') {
        headers['Content-Type'] = 'text/plain;charset=utf-8';
        fetchOpts.body = JSON.stringify(bodyData || {});
      }

      let resp: Response;
      try {
        resp = await fetch(url, fetchOpts);
      } catch (err: any) {
        if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
          return {
            isHtml: false,
            status: 504,
            raw: '',
            data: {
              success: false,
              error: 'การเชื่อมต่อกับ Google Apps Script หมดเวลา (Timeout 18s) กรุณาลองใหม่อีกครั้ง',
            },
          };
        }
        // Retry once on brief network blip
        try {
          await new Promise((r) => setTimeout(r, 600));
          const retryOpts = { ...fetchOpts, signal: AbortSignal.timeout(15000) };
          resp = await fetch(url, retryOpts);
        } catch (retryErr: any) {
          const isTimeout = retryErr?.name === 'TimeoutError' || retryErr?.name === 'AbortError';
          return {
            isHtml: false,
            status: isTimeout ? 504 : 502,
            raw: '',
            data: {
              success: false,
              error: isTimeout
                ? 'การเชื่อมต่อกับ Google Apps Script หมดเวลา (Timeout 15s) กรุณาลองใหม่อีกครั้ง'
                : `ไม่สามารถเชื่อมต่อไปยัง Google Apps Script ได้ (Network error: ${retryErr?.message || 'fetch failed'})`,
            },
          };
        }
      }

      const text = await resp.text();

      // Check if response is HTML (e.g. Google Login redirect due to non-public permissions)
      if (
        text.trim().startsWith('<') ||
        text.toLowerCase().includes('<!doctype') ||
        text.toLowerCase().includes('<html')
      ) {
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

    // RESET ALL DATA:
    // Completely clears active shift, handovers, pending charts, leaving a clean slate
    if (action === 'resetAllData' || action === 'clearAllData') {
      try {
        const blankShift = {
          id: '',
          date: '',
          shiftType: '',
          inchargeName: '',
          previousShiftInfo: '',
          isActive: false,
          stats: {
            carriedOver: 0,
            transferredIn: 0,
            admittedNew: 0,
            transferredOut: 0,
            againstAdvice: 0,
            deceased: 0,
            deceasedPostOp24Hr: 0,
            admitDischarge24Hr: 0,
            referOut: 0,
            currentRemaining: 0,
            category5Count: 0,
            category4Count: 0,
            ventilatorCount: 0,
            oxygenCount: 0,
            postOpCount: 0,
          },
          movementRecords: [],
          consultationData: { totalCount: 0, departmentCounts: {}, customDepartments: [], notes: '', items: [] },
          staffData: { headCount: 0, rnCount: 0, naCount: 0, clerkCount: 0, pnCount: 0, otCount: 0, leaveCount: 0, totalStaff: 0, notes: '' },
          equipmentWeanData: {},
          incidentData: { details: '' },
          handoverItems: [],
          pendingCharts: [],
        };

        // 1. Reset active shift snapshot & stats in Google Sheets
        await executeFetch(targetUrl, 'POST', {
          action: 'saveState',
          currentShift: blankShift,
          handoverItems: [],
          pendingCharts: [],
        });

        // 2. Clear handover items sheet
        await executeFetch(targetUrl, 'POST', {
          action: 'saveHandovers',
          handoverItems: [],
        });

        // 3. Clear pending charts sheet
        await executeFetch(targetUrl, 'POST', {
          action: 'savePendingCharts',
          pendingCharts: [],
        });

        // 4. Also call native resetAllData on GAS if supported
        try {
          await executeFetch(targetUrl, 'POST', { action: 'resetAllData' });
        } catch {}

        return res.status(200).json({
          success: true,
          message: 'ลบข้อมูลที่ค้างเก่าทั้งหมด และรีเซ็ตข้อมูลเริ่มต้นใหม่เรียบร้อยแล้ว',
        });
      } catch (resetErr: any) {
        return res.status(500).json({
          success: false,
          error: `เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล: ${extractErrorMessage(resetErr)}`,
        });
      }
    }

    // FAST PATH for Reading Data:
    // If request is to get all ward data or state, use native GET ?action=getState directly.
    // This executes in under 2 seconds without triggering POST redirect delays or Unknown action errors.
    if (action === 'getAllData' || action === 'getState') {
      try {
        const getStateUrl = new URL(targetUrl);
        getStateUrl.searchParams.set('action', 'getState');
        let stateResult = await executeFetch(getStateUrl.toString(), 'GET');

        // If custom URL returned HTML, try system URL
        if (
          stateResult.isHtml &&
          process.env.GOOGLE_APPS_SCRIPT_URL &&
          targetUrl !== process.env.GOOGLE_APPS_SCRIPT_URL
        ) {
          const sysUrl = new URL(process.env.GOOGLE_APPS_SCRIPT_URL);
          sysUrl.searchParams.set('action', 'getState');
          const sysResult = await executeFetch(sysUrl.toString(), 'GET');
          if (!sysResult.isHtml && sysResult.data && sysResult.data.success !== false) {
            stateResult = sysResult;
          }
        }

        if (!stateResult.isHtml && stateResult.data && stateResult.data.success !== false) {
          // Normalize inner data
          const inner = stateResult.data.data || stateResult.data;
          const rawActiveShift = inner.activeShift;
          const activeShift = (rawActiveShift && rawActiveShift.id && String(rawActiveShift.id).trim() !== '')
            ? rawActiveShift
            : null;
          const patientStats = activeShift ? (inner.patientStats || activeShift.stats || null) : null;

          stateResult.data = {
            success: true,
            activeShift: activeShift,
            patientStats: patientStats,
            handoverItems: inner.handoverItems || [],
            pendingCharts: inner.pendingCharts || [],
            settings: inner.settings || {},
            shifts: inner.shifts || [],
            nurses: inner.nurses || [],
            valuableItems: inner.valuableItems || [],
            handoverHistory: inner.handoverHistory || [],
            timestamp: inner.updatedAt || new Date().toISOString(),
          };

          // Sanitize dates
          if (stateResult.data.activeShift && stateResult.data.activeShift.date) {
            stateResult.data.activeShift.date = normalizeThaiDateString(stateResult.data.activeShift.date);
          }
          if (Array.isArray(stateResult.data.shifts)) {
            stateResult.data.shifts.forEach((s: any) => {
              if (s && s.date) s.date = normalizeThaiDateString(s.date);
            });
          }
          if (Array.isArray(stateResult.data.pendingCharts)) {
            stateResult.data.pendingCharts.forEach((c: any) => {
              if (c && c.dateAdded) c.dateAdded = normalizeThaiDateString(c.dateAdded);
            });
          }

          return res.status(200).json(stateResult.data);
        }
      } catch (fastPathErr) {
        console.warn('Fast path GET getState failed, falling back to standard execution:', fastPathErr);
      }
    }

    // Standard execution for all other actions (ping, saveState, saveShift, deleteShift, etc.)
    let finalUrl = targetUrl;
    if (method === 'GET') {
      try {
        const parsed = new URL(targetUrl);
        for (const [key, val] of Object.entries(req.query)) {
          if (key !== 'url' && val !== undefined) {
            parsed.searchParams.set(key, String(val));
          }
        }
        if (action) parsed.searchParams.set('action', action);
        finalUrl = parsed.toString();
      } catch {
        finalUrl = targetUrl;
      }
    }

    const effectiveBody = req.body ? { ...req.body, action: action || req.body.action } : undefined;
    let result = await executeFetch(finalUrl, method, effectiveBody);

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
          if (action) parsed.searchParams.set('action', action);
          fallbackUrl = parsed.toString();
        } catch {}
      }
      const systemResult = await executeFetch(fallbackUrl, method, effectiveBody);
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

    // Auto-fallback: If POST failed with "Unknown POST action", try specific fallbacks or GET
    if (
      result.data &&
      result.data.success === false &&
      typeof result.data.error === 'string' &&
      result.data.error.includes('Unknown')
    ) {
      // 1. Fallback for saveHandoverItem -> saveHandovers
      if (action === 'saveHandoverItem') {
        try {
          const item = req.body.item || req.body;
          const getStateUrl = new URL(targetUrl);
          getStateUrl.searchParams.set('action', 'getState');
          const st = await executeFetch(getStateUrl.toString(), 'GET');
          const currentItems = (st.data?.data?.handoverItems || st.data?.handoverItems || []) as any[];
          const idx = currentItems.findIndex((h: any) => h && h.id === item.id);
          const updatedItems = idx >= 0
            ? currentItems.map((h: any) => (h && h.id === item.id ? { ...h, ...item } : h))
            : [item, ...currentItems];
          const saveRes = await executeFetch(targetUrl, 'POST', {
            action: 'saveHandovers',
            handoverItems: updatedItems,
          });
          if (saveRes.data && saveRes.data.success !== false) {
            result = {
              isHtml: false,
              status: 200,
              data: { success: true, item, message: 'Handover item saved to Google Sheets' },
            };
          }
        } catch (fbErr) {
          console.warn('saveHandoverItem fallback failed:', fbErr);
        }
      } else if (action === 'deleteHandoverItem') {
        try {
          const id = req.body.id || req.body.itemId;
          const getStateUrl = new URL(targetUrl);
          getStateUrl.searchParams.set('action', 'getState');
          const st = await executeFetch(getStateUrl.toString(), 'GET');
          const currentItems = (st.data?.data?.handoverItems || st.data?.handoverItems || []) as any[];
          const updatedItems = currentItems.filter((h: any) => h && h.id !== id);
          const saveRes = await executeFetch(targetUrl, 'POST', {
            action: 'saveHandovers',
            handoverItems: updatedItems,
          });
          if (saveRes.data && saveRes.data.success !== false) {
            result = {
              isHtml: false,
              status: 200,
              data: { success: true, message: 'Handover item deleted' },
            };
          }
        } catch (fbErr) {
          console.warn('deleteHandoverItem fallback failed:', fbErr);
        }
      } else if (action === 'archiveHandoverItem') {
        try {
          const id = req.body.id || req.body.itemId;
          const getStateUrl = new URL(targetUrl);
          getStateUrl.searchParams.set('action', 'getState');
          const st = await executeFetch(getStateUrl.toString(), 'GET');
          const currentItems = (st.data?.data?.handoverItems || st.data?.handoverItems || []) as any[];
          const updatedItems = currentItems.filter((h: any) => h && h.id !== id);
          const saveRes = await executeFetch(targetUrl, 'POST', {
            action: 'saveHandovers',
            handoverItems: updatedItems,
          });
          if (saveRes.data && saveRes.data.success !== false) {
            result = {
              isHtml: false,
              status: 200,
              data: { success: true, source_handover_id: id, message: 'Handover item archived' },
            };
          }
        } catch (fbErr) {
          console.warn('archiveHandoverItem fallback failed:', fbErr);
        }
      } else if (action === 'savePendingChart') {
        try {
          const chart = req.body.chart || req.body;
          const getStateUrl = new URL(targetUrl);
          getStateUrl.searchParams.set('action', 'getState');
          const st = await executeFetch(getStateUrl.toString(), 'GET');
          const currentCharts = (st.data?.data?.pendingCharts || st.data?.pendingCharts || []) as any[];
          const idx = currentCharts.findIndex((c: any) => c && c.id === chart.id);
          const updatedCharts = idx >= 0
            ? currentCharts.map((c: any) => (c && c.id === chart.id ? { ...c, ...chart } : c))
            : [chart, ...currentCharts];
          const saveRes = await executeFetch(targetUrl, 'POST', {
            action: 'savePendingCharts',
            pendingCharts: updatedCharts,
          });
          if (saveRes.data && saveRes.data.success !== false) {
            result = {
              isHtml: false,
              status: 200,
              data: { success: true, chart, message: 'Pending chart saved to Google Sheets' },
            };
          }
        } catch (fbErr) {
          console.warn('savePendingChart fallback failed:', fbErr);
        }
      } else if (action === 'deletePendingChart') {
        try {
          const id = req.body.id || req.body.chartId;
          const getStateUrl = new URL(targetUrl);
          getStateUrl.searchParams.set('action', 'getState');
          const st = await executeFetch(getStateUrl.toString(), 'GET');
          const currentCharts = (st.data?.data?.pendingCharts || st.data?.pendingCharts || []) as any[];
          const updatedCharts = currentCharts.filter((c: any) => c && c.id !== id);
          const saveRes = await executeFetch(targetUrl, 'POST', {
            action: 'savePendingCharts',
            pendingCharts: updatedCharts,
          });
          if (saveRes.data && saveRes.data.success !== false) {
            result = {
              isHtml: false,
              status: 200,
              data: { success: true, message: 'Pending chart deleted' },
            };
          }
        } catch (fbErr) {
          console.warn('deletePendingChart fallback failed:', fbErr);
        }
      } else if (action) {
        try {
          const getUrl = new URL(targetUrl);
          getUrl.searchParams.set('action', String(action));
          const getFallback = await executeFetch(getUrl.toString(), 'GET');
          if (!getFallback.isHtml && getFallback.data && getFallback.data.success !== false) {
            result = getFallback;
          } else if (action === 'getAllData' || action === 'getState') {
            getUrl.searchParams.set('action', 'getState');
            const stateFallback = await executeFetch(getUrl.toString(), 'GET');
            if (!stateFallback.isHtml && stateFallback.data && stateFallback.data.success !== false) {
              result = stateFallback;
            }
          }
        } catch {}
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

    // Clean and normalize dates and errors to avoid "Tue Aug 01 2569..." and [object Object]
    if (result.data && typeof result.data === 'object') {
      if (result.data.activeShift && result.data.activeShift.date) {
        result.data.activeShift.date = normalizeThaiDateString(result.data.activeShift.date);
      }
      if (Array.isArray(result.data.shifts)) {
        result.data.shifts.forEach((s: any) => {
          if (s && s.date) s.date = normalizeThaiDateString(s.date);
        });
      }
      if (Array.isArray(result.data.pendingCharts)) {
        result.data.pendingCharts.forEach((c: any) => {
          if (c && c.dateAdded) c.dateAdded = normalizeThaiDateString(c.dateAdded);
        });
      }
      if (result.data.error && typeof result.data.error !== 'string') {
        result.data.error = extractErrorMessage(result.data.error);
      }
    }

    return res.status(result.status || 200).json(result.data);
  } catch (err: any) {
    const safeError = extractErrorMessage(err);
    console.error('GAS Proxy Error:', safeError);
    return res.status(502).json({
      success: false,
      error: `Proxy failed to communicate with Google Apps Script: ${safeError}`,
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
