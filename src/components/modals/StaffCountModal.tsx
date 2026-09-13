import React, { useState, useEffect } from 'react';
import { Users, X, CheckCircle2, ShieldCheck, Plus, Minus, RotateCcw } from 'lucide-react';
import { StaffData } from '../../types';

interface StaffCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: StaffData;
  onSave: (data: StaffData) => void;
  previousStaffData?: StaffData;
  previousShiftLabel?: string;
}

export const StaffCountModal: React.FC<StaffCountModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  previousStaffData,
  previousShiftLabel,
}) => {
  const [headCount, setHeadCount] = useState<number | string>(initialData?.headCount ?? 0);
  const [rnCount, setRnCount] = useState<number | string>(initialData?.rnCount ?? 0);
  const [naCount, setNaCount] = useState<number | string>(initialData?.naCount ?? initialData?.pnCount ?? 0);
  const [clerkCount, setClerkCount] = useState<number | string>(initialData?.clerkCount ?? 0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setHeadCount(initialData?.headCount ?? 0);
      setRnCount(initialData?.rnCount ?? 0);
      setNaCount(initialData?.naCount ?? initialData?.pnCount ?? 0);
      setClerkCount(initialData?.clerkCount ?? 0);
      setFeedbackMessage(null);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalStaff =
    Number(headCount || 0) +
    Number(rnCount || 0) +
    Number(naCount || 0) +
    Number(clerkCount || 0);

  const handleResetAll = () => {
    setHeadCount(0);
    setRnCount(0);
    setNaCount(0);
    setClerkCount(0);
    setFeedbackMessage('ล้างค่ายอดเจ้าหน้าที่เป็น 0 เรียบร้อย');
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const handleSave = () => {
    onSave({
      headCount: Number(headCount || 0),
      rnCount: Number(rnCount || 0),
      naCount: Number(naCount || 0),
      pnCount: Number(naCount || 0),
      clerkCount: Number(clerkCount || 0),
      otCount: 0,
      leaveCount: 0,
      totalStaff: Math.max(0, totalStaff),
      notes: initialData?.notes || '',
    });
    onClose();
  };

  const adjustValue = (
    setter: React.Dispatch<React.SetStateAction<number | string>>,
    delta: number
  ) => {
    setter((prev) => {
      const current = Number(prev || 0);
      return Math.max(0, current + delta);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-['Prompt',sans-serif]">
                ยอดเจ้าหน้าที่ประจำเวร
              </h3>
              <p className="text-[11px] text-blue-100/90 font-normal">
                1.Head  2.RN  3.NA  4.Clerk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white transition p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Summary Total Banner */}
          <div className="bg-blue-50/90 p-4 rounded-2xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <div>
                  <span className="font-bold text-slate-800 text-xs block font-['Prompt',sans-serif]">
                    รวมยอดเจ้าหน้าที่ปฏิบัติการในเวร
                  </span>
                  <span className="text-[11px] text-slate-500">
                    (1.Head + 2.RN + 3.NA + 4.Clerk)
                  </span>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-800 font-['Prompt',sans-serif]">
                  {Math.max(0, totalStaff)}
                </span>
                <span className="font-semibold text-slate-600">คน</span>
              </div>
            </div>

            {/* Quick breakdown tags and Action buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-blue-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold text-[11px] shadow-2xs">
                  1.Head: <strong>{headCount || 0}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold text-[11px] shadow-2xs">
                  2.RN: <strong>{rnCount || 0}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold text-[11px] shadow-2xs">
                  3.NA: <strong>{naCount || 0}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold text-[11px] shadow-2xs">
                  4.Clerk: <strong>{clerkCount || 0}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                {totalStaff > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border border-slate-300 rounded-lg transition cursor-pointer"
                    title="ล้างค่าเป็น 0"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>ล้างค่า</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="p-2.5 bg-blue-100 border border-blue-300 text-blue-900 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-medium">{feedbackMessage}</span>
            </div>
          )}

          {/* Grid of 4 Core Staff Roles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Head */}
            <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5 transition hover:border-blue-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Prompt',sans-serif]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold flex items-center justify-center">1</span>
                  <span>Head (หัวหน้าตึก/Incharge)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustValue(setHeadCount, -1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    value={headCount}
                    onChange={(e) => setHeadCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-9 py-1 text-center text-base font-extrabold text-blue-700 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => adjustValue(setHeadCount, 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-slate-600 text-xs font-semibold min-w-[20px] text-right">คน</span>
              </div>
            </div>

            {/* 2. RN */}
            <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5 transition hover:border-indigo-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Prompt',sans-serif]">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center justify-center">2</span>
                  <span>RN (พยาบาลวิชาชีพ)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustValue(setRnCount, -1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    value={rnCount}
                    onChange={(e) => setRnCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-9 py-1 text-center text-base font-extrabold text-indigo-700 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => adjustValue(setRnCount, 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-slate-600 text-xs font-semibold min-w-[20px] text-right">คน</span>
              </div>
            </div>

            {/* 3. NA */}
            <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5 transition hover:border-teal-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Prompt',sans-serif]">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center justify-center">3</span>
                  <span>NA (ผู้ช่วยเหลือคนไข้)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustValue(setNaCount, -1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    value={naCount}
                    onChange={(e) => setNaCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-9 py-1 text-center text-base font-extrabold text-teal-700 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => adjustValue(setNaCount, 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-slate-600 text-xs font-semibold min-w-[20px] text-right">คน</span>
              </div>
            </div>

            {/* 4. Clerk */}
            <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5 transition hover:border-amber-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Prompt',sans-serif]">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center">4</span>
                  <span>Clerk (ธุรการ/เสมียน)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustValue(setClerkCount, -1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    value={clerkCount}
                    onChange={(e) => setClerkCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-9 py-1 text-center text-base font-extrabold text-amber-700 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => adjustValue(setClerkCount, 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-slate-600 text-xs font-semibold min-w-[20px] text-right">คน</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
};
