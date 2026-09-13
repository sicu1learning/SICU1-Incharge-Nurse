import React, { useState, useEffect } from 'react';
import { Wind, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { EquipmentWeanData, ShiftType } from '../../types';

interface EquipmentWeanModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftType?: ShiftType;
  initialData?: EquipmentWeanData;
  onSave: (data: EquipmentWeanData) => void;
  previousEquipmentData?: EquipmentWeanData;
  previousShiftLabel?: string;
}

export const EquipmentWeanModal: React.FC<EquipmentWeanModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  previousEquipmentData,
  previousShiftLabel,
}) => {
  // 7 รายการหลัก
  const [ventilatorUse, setVentilatorUse] = useState<number | string>(
    initialData?.ventilatorUse ?? initialData?.ventCount ?? 0
  );
  const [foleyCatheter, setFoleyCatheter] = useState<number | string>(
    initialData?.foleyCatheter ?? 0
  );
  const [peripheralLine, setPeripheralLine] = useState<number | string>(
    initialData?.peripheralLine ?? 0
  );
  const [centralLine, setCentralLine] = useState<number | string>(
    initialData?.centralLine ?? 0
  );
  const [weanAssess, setWeanAssess] = useState<number | string>(
    initialData?.weanAssess ?? 0
  );
  const [weanAttempt, setWeanAttempt] = useState<number | string>(
    initialData?.weanAttempt ?? initialData?.weanCount ?? 0
  );
  const [weanSuccess, setWeanSuccess] = useState<number | string>(
    initialData?.weanSuccess ?? 0
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setVentilatorUse(initialData?.ventilatorUse ?? initialData?.ventCount ?? 0);
      setFoleyCatheter(initialData?.foleyCatheter ?? 0);
      setPeripheralLine(initialData?.peripheralLine ?? 0);
      setCentralLine(initialData?.centralLine ?? 0);
      setWeanAssess(initialData?.weanAssess ?? 0);
      setWeanAttempt(initialData?.weanAttempt ?? initialData?.weanCount ?? 0);
      setWeanSuccess(initialData?.weanSuccess ?? 0);
      setFeedbackMessage(null);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetAll = () => {
    setVentilatorUse(0);
    setFoleyCatheter(0);
    setPeripheralLine(0);
    setCentralLine(0);
    setWeanAssess(0);
    setWeanAttempt(0);
    setWeanSuccess(0);
    setFeedbackMessage('ล้างค่ายอดอุปกรณ์/Wean เป็น 0 เรียบร้อย');
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const handleSave = () => {
    const ventNum = Number(ventilatorUse || 0);
    const weanAttemptNum = Number(weanAttempt || 0);

    onSave({
      ventilatorUse: ventNum,
      foleyCatheter: Number(foleyCatheter || 0),
      peripheralLine: Number(peripheralLine || 0),
      centralLine: Number(centralLine || 0),
      weanAssess: Number(weanAssess || 0),
      weanAttempt: weanAttemptNum,
      weanSuccess: Number(weanSuccess || 0),
      ventCount: ventNum,
      weanCount: weanAttemptNum,
      ettCount: ventNum,
      details: initialData?.details || '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Wind className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm font-['Prompt',sans-serif]">
                  บันทึกการใช้อุปกรณ์ / Wean
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/30 border border-rose-300 text-rose-100 text-[10px] font-extrabold shadow-2xs">
                  **เฉพาะเวรบ่าย**
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 font-normal">
                บันทึก 7 รายการหลัก (รวมยอดรายเดือนอัตโนมัติ)
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

        {/* Action Bar */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition cursor-pointer"
            title="ล้างค่าเป็น 0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>ล้างค่า</span>
          </button>
        </div>

        {/* Feedback Message */}
        {feedbackMessage && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* หมวดที่ 1: บันทึกการใช้อุปกรณ์ (1-4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-['Prompt',sans-serif]">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>ส่วนที่ 1: การใช้อุปกรณ์และสายสวน (Devices & Lines)</span>
              </span>
              <span className="text-[10px] text-slate-400">รายการ 1-4</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. ใช้เครื่องช่วยหายใจ */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      ใช้เครื่องช่วยหายใจ
                    </span>
                    <span className="text-[10px] text-slate-500">Mechanical Ventilator</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={ventilatorUse}
                    onChange={(e) =>
                      setVentilatorUse(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-14 h-8 text-center text-xs font-bold text-emerald-700 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 2. คาสายสวนปัสสาวะ */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      คาสายสวนปัสสาวะ
                    </span>
                    <span className="text-[10px] text-slate-500">Foley / Urinary Catheter</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={foleyCatheter}
                    onChange={(e) =>
                      setFoleyCatheter(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-14 h-8 text-center text-xs font-bold text-teal-700 bg-white border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 3. Peripheral line */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Peripheral line
                    </span>
                    <span className="text-[10px] text-slate-500">IV Catheter / Heparin lock</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={peripheralLine}
                    onChange={(e) =>
                      setPeripheralLine(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-14 h-8 text-center text-xs font-bold text-sky-700 bg-white border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 4. Central line */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-xs">
                    4
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Central line
                    </span>
                    <span className="text-[10px] text-slate-500">CVC / Double lumen / Triple</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={centralLine}
                    onChange={(e) =>
                      setCentralLine(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-14 h-8 text-center text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>
            </div>
          </div>

          {/* หมวดที่ 2: บันทึกกระบวนการ Wean (5-7) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-['Prompt',sans-serif]">
                <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                <span>ส่วนที่ 2: กระบวนการหย่าเครื่องช่วยหายใจ (Weaning Process)</span>
              </span>
              <span className="text-[10px] text-slate-400">รายการ 5-7</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 5. ประเมินWean */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-2 hover:border-cyan-300 transition">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    5
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs leading-tight">
                      ประเมินWean
                    </span>
                    <span className="text-[10px] text-slate-500">Wean Assessment</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60">
                  <input
                    type="number"
                    min="0"
                    value={weanAssess}
                    onChange={(e) =>
                      setWeanAssess(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-14 h-8 text-center text-xs font-bold text-cyan-700 bg-white border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 6. ได้รับการwean */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-2 hover:border-blue-300 transition">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    6
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs leading-tight">
                      ได้รับการwean
                    </span>
                    <span className="text-[10px] text-slate-500">Wean In-Progress</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60">
                  <input
                    type="number"
                    min="0"
                    value={weanAttempt}
                    onChange={(e) =>
                      setWeanAttempt(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-14 h-8 text-center text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 7. weanสำเร็จ */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-2 hover:border-emerald-300 transition">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    7
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs leading-tight">
                      weanสำเร็จ
                    </span>
                    <span className="text-[10px] text-slate-500">Wean Successful</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60">
                  <input
                    type="number"
                    min="0"
                    value={weanSuccess}
                    onChange={(e) =>
                      setWeanSuccess(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-14 h-8 text-center text-xs font-bold text-emerald-700 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
};
