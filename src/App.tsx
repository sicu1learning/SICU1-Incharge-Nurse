import React, { useState, useEffect } from 'react';
import { ShiftInfo, PatientStats, HandoverItem, PendingChart } from './types';
import {
  INITIAL_SHIFT,
  INITIAL_PATIENT_STATS,
  INITIAL_HANDOVER_ITEMS,
  INITIAL_PENDING_CHARTS,
} from './data/initialData';
import { Header } from './components/Header';
import { HeroShiftBanner } from './components/HeroShiftBanner';
import { PatientSummaryCard } from './components/PatientSummaryCard';
import { QuickSummaryCards } from './components/QuickSummaryCards';
import { HandoverSection } from './components/HandoverSection';
import { PendingChartSection } from './components/PendingChartSection';
import { AddShiftModal } from './components/AddShiftModal';
import { EditShiftModal } from './components/EditShiftModal';
import { HandoverLogsView } from './components/HandoverLogsView';
import { DashboardStatsModal } from './components/DashboardStatsModal';
import { GoogleAppsScriptModal } from './components/GoogleAppsScriptModal';
import {
  initializeWardData,
  subscribeWardState,
  subscribeShiftsHistory,
  syncWardStateToCloud,
  syncShiftsHistoryToCloud,
  syncPatientStats,
  saveShiftToGoogleSheets,
  deleteShiftFromGoogleSheets,
  saveHandoversToGoogleSheets,
  savePendingChartsToGoogleSheets,
  refreshFromGoogleSheets,
  sanitizeShiftEquipmentData,
  sanitizeShiftsList,
  isDummyHandoverItem,
  isDummyPendingChart,
  isMockShift,
} from './services/wardDataService';
import {
  subscribeGasStatus,
  GasConnectionStatus,
  getStoredGasUrl,
} from './services/googleAppsScriptService';
import { AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';

export default function App() {
  // Navigation view mode (UI state only)
  const [currentView, setCurrentView] = useState<'dashboard' | 'logs'>('dashboard');

  // Google Apps Script Connection Status
  const [gasStatus, setGasStatus] = useState<GasConnectionStatus>({
    state: getStoredGasUrl() ? 'connecting' : 'not_configured',
  });

  // Ward Data States (Clean in-memory, single source of truth is Google Sheets)
  const [currentShift, setCurrentShift] = useState<ShiftInfo>(() =>
    sanitizeShiftEquipmentData(INITIAL_SHIFT)
  );
  const [shiftsHistory, setShiftsHistory] = useState<ShiftInfo[]>([]);
  const [patientStats, setPatientStats] = useState<PatientStats>(
    () => INITIAL_SHIFT.stats || INITIAL_PATIENT_STATS
  );
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>(INITIAL_HANDOVER_ITEMS);
  const [pendingCharts, setPendingCharts] = useState<PendingChart[]>(INITIAL_PENDING_CHARTS);

  // Modals state
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [isEditActiveShiftOpen, setIsEditActiveShiftOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  // Subscribe to Google Apps Script status
  useEffect(() => {
    const unsub = subscribeGasStatus((status) => setGasStatus(status));
    return unsub;
  }, []);

  // Initialize data from Google Sheets & subscribe to real-time online updates
  useEffect(() => {
    initializeWardData();

    // Subscribe to active ward state (live shift, stats, handovers, pending charts)
    const unsubscribeWard = subscribeWardState((sheetState) => {
      if (sheetState.currentShift && sheetState.currentShift.id && !isMockShift(sheetState.currentShift)) {
        setCurrentShift(sheetState.currentShift);
      }
      if (sheetState.patientStats) {
        setPatientStats(sheetState.patientStats);
      }
      if (Array.isArray(sheetState.handoverItems)) {
        const cleaned = sheetState.handoverItems.filter((i) => !isDummyHandoverItem(i));
        setHandoverItems(cleaned);
      }
      if (Array.isArray(sheetState.pendingCharts)) {
        const cleaned = sheetState.pendingCharts.filter((c) => !isDummyPendingChart(c));
        setPendingCharts(cleaned);
      }
    });

    // Subscribe to shifts history logs
    const unsubscribeHistory = subscribeShiftsHistory((sheetShifts) => {
      if (sheetShifts && Array.isArray(sheetShifts)) {
        const realShifts = sheetShifts.filter((s) => !isMockShift(s));
        const { shifts: sanitized } = sanitizeShiftsList(realShifts);
        setShiftsHistory(sanitized);
      }
    });

    return () => {
      unsubscribeWard();
      unsubscribeHistory();
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
    const updatedShift: ShiftInfo = {
      ...currentShift,
      stats: newStats,
      updatedAt: `${new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
    };
    setCurrentShift(updatedShift);

    // Save directly to Google Sheets via Google Apps Script API
    syncPatientStats(newStats, updatedShift).catch((err) =>
      console.warn('Failed to save stats to Google Sheets:', err)
    );
  };

  const handleAddShift = (newShift: ShiftInfo) => {
    const currentShiftInHistory = shiftsHistory.find((s) => s.id === currentShift.id);

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

    const completedCurrentShift: ShiftInfo = sanitizeShiftEquipmentData({
      ...currentShift,
      stats: patientStats,
      handoverItems: combinedHandovers,
      pendingCharts: combinedCharts,
      isActive: false,
    });

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

    const newShiftsList = [
      updatedNewShift,
      completedCurrentShift,
      ...shiftsHistory.filter((s) => s.id !== currentShift.id && s.id !== newShift.id),
    ];

    setShiftsHistory(newShiftsList);
    setCurrentShift(updatedNewShift);
    setPatientStats(newShift.stats);
    setHandoverItems(finalHandovers);
    setPendingCharts(carriedCharts);
    setIsAddShiftOpen(false);

    // Persist to Google Sheets via Google Apps Script API
    syncWardStateToCloud({
      currentShift: updatedNewShift,
      patientStats: newShift.stats,
      handoverItems: finalHandovers,
      pendingCharts: carriedCharts,
    }).catch((err) => console.warn('Failed to sync state to Google Sheets:', err));

    saveShiftToGoogleSheets(completedCurrentShift).catch((err) =>
      console.warn('Failed to archive shift to Google Sheets:', err)
    );
    saveShiftToGoogleSheets(updatedNewShift).catch((err) =>
      console.warn('Failed to save new shift to Google Sheets:', err)
    );
  };

  const handleDeleteShift = (shiftId: string) => {
    const updatedHistory = shiftsHistory.filter((s) => s.id !== shiftId);
    setShiftsHistory(updatedHistory);

    // Delete from Google Sheets
    deleteShiftFromGoogleSheets(shiftId).catch((err) =>
      console.warn('Failed to delete shift from Google Sheets:', err)
    );

    // If the active current shift was deleted, update currentShift to the newest remaining shift
    if (currentShift.id === shiftId && updatedHistory.length > 0) {
      const nextShift = updatedHistory[0];
      setCurrentShift(nextShift);
      if (nextShift.stats) setPatientStats(nextShift.stats);
      if (nextShift.handoverItems) setHandoverItems(nextShift.handoverItems);
      if (nextShift.pendingCharts) setPendingCharts(nextShift.pendingCharts);

      syncWardStateToCloud({
        currentShift: nextShift,
        patientStats: nextShift.stats || patientStats,
        handoverItems: nextShift.handoverItems || [],
        pendingCharts: nextShift.pendingCharts || [],
      }).catch((err) => console.warn('Failed to sync next shift to Google Sheets:', err));
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

    syncWardStateToCloud({
      currentShift: updatedActive,
      patientStats: selected.stats || patientStats,
      handoverItems: selected.handoverItems || handoverItems,
      pendingCharts: selected.pendingCharts || pendingCharts,
    }).catch((err) => console.warn('Failed to sync active shift to Google Sheets:', err));

    saveShiftToGoogleSheets(updatedActive).catch((err) =>
      console.warn('Failed to save active shift to Google Sheets:', err)
    );

    setCurrentView('dashboard');
  };

  const handleEditShift = (rawUpdatedShift: ShiftInfo) => {
    const updatedShift = sanitizeShiftEquipmentData(rawUpdatedShift);
    const isTargetActive =
      currentShift.id === updatedShift.id ||
      Boolean(updatedShift.isActive) ||
      shiftsHistory.length === 0 ||
      shiftsHistory[0]?.id === updatedShift.id;

    const existsInHistory = shiftsHistory.some((s) => s.id === updatedShift.id);
    const updatedHistory = existsInHistory
      ? shiftsHistory.map((s) =>
          s.id === updatedShift.id ? { ...updatedShift, isActive: isTargetActive ? true : s.isActive } : s
        )
      : [{ ...updatedShift, isActive: isTargetActive }, ...shiftsHistory];

    setShiftsHistory(updatedHistory);

    // Save to Google Sheets
    saveShiftToGoogleSheets(updatedShift).catch((err) =>
      console.warn('Failed to save edited shift to Google Sheets:', err)
    );

    if (isTargetActive) {
      const activeShift = { ...updatedShift, isActive: true };
      setCurrentShift(activeShift);
      if (updatedShift.stats) {
        setPatientStats(updatedShift.stats);
      }
      syncWardStateToCloud({
        currentShift: activeShift,
        patientStats: updatedShift.stats || patientStats,
      }).catch((err) => console.warn('Failed to sync updated active shift to Google Sheets:', err));
    }
  };

  const handleAddHandover = (itemData: Omit<HandoverItem, 'id' | 'createdAt'>) => {
    const newItem: HandoverItem = {
      ...itemData,
      id: 'ho-' + Date.now(),
      createdAt: new Date().toISOString(),
      shiftId: currentShift.id,
    };
    const updatedHandovers = [newItem, ...handoverItems];
    setHandoverItems(updatedHandovers);

    const updatedHistory = shiftsHistory.map((s) => {
      if (s.id === currentShift.id) {
        const list = s.handoverItems || [];
        return {
          ...s,
          handoverItems: [newItem, ...list.filter((h) => h.id !== newItem.id)],
        };
      }
      return s;
    });
    setShiftsHistory(updatedHistory);

    // Save to Google Sheets via Google Apps Script
    saveHandoversToGoogleSheets(updatedHandovers).catch((err) =>
      console.warn('Failed to save handovers to Google Sheets:', err)
    );
  };

  const handleEditHandover = (id: string, updated: Partial<HandoverItem>) => {
    const updatedHandovers = handoverItems.map((item) =>
      item.id === id ? { ...item, ...updated } : item
    );
    setHandoverItems(updatedHandovers);

    const updatedHistory = shiftsHistory.map((s) => {
      if (s.id === currentShift.id && s.handoverItems) {
        return {
          ...s,
          handoverItems: s.handoverItems.map((item) =>
            item.id === id ? { ...item, ...updated } : item
          ),
        };
      }
      return s;
    });
    setShiftsHistory(updatedHistory);

    saveHandoversToGoogleSheets(updatedHandovers).catch((err) =>
      console.warn('Failed to save handovers to Google Sheets:', err)
    );
  };

  const handleDeleteHandover = (id: string) => {
    const updatedHandovers = handoverItems.filter((item) => item.id !== id);
    setHandoverItems(updatedHandovers);

    const updatedHistory = shiftsHistory.map((s) => {
      if (s.id === currentShift.id && s.handoverItems) {
        return {
          ...s,
          handoverItems: s.handoverItems.filter((item) => item.id !== id),
        };
      }
      return s;
    });
    setShiftsHistory(updatedHistory);

    saveHandoversToGoogleSheets(updatedHandovers).catch((err) =>
      console.warn('Failed to delete handover from Google Sheets:', err)
    );
  };

  const handleToggleCompleteHandover = (id: string) => {
    const updatedHandovers = handoverItems.map((item) =>
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setHandoverItems(updatedHandovers);

    saveHandoversToGoogleSheets(updatedHandovers).catch((err) =>
      console.warn('Failed to update handover in Google Sheets:', err)
    );
  };

  const handleAddPendingChart = (chartData: Omit<PendingChart, 'id' | 'daysPending'>) => {
    const newChart: PendingChart = {
      ...chartData,
      id: 'chart-' + Date.now(),
      daysPending: 1,
      shiftId: currentShift.id,
      status: 'pending',
    };
    const updatedCharts = [newChart, ...pendingCharts];
    setPendingCharts(updatedCharts);

    const updatedHistory = shiftsHistory.map((s) => {
      if (s.id === currentShift.id) {
        const list = s.pendingCharts || [];
        return {
          ...s,
          pendingCharts: [newChart, ...list.filter((c) => c.id !== newChart.id)],
        };
      }
      return s;
    });
    setShiftsHistory(updatedHistory);

    savePendingChartsToGoogleSheets(updatedCharts).catch((err) =>
      console.warn('Failed to save pending chart to Google Sheets:', err)
    );
  };

  const handleEditPendingChart = (id: string, updated: Partial<PendingChart>) => {
    const updatedCharts = pendingCharts.map((chart) =>
      chart.id === id ? { ...chart, ...updated } : chart
    );
    setPendingCharts(updatedCharts);

    savePendingChartsToGoogleSheets(updatedCharts).catch((err) =>
      console.warn('Failed to update pending chart in Google Sheets:', err)
    );
  };

  const handleDeletePendingChart = (id: string) => {
    const updatedCharts = pendingCharts.filter((chart) => chart.id !== id);
    setPendingCharts(updatedCharts);

    savePendingChartsToGoogleSheets(updatedCharts).catch((err) =>
      console.warn('Failed to delete pending chart from Google Sheets:', err)
    );
  };

  const handleResolvePendingChart = (id: string) => {
    const updatedCharts = pendingCharts.filter((chart) => chart.id !== id);
    setPendingCharts(updatedCharts);

    savePendingChartsToGoogleSheets(updatedCharts).catch((err) =>
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
        {/* Google Sheets Connection Alert / Setup Banner */}
        {gasStatus.state === 'not_configured' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                  ตั้งค่าการเชื่อมต่อ Google Sheets กลาง (ระบบไร้ Database)
                </h4>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  เพื่อบันทึกและซิงค์ข้อมูลผู้ป่วยแบบ Online ข้ามอุปกรณ์ (Computer, Tablet, Mobile) กรุณาใส่ URL ของ Google Apps Script Web App
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#004d40] hover:bg-[#005a4b] text-white text-xs font-semibold shadow-xs transition flex-shrink-0 cursor-pointer"
            >
              ตั้งค่า Google Sheets
            </button>
          </div>
        )}

        {gasStatus.state === 'error' && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-700">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                  ไม่สามารถติดต่อ Google Apps Script Web App ได้
                </h4>
                <p className="text-xs text-rose-800/90 mt-0.5">
                  {gasStatus.errorMessage || 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือตั้งค่าสิทธิ์ Web App เป็น Anyone'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => refreshFromGoogleSheets()}
                className="px-3 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองเชื่อมต่อใหม่</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition cursor-pointer"
              >
                ตั้งค่า URL
              </button>
            </div>
          </div>
        )}

        {currentView === 'logs' ? (
          <HandoverLogsView
            shifts={shiftsHistory}
            currentShift={currentShift}
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
              shift={currentShift}
              onOpenHistory={() => setCurrentView('logs')}
              onOpenEditShift={() => setIsEditActiveShiftOpen(true)}
            />

            {/* 2. Patient Summary Card (ภาพรวมยอดผู้ป่วย เวรปัจจุบัน) */}
            <PatientSummaryCard
              stats={currentShift.stats || patientStats}
              shift={currentShift}
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

            {/* 4. Bottom 2 Columns: เรื่องส่งต่อข้อมูล & Chart ค้าง */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 items-stretch">
              {/* Left: เรื่องส่งต่อข้อมูล */}
              <HandoverSection
                items={handoverItems}
                currentIncharge={currentShift.inchargeName}
                onAddItem={handleAddHandover}
                onEditItem={handleEditHandover}
                onDeleteItem={handleDeleteHandover}
                onToggleComplete={handleToggleCompleteHandover}
              />

              {/* Right: Chart ค้าง */}
              <PendingChartSection
                charts={pendingCharts}
                currentDate={currentShift.date}
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
        currentShift={currentShift}
        shiftsHistory={shiftsHistory}
        activeHandoverItems={handoverItems}
        activePendingCharts={pendingCharts}
      />

      <EditShiftModal
        isOpen={isEditActiveShiftOpen}
        onClose={() => setIsEditActiveShiftOpen(false)}
        shift={currentShift}
        onSaveShift={handleEditShift}
        shiftsHistory={shiftsHistory}
        previousShift={shiftsHistory.find((s) => s.id !== currentShift.id)}
      />

      <DashboardStatsModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
        shift={currentShift}
        stats={currentShift.stats || patientStats}
        handovers={handoverItems}
        charts={pendingCharts}
      />

      <GoogleAppsScriptModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />
    </div>
  );
}
