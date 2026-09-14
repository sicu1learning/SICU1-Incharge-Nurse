import {
  ShiftInfo,
  PatientStats,
  HandoverItem,
  HandoverHistoryItem,
  PendingChart,
  ValuableItem,
} from '../types';

export type GasConnectionState =
  | 'not_configured'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'syncing';

export interface GasConnectionStatus {
  state: GasConnectionState;
  lastSyncedAt?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  errorMessage?: string;
  isProxyConfigured?: boolean;
  customUrl?: string;
  url?: string;
}

// In-memory runtime URL for the active session (Strict No localStorage/No Database policy)
let runtimeGasUrl: string = '';

let currentStatus: GasConnectionStatus = {
  state: 'connecting',
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

export function subscribeGasStatus(
  callback: (status: GasConnectionStatus) => void
): () => void {
  listeners.add(callback);
  callback({ ...currentStatus });
  return () => {
    listeners.delete(callback);
  };
}

export function getGasConnectionStatus(): GasConnectionStatus {
  return { ...currentStatus };
}

export function getCustomGasUrl(): string {
  if (runtimeGasUrl && runtimeGasUrl.startsWith('http')) {
    return runtimeGasUrl;
  }
  return '';
}

export function setCustomGasUrl(url: string) {
  const trimmed = (url || '').trim();
  runtimeGasUrl = trimmed;

  currentStatus = {
    ...currentStatus,
    customUrl: trimmed,
    url: trimmed,
    state: trimmed ? 'connecting' : 'not_configured',
    errorMessage: undefined,
  };
  notifyListeners();
}

export const getStoredGasUrl = getCustomGasUrl;
export const setStoredGasUrl = setCustomGasUrl;

export function getStoredSpreadsheetInfo(): { name?: string; url?: string } {
  return {
    name: currentStatus.spreadsheetName,
    url: currentStatus.spreadsheetUrl,
  };
}

export async function testGasConnection(url?: string): Promise<{
  success: boolean;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  error?: string;
}> {
  try {
    if (url) {
      setCustomGasUrl(url);
    }
    const res = await callGasApi<{
      success: boolean;
      spreadsheetName?: string;
      spreadsheetUrl?: string;
      error?: string;
    }>('testConnection');

    return {
      success: true,
      spreadsheetName: res.spreadsheetName,
      spreadsheetUrl: res.spreadsheetUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'การเชื่อมต่อกับ Google Sheets ล้มเหลว',
    };
  }
}

/**
 * Check if the server proxy has GOOGLE_APPS_SCRIPT_URL configured in process.env
 */
export async function checkServerConfig(): Promise<boolean> {
  try {
    const res = await fetch('/api/gas/status');
    if (res.ok) {
      const data = await res.json();
      currentStatus = {
        ...currentStatus,
        isProxyConfigured: Boolean(data.configured),
      };
      notifyListeners();
      return Boolean(data.configured);
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Central Google Apps Script Request Dispatcher
 * Calls /api/gas proxy on the server.
 * IMPORTANT: Strictly throws on error. Never falls back to mock data!
 */
export async function callGasApi<T = any>(
  action: string,
  payload?: any,
  options: { timeoutMs?: number; signal?: AbortSignal; method?: 'POST' | 'GET' } = {}
): Promise<T> {
  const customUrl = getCustomGasUrl();
  const timeoutMs = options.timeoutMs || 45000;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('การเชื่อมต่อกับ Google Apps Script หมดเวลา (Timeout 45s)')),
    timeoutMs
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (customUrl) {
    headers['x-gas-url'] = customUrl;
  }

  currentStatus = {
    ...currentStatus,
    state: currentStatus.state === 'connected' ? 'syncing' : 'connecting',
    errorMessage: undefined,
  };
  notifyListeners();

  try {
    const fetchMethod = options.method || 'POST';
    let url = '/api/gas';
    let body: string | undefined = undefined;

    if (fetchMethod === 'POST') {
      body = JSON.stringify({
        action,
        ...(payload || {}),
      });
    } else {
      const q = new URLSearchParams();
      q.set('action', action);
      if (payload) {
        for (const [k, v] of Object.entries(payload)) {
          if (v !== undefined) q.set(k, String(v));
        }
      }
      url = `/api/gas?${q.toString()}`;
    }

    let response: Response | null = null;
    let lastNetworkErr: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(url, {
          method: fetchMethod,
          headers,
          body,
          signal: options.signal || controller.signal,
        });
        if (response) break;
      } catch (fetchErr: any) {
        lastNetworkErr = fetchErr;
        // Do not retry if aborted
        if (fetchErr?.name === 'AbortError' || controller.signal.aborted) {
          throw fetchErr;
        }
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
        }
      }
    }

    clearTimeout(timer);

    if (!response) {
      throw lastNetworkErr || new Error('ไม่สามารถเชื่อมต่อเครือข่ายกับเซิร์ฟเวอร์ระบบได้ (Failed to fetch)');
    }

    const rawText = await response.text();

    if (rawText.trim().startsWith('<') || rawText.toLowerCase().includes('<!doctype') || rawText.toLowerCase().includes('<html')) {
      throw new Error(
        'Google Apps Script ส่งกลับเป็นหน้าเว็บ HTML (กรุณาตรวจสอบว่าได้ตั้งค่า Deploy Web App ให้ "Who has access" เป็น "Anyone" และใช้ URL ที่ลงท้ายด้วย "/exec")'
      );
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`ข้อมูลที่ได้รับจาก Google Sheets ไม่ถูกต้อง: ${rawText.slice(0, 100)}`);
    }

    if (!response.ok) {
      const errText = data?.error || data?.message || `HTTP ${response.status} ${response.statusText}`;
      throw new Error(errText);
    }

    // Auto-fallback: if POST returned unknown action and we haven't tried GET, or try getState
    if (!data || data.success === false) {
      const errMsg = data?.error || data?.message || 'Google Sheets API returned success=false';
      if (typeof errMsg === 'string' && errMsg.includes('Unknown') && fetchMethod === 'POST') {
        // Retry via GET
        return await callGasApi<T>(action, payload, { ...options, method: 'GET' });
      }
      throw new Error(errMsg);
    }

    currentStatus = {
      ...currentStatus,
      state: 'connected',
      lastSyncedAt: new Date().toISOString(),
      errorMessage: undefined,
      spreadsheetName: data.spreadsheetName || currentStatus.spreadsheetName,
      spreadsheetUrl: data.spreadsheetUrl || currentStatus.spreadsheetUrl,
    };
    notifyListeners();

    return data as T;
  } catch (error: any) {
    clearTimeout(timer);
    let msg: string;

    if (error.name === 'AbortError' || String(error.message).includes('aborted')) {
      msg = 'การเชื่อมต่อกับ Google Apps Script ใช้เวลานานกว่าปกติ (Timeout 45s) หรือถูกยกเลิก กรุณาลองใหม่อีกครั้ง';
    } else if (String(error.message).includes('Failed to fetch') || String(error.message).includes('NetworkError')) {
      msg = 'ไม่สามารถเชื่อมต่อเครือข่ายได้ชั่วคราว (Network connection interrupted) ระบบจะลองเชื่อมต่อใหม่โดยอัตโนมัติ';
    } else {
      msg = error?.message || 'ไม่สามารถติดต่อ Google Sheets ผ่าน /api/gas ได้';
    }

    currentStatus = {
      ...currentStatus,
      state: 'error',
      errorMessage: msg,
    };
    notifyListeners();
    // Rule: Throw error immediately! Never fallback to mock data!
    throw new Error(msg);
  }
}

