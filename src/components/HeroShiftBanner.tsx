import React from 'react';
import { Moon, Sun, Sunset, User, History, Edit3, Clock } from 'lucide-react';
import { ShiftInfo } from '../types';
import { INITIAL_SHIFT } from '../data/initialData';

interface HeroShiftBannerProps {
  shift: ShiftInfo;
  onOpenHistory: () => void;
  onOpenEditShift?: () => void;
}

export const HeroShiftBanner: React.FC<HeroShiftBannerProps> = ({
  shift,
  onOpenHistory,
  onOpenEditShift,
}) => {
  const safeShift: ShiftInfo = shift || INITIAL_SHIFT;

  const getShiftIcon = (type: string) => {
    switch (type) {
      case 'เวรเช้า':
        return <Sun className="w-3.5 h-3.5 text-amber-300" />;
      case 'เวรบ่าย':
        return <Sunset className="w-3.5 h-3.5 text-orange-300" />;
      case 'เวรดึก':
      default:
        return <Moon className="w-3.5 h-3.5 text-purple-300" />;
    }
  };

  const getShiftBadgeStyle = (type: string) => {
    switch (type) {
      case 'เวรเช้า':
        return 'bg-amber-950/70 border-amber-500/40 text-amber-200';
      case 'เวรบ่าย':
        return 'bg-orange-950/70 border-orange-500/40 text-orange-200';
      case 'เวรดึก':
      default:
        return 'bg-[#431464] border-purple-500/50 text-purple-200';
    }
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-[#131230] via-[#1a1c48] to-[#121c38] text-white p-5 sm:p-6 md:p-7 shadow-lg border border-slate-800/80 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Top Shift indicator */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2dd4bf] tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
              <span>เวรล่าสุด (CURRENT ACTIVE SHIFT)</span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getShiftBadgeStyle(
                safeShift.shiftType
              )}`}
            >
              {getShiftIcon(safeShift.shiftType)}
              <span>{safeShift.shiftType}</span>
            </div>
          </div>

          {safeShift.updatedAt && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>อัปเดตล่าสุด: {safeShift.updatedAt}</span>
            </div>
          )}
        </div>

        {/* Date and Shift Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2 flex-wrap font-['Prompt',sans-serif]">
            <span>{safeShift.date || 'วันนี้'}</span>
            <span className="text-slate-400 font-light">·</span>
            <span className="text-[#2dd4bf] font-bold">{safeShift.shiftType}</span>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenEditShift && (
              <button
                type="button"
                onClick={onOpenEditShift}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-teal-500/40 text-teal-200 text-xs font-medium transition cursor-pointer active:scale-95 shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                <span>แก้ไขเวรนี้</span>
              </button>
            )}
          </div>
        </div>

        {/* Incharge and History buttons */}
        <div className="flex items-center gap-2.5 flex-wrap pt-1 border-t border-slate-700/50">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-200 text-xs font-medium">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Incharge: {safeShift.inchargeName || 'ยังไม่ระบุ'}</span>
          </div>

          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#004d40]/80 hover:bg-[#004d40] border border-teal-500/40 text-teal-200 text-xs font-medium transition cursor-pointer active:scale-95"
          >
            <History className="w-3.5 h-3.5 text-teal-300" />
            <span>ประวัติการส่งต่อ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
