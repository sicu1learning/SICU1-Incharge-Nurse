import { ShiftInfo, PatientStats, HandoverItem, PendingChart } from '../types';

export type GasConnectionState = 'not_configured' | 'connecting' | 'connected' | 'error' | 'syncing';

export interface GasConnectionStatus {
  state: GasConnectionState;
  lastSyncedAt?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  errorMessage?: string;
  url?: string;
}

const STORAGE_KEY_GAS_URL = 'sicu_gas_url';
const STORAGE_KEY_SPREADSHEET_NAME = 'sicu_gas_spreadsheet_name';
const STORAGE_KEY_SPREADSHEET_URL = 'sicu_gas_spreadsheet_url';

let currentStatus: GasConnectionStatus = {
  state: 'not_configured',
  url: '',
};

const listeners = new Set<(status: GasConnectionStatus) => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...currentStatus });
    } catch (e) {
      console.warn('Error in gas status listener:', e);
    }
  });
}

export function subscribeGasStatus(callback: (status: GasConnectionStatus) => void): () => void {
  listeners.add(callback);
  callback({ ...currentStatus });
  return () => {
    listeners.delete(callback);
  };
}

export function getStoredGasUrl(): string {
  try {
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
      return envUrl.trim();
    }
    const saved = localStorage.getItem(STORAGE_KEY_GAS_URL);
    if (saved && typeof saved === 'string' && saved.startsWith('http')) {
      return saved.trim();
    }
  } catch {
    // ignore
  }
  return '';
}

export function setStoredGasUrl(url: string) {
  const trimmed = (url || '').trim();
  try {
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_GAS_URL, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY_GAS_URL);
    }
  } catch {
    // ignore
  }
  currentStatus = {
    ...currentStatus,
    url: trimmed,
    state: trimmed ? 'connecting' : 'not_configured',
    errorMessage: undefined,
  };
  notifyListeners();
}