// =============================================================================
// Required Functions Specified by User
// =============================================================================

export interface AllWardData {
  activeShift: ShiftInfo | null;
  patientStats: PatientStats | null;
  shifts: ShiftInfo[];
  nurses: string[];
  valuableItems: ValuableItem[];
  pendingCharts: PendingChart[];
  handoverItems: HandoverItem[];
  handoverHistory: HandoverHistoryItem[];
  settings: Record<string, any>;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
}

/**
 * 1. getAllData()
 * Loads all ward datasets in a single efficient request.
 */
export async function getAllData(): Promise<AllWardData> {
  let res: any;
  try {
    res = await callGasApi('getAllData');
  } catch (err: any) {
    // If getAllData failed with Unknown action, try getState
    if (String(err?.message || '').includes('Unknown')) {
      res = await callGasApi('getState');
    } else {
      throw err;
    }
  }

  const payload = res?.data || res || {};

  return {
    activeShift: payload.activeShift || null,
    patientStats: payload.patientStats || (payload.activeShift ? payload.activeShift.stats : null),
    shifts: Array.isArray(payload.shifts) ? payload.shifts : [],
    nurses: Array.isArray(payload.nurses) ? payload.nurses : [],
    valuableItems: Array.isArray(payload.valuableItems) ? payload.valuableItems : [],
    pendingCharts: Array.isArray(payload.pendingCharts) ? payload.pendingCharts : [],
    handoverItems: Array.isArray(payload.handoverItems) ? payload.handoverItems : [],
    handoverHistory: Array.isArray(payload.handoverHistory) ? payload.handoverHistory : [],
    settings: payload.settings || {},
    spreadsheetName: res?.spreadsheetName || payload.spreadsheetName,
    spreadsheetUrl: res?.spreadsheetUrl || payload.spreadsheetUrl,
  };
}

