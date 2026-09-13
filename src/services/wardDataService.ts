import { ShiftInfo, PatientStats, HandoverItem, PendingChart } from '../types';
import {
  INITIAL_SHIFT,
  INITIAL_PATIENT_STATS,
  INITIAL_HANDOVER_ITEMS,
  INITIAL_PENDING_CHARTS,
  INITIAL_SHIFTS_HISTORY,
} from '../data/initialData';
import {
  fetchWardStateFromGas,
  saveWardStateToGas,
  fetchShiftsHistoryFromGas,
  saveShiftToGasHistory,
  deleteShiftFromGasHistory,
  saveHandoversToGas,
  savePendingChartsToGas,
  getStoredGasUrl,
  subscribeGasStatus,
  GasConnectionStatus,
} from './googleAppsScriptService';

export const DEFAULT_NURSES = [
  'สัจจพร งามยิ่งยวด',
  'ธิดาพร เท้งสี',
  'สุพรรณษา คุ้มครอง',
  'นัฐภร จันทร์ฟ้าเลื่อม',
  'ชมพูนุท เล็งสาย',
  'เกศินี กำเนิดรัตน์',
];

export interface WardStateSnapshot {
  currentShift: ShiftInfo;
  patientStats: PatientStats;
  handoverItems: HandoverItem[];
  pendingCharts: PendingChart[];
  updatedAt?: string;
}

// In-Memory state of the client session (No local database)
let cachedWardState: WardStateSnapshot = {
  currentShift: INITIAL_SHIFT,
  patientStats: INITIAL_SHIFT.stats || INITIAL_PATIENT_STATS,
  handoverItems: INITIAL_HANDOVER_ITEMS,
  pendingCharts: INITIAL_PENDING_CHARTS,
  updatedAt: new Date().toISOString(),
};

let cachedShiftsHistory: ShiftInfo[] = [];

// Subscribers for Ward State and History
const stateSubscribers = new Set<(state: WardStateSnapshot) => void>();
const historySubscribers = new Set<(shifts: ShiftInfo[]) => void>();

let pollIntervalTimer: any = null;
let isInitialized = false;

function notifyStateSubscribers() {
  stateSubscribers.forEach((cb) => {
    try {
      cb({ ...cachedWardState });
    } catch (e) {
      console.warn('Error in ward state subscriber:', e);
    }
  });
}

function notifyHistorySubscribers() {
  historySubscribers.forEach((cb) => {
    try {
      cb([...cachedShiftsHistory]);
    } catch (e) {
      console.warn('Error in history subscriber:', e);
    }
  });
}

/**
 * Ensures equipmentWeanData is only present on 'เวรบ่าย' (Afternoon shift)
 */
export function sanitizeShiftEquipmentData(shift: ShiftInfo): ShiftInfo {
  if (!shift) return shift;
  const isNotAfternoon = shift.shiftType !== 'เวรบ่าย';

  if (isNotAfternoon && shift.equipmentWeanData) {
    const copy = { ...shift };
    delete copy.equipmentWeanData;
    if (copy.stats) {
      copy.stats = { ...copy.stats, ventilatorCount: 0 };
    }
    return copy;
  }
  return shift;
}

export function sanitizeShiftsList(shifts: ShiftInfo[]): { shifts: ShiftInfo[]; changed: boolean } {
  let changed = false;
  const sanitized = (shifts || []).map((s) => {
    const isNotAfternoon = s.shiftType !== 'เวรบ่าย';

    if (isNotAfternoon && s.equipmentWeanData) {
      changed = true;
      const copy = { ...s };
      delete copy.equipmentWeanData;
      if (copy.stats) {
        copy.stats = { ...copy.stats, ventilatorCount: 0 };
      }
      return copy;
    }
    return s;
  });

  return { shifts: sanitized, changed };
}

/**
 * Filter helpers for legacy mock identifiers
 */
export function isDummyHandoverItem(item: Partial<HandoverItem>): boolean {
  if (!item) return true;
  const id = String(item.id || '');
  return id.startsWith('mock-') || id.startsWith('dummy-');
}

export function isDummyPendingChart(chart: Partial<PendingChart>): boolean {
  if (!chart) return true;
  const id = String(chart.id || '');
  return id.startsWith('mock-') || id.startsWith('dummy-');
}

