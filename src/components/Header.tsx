import React, { useState, useEffect } from 'react';
import { Activity, LayoutGrid, Plus, Wifi, FileSpreadsheet, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import {
  subscribeGasStatus,
  GasConnectionStatus,
  getStoredGasUrl,
} from '../services/googleAppsScriptService';

interface HeaderProps {
  onOpenDashboard: () => void;
  onOpenAddShift: () => void;
  onOpenGoogleSheets: () => void;
  isOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDashboard,
  onOpenAddShift,
  onOpenGoogleSheets,
  isOnline = true,
}) => {
  const [gasStatus, setGasStatus] = useState<GasConnectionStatus>({
    state: getStoredGasUrl() ? 'connecting' : 'not_configured',
  });

  useEffect(() => {
    const unsub = subscribeGasStatus((s) => setGasStatus(s));
    return unsub;
  }, []);

  return (
    <header className="w-full bg-[#0d1527] text-white px-4 lg:px-8 py-3.5 border-b border-slate-800 shadow-md">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left branding */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-[#009688] flex items-center justify-center shadow-lg shadow-teal-900/30 flex-shrink-0">
            <Activity className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white font-['Prompt',sans-serif]">
                SICU1 Incharge Nurse
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>Online (Google Sheets)</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              ระบบบริหารยอดผู้ป่วย &amp; ส่งต่อเวร หออภิบาลผู้ป่วยหนักศัลยกรรม
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          {/* Google Sheets Status & Connect Button */}
          <button
            type="button"
            onClick={onOpenGoogleSheets}
            title="จัดการฐานข้อมูล Google Sheets ผ่าน Google Apps Script API"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer border shadow-sm ${
              gasStatus.state === 'connected'
                ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-200 hover:bg-emerald-900/90'
                : gasStatus.state === 'connecting' || gasStatus.state === 'syncing'
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                : gasStatus.state === 'error'
                ? 'bg-rose-950/80 border-rose-600/50 text-rose-200 hover:bg-rose-900'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <FileSpreadsheet
              className={`w-4 h-4 ${
                gasStatus.state === 'connected'
                  ? 'text-emerald-400'
                  : gasStatus.state === 'error'
                  ? 'text-rose-400'
                  : 'text-teal-400'
              }`}
            />
            <span className="hidden sm:inline">
              {gasStatus.state === 'connected'
                ? 'Google Sheets (ออนไลน์)'
                : gasStatus.state === 'syncing'
                ? 'กำลังซิงค์ Sheets...'
                : gasStatus.state === 'connecting'
                ? 'กำลังเชื่อมต่อ Sheets...'
                : gasStatus.state === 'error'
                ? 'Sheets ขัดข้อง (คลิกเพื่อดู)'
                : 'เชื่อมต่อ Google Sheets'}
            </span>
            <span className="sm:hidden">Sheets</span>
            {gasStatus.state === 'syncing' || gasStatus.state === 'connecting' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : gasStatus.state === 'connected' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : gasStatus.state === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={onOpenDashboard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#004d40] hover:bg-[#005a4b] text-teal-100 text-sm font-medium transition-colors cursor-pointer border border-teal-700/50 shadow-sm"
          >
            <LayoutGrid className="w-4 h-4 text-teal-300" />
            <span>แดชบอร์ด</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddShift}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009688] hover:bg-[#00897b] text-white text-sm font-medium transition-colors cursor-pointer shadow-md shadow-teal-900/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>เพิ่มเวร</span>
          </button>
        </div>
      </div>
    </header>
  );
};
