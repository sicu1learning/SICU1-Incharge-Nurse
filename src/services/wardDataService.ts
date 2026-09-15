import {
  ShiftInfo,
  PatientStats,
  HandoverItem,
  HandoverHistoryItem,
  PendingChart,
  ValuableItem,
} from '../types';
import { normalizeThaiDate } from '../utils/shiftUtils';
import {
  getAllData,
  saveShift,
  deleteShift as deleteShiftApi,
  saveActiveShift,
  saveHandover,
  deleteHandover as deleteHandoverApi,
  archiveHandover as archiveHandoverApi,
  savePendingChart,
  deletePendingChart as deletePendingChartApi,
  resolvePendingChart as resolvePendingChartApi,
  saveValuableItem,
  deleteValuableItem as deleteValuableItemApi,
  returnValuableItem as returnValuableItemApi,
  saveNurses,
  resetWardData as resetWardDataApi,
  getGasConnectionStatus,
  subscribeGasStatus,
  GasConnectionStatus,
  extractErrorMessage,
} from './googleSheets';

export const DEFAULT_NURSES: string[] = [
  'นัฐกร จันทร์ฟ้าเลื่อม',
  'ธิดาพร เท้งสี',
  'ชมพูนุท เล็งสาย',
  'สุพรรณษา คุ้มครอง',
  'เกศินี กำเนิดรัตน์',
  'วิมลมาศ สุโกมล',
  'จุฑารัตน์ คุณานุศาสน์',
  'สุรีรัตน์ ชาสมบัติ',
  'ปิยพร ธีรศิลป์',
  'สัจจพร งามยิ่งยศ',
];

export interface WardStateSnapshot {
  currentShift: ShiftInfo | null;
  patientStats: PatientStats | null;
  handoverItems: HandoverItem[];
  handoverHistory: HandoverHistoryItem[];
  pendingCharts: PendingChart[];
  valuableItems: ValuableItem[];
  shiftsHistory: ShiftInfo[];
  nurseList: string[];
  settings: Record<string, any>;
  isLoading: boolean;
  error?: string;
  updatedAt?: string;
}

// In-Memory state of the client session (Google Sheets is the single source of truth)
let cachedWardState: WardStateSnapshot = {
  currentShift: null,
  patientStats: null,
  handoverItems: [],
  handoverHistory: [],
  pendingCharts: [],
  valuableItems: [],
  shiftsHistory: [],
  nurseList: DEFAULT_NURSES,
  settings: {},
  isLoading: true,
  error: undefined,
  updatedAt: undefined,
};

// Subscribers
const stateSubscribers = new Set<(state: WardStateSnapshot) => void>();
const historySubscribers = new Set<(shifts: ShiftInfo[]) => void>();
const nurseSubscribers = new Set<(nurses: string[]) => void>();

let pollIntervalTimer: any = null;
let isInitialized = false;

function notifyStateSubscribers() {
  const snapshot: WardStateSnapshot = {
    ...cachedWardState,
    handoverItems: [...cachedWardState.handoverItems],
    handoverHistory: [...cachedWardState.handoverHistory],
    pendingCharts: [...cachedWardState.pendingCharts],
    valuableItems: [...cachedWardState.valuableItems],
    shiftsHistory: [...cachedWardState.shiftsHistory],
    nurseList: [...cachedWardState.nurseList],
  };

  stateSubscribers.forEach((cb) => {
    try {
      cb(snapshot);
    } catch (e) {
      console.warn('Error in ward state subscriber:', e);
    }
  });

  historySubscribers.forEach((cb) => {
    try {
      cb(snapshot.shiftsHistory);
    } catch (e) {
      console.warn('Error in shifts history subscriber:', e);
    }
  });

  nurseSubscribers.forEach((cb) => {
    try {
      cb(snapshot.nurseList);
    } catch (e) {
      console.warn('Error in nurse list subscriber:', e);
    }
  });
}

/**
 * Ensures shift date is formatted as DD/MM/YYYY and equipmentWeanData is only present on 'เวรบ่าย'
 */