export function isMockShift(shift: Partial<ShiftInfo>): boolean {
  if (!shift) return true;
  const id = String(shift.id || '');
  return id.startsWith('mock-') || id.startsWith('dummy-');
}

/**
 * Pull latest data from Google Sheets via Google Apps Script Web API
 */
export async function refreshFromGoogleSheets(): Promise<{
  success: boolean;
  error?: string;
}> {
  const gasUrl = getStoredGasUrl();
  if (!gasUrl) {
    return { success: false, error: 'not_configured' };
  }

  try {
    // 1. Fetch current live ward state
    const stateResult = await fetchWardStateFromGas();
    if (stateResult.success) {
      const cleanHandovers = (stateResult.handoverItems || []).filter((h) => !isDummyHandoverItem(h));
      const cleanCharts = (stateResult.pendingCharts || []).filter((c) => !isDummyPendingChart(c));

      let activeShift = stateResult.activeShift;
      if (activeShift && !isMockShift(activeShift)) {
        activeShift = sanitizeShiftEquipmentData(activeShift);
      } else {
        activeShift = cachedWardState.currentShift || INITIAL_SHIFT;
      }

      cachedWardState = {
        currentShift: activeShift,
        patientStats: stateResult.patientStats || activeShift.stats || INITIAL_PATIENT_STATS,
        handoverItems: cleanHandovers,
        pendingCharts: cleanCharts,
        updatedAt: new Date().toISOString(),
      };
      notifyStateSubscribers();
    }

    // 2. Fetch shifts history
    const historyResult = await fetchShiftsHistoryFromGas();
    if (historyResult.success && Array.isArray(historyResult.shifts)) {
      const realShifts = historyResult.shifts.filter((s) => !isMockShift(s));
      const { shifts: sanitized } = sanitizeShiftsList(realShifts);
      cachedShiftsHistory = sanitized;
      notifyHistorySubscribers();
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Google Sheets sync error:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * Initialize Ward Data from Google Sheets
 * - Pulls data immediately on mount
 * - Sets up periodic background polling (every 20s) for real-time multi-device sync (Computer, Tablet, Mobile)
 * - Reloads automatically when browser window gains focus
 */
export function initializeWardData() {
  if (isInitialized) return;
  isInitialized = true;

  // Immediate pull
  refreshFromGoogleSheets();

  // Set up periodic sync (20 seconds) for real-time collaboration
  if (pollIntervalTimer) clearInterval(pollIntervalTimer);
  pollIntervalTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshFromGoogleSheets();
    }
  }, 20000);

  // Sync on tab focus / visibility change
  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshFromGoogleSheets();
      }
    });

    window.addEventListener('focus', () => {
      refreshFromGoogleSheets();
    });
  }
}

/**
 * Subscribe to Ward State updates (Active Shift, Stats, Handovers, Pending Charts)
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
  callback([...cachedShiftsHistory]);
  return () => {
    historySubscribers.delete(callback);
  };
}

/**
 * Sync Active Ward State to Google Sheets
 */
