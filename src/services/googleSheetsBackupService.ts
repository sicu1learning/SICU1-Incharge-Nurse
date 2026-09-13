import {
  ShiftInfo,
  PatientStats,
  HandoverItem,
  PendingChart,
} from '../types';
import {
  saveWardStateToGas,
  fetchWardStateFromGas,
  fetchShiftsHistoryFromGas,
  saveShiftToGasHistory,
  getStoredGasUrl,
  subscribeGasStatus,
  GasConnectionStatus,
  testGasConnection,
  getStoredSpreadsheetInfo,
} from './googleAppsScriptService';

export interface WardBackupPayload {
  currentShift: ShiftInfo;
  patientStats: PatientStats;
  shiftsHistory?: ShiftInfo[];
  handoverItems?: HandoverItem[];
  pendingCharts?: PendingChart[];
  backupTrigger?: string;
}

export interface GoogleSheetsSyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error' | 'unauthenticated';
  lastSyncedAt?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  errorMessage?: string;
}

export interface GoogleSheetsRestorePreview {
  spreadsheetTitle: string;
  sheetsFound: string[];
  shiftsHistoryCount: number;
  activeShiftSummary?: {
    date: string;
    shiftType: string;
    inchargeName: string;
    remaining: number;
  };
  handoverCount: number;
  pendingChartsCount: number;
  previewShifts: ShiftInfo[];
}

export interface GoogleSheetsRestoreResult {
  success: boolean;
  message: string;
  restoredShiftsCount: number;
  restoredHandoverCount: number;
  restoredPendingChartsCount: number;
  mergedShifts?: ShiftInfo[];
  mergedHandovers?: HandoverItem[];
  mergedCharts?: PendingChart[];
  error?: string;
}

export const subscribeGoogleSheetsStatus = (listener: (status: GoogleSheetsSyncStatus) => void) => {
  return subscribeGasStatus((gasStatus: GasConnectionStatus) => {
    let mappedState: GoogleSheetsSyncStatus['state'] = 'idle';
    if (gasStatus.state === 'syncing' || gasStatus.state === 'connecting') mappedState = 'syncing';
    else if (gasStatus.state === 'connected') mappedState = 'synced';
    else if (gasStatus.state === 'error') mappedState = 'error';
    else mappedState = 'unauthenticated';

    listener({
      state: mappedState,
      lastSyncedAt: gasStatus.lastSyncedAt,
      spreadsheetUrl: gasStatus.spreadsheetUrl,
      errorMessage: gasStatus.errorMessage,
    });
  });
};

export const getStoredSpreadsheetId = (): string | null => {
  const info = getStoredSpreadsheetInfo();
  return info.url || null;
};

export const setStoredSpreadsheetId = (idOrUrl: string) => {
  // no-op for backward compatibility
};

export const queueGoogleSheetsBackup = (payload: WardBackupPayload, delayMs: number = 3000) => {
  return triggerImmediateGoogleSheetsBackup(payload);
};

export const triggerImmediateGoogleSheetsBackup = async (
  payload: WardBackupPayload
): Promise<{ success: boolean; spreadsheetUrl?: string; error?: string }> => {
  try {
    const res = await saveWardStateToGas({
      currentShift: payload.currentShift,
      patientStats: payload.patientStats,
      handoverItems: payload.handoverItems,
      pendingCharts: payload.pendingCharts,
    });
    const info = getStoredSpreadsheetInfo();
    return {
      success: res.success,
      spreadsheetUrl: info.url,
      error: res.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

export const previewRestoreFromGoogleSheets = async (): Promise<GoogleSheetsRestorePreview> => {
  const stateRes = await fetchWardStateFromGas();
  const histRes = await fetchShiftsHistoryFromGas();

  const shifts = histRes.shifts || [];
  const handovers = stateRes.handoverItems || [];
  const charts = stateRes.pendingCharts || [];
  const info = getStoredSpreadsheetInfo();

  return {
    spreadsheetTitle: info.name || 'SICU Google Sheets',
    sheetsFound: ['Active_Shift', 'Shifts_History', 'Handover_Items', 'Pending_Charts'],
    shiftsHistoryCount: shifts.length,
    activeShiftSummary: stateRes.activeShift
      ? {
          date: stateRes.activeShift.date,
          shiftType: stateRes.activeShift.shiftType,
          inchargeName: stateRes.activeShift.inchargeName,
          remaining: stateRes.activeShift.stats?.currentRemaining || 0,
        }
      : undefined,
    handoverCount: handovers.length,
    pendingChartsCount: charts.length,
    previewShifts: shifts.slice(0, 5),
  };
};

export const executeRestoreFromGoogleSheets = async (): Promise<GoogleSheetsRestoreResult> => {
  try {
    const stateRes = await fetchWardStateFromGas();
    const histRes = await fetchShiftsHistoryFromGas();

    return {
      success: true,
      message: 'กู้คืนข้อมูลจาก Google Sheets สำเร็จเรียบร้อย',
      restoredShiftsCount: histRes.shifts?.length || 0,
      restoredHandoverCount: stateRes.handoverItems?.length || 0,
      restoredPendingChartsCount: stateRes.pendingCharts?.length || 0,
      mergedShifts: histRes.shifts,
      mergedHandovers: stateRes.handoverItems,
      mergedCharts: stateRes.pendingCharts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'ไม่สามารถกู้คืนข้อมูลได้: ' + (err?.message || 'ข้อผิดพลาดเครือข่าย'),
      restoredShiftsCount: 0,
      restoredHandoverCount: 0,
      restoredPendingChartsCount: 0,
      error: err?.message,
    };
  }
};