/**
 * 2. getShifts()
 * Retrieves full shift history from Shifts_History sheet.
 */
export async function getShifts(): Promise<ShiftInfo[]> {
  const res = await callGasApi<{ success: boolean; shifts: ShiftInfo[] }>('getShifts');
  return Array.isArray(res.shifts) ? res.shifts : [];
}

/**
 * 3. getNurses()
 * Retrieves the ward nurses directory from Nurses sheet.
 */
export async function getNurses(): Promise<string[]> {
  const res = await callGasApi<{ success: boolean; nurses: string[] }>('getNurses');
  return Array.isArray(res.nurses) ? res.nurses : [];
}

/**
 * 4. getValuableItems()
 * Retrieves patient valuable items from Valuable_Items sheet.
 */
export async function getValuableItems(): Promise<ValuableItem[]> {
  const res = await callGasApi<{ success: boolean; valuableItems: ValuableItem[] }>('getValuableItems');
  return Array.isArray(res.valuableItems) ? res.valuableItems : [];
}

/**
 * 5. getPendingCharts()
 * Retrieves pending medical records from Pending_Charts sheet.
 */
export async function getPendingCharts(): Promise<PendingChart[]> {
  const res = await callGasApi<{ success: boolean; pendingCharts: PendingChart[] }>('getPendingCharts');
  return Array.isArray(res.pendingCharts) ? res.pendingCharts : [];
}

/**
 * 6. getHandoverItems()
 * Retrieves only ACTIVE handover items from Handover_Items sheet.
 */
export async function getHandoverItems(): Promise<HandoverItem[]> {
  const res = await callGasApi<{ success: boolean; handoverItems: HandoverItem[] }>('getHandoverItems');
  return Array.isArray(res.handoverItems) ? res.handoverItems : [];
}

/**
 * 7. getHandoverHistory()
 * Retrieves archived handover items from Handover_History sheet.
 */
export async function getHandoverHistory(): Promise<HandoverHistoryItem[]> {
  const res = await callGasApi<{ success: boolean; handoverHistory: HandoverHistoryItem[] }>('getHandoverHistory');
  return Array.isArray(res.handoverHistory) ? res.handoverHistory : [];
}

/**
 * 8. saveShift()
 * Saves or updates shift in Shifts_History and Active_Shift (deduplicated by primary key id).
 */
export async function saveShift(shift: ShiftInfo): Promise<{ success: boolean; shiftId: string }> {
  if (!shift || !shift.id) {
    throw new Error('Cannot save shift: missing shift.id');
  }
  const res = await callGasApi<{ success: boolean; shiftId: string }>('saveShift', {
    shift,
  });
  return { success: res.success, shiftId: res.shiftId || shift.id };
}

/**
 * 9. saveValuableItem()
 * Saves or updates patient valuable item in Valuable_Items sheet (deduplicated by primary key id).
 */