export async function syncWardStateToCloud(
  arg1:
    | ShiftInfo
    | {
        currentShift?: ShiftInfo;
        patientStats?: PatientStats;
        handoverItems?: HandoverItem[];
        pendingCharts?: PendingChart[];
      },
  arg2?: PatientStats,
  arg3?: HandoverItem[],
  arg4?: PendingChart[]
) {
  let shift: ShiftInfo | undefined;
  let stats: PatientStats | undefined;
  let handovers: HandoverItem[] | undefined;
  let charts: PendingChart[] | undefined;

  if (arg1 && typeof arg1 === 'object' && !('id' in arg1)) {
    const payload = arg1 as {
      currentShift?: ShiftInfo;
      patientStats?: PatientStats;
      handoverItems?: HandoverItem[];
      pendingCharts?: PendingChart[];
    };
    shift = payload.currentShift;
    stats = payload.patientStats;
    handovers = payload.handoverItems;
    charts = payload.pendingCharts;
  } else {
    shift = arg1 as ShiftInfo;
    stats = arg2;
    handovers = arg3;
    charts = arg4;
  }

  const sanitizedShift = shift ? sanitizeShiftEquipmentData(shift) : cachedWardState.currentShift;
  const cleanHandovers = (handovers || cachedWardState.handoverItems).filter((i) => !isDummyHandoverItem(i));
  const cleanCharts = (charts || cachedWardState.pendingCharts).filter((c) => !isDummyPendingChart(c));
  const finalStats = stats || cachedWardState.patientStats;

  cachedWardState = {
    currentShift: sanitizedShift,
    patientStats: finalStats,
    handoverItems: cleanHandovers,
    pendingCharts: cleanCharts,
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return saveWardStateToGas({
    currentShift: sanitizedShift,
    patientStats: finalStats,
    handoverItems: cleanHandovers,
    pendingCharts: cleanCharts,
  });
}

/**
 * Sync Shifts History to Google Sheets
 */
export async function syncShiftsHistoryToCloud(shifts: ShiftInfo[]) {
  const realShifts = (shifts || []).filter((s) => !isMockShift(s));
  const { shifts: sanitized } = sanitizeShiftsList(realShifts);
  cachedShiftsHistory = sanitized;
  notifyHistorySubscribers();

  // Save the latest shift to Google Sheets
  if (sanitized.length > 0) {
    const latest = sanitized[0];
    return saveShiftToGasHistory(latest);
  }
  return { success: true };
}

/**
 * Sync Patient Stats to Google Sheets
 */
export async function syncPatientStats(stats: PatientStats, currentShift?: ShiftInfo) {
  const targetShift = currentShift || cachedWardState.currentShift;
  cachedWardState = {
    ...cachedWardState,
    patientStats: stats,
    currentShift: {
      ...targetShift,
      stats,
    },
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return saveWardStateToGas({
    currentShift: cachedWardState.currentShift,
    patientStats: stats,
  });
}

/**
 * Save / Archive a shift to Google Sheets history
 */
export async function saveShiftToGoogleSheets(shift: ShiftInfo) {
  const sanitized = sanitizeShiftEquipmentData(shift);

  // Update local in-memory cache
  cachedShiftsHistory = [sanitized, ...cachedShiftsHistory.filter((s) => s.id !== sanitized.id)];
  notifyHistorySubscribers();

  return saveShiftToGasHistory(sanitized);
}

/**
 * Delete a shift from Google Sheets history
 */
export async function deleteShiftFromGoogleSheets(shiftId: string) {
  cachedShiftsHistory = cachedShiftsHistory.filter((s) => s.id !== shiftId);
  notifyHistorySubscribers();

  return deleteShiftFromGasHistory(shiftId);
}

/**
 * Save Handover items to Google Sheets
 */
export async function saveHandoversToGoogleSheets(items: HandoverItem[]) {
  const cleanItems = items.filter((i) => !isDummyHandoverItem(i));
  cachedWardState = {
    ...cachedWardState,
    handoverItems: cleanItems,
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return saveHandoversToGas(cleanItems);
}

/**
 * Save Pending Charts to Google Sheets
 */
export async function savePendingChartsToGoogleSheets(charts: PendingChart[]) {
  const cleanCharts = charts.filter((c) => !isDummyPendingChart(c));
  cachedWardState = {
    ...cachedWardState,
    pendingCharts: cleanCharts,
    updatedAt: new Date().toISOString(),
  };
  notifyStateSubscribers();

  return savePendingChartsToGas(cleanCharts);
}

// In-memory nurse list subscribers
const nurseSubscribers = new Set<(nurses: string[]) => void>();
let cachedNurseList: string[] = [
  'นัฐภร จันทร์ฟ้าเลื่อม',
  'ธิดาพร เท้งสี',
  'ชมพูนุท เล็งสาย',
  'สุพรรณษา คุ้มครอง',
  'เกศินี กำเนิดรัตน์',
  'วิมลมาศ สุโกมล',
  'จุฑารัตน์ คุณานุศาสน์',
  'สุรีรัตน์ ชาสมบัติ',
  'ปิยพร ธีรศิลป์',
  'สัจจพร งามยิ่งยวด',
];

export function subscribeNurseList(callback: (nurses: string[]) => void): () => void {
  nurseSubscribers.add(callback);
  callback([...cachedNurseList]);
  return () => {
    nurseSubscribers.delete(callback);
  };
}

export async function syncNurseListToCloud(nurses: string[]) {
  cachedNurseList = [...nurses];
  nurseSubscribers.forEach((cb) => {
    try {
      cb([...cachedNurseList]);
    } catch (e) {
      console.warn('Nurse subscriber error:', e);
    }
  });
  return { success: true };
}