export function sanitizeShiftEquipmentData(shift: ShiftInfo): ShiftInfo {
  if (!shift) return shift;
  const copy = { ...shift };
  if (copy.date) {
    copy.date = normalizeThaiDate(copy.date);
  }
  const isNotAfternoon = copy.shiftType !== 'เวรบ่าย';

  if (isNotAfternoon && copy.equipmentWeanData) {
    delete copy.equipmentWeanData;
    if (copy.stats) {
      copy.stats = { ...copy.stats, ventilatorCount: 0 };
    }
  }
  return copy;
}

export function sanitizeShiftsList(shifts: ShiftInfo[]): { shifts: ShiftInfo[]; changed: boolean } {
  let changed = false;
  const sanitized = (shifts || []).map((s) => {
    const origDate = s.date;
    const cleanDate = normalizeThaiDate(s.date);
    if (origDate !== cleanDate) {
      changed = true;
    }
    const isNotAfternoon = s.shiftType !== 'เวรบ่าย';

    if (isNotAfternoon && s.equipmentWeanData) {
      changed = true;
      const copy = { ...s, date: cleanDate };
      delete copy.equipmentWeanData;
      if (copy.stats) {
        copy.stats = { ...copy.stats, ventilatorCount: 0 };
      }
      return copy;
    }
    if (origDate !== cleanDate) {
      return { ...s, date: cleanDate };
    }
    return s;
  });

  return { shifts: sanitized, changed };
}

let activeRefreshPromise: Promise<{ success: boolean; error?: string }> | null = null;

let lastFetchSuccessTime = 0;
let lastFetchErrorTime = 0;

/**
 * Pull latest data from Google Sheets via Google Apps Script Web API.
 * STRICT RULE: If Google Sheets fails, sets clear error. NEVER mocks data!
 */
export async function refreshFromGoogleSheets(force: boolean = false): Promise<{
  success: boolean;
  error?: string;
}> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  const now = Date.now();
  // Prevent spamming Google Apps Script on failure (15s backoff for background calls)
  if (!force && lastFetchErrorTime > 0 && now - lastFetchErrorTime < 15000) {
    return { success: false, error: cachedWardState.error };
  }

  // Background cooldown: don't auto-fetch if fetched within last 10 seconds
  if (!force && lastFetchSuccessTime > 0 && now - lastFetchSuccessTime < 10000) {
    return { success: true };
  }

  activeRefreshPromise = (async () => {
    try {
      const data = await getAllData();
      lastFetchSuccessTime = Date.now();
      lastFetchErrorTime = 0;

      const sanitizedActiveShift = data.activeShift
        ? sanitizeShiftEquipmentData(data.activeShift)
        : null;

      const { shifts: sanitizedShifts } = sanitizeShiftsList(data.shifts || []);

      const sanitizedPendingCharts = (data.pendingCharts || []).map((chart: any) => ({
        ...chart,
        dateAdded: chart.dateAdded ? normalizeThaiDate(chart.dateAdded) : chart.dateAdded,
      }));

      cachedWardState = {
        currentShift: sanitizedActiveShift,
        patientStats:
          data.patientStats ||
          (sanitizedActiveShift ? sanitizedActiveShift.stats : null),
        handoverItems: data.handoverItems || [],
        handoverHistory: data.handoverHistory || [],
        pendingCharts: sanitizedPendingCharts,
        valuableItems: data.valuableItems || [],
        shiftsHistory: sanitizedShifts,
        nurseList: data.nurses && data.nurses.length > 0 ? data.nurses : cachedWardState.nurseList,
        settings: data.settings || {},
        isLoading: false,
        error: undefined,
        updatedAt: new Date().toISOString(),
      };

      notifyStateSubscribers();
      return { success: true };
    } catch (err: any) {
      lastFetchErrorTime = Date.now();
      const errorMsg = extractErrorMessage(err);
      console.warn('Google Sheets fetch notice:', errorMsg);

      cachedWardState = {
        ...cachedWardState,
        isLoading: false,
        error: errorMsg,
      };
      notifyStateSubscribers();

      return { success: false, error: errorMsg };
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Initialize Ward Data from Google Sheets
 * - Pulls live data immediately on mount
 * - Sets up periodic background polling (every 30s) for real-time multi-device sync
 * - Reloads automatically when browser window gains focus
 */
export function initializeWardData() {
  if (isInitialized) return;
  isInitialized = true;

  // Initial pull
  refreshFromGoogleSheets(true).then((res) => {
    if (!res.success) {
      // Retry once after 10s backoff if initial pull had a transient issue
      setTimeout(() => {
        refreshFromGoogleSheets(false);
      }, 10000);
    }
  });

  if (pollIntervalTimer) clearInterval(pollIntervalTimer);
  pollIntervalTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      refreshFromGoogleSheets(false);
    }
  }, 30000);

  if (typeof window !== 'undefined') {
    let focusDebounce: any = null;
    const handleReactivation = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(focusDebounce);
        focusDebounce = setTimeout(() => {
          refreshFromGoogleSheets(false);
        }, 1500);
      }
    };

    window.addEventListener('visibilitychange', handleReactivation);
    window.addEventListener('focus', handleReactivation);
  }
}

