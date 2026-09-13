import React from 'react';
import {
  Activity,
  Calendar,
  ArrowDown,
  UserPlus,
  ArrowUpRight,
  Heart,
  ExternalLink,
  Bed,
  Edit3,
  UserMinus,
  AlertCircle,
} from 'lucide-react';
import { PatientStats, ShiftInfo } from '../types';
import { INITIAL_SHIFT } from '../data/initialData';

interface PatientSummaryCardProps {
  stats: PatientStats;
  shift: ShiftInfo;
  onUpdateStats?: (newStats: PatientStats) => void;
  onOpenEditShift?: () => void;
}

export const PatientSummaryCard: React.FC<PatientSummaryCardProps> = ({
  stats,
  shift,
  onOpenEditShift,
}) => {
  const safeStats: PatientStats = {
    carriedOver: stats?.carriedOver ?? 0,
    transferredIn: stats?.transferredIn ?? 0,
    admittedNew: stats?.admittedNew ?? 0,
    transferredOut: stats?.transferredOut ?? 0,
    againstAdvice: stats?.againstAdvice ?? 0,
    deceased: stats?.deceased ?? 0,
    deceasedPostOp24Hr: stats?.deceasedPostOp24Hr ?? 0,
    admitDischarge24Hr: stats?.admitDischarge24Hr ?? 0,
    referOut: stats?.referOut ?? 0,
    currentRemaining: stats?.currentRemaining ?? 0,
    category5Count: stats?.category5Count ?? 0,
    category4Count: stats?.category4Count ?? 0,
    ventilatorCount: stats?.ventilatorCount ?? 0,
    oxygenCount: stats?.oxygenCount ?? 0,
    postOpCount: stats?.postOpCount ?? 0,
  };

  const safeShift: ShiftInfo = shift || INITIAL_SHIFT;

  return (
    <div className="w-full bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200/80">
      {/* Header of summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-slate-800 font-['Prompt',sans-serif]">
                ภาพรวมยอดผู้ป่วย (เวรปัจจุบัน)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                {safeShift.date || 'วันนี้'} {safeShift.shiftType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              In-charge: <span className="font-semibold text-slate-700">{safeShift.inchargeName || 'ยังไม่ระบุ'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>ยอดยกมาจาก : {safeShift.previousShiftInfo || '-'}</span>
          </div>

          {onOpenEditShift && (
            <button
              type="button"
              onClick={onOpenEditShift}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition cursor-pointer active:scale-95 shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-teal-700" />
              <span>แก้ไขสถิติ / เวร</span>
            </button>
          )}
        </div>
      </div>

      {/* 8 Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-5">
        {/* 1. ยอดยกมา */}
        <div className="rounded-xl border border-slate-200 p-3 flex flex-col justify-between h-[100px] bg-white transition hover:shadow-sm">
          <div className="flex items-center gap-1 text-slate-600 text-xs font-medium">
            <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">ยอดยกมา</span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight font-['Prompt',sans-serif]">
              {safeStats.carriedOver}
            </span>
            <span className="text-xs text-slate-400 font-normal">ราย</span>
          </div>
        </div>

        {/* 2. รับย้าย */}
        <div className="rounded-xl border border-sky-200 p-3 flex flex-col justify-between h-[100px] bg-white transition hover:shadow-sm">
          <div className="flex items-center gap-1 text-sky-700 text-xs font-medium">
            <UserPlus className="w-3.5 h-3.5 text-sky-500" />
            <span className="truncate">รับย้าย</span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl sm:text-3xl font-bold text-[#0284c7] tracking-tight font-['Prompt',sans-serif]">
              {safeStats.transferredIn}
            </span>
            <span className="text-xs text-slate-400 font-normal">ราย</span>
          </div>
        </div>

        {/* 3. รับใหม่ */}
        <div className="rounded-xl border border-emerald-200 p-3 flex flex-col justify-between h-[100px] bg-white transition hover:shadow-sm">
          <div className="flex items-center gap-1 text-emerald-700 text-xs font-medium">
            <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
            <span className="truncate">รับใหม่</span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl sm:text-3xl font-bold text-[#059669] tracking-tight font-['Prompt',sans-serif]">
              {safeStats.admittedNew}
            </span>
            <span className="text-xs text-slate-400 font-normal">ราย</span>
          </div>
        </div>

        {/* 4. ย้ายไป */}
        <div className="rounded-xl border border-amber-200 p-3 flex flex-col justify-between h-[100px] bg-white transition hover:shadow-sm">
          <div className="flex items-center gap-1 text-amber-700 text-xs font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
            <span className="truncate">ย้ายไป</span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl sm:text-3xl font-bold text-[#d97706] tracking-tight font-['Prompt',sans-serif]">
              {safeStats.transferredOut}
            </span>
            <span className="text-xs text-slate-400 font-normal">ราย</span>
          </div>
        </div>

        {/* 5. ไม่สมัครใจอยู่ */}
        <div className="rounded-xl border border-orange-200 p-3 flex flex-col justify-between h-[100px] bg-white transition hover:shadow-sm">
          <div className="flex items-center gap-1 text-[#ea580c] text-xs font-medium">
            <UserMinus className="w-3.5 h-3.5 text-orange-500" />
            <span className="truncate" title="ไม่สมัครใจอยู่">ไม่สมัครใจอยู่</span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl sm:text-3xl font-bold text-[#ea580c] tracking-tight font-['Prompt',sans-serif]">
              {safeStats.againstAdvice ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-normal">ราย</span>
          </div>
        </div>

        {/* 6. เสียชีวิต */}
        <div className="rounded-xl border border-rose-200 p-3 flex flex-col justify-between h-[100px] bg-white transition hover:shadow-sm">
          <div className="flex items-center gap-1 text-rose-700 text-xs font-medium">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span className="truncate">เสียชีวิต</span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl sm:text-3xl font-bold text-[#e11d48] tracking-tight font-['Prompt',sans-serif]">
              {safeStats.deceased}
            </span>
            <span className="text-xs text-slate-400 font-normal">ราย</span>
          </div>
        </div>

        {/* 7. Refer out */}
        <div className="rounded-xl border border-purple-200 p-3 flex flex-col justify-between h-[100px] bg-white transition hover:shadow-sm">
          <div className="flex items-center gap-1 text-purple-700 text-xs font-medium">
            <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
            <span className="truncate">Refer out</span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl sm:text-3xl font-bold text-[#9333ea] tracking-tight font-['Prompt',sans-serif]">
              {safeStats.referOut}
            </span>
            <span className="text-xs text-slate-400 font-normal">ราย</span>
          </div>
        </div>

        {/* 8. คงพยาบาล */}
        <div className="rounded-xl border-2 border-teal-500 p-3 flex flex-col justify-between h-[100px] bg-white transition shadow-xs">
          <div className="flex items-center gap-1 text-teal-700 text-xs font-medium">
            <Bed className="w-3.5 h-3.5 text-teal-600" />
            <span className="truncate font-semibold">คงพยาบาล</span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl sm:text-3xl font-bold text-teal-700 tracking-tight font-['Prompt',sans-serif]">
              {safeStats.currentRemaining}
            </span>
            <span className="text-xs text-teal-700 font-medium">ราย</span>
          </div>
        </div>
      </div>

      {/* Sub-indicators: Ventilator, Oxygen, Post op */}
      <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Ventilator */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-sky-50/60 border border-sky-200/80">
          <div className="flex items-center gap-2">
            <span className="text-base">🫁</span>
            <div>
              <span className="text-xs font-bold text-sky-950 block leading-tight">Ventilator</span>
              <span className="text-[10px] text-slate-500">เครื่องช่วยหายใจ</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-sky-700 font-['Prompt',sans-serif]">
              {safeStats.ventilatorCount ?? 0}
            </span>
            <span className="text-[11px] text-slate-500">ราย</span>
          </div>
        </div>

        {/* Oxygen */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-teal-50/60 border border-teal-200/80">
          <div className="flex items-center gap-2">
            <span className="text-base">💨</span>
            <div>
              <span className="text-xs font-bold text-teal-950 block leading-tight">Oxygen</span>
              <span className="text-[10px] text-slate-500">บำบัดออกซิเจน</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-teal-700 font-['Prompt',sans-serif]">
              {safeStats.oxygenCount ?? 0}
            </span>
            <span className="text-[11px] text-slate-500">ราย</span>
          </div>
        </div>

        {/* Post op */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
          <div className="flex items-center gap-2">
            <span className="text-base">🩺</span>
            <div>
              <span className="text-xs font-bold text-indigo-950 block leading-tight">Post op</span>
              <span className="text-[10px] text-slate-500">ผู้ป่วยหลังผ่าตัด</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-indigo-700 font-['Prompt',sans-serif]">
              {safeStats.postOpCount ?? 0}
            </span>
            <span className="text-[11px] text-slate-500">ราย</span>
          </div>
        </div>
      </div>

      {/* Sub-indicators info pill banner if recorded */}
      {((safeStats.deceasedPostOp24Hr ?? 0) > 0 || (safeStats.admitDischarge24Hr ?? 0) > 0) && (
        <div className="mt-2.5 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>สถิติเฉพาะในเวร :</span>
          </div>
          {(safeStats.deceasedPostOp24Hr ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold">
              เสียชีวิตใน 24 hr. หลังผ่าตัด: {safeStats.deceasedPostOp24Hr} ราย
            </span>
          )}
          {(safeStats.admitDischarge24Hr ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold">
              รับและ D/C ใน 24 hr.: {safeStats.admitDischarge24Hr} ราย
            </span>
          )}
        </div>
      )}

      {/* Patient Classification (ประเภทผู้ป่วย) */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-xs font-medium text-slate-700">
          ประเภทผู้ป่วย :
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50/70 border border-rose-200 text-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>ประเภท 5 =</span>
            <span className="font-bold text-rose-600">{safeStats.category5Count}</span>
            <span>คน</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/70 border border-amber-200 text-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>ประเภท 4 =</span>
            <span className="font-bold text-amber-600">{safeStats.category4Count}</span>
            <span>คน</span>
          </div>
        </div>
      </div>
    </div>
  );
};