export async function saveValuableItem(item: ValuableItem): Promise<{ success: boolean; item: ValuableItem }> {
  if (!item || !item.id) {
    throw new Error('Cannot save valuable item: missing item.id');
  }
  const res = await callGasApi<{ success: boolean; item: ValuableItem }>('saveValuableItem', {
    item,
  });
  return { success: res.success, item: res.item || item };
}

/**
 * 10. savePendingChart()
 * Saves or updates pending chart in Pending_Charts sheet (deduplicated by primary key id).
 */
export async function savePendingChart(chart: PendingChart): Promise<{ success: boolean; chart: PendingChart }> {
  if (!chart || !chart.id) {
    throw new Error('Cannot save pending chart: missing chart.id');
  }
  const res = await callGasApi<{ success: boolean; chart: PendingChart }>('savePendingChart', {
    chart,
  });
  return { success: res.success, chart: res.chart || chart };
}

/**
 * 11. saveHandoverItem()
 * Saves or updates active handover item in Handover_Items sheet (deduplicated by primary key id).
 */
export async function saveHandoverItem(item: HandoverItem): Promise<{ success: boolean; item: HandoverItem }> {
  if (!item || !item.id) {
    throw new Error('Cannot save handover item: missing item.id');
  }
  const res = await callGasApi<{ success: boolean; item: HandoverItem }>('saveHandoverItem', {
    item,
  });
  return { success: res.success, item: res.item || item };
}

/**
 * 12. archiveHandoverItem()
 * Archives a handover item:
 * - Appends to Handover_History sheet with source_handover_id
 * - Removes from active Handover_Items sheet
 * - Does NOT permanently delete from Google Sheets
 */
export async function archiveHandoverItem(
  itemId: string,
  metadata?: { archivedBy?: string; reason?: string }
): Promise<{ success: boolean; source_handover_id?: string }> {
  if (!itemId) {
    throw new Error('Cannot archive handover item: missing itemId');
  }
  const res = await callGasApi<{
    success: boolean;
    source_handover_id?: string;
  }>('archiveHandoverItem', {
    id: itemId,
    archivedBy: metadata?.archivedBy || '',
    archiveReason: metadata?.reason || 'Archived from Dashboard',
  });
  return { success: res.success, source_handover_id: res.source_handover_id || itemId };
}

export async function saveActiveShift(shift: ShiftInfo): Promise<{ success: boolean; shiftId: string }> {
  const activeShift = { ...shift, isActive: true };
  const res = await callGasApi<{ success: boolean; shiftId: string }>('saveShift', {
    shift: activeShift,
  });
  return { success: res.success, shiftId: res.shiftId || shift.id };
}

export const saveHandover = saveHandoverItem;
export const archiveHandover = archiveHandoverItem;

export async function deleteHandover(id: string): Promise<boolean> {
  const res = await callGasApi<{ success: boolean }>('deleteHandoverItem', { id });
  return res.success;
}
export const deleteHandoverItem = deleteHandover;

export async function resolvePendingChart(id: string): Promise<boolean> {
  const res = await callGasApi<{ success: boolean }>('deletePendingChart', { id });
  return res.success;
}

export async function returnValuableItem(
  id: string,
  returnedTo?: string,
  witness?: string
): Promise<boolean> {
  const res = await callGasApi<{ success: boolean }>('saveValuableItem', {
    item: {
      id,
      status: 'returned',
      returnedAt: new Date().toISOString(),
      returnedTo: returnedTo || '',
      witness: witness || '',
    },
  });
  return res.success;
}

// =============================================================================
// Additional Utility & Deletion Handlers
// =============================================================================

export async function deleteShift(shiftId: string): Promise<boolean> {
  const res = await callGasApi<{ success: boolean }>('deleteShift', {
    shiftId,
  });
  return res.success;
}

export async function deleteValuableItem(id: string): Promise<boolean> {
  const res = await callGasApi<{ success: boolean }>('deleteValuableItem', {
    id,
  });
  return res.success;
}

export async function deletePendingChart(id: string): Promise<boolean> {
  const res = await callGasApi<{ success: boolean }>('deletePendingChart', {
    id,
  });
  return res.success;
}

export async function saveNurses(nurses: string[]): Promise<boolean> {
  const res = await callGasApi<{ success: boolean }>('saveNurses', {
    nurses,
  });
  return res.success;
}
