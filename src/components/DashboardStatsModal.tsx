import React from 'react';
import {
  LayoutGrid,
  X,
  Bed,
  Users,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { PatientStats, ShiftInfo, HandoverItem, PendingChart } from '../types';

interface DashboardStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ShiftInfo;
  stats: PatientStats;
  handovers: HandoverItem[];
  charts: PendingChart[];
}

export const DashboardStatsModal: React.FC<DashboardStatsModalProps> = ({
  isOpen,
  onClose,
  shift,
  stats,
  handovers,
  charts,
}) => {
  if (!isOpen) return null;

  const totalBedsCapacity = 8; // SICU standard ICU unit beds
  const occupancyRate = Math.round((stats.currentRemaining / totalBedsCapacity) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-[#0d1527] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-base font-['Prompt',sans-serif]">
              SICU Real-Time Dashboard (แดชบอร์ดภาพรวมหอผู้ป่วย)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200">
              <div className="flex items-center justify-between text-teal-800 text-xs font-semibold">
                <span>อัตราการครองเตียง (Occupancy)</span>
                <Bed className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-teal-800">
                  {occupancyRate}%
                </span>
                <span className="text-xs text-teal-600">
                  ({stats.currentRemaining}/{totalBedsCapacity} เตียง)
                </span>
              </div>
              <div className="w-full bg-teal-200/60 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-[#009688] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, occupancyRate)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
              <div className="flex items-center justify-between text-purple-800 text-xs font-semibold">
                <span>ผู้ป่วยประเภท 5 (วิกฤตสูง)</span>
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-rose-600">
                  {stats.category5Count}
                </span>
                <span className="text-xs text-slate-500">
                  จาก {stats.currentRemaining} ราย
                </span>
              </div>
              <div className="text-[11px] text-purple-700 mt-3 font-medium">
                ประเภท 4 = {stats.category4Count} ราย
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
              <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
                <span>งานค้าง / ติดตาม</span>
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-700">
                  {charts.length + handovers.length}
                </span>
                <span className="text-xs text-slate-500">รายการ</span>
              </div>
              <div className="text-[11px] text-amber-700 mt-3">
                Chart {charts.length} แฟ้ม | ส่งต่อ {handovers.length} เรื่อง
              </div>
            </div>
          </div>

          {/* Active Shift details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-semibold text-xs text-slate-700 mb-2 font-['Prompt',sans-serif]">
              สถานะเวรปัจจุบัน
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">วันที่ &amp; เวร:</span>
                <span className="font-semibold text-slate-800">
                  {shift.date} ({shift.shiftType})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Incharge Nurse:</span>
                <span className="font-semibold text-slate-800">{shift.inchargeName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">ยอดยกมา:</span>
                <span className="font-semibold text-slate-800">{stats.carriedOver} ราย</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">คงพยาบาล:</span>
                <span className="font-bold text-teal-700">{stats.currentRemaining} ราย</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
