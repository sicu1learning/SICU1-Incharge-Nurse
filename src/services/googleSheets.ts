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
}

const STORAGE_KEY_CUSTOM_GAS_URL = 'sicu_custom_gas_url';

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
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_GAS_URL);
    if (saved && typeof saved === 'string' && saved.startsWith('http')) {
      return saved.trim();
    }
  } catch {
    // ignore
  }
  return '';
}

export function setCustomGasUrl(url: string) {
  const trimmed = (url || '').trim();
  try {
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_GAS_URL, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_GAS_URL);
    }
  } catch {
    // ignore
  }
  currentStatus = {
    ...currentStatus,
    customUrl: trimmed,
    state: 'connecting',
    errorMessage: undefined,
  };
  notifyListeners();
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
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<T> {
  const customUrl = getCustomGasUrl();
  const timeoutMs = options.timeoutMs || 30000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
    const response = await fetch('/api/gas', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        ...(payload || {}),
      }),
      signal: options.signal || controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      let errText = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errText = errJson.error;
        }
      } catch {
        // use default
      }
      throw new Error(errText);
    }

    const data = await response.json();

    if (!data || data.success === false) {
      const errMsg = data?.error || data?.message || 'Google Sheets API returned success=false';
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
    const msg = error?.message || 'ไม่สามารถติดต่อ Google Sheets ผ่าน /api/gas ได้';
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
  const res = await callGasApi<{
    success: boolean;
    activeShift: ShiftInfo | null;
    patientStats: PatientStats | null;
    shifts: ShiftInfo[];
    nurses: string[];
    valuableItems: ValuableItem[];
    pendingCharts: PendingChart[];
    handoverItems: HandoverItem[];
    handoverHistory: HandoverHistoryItem[];
    settings?: Record<string, any>;
    spreadsheetName?: string;
    spreadsheetUrl?: string;
  }>('getAllData');

  return {
    activeShift: res.activeShift || null,
    patientStats: res.patientStats || (res.activeShift ? res.activeShift.stats : null),
    shifts: Array.isArray(res.shifts) ? res.shifts : [],
    nurses: Array.isArray(res.nurses) ? res.nurses : [],
    valuableItems: Array.isArray(res.valuableItems) ? res.valuableItems : [],
    pendingCharts: Array.isArray(res.pendingCharts) ? res.pendingCharts : [],
    handoverItems: Array.isArray(res.handoverItems) ? res.handoverItems : [],
    handoverHistory: Array.isArray(res.handoverHistory) ? res.handoverHistory : [],
    settings: res.settings || {},
    spreadsheetName: res.spreadsheetName,
    spreadsheetUrl: res.spreadsheetUrl,
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

export async function testGasConnection(): Promise<GasConnectionStatus> {
  await callGasApi('ping');
  return { ...currentStatus };
}
