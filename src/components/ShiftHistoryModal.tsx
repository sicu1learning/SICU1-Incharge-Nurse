import React from 'react';
import { History, X, Calendar, User, Clock, CheckCircle, Bed } from 'lucide-react';
import { ShiftInfo, PatientStats } from '../types';
import { compareShiftsDesc } from '../utils/shiftUtils';

interface ShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: ShiftInfo[];
  currentStats: PatientStats;
}

export const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({
  isOpen,
  onClose,
  shifts,
  currentStats,
}) => {
  if (!isOpen) return null;

  const sortedShifts = [...shifts].sort(compareShiftsDesc);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-[#0d1527] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-base font-['Prompt',sans-serif]">
              ประวัติการส่งต่อเวร SICU
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

        <div className="p-6 overflow-y-auto space-y-4">
          {sortedShifts.map((shift, idx) => (
            <div
              key={shift.id}
              className={`p-4 rounded-xl border transition ${
                shift.isActive
                  ? 'bg-teal-50/40 border-teal-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800 font-['Prompt',sans-serif]">
                    {shift.date} · {shift.shiftType}
                  </span>
                  {shift.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#009688] text-white">
                      เวรปัจจุบัน
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Incharge: {shift.inchargeName}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">คงพยาบาล</span>
                  <span className="font-bold text-teal-700 text-sm">
                    {shift.stats?.currentRemaining ?? (shift.isActive ? currentStats.currentRemaining : 0)} ราย
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">ประเภท 5</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {shift.stats?.category5Count ?? (shift.isActive ? currentStats.category5Count : 0)} คน
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">ประเภท 4</span>
                  <span className="font-bold text-amber-600 text-sm">
                    {shift.stats?.category4Count ?? (shift.isActive ? currentStats.category4Count : 0)} คน
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">ส่งต่อมาจาก</span>
                  <span className="font-medium text-slate-700 text-xs truncate block">
                    {shift.previousShiftInfo}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