/**
 * Subscribe to Ward State updates
 */
export function subscribeWardState(callback: (state: WardStateSnapshot) => void): () => void {
  stateSubscribers.add(callback);
  callback({ ...cachedWardState });
  return () => {
    stateSubscribers.delete(callback);
  };
}

/**
 * Subscribe to Shifts History updates
 */
export function subscribeShiftsHistory(callback: (shifts: ShiftInfo[]) => void): () => void {
  historySubscribers.add(callback);
  callback([...cachedWardState.shiftsHistory]);
  return () => {
    historySubscribers.delete(callback);
  };
}

/**
 * Subscribe to Nurse List updates
 */
export function subscribeNurseList(callback: (nurses: string[]) => void): () => void {
  nurseSubscribers.add(callback);
  callback([...cachedWardState.nurseList]);
  return () => {
    nurseSubscribers.delete(callback);
  };
}

/**
 * Sync Active Shift to Google Sheets (Active_Shift sheet)
 */
export async function syncWardStateToCloud(
  shift: ShiftInfo,
  stats?: PatientStats
) {
  const sanitized = sanitizeShiftEquipmentData(shift);
  const finalStats = stats || sanitized.stats || cachedWardState.patientStats;

  cachedWardState = {
    ...cachedWardState,
    currentShift: sanitized,
    patientStats: finalStats,
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return saveActiveShift(sanitized);
}

/**
 * Save / Archive a shift to Google Sheets Shifts_History
 */
export async function saveShiftToGoogleSheets(shift: ShiftInfo) {
  const sanitized = sanitizeShiftEquipmentData(shift);

  const existingIdx = cachedWardState.shiftsHistory.findIndex((s) => s.id === sanitized.id);
  let updatedShifts = [...cachedWardState.shiftsHistory];
  if (existingIdx >= 0) {
    updatedShifts[existingIdx] = sanitized;
  } else {
    updatedShifts = [sanitized, ...updatedShifts];
  }

  cachedWardState = {
    ...cachedWardState,
    shiftsHistory: updatedShifts,
    currentShift: sanitized,
    patientStats: sanitized.stats || cachedWardState.patientStats,
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return saveShift(sanitized);
}

/**
 * Delete a shift from Google Sheets Shifts_History
 */
export async function deleteShiftFromGoogleSheets(shiftId: string) {
  cachedWardState = {
    ...cachedWardState,
    shiftsHistory: cachedWardState.shiftsHistory.filter((s) => s.id !== shiftId),
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return deleteShiftApi(shiftId);
}

/**
 * Handover Items
 */
export async function saveHandoverToGoogleSheets(item: HandoverItem) {
  const existingIdx = cachedWardState.handoverItems.findIndex((h) => h.id === item.id);
  let updated = [...cachedWardState.handoverItems];
  if (existingIdx >= 0) {
    updated[existingIdx] = item;
  } else {
    updated = [item, ...updated];
  }

  cachedWardState = {
    ...cachedWardState,
    handoverItems: updated,
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return saveHandover(item);
}

export async function archiveHandoverInGoogleSheets(
  itemId: string,
  resolvedBy?: string,
  resolutionNote?: string
) {
  const target = cachedWardState.handoverItems.find((h) => h.id === itemId);
  if (!target) return { success: false, error: 'Item not found' };

  cachedWardState = {
    ...cachedWardState,
    handoverItems: cachedWardState.handoverItems.filter((h) => h.id !== itemId),
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return archiveHandoverApi(itemId, {
    archivedBy: resolvedBy,
    reason: resolutionNote,
  });
}

export async function deleteHandoverFromGoogleSheets(itemId: string) {
  cachedWardState = {
    ...cachedWardState,
    handoverItems: cachedWardState.handoverItems.filter((h) => h.id !== itemId),
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return deleteHandoverApi(itemId);
}

/**
 * Pending Charts
 */
export async function savePendingChartToGoogleSheets(chart: PendingChart) {
  const existingIdx = cachedWardState.pendingCharts.findIndex((c) => c.id === chart.id);
  let updated = [...cachedWardState.pendingCharts];
  if (existingIdx >= 0) {
    updated[existingIdx] = chart;
  } else {
    updated = [chart, ...updated];
  }

  cachedWardState = {
    ...cachedWardState,
    pendingCharts: updated,
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return savePendingChart(chart);
}

export async function resolvePendingChartInGoogleSheets(chartId: string) {
  cachedWardState = {
    ...cachedWardState,
    pendingCharts: cachedWardState.pendingCharts.filter((c) => c.id !== chartId),
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return resolvePendingChartApi(chartId);
}

export async function deletePendingChartFromGoogleSheets(chartId: string) {
  cachedWardState = {
    ...cachedWardState,
    pendingCharts: cachedWardState.pendingCharts.filter((c) => c.id !== chartId),
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return deletePendingChartApi(chartId);
}

/**
 * Valuable Items
 */
export async function saveValuableItemToGoogleSheets(item: ValuableItem) {
  const existingIdx = cachedWardState.valuableItems.findIndex((v) => v.id === item.id);
  let updated = [...cachedWardState.valuableItems];
  if (existingIdx >= 0) {
    updated[existingIdx] = item;
  } else {
    updated = [item, ...updated];
  }

  cachedWardState = {
    ...cachedWardState,
    valuableItems: updated,
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return saveValuableItem(item);
}

export async function returnValuableItemInGoogleSheets(
  itemId: string,
  returnedTo: string,
  witness?: string
) {
  cachedWardState = {
    ...cachedWardState,
    valuableItems: cachedWardState.valuableItems.map((v) =>
      v.id === itemId
        ? {
            ...v,
            status: 'returned' as const,
            returnedAt: new Date().toISOString(),
            returnedTo,
            witness,
          }
        : v
    ),
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return returnValuableItemApi(itemId, returnedTo, witness);
}

export async function deleteValuableItemFromGoogleSheets(itemId: string) {
  cachedWardState = {
    ...cachedWardState,
    valuableItems: cachedWardState.valuableItems.filter((v) => v.id !== itemId),
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return deleteValuableItemApi(itemId);
}

/**
 * Nurse List Sync
 */
export async function syncNurseListToCloud(nurses: string[]) {
  cachedWardState = {
    ...cachedWardState,
    nurseList: [...nurses],
  };
  notifyStateSubscribers();

  return saveNurses(nurses);
}

/**
 * Reset all ward data to fresh state
 * Clears active shift, handovers, pending charts, and wipes test/mock records
 */
export async function resetAllWardData() {
  cachedWardState = {
    ...cachedWardState,
    isLoading: true,
  };
  notifyStateSubscribers();

  const res = await resetWardDataApi();
  if (res.success) {
    cachedWardState = {
      ...cachedWardState,
      currentShift: null,
      patientStats: null,
      handoverItems: [],
      pendingCharts: [],
      valuableItems: [],
      isLoading: false,
      error: undefined,
      updatedAt: new Date().toISOString(),
    };
  } else {
    cachedWardState = {
      ...cachedWardState,
      isLoading: false,
      error: res.error,
    };
  }
  notifyStateSubscribers();
  return res;
}