export function getStoredSpreadsheetInfo(): { name?: string; url?: string } {
  try {
    return {
      name: localStorage.getItem(STORAGE_KEY_SPREADSHEET_NAME) || undefined,
      url: localStorage.getItem(STORAGE_KEY_SPREADSHEET_URL) || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Execute request to Google Apps Script Web App
 * Tries direct fetch first, and falls back to server proxy /api/gas if CORS/network restricts
 */
async function callGasApi<T = any>(
  action: string,
  options: {
    method?: 'GET' | 'POST';
    payload?: any;
    targetUrl?: string;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const gasUrl = options.targetUrl || getStoredGasUrl();
  if (!gasUrl) {
    throw new Error('ยังไม่ได้กำหนด Google Apps Script Web App URL');
  }

  const method = options.method || (options.payload ? 'POST' : 'GET');
  const timeoutMs = options.timeoutMs || 25000;

  let requestUrl = gasUrl;
  if (method === 'GET') {
    const separator = gasUrl.includes('?') ? '&' : '?';
    requestUrl = `${gasUrl}${separator}action=${encodeURIComponent(action)}&t=${Date.now()}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Strategy 1: Attempt direct client-side fetch (supports direct Google Apps Script CORS)
  try {
    let fetchOptions: RequestInit = {
      method,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'follow',
    };

    if (method === 'POST') {
      // Use text/plain for Google Apps Script to prevent unnecessary CORS preflights
      fetchOptions.body = JSON.stringify({
        action,
        ...(options.payload || {}),
      });
      fetchOptions.headers = {
        'Content-Type': 'text/plain;charset=utf-8',
      };
    }

    const res = await fetch(requestUrl, fetchOptions);
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        return parsed;
      } catch (e) {
        throw new Error(`Google Apps Script ส่งค่ากลับไม่ใช่ JSON: ${text.slice(0, 100)}`);
      }
    } else {
      throw new Error(`Google Apps Script HTTP Error ${res.status}: ${res.statusText}`);
    }
  } catch (directErr: any) {
    clearTimeout(timer);
    // Strategy 2: If direct fetch failed (e.g. browser CORS policy), fallback to local /api/gas proxy
    try {
      const proxyUrl = `/api/gas?url=${encodeURIComponent(requestUrl)}`;
      const proxyRes = await fetch(proxyUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Gas-Url': requestUrl,
        },
        body: method === 'POST' ? JSON.stringify({ action, ...(options.payload || {}) }) : undefined,
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        return proxyData;
      }
    } catch {
      // ignore proxy fallback failure
    }

    throw directErr;
  }
}

/**
 * Ping and test connection to Google Apps Script Web App & Google Sheets
 */
export async function testGasConnection(urlToTest?: string): Promise<{
  success: boolean;
  message?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  error?: string;
}> {
  const targetUrl = urlToTest || getStoredGasUrl();
  if (!targetUrl) {
    return {
      success: false,
      error: 'กรุณากรอก Google Apps Script Web App URL',
    };
  }

  currentStatus = {
    ...currentStatus,
    state: 'connecting',
    url: targetUrl,
    errorMessage: undefined,
  };
  notifyListeners();

  try {
    const res = await callGasApi<{
      success: boolean;
      status?: string;
      spreadsheetName?: string;
      spreadsheetUrl?: string;
      message?: string;
      error?: string;
    }>('ping', {
      method: 'GET',
      targetUrl,
      timeoutMs: 15000,
    });

    if (res && res.success) {
      const ssName = res.spreadsheetName || 'Google Sheets SICU1';
      const ssUrl = res.spreadsheetUrl || '';

      try {
        if (ssName) localStorage.setItem(STORAGE_KEY_SPREADSHEET_NAME, ssName);
        if (ssUrl) localStorage.setItem(STORAGE_KEY_SPREADSHEET_URL, ssUrl);
      } catch {}

      currentStatus = {
        state: 'connected',
        url: targetUrl,
        lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
        spreadsheetName: ssName,
        spreadsheetUrl: ssUrl,
        errorMessage: undefined,
      };
      notifyListeners();

      return {
        success: true,
        message: res.message || 'เชื่อมต่อ Google Sheets สำเร็จ',
        spreadsheetName: ssName,
        spreadsheetUrl: ssUrl,
      };
    } else {
      throw new Error(res?.error || 'เชื่อมต่อสำเร็จแต่ Google Apps Script รายงานข้อผิดพลาด');
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'ไม่สามารถเชื่อมต่อ Google Apps Script ได้';
    currentStatus = {
      ...currentStatus,
      state: 'error',
      errorMessage: errorMsg,
    };
    notifyListeners();

    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Fetch ward state (Active Shift, Stats, Handovers, Pending Charts) from Google Sheets
 */
export async function fetchWardStateFromGas(): Promise<{
  success: boolean;
  activeShift?: ShiftInfo;
  patientStats?: PatientStats;
  handoverItems?: HandoverItem[];
  pendingCharts?: PendingChart[];
  settings?: any;
  error?: string;
}> {
  const url = getStoredGasUrl();
  if (!url) {
    currentStatus = { ...currentStatus, state: 'not_configured' };
    notifyListeners();
    return { success: false, error: 'not_configured' };
  }

  currentStatus = { ...currentStatus, state: 'syncing' };
  notifyListeners();

  try {
    const res = await callGasApi<{
      success: boolean;
      data?: {
        activeShift?: ShiftInfo;
        patientStats?: PatientStats;
        handoverItems?: HandoverItem[];
        pendingCharts?: PendingChart[];
        settings?: any;
      };
      error?: string;
    }>('getState', { method: 'GET' });

    if (res && res.success && res.data) {
      currentStatus = {
        ...currentStatus,
        state: 'connected',
        lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
        errorMessage: undefined,
      };
      notifyListeners();

      return {
        success: true,
        activeShift: res.data.activeShift || undefined,
        patientStats: res.data.patientStats || undefined,
        handoverItems: res.data.handoverItems || [],
        pendingCharts: res.data.pendingCharts || [],
        settings: res.data.settings || {},
      };
    } else {
      throw new Error(res?.error || 'ไม่พบข้อมูลตอบกลับจาก Google Sheets');
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Google Sheets';
    currentStatus = {
      ...currentStatus,
      state: 'error',
      errorMessage: errorMsg,
    };
    notifyListeners();
    return { success: false, error: errorMsg };
  }
}

/**
 * Save active ward state to Google Sheets via Google Apps Script
 */
export async function saveWardStateToGas(payload: {
  currentShift?: ShiftInfo;
  patientStats?: PatientStats;
  handoverItems?: HandoverItem[];
  pendingCharts?: PendingChart[];
}): Promise<{ success: boolean; error?: string }> {
  const url = getStoredGasUrl();
  if (!url) return { success: false, error: 'not_configured' };

  currentStatus = { ...currentStatus, state: 'syncing' };
  notifyListeners();

  try {
    const res = await callGasApi<{ success: boolean; error?: string }>('saveState', {
      method: 'POST',
      payload,
    });

    if (res && res.success) {
      currentStatus = {
        ...currentStatus,
        state: 'connected',
        lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
        errorMessage: undefined,
      };
      notifyListeners();
      return { success: true };
    } else {
      throw new Error(res?.error || 'Google Apps Script บันทึกข้อมูลไม่สำเร็จ');
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'บันทึกลง Google Sheets ไม่สำเร็จ';
    currentStatus = {
      ...currentStatus,
      state: 'error',
      errorMessage: errorMsg,
    };
    notifyListeners();
    return { success: false, error: errorMsg };
  }
}

/**
 * Fetch shifts history from Google Sheets
 */
export async function fetchShiftsHistoryFromGas(): Promise<{
  success: boolean;
  shifts: ShiftInfo[];
  error?: string;
}> {
  const url = getStoredGasUrl();
  if (!url) return { success: false, shifts: [], error: 'not_configured' };

  try {
    const res = await callGasApi<{
      success: boolean;
      shifts?: ShiftInfo[];
      error?: string;
    }>('getHistory', { method: 'GET' });

    if (res && res.success && Array.isArray(res.shifts)) {
      return { success: true, shifts: res.shifts };
    }
    return { success: false, shifts: [], error: res?.error };
  } catch (err: any) {
    return { success: false, shifts: [], error: err?.message };
  }
}

/**
 * Save shift to Shifts_History sheet in Google Sheets
 */
export async function saveShiftToGasHistory(shift: ShiftInfo): Promise<{ success: boolean; error?: string }> {
  const url = getStoredGasUrl();
  if (!url) return { success: false, error: 'not_configured' };

  try {
    const res = await callGasApi<{ success: boolean; error?: string }>('saveShift', {
      method: 'POST',
      payload: { shift },
    });
    return { success: !!(res && res.success), error: res?.error };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Delete shift from Shifts_History sheet in Google Sheets
 */
export async function deleteShiftFromGasHistory(shiftId: string): Promise<{ success: boolean; error?: string }> {
  const url = getStoredGasUrl();
  if (!url) return { success: false, error: 'not_configured' };

  try {
    const res = await callGasApi<{ success: boolean; error?: string }>('deleteShift', {
      method: 'POST',
      payload: { shiftId },
    });
    return { success: !!(res && res.success), error: res?.error };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Save handovers to Handover_Items sheet in Google Sheets
 */
export async function saveHandoversToGas(handoverItems: HandoverItem[]): Promise<{ success: boolean; error?: string }> {
  const url = getStoredGasUrl();
  if (!url) return { success: false, error: 'not_configured' };

  try {
    const res = await callGasApi<{ success: boolean; error?: string }>('saveHandovers', {
      method: 'POST',
      payload: { handoverItems },
    });
    return { success: !!(res && res.success), error: res?.error };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Save pending charts to Pending_Charts sheet in Google Sheets
 */
export async function savePendingChartsToGas(pendingCharts: PendingChart[]): Promise<{ success: boolean; error?: string }> {
  const url = getStoredGasUrl();
  if (!url) return { success: false, error: 'not_configured' };

  try {
    const res = await callGasApi<{ success: boolean; error?: string }>('savePendingCharts', {
      method: 'POST',
      payload: { pendingCharts },
    });
    return { success: !!(res && res.success), error: res?.error };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
