import React, { useState, useEffect } from 'react';
import {
  ShiftInfo,
  PatientStats,
  HandoverItem,
  HandoverHistoryItem,
  PendingChart,
} from './types';
import { Header } from './components/Header';
import { HeroShiftBanner } from './components/HeroShiftBanner';
import { PatientSummaryCard } from './components/PatientSummaryCard';
import { QuickSummaryCards } from './components/QuickSummaryCards';
import { HandoverSection } from './components/HandoverSection';
import { PendingChartSection } from './components/PendingChartSection';
import { HandoverHistoryModal } from './components/HandoverHistoryModal';
import { AddShiftModal } from './components/AddShiftModal';
import { EditShiftModal } from './components/EditShiftModal';
import { HandoverLogsView } from './components/HandoverLogsView';
import { DashboardStatsModal } from './components/DashboardStatsModal';
import { GoogleAppsScriptModal } from './components/GoogleAppsScriptModal';
import {
  initializeWardData,
  subscribeWardState,
  syncWardStateToCloud,
  saveShiftToGoogleSheets,
  deleteShiftFromGoogleSheets,
  saveHandoverToGoogleSheets,
  archiveHandoverInGoogleSheets,
  deleteHandoverFromGoogleSheets,
  savePendingChartToGoogleSheets,
  resolvePendingChartInGoogleSheets,
  deletePendingChartFromGoogleSheets,
  refreshFromGoogleSheets,
  sanitizeShiftEquipmentData,
  sanitizeShiftsList,
} from './services/wardDataService';
import {
  subscribeGasStatus,
  GasConnectionStatus,
  getCustomGasUrl,
} from './services/googleSheets';
import { AlertCircle, FileSpreadsheet, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';

const EMPTY_PATIENT_STATS: PatientStats = {
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
};

export default function App() {
  // Navigation view mode (UI state only)
  const [currentView, setCurrentView] = useState<'dashboard' | 'logs'>('dashboard');

  // Google Apps Script Connection Status
  const [gasStatus, setGasStatus] = useState<GasConnectionStatus>({
    state: getCustomGasUrl() ? 'connecting' : 'connected',
  });

  // Ward Data States (Pure Google Sheets is the only source of truth - No mock data)
  const [currentShift, setCurrentShift] = useState<ShiftInfo | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<ShiftInfo[]>([]);
  const [patientStats, setPatientStats] = useState<PatientStats>(EMPTY_PATIENT_STATS);
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>([]);
  const [handoverHistory, setHandoverHistory] = useState<HandoverHistoryItem[]>([]);
  const [pendingCharts, setPendingCharts] = useState<PendingChart[]>([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Modals state
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [isEditActiveShiftOpen, setIsEditActiveShiftOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [isHandoverHistoryOpen, setIsHandoverHistoryOpen] = useState(false);

  // Subscribe to Google Apps Script connection status
  useEffect(() => {
    const unsub = subscribeGasStatus((status) => setGasStatus(status));
    return unsub;
  }, []);

  // Initialize data from Google Sheets & subscribe to real-time online updates
  useEffect(() => {
    initializeWardData();

    // Subscribe to all ward data updates directly from Google Sheets
    const unsubscribeWard = subscribeWardState((sheetState) => {
      setIsLoading(sheetState.isLoading);
      setErrorMessage(sheetState.error);

      if (sheetState.currentShift) {
        setCurrentShift(sheetState.currentShift);
      }
      if (sheetState.patientStats) {
        setPatientStats(sheetState.patientStats);
      } else if (sheetState.currentShift?.stats) {
        setPatientStats(sheetState.currentShift.stats);
      }
      setHandoverItems(sheetState.handoverItems || []);
      setHandoverHistory(sheetState.handoverHistory || []);
      setPendingCharts(sheetState.pendingCharts || []);
      setShiftsHistory(sheetState.shiftsHistory || []);
    });

    return () => {
      unsubscribeWard();
    };
  }, []);

  // Sync patientStats whenever currentShift updates
  useEffect(() => {
    if (currentShift?.stats) {
      setPatientStats((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(currentShift.stats)) return prev;
        return currentShift.stats!;
      });
    }
  }, [currentShift]);

  // Handlers
  const handleUpdateStats = (newStats: PatientStats) => {
    setPatientStats(newStats);
    if (!currentShift) return;

    const updatedShift: ShiftInfo = {
      ...currentShift,
      stats: newStats,
      updatedAt: `${new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
    };
    setCurrentShift(updatedShift);

    // Save directly to Google Sheets via Google Apps Script API
    syncWardStateToCloud(updatedShift, newStats).catch((err) =>
      console.warn('Failed to save stats to Google Sheets:', err)
    );
  };

  const handleAddShift = (newShift: ShiftInfo) => {
    const currentShiftInHistory = currentShift
      ? shiftsHistory.find((s) => s.id === currentShift.id)
      : null;

    const combinedHandovers = [
      ...handoverItems,
      ...(currentShiftInHistory?.handoverItems?.filter(
        (hi) => !handoverItems.some((h) => h.id === hi.id)
      ) || []),
    ];

    const combinedCharts = [
      ...pendingCharts,
      ...(currentShiftInHistory?.pendingCharts?.filter(
        (pc) => !pendingCharts.some((c) => c.id === pc.id)
      ) || []),
    ];

    const completedCurrentShift: ShiftInfo | null = currentShift
      ? sanitizeShiftEquipmentData({
          ...currentShift,
          stats: patientStats,
          handoverItems: combinedHandovers,
          pendingCharts: combinedCharts,
          isActive: false,
        })
      : null;

    const finalHandovers =
      newShift.handoverItems && newShift.handoverItems.length > 0
        ? newShift.handoverItems
        : [...handoverItems];

    const carriedCharts = pendingCharts.map((chart) => ({
      ...chart,
      daysPending: (chart.daysPending || 1) + 1,
    }));

    const updatedNewShift: ShiftInfo = sanitizeShiftEquipmentData({
      ...newShift,
      handoverItems: finalHandovers,
      pendingCharts: carriedCharts,
      isActive: true,
    });

    const newShiftsList = completedCurrentShift
      ? [
          updatedNewShift,
          completedCurrentShift,
          ...shiftsHistory.filter(
            (s) => s.id !== currentShift?.id && s.id !== newShift.id
          ),
        ]
      : [updatedNewShift, ...shiftsHistory.filter((s) => s.id !== newShift.id)];

    setShiftsHistory(newShiftsList);
    setCurrentShift(updatedNewShift);
    setPatientStats(newShift.stats);
    setHandoverItems(finalHandovers);
    setPendingCharts(carriedCharts);
    setIsAddShiftOpen(false);

    // Persist to Google Sheets Active_Shift & Shifts_History
    syncWardStateToCloud(updatedNewShift, newShift.stats).catch((err) =>
      console.warn('Failed to sync state to Google Sheets:', err)
    );

    if (completedCurrentShift) {
      saveShiftToGoogleSheets(completedCurrentShift).catch((err) =>
        console.warn('Failed to archive shift to Google Sheets:', err)
      );
    }
    saveShiftToGoogleSheets(updatedNewShift).catch((err) =>
      console.warn('Failed to save new shift to Google Sheets:', err)
    );
  };

  const handleDeleteShift = (shiftId: string) => {
    const updatedHistory = shiftsHistory.filter((s) => s.id !== shiftId);
    setShiftsHistory(updatedHistory);

    deleteShiftFromGoogleSheets(shiftId).catch((err) =>
      console.warn('Failed to delete shift from Google Sheets:', err)
    );

    if (currentShift?.id === shiftId && updatedHistory.length > 0) {
      const nextShift = updatedHistory[0];
      setCurrentShift(nextShift);
      if (nextShift.stats) setPatientStats(nextShift.stats);
      if (nextShift.handoverItems) setHandoverItems(nextShift.handoverItems);
      if (nextShift.pendingCharts) setPendingCharts(nextShift.pendingCharts);

      syncWardStateToCloud(nextShift, nextShift.stats).catch((err) =>
        console.warn('Failed to sync next shift to Google Sheets:', err)
      );
    }
  };

  const handleSelectShiftAsActive = (selected: ShiftInfo) => {
    const updatedHistory = shiftsHistory.map((s) => ({
      ...s,
      isActive: s.id === selected.id,
    }));
    const updatedActive: ShiftInfo = {
      ...selected,
      isActive: true,
    };

    setShiftsHistory(updatedHistory);
    setCurrentShift(updatedActive);
    if (selected.stats) setPatientStats(selected.stats);
    if (selected.handoverItems) setHandoverItems(selected.handoverItems);
    if (selected.pendingCharts) setPendingCharts(selected.pendingCharts);

    syncWardStateToCloud(updatedActive, selected.stats).catch((err) =>
      console.warn('Failed to sync active shift to Google Sheets:', err)
    );

    saveShiftToGoogleSheets(updatedActive).catch((err) =>
      console.warn('Failed to save active shift to Google Sheets:', err)
    );

    setCurrentView('dashboard');
  };

  const handleEditShift = (rawUpdatedShift: ShiftInfo) => {
    const updatedShift = sanitizeShiftEquipmentData(rawUpdatedShift);
    const isTargetActive =
      currentShift?.id === updatedShift.id ||
      Boolean(updatedShift.isActive) ||
      shiftsHistory.length === 0 ||
      shiftsHistory[0]?.id === updatedShift.id;

    const existsInHistory = shiftsHistory.some((s) => s.id === updatedShift.id);
    const updatedHistory = existsInHistory
      ? shiftsHistory.map((s) =>
          s.id === updatedShift.id
            ? { ...updatedShift, isActive: isTargetActive ? true : s.isActive }
            : s
        )
      : [{ ...updatedShift, isActive: isTargetActive }, ...shiftsHistory];

    setShiftsHistory(updatedHistory);

    saveShiftToGoogleSheets(updatedShift).catch((err) =>
      console.warn('Failed to save edited shift to Google Sheets:', err)
    );

    if (isTargetActive) {
      const activeShift = { ...updatedShift, isActive: true };
      setCurrentShift(activeShift);
      if (updatedShift.stats) {
        setPatientStats(updatedShift.stats);
      }
      syncWardStateToCloud(activeShift, updatedShift.stats).catch((err) =>
        console.warn('Failed to sync updated active shift to Google Sheets:', err)
      );
    }
  };

  // Handover Operations
  const handleAddHandover = (itemData: Omit<HandoverItem, 'id' | 'createdAt'>) => {
    const newItem: HandoverItem = {
      ...itemData,
      id: 'ho-' + Date.now(),
      createdAt: new Date().toISOString(),
      shiftId: currentShift?.id || 'shift-live',
    };
    const updatedHandovers = [newItem, ...handoverItems];
    setHandoverItems(updatedHandovers);

    saveHandoverToGoogleSheets(newItem).catch((err) =>
      console.warn('Failed to save handover to Google Sheets:', err)
    );
  };

  const handleEditHandover = (id: string, updated: Partial<HandoverItem>) => {
    const target = handoverItems.find((i) => i.id === id);
    if (!target) return;
    const updatedItem = { ...target, ...updated };

    const updatedHandovers = handoverItems.map((item) =>
      item.id === id ? updatedItem : item
    );
    setHandoverItems(updatedHandovers);

    saveHandoverToGoogleSheets(updatedItem).catch((err) =>
      console.warn('Failed to save handover to Google Sheets:', err)
    );
  };

  const handleDeleteHandover = (id: string) => {
    const updatedHandovers = handoverItems.filter((item) => item.id !== id);
    setHandoverItems(updatedHandovers);

    deleteHandoverFromGoogleSheets(id).catch((err) =>
      console.warn('Failed to delete handover from Google Sheets:', err)
    );
  };

  const handleToggleCompleteHandover = (id: string) => {
    const target = handoverItems.find((i) => i.id === id);
    if (!target) return;
    const isNowCompleted = !target.isCompleted;

    if (isNowCompleted) {
      // Archive to Handover_History
      archiveHandoverInGoogleSheets(
        id,
        currentShift?.inchargeName || 'In-Charge',
        'ส่งต่อข้อมูลเรียบร้อยแล้ว'
      ).catch((err) => console.warn('Failed to archive handover:', err));
    } else {
      const updatedItem = { ...target, isCompleted: false };
      setHandoverItems(handoverItems.map((i) => (i.id === id ? updatedItem : i)));
      saveHandoverToGoogleSheets(updatedItem).catch((err) =>
        console.warn('Failed to update handover in Google Sheets:', err)
      );
    }
  };

  // Pending Chart Operations
  const handleAddPendingChart = (chartData: Omit<PendingChart, 'id' | 'daysPending'>) => {
    const newChart: PendingChart = {
      ...chartData,
      id: 'chart-' + Date.now(),
      daysPending: 1,
      shiftId: currentShift?.id || 'shift-live',
      status: 'pending',
    };
    const updatedCharts = [newChart, ...pendingCharts];
    setPendingCharts(updatedCharts);

    savePendingChartToGoogleSheets(newChart).catch((err) =>
      console.warn('Failed to save pending chart to Google Sheets:', err)
    );
  };

  const handleEditPendingChart = (id: string, updated: Partial<PendingChart>) => {
    const target = pendingCharts.find((c) => c.id === id);
    if (!target) return;
    const updatedChart = { ...target, ...updated };

    const updatedCharts = pendingCharts.map((chart) =>
      chart.id === id ? updatedChart : chart
    );
    setPendingCharts(updatedCharts);

    savePendingChartToGoogleSheets(updatedChart).catch((err) =>
      console.warn('Failed to update pending chart in Google Sheets:', err)
    );
  };

  const handleDeletePendingChart = (id: string) => {
    const updatedCharts = pendingCharts.filter((chart) => chart.id !== id);
    setPendingCharts(updatedCharts);

    deletePendingChartFromGoogleSheets(id).catch((err) =>
      console.warn('Failed to delete pending chart from Google Sheets:', err)
    );
  };

  const handleResolvePendingChart = (id: string) => {
    const updatedCharts = pendingCharts.filter((chart) => chart.id !== id);
    setPendingCharts(updatedCharts);

    resolvePendingChartInGoogleSheets(id).catch((err) =>
      console.warn('Failed to resolve pending chart in Google Sheets:', err)
    );
  };

  const scrollToCharts = () => {
    const el = document.getElementById('chart-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToHandovers = () => {
    const el = document.getElementById('handover-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Fallback safe shift representation when waiting for Google Sheets initial load
  const displayShift: ShiftInfo = currentShift || {
    id: 'loading-shift',
    date: new Date().toLocaleDateString('th-TH'),
    shiftType: 'เวรเช้า',
    inchargeName: 'กำลังโหลดข้อมูล...',
    stats: patientStats,
  };

  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-800 flex flex-col font-['Prompt',sans-serif]">
      {/* Top Header with Live Online Indicator */}
      <Header
        onOpenDashboard={() => setCurrentView('dashboard')}
        onOpenAddShift={() => setIsAddShiftOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
      />

      {/* Main Content Dashboard Container */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 space-y-5 md:space-y-6 flex-1">
        {/* Loading Spinner Indicator */}
        {isLoading && !currentShift && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 flex items-center justify-center gap-3 text-slate-600 shadow-xs">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            <span className="text-sm font-medium">กำลังโหลดข้อมูลล่าสุดจาก Google Sheets...</span>
          </div>
        )}

        {/* Error / Offline Alert Banner */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-700">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                  ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้
                </h4>
                <p className="text-xs text-rose-800/90 mt-0.5">
                  {errorMessage} (ระบบปฏิบัติตามคำสั่ง: ห้ามใช้ mock data โดยเด็ดขาด)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => refreshFromGoogleSheets()}
                className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองใหม่</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                ตั้งค่า URL
              </button>
            </div>
          </div>
        )}

        {currentView === 'logs' ? (
          <HandoverLogsView
            shifts={shiftsHistory}
            currentShift={displayShift}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onSelectShift={handleSelectShiftAsActive}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            onOpenRestoreGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
          />
        ) : (
          <>
            {/* 1. Active Shift Hero Banner */}
            <HeroShiftBanner
              shift={displayShift}
              onOpenHistory={() => setCurrentView('logs')}
              onOpenEditShift={() => setIsEditActiveShiftOpen(true)}
            />

            {/* 2. Patient Summary Card (ภาพรวมยอดผู้ป่วย เวรปัจจุบัน) */}
            <PatientSummaryCard
              stats={displayShift.stats || patientStats}
              shift={displayShift}
              onUpdateStats={handleUpdateStats}
              onOpenEditShift={() => setIsEditActiveShiftOpen(true)}
            />

            {/* 3. Quick Summary Row (CHART ค้าง ทั้งหมด / เรื่องส่งต่อ ข้อมูล) */}
            <QuickSummaryCards
              pendingChartCount={pendingCharts.length}
              handoverCount={handoverItems.length}
              onScrollToCharts={scrollToCharts}
              onScrollToHandovers={scrollToHandovers}
            />

            {/* 4. Two Columns: เรื่องส่งต่อข้อมูล & Chart ค้าง */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 items-stretch">
              {/* Left: เรื่องส่งต่อข้อมูล */}
              <HandoverSection
                items={handoverItems}
                currentIncharge={displayShift.inchargeName}
                onAddItem={handleAddHandover}
                onEditItem={handleEditHandover}
                onDeleteItem={handleDeleteHandover}
                onToggleComplete={handleToggleCompleteHandover}
                onViewHistory={() => setIsHandoverHistoryOpen(true)}
              />

              {/* Right: Chart ค้าง */}
              <PendingChartSection
                charts={pendingCharts}
                currentDate={displayShift.date}
                onAddChart={handleAddPendingChart}
                onEditChart={handleEditPendingChart}
                onDeleteChart={handleDeletePendingChart}
                onResolveChart={handleResolvePendingChart}
              />
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <AddShiftModal
        isOpen={isAddShiftOpen}
        onClose={() => setIsAddShiftOpen(false)}
        onAddShift={handleAddShift}
        currentShift={displayShift}
        shiftsHistory={shiftsHistory}
        activeHandoverItems={handoverItems}
        activePendingCharts={pendingCharts}
      />

      <EditShiftModal
        isOpen={isEditActiveShiftOpen}
        onClose={() => setIsEditActiveShiftOpen(false)}
        shift={displayShift}
        onSaveShift={handleEditShift}
        shiftsHistory={shiftsHistory}
        previousShift={shiftsHistory.find((s) => s.id !== displayShift.id)}
      />

      <DashboardStatsModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
        shift={displayShift}
        stats={displayShift.stats || patientStats}
        handovers={handoverItems}
        charts={pendingCharts}
      />

      <GoogleAppsScriptModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />

      <HandoverHistoryModal
        isOpen={isHandoverHistoryOpen}
        onClose={() => setIsHandoverHistoryOpen(false)}
        historyItems={handoverHistory}
        onRefresh={async () => {
          await refreshFromGoogleSheets();
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
