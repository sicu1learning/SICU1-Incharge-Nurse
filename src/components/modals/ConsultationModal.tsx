import React, { useState, useEffect, useMemo } from 'react';
import { Stethoscope, X, Plus, Trash2, CheckCircle2, RotateCcw, Sparkles, Copy, History } from 'lucide-react';
import { ConsultationData } from '../../types';
import { CONSULTATION_CATEGORIES } from '../../data/consultationConstants';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ConsultationData;
  onSave: (data: ConsultationData) => void;
  shiftContextTitle?: string; // e.g. "เวรดึก 23/08/2569"
  previousConsultationData?: ConsultationData;
  previousShiftLabel?: string; // e.g. "เวรบ่าย 22/08/2569"
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  shiftContextTitle,
  previousConsultationData,
  previousShiftLabel,
}) => {
  // Department counts map: { [specialtyName]: count }
  const [deptCounts, setDeptCounts] = useState<Record<string, number>>({});
  const [customDepts, setCustomDepts] = useState<string[]>([]);
  const [newCustomDeptName, setNewCustomDeptName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Initialize/Load state when modal opens
  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const counts: Record<string, number> = { ...(initialData?.departmentCounts || {}) };

      // Also migrate from initialData.items if departmentCounts was empty but items existed
      if (Object.keys(counts).length === 0 && initialData?.items && initialData.items.length > 0) {
        initialData.items.forEach((item) => {
          if (item.department) {
            counts[item.department] = (counts[item.department] || 0) + 1;
          }
        });
      }

      setDeptCounts(counts);
      setCustomDepts(initialData?.customDepartments || []);
      setNewCustomDeptName('');
      setIsAddingCustom(false);
      setFeedbackMessage(null);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  // Compute total automatic sum
  const totalCount = useMemo(() => {
    let sum = 0;
    Object.values(deptCounts).forEach((c) => {
      if (typeof c === 'number' && !isNaN(c) && c > 0) {
        sum += c;
      }
    });
    return sum;
  }, [deptCounts]);

  // List of active departments with count > 0 for quick breakdown pills
  const activeSpecialtyEntries = useMemo(() => {
    return Object.entries(deptCounts)
      .filter(([_, count]) => typeof count === 'number' && count > 0)
      .map(([name, count]) => ({ name, count }));
  }, [deptCounts]);

  if (!isOpen) return null;

  const handleCountChange = (specialty: string, value: number) => {
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    setDeptCounts((prev) => {
      if (safeVal === 0) {
        const next = { ...prev };
        delete next[specialty];
        return next;
      }
      return {
        ...prev,
        [specialty]: safeVal,
      };
    });
  };

  const handleResetAllCounts = () => {
    setDeptCounts({});
    setFeedbackMessage('ล้างยอดสถิติเป็น 0 เรียบร้อย');
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const handleCopyPreviousShift = () => {
    if (!previousConsultationData) {
      setFeedbackMessage('ไม่พบข้อมูลจากเวรก่อนหน้า');
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    const prevCounts: Record<string, number> = { ...(previousConsultationData.departmentCounts || {}) };

    // Also migrate from previous items if departmentCounts was empty
    if (Object.keys(prevCounts).length === 0 && previousConsultationData.items && previousConsultationData.items.length > 0) {
      previousConsultationData.items.forEach((item) => {
        if (item.department) {
          prevCounts[item.department] = (prevCounts[item.department] || 0) + 1;
        }
      });
    }

    const prevCustoms = previousConsultationData.customDepartments || [];
    setDeptCounts(prevCounts);
    if (prevCustoms.length > 0) {
      setCustomDepts((curr) => Array.from(new Set([...curr, ...prevCustoms])));
    }

    const totalPrev = Object.values(prevCounts).reduce((acc, v) => acc + (Number(v) || 0), 0) || previousConsultationData.totalCount || 0;
    if (totalPrev > 0) {
      setFeedbackMessage(`ดึงข้อมูลยอด Consult จากเวรก่อนหน้า (${totalPrev} ราย) เรียบร้อยแล้ว`);
    } else {
      setFeedbackMessage('ดึงข้อมูลแล้ว (เวรก่อนหน้าไม่มียอดส่ง Consult)');
    }
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleAddCustomDepartment = () => {
    const trimmed = newCustomDeptName.trim();
    if (!trimmed) return;
    if (!customDepts.includes(trimmed)) {
      setCustomDepts((prev) => [...prev, trimmed]);
      setDeptCounts((prev) => ({ ...prev, [trimmed]: 1 }));
    }
    setNewCustomDeptName('');
    setIsAddingCustom(false);
  };

  const handleRemoveCustomDepartment = (deptName: string) => {
    setCustomDepts((prev) => prev.filter((d) => d !== deptName));
    setDeptCounts((prev) => {
      const next = { ...prev };
      delete next[deptName];
      return next;
    });
  };

  const handleSave = () => {
    // Filter out zero counts
    const cleanCounts: Record<string, number> = {};
    Object.entries(deptCounts).forEach(([dept, count]) => {
      const num = Number(count);
      if (num > 0) {
        cleanCounts[dept] = num;
      }
    });

    onSave({
      totalCount,
      departmentCounts: cleanCounts,
      customDepartments: customDepts,
      notes: initialData?.notes || '',
      items: initialData?.items || [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-800 text-white flex items-center justify-between border-b border-teal-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-teal-200 border border-white/20 shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-['Prompt',sans-serif] tracking-tight">
                  ยอด Consultation
                </h3>
                {shiftContextTitle && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-900/60 border border-teal-500/40 text-teal-200 text-[11px] font-medium">
                    {shiftContextTitle}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-teal-100/90 font-normal">
                บันทึกและรวบรวมสถิติการส่งปรึกษาแพทย์เฉพาะทางแต่ละสาขา (ดึก / เช้า / บ่าย)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition p-1.5 rounded-xl hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Live Summary Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-[#102a27] to-teal-950 text-white p-4 px-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-inner">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-teal-200">
                ผลรวมแต่ละเวร (ผลรวมอัตโนมัติ) :
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#2dd4bf] font-['Prompt',sans-serif] tracking-tight">
                {totalCount}
              </span>
              <span className="text-sm text-teal-200 font-medium">ราย</span>
            </div>
          </div>

          {/* Action Buttons: ข้อมูลเหมือนเวรก่อนหน้า (ดึก/เช้า/บ่าย) + ล้างค่า */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyPreviousShift}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-100 hover:text-white bg-teal-600/40 hover:bg-teal-600/70 border border-teal-400/60 rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
              title={previousShiftLabel ? `ดึงข้อมูลจาก ${previousShiftLabel}` : 'ดึงข้อมูลตัวเลขยอด Consult จากเวรก่อนหน้า (ดึก/เช้า/บ่าย)'}
            >
              <Copy className="w-3.5 h-3.5 text-teal-300" />
              <span>ข้อมูลเหมือนเวรก่อนหน้า (ดึก/เช้า/บ่าย)</span>
            </button>

            {activeSpecialtyEntries.length > 0 && (
              <button
                type="button"
                onClick={handleResetAllCounts}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition border border-white/10 cursor-pointer active:scale-95"
                title="ล้างยอดสถิติเป็น 0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>ล้างค่า</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Message Toast */}
        {feedbackMessage && (
          <div className="px-5 py-2 bg-teal-900/90 text-teal-100 text-xs flex items-center justify-between border-b border-teal-800 animate-in fade-in">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          </div>
        )}

        {/* Active Breakdown Chips if any */}
        {activeSpecialtyEntries.length > 0 && (
          <div className="px-5 py-2.5 bg-teal-50/70 border-b border-teal-100 flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-teal-900 font-bold text-[11px] mr-1">สาขาที่ส่ง Consult:</span>
            {activeSpecialtyEntries.map(({ name, count }) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-teal-300 text-teal-900 font-medium text-[11px] shadow-2xs"
              >
                <span className="font-semibold">{name}</span>
                <span className="w-4 h-4 rounded-full bg-teal-700 text-white font-bold text-[10px] flex items-center justify-center">
                  {count}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* 4 Specialty Categories with colored BG */}
          {CONSULTATION_CATEGORIES.map((category) => {
            const categoryTotal = category.specialties.reduce(
              (acc, spec) => acc + (deptCounts[spec] || 0),
              0
            );

            return (
              <div
                key={category.id}
                className={`rounded-2xl border ${category.borderColor} ${category.bgColor} p-3.5 space-y-2.5 shadow-2xs transition`}
              >
                {/* Category Title */}
                <div className="flex items-center justify-between pb-1.5 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{category.emoji}</span>
                    <h4 className={`font-bold text-xs font-['Prompt',sans-serif] ${category.textColor}`}>
                      {category.name}
                    </h4>
                  </div>
                  {categoryTotal > 0 && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${category.badgeBg} ${category.badgeText} border ${category.borderColor}`}>
                      รวม {categoryTotal} ราย
                    </span>
                  )}
                </div>

                {/* Specialties Grid without - + buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {category.specialties.map((specialty) => {
                    const count = deptCounts[specialty] || 0;
                    const hasCount = count > 0;

                    return (
                      <div
                        key={specialty}
                        className={`p-2 rounded-xl border transition flex flex-col justify-between h-[66px] ${
                          hasCount
                            ? `${category.itemActiveBg} ${category.itemActiveBorder} shadow-xs ring-1 ring-black/5`
                            : 'bg-white/90 border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-bold text-xs truncate ${
                              hasCount ? category.itemActiveText : 'text-slate-700'
                            }`}
                            title={specialty}
                          >
                            {specialty}
                          </span>
                          {hasCount && (
                            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                          )}
                        </div>

                        {/* Direct input number (No - + buttons) */}
                        <div className="pt-1">
                          <input
                            type="number"
                            min="0"
                            value={count === 0 ? '' : count}
                            placeholder="0"
                            onChange={(e) =>
                              handleCountChange(
                                specialty,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className={`w-full h-7 text-center font-extrabold text-xs rounded-lg border transition focus:outline-none focus:ring-2 ${
                              hasCount
                                ? 'bg-white border-teal-500 text-teal-900 focus:ring-teal-400 shadow-2xs'
                                : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300 focus:ring-teal-400'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Custom Added Specialties Section (if any) */}
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <span>➕ สาขาเฉพาะทางเพิ่มเติม</span>
                {customDepts.length > 0 && (
                  <span className="text-[10px] text-indigo-600">({customDepts.length})</span>
                )}
              </div>

              {!isAddingCustom && (
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มสาขาอื่น</span>
                </button>
              )}
            </div>

            {isAddingCustom && (
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-teal-300 shadow-2xs">
                <input
                  type="text"
                  value={newCustomDeptName}
                  onChange={(e) => setNewCustomDeptName(e.target.value)}
                  placeholder="ระบุชื่อสาขา เช่น ทันตกรรม, จิตเวชเด็ก..."
                  className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomDepartment();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomDepartment}
                  className="px-3 py-1 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition cursor-pointer"
                >
                  เพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustom(false);
                    setNewCustomDeptName('');
                  }}
                  className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            )}

            {customDepts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {customDepts.map((deptName) => {
                  const count = deptCounts[deptName] || 0;
                  const hasCount = count > 0;

                  return (
                    <div
                      key={deptName}
                      className={`p-2 rounded-xl border transition flex flex-col justify-between h-[66px] relative group ${
                        hasCount
                          ? 'bg-indigo-100/90 border-indigo-300 text-indigo-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold text-xs truncate ${
                            hasCount ? 'text-indigo-950' : 'text-slate-700'
                          }`}
                          title={deptName}
                        >
                          {deptName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomDepartment(deptName)}
                          className="text-slate-300 hover:text-rose-500 p-0.5 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="ลบสาขานี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Direct input number (No - + buttons) */}
                      <div className="pt-1">
                        <input
                          type="number"
                          min="0"
                          value={count === 0 ? '' : count}
                          placeholder="0"
                          onChange={(e) =>
                            handleCountChange(
                              deptName,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className={`w-full h-7 text-center font-extrabold text-xs rounded-lg border transition focus:outline-none focus:ring-2 ${
                            hasCount
                              ? 'bg-white border-indigo-500 text-indigo-950 focus:ring-indigo-400 shadow-2xs'
                              : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300 focus:ring-indigo-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            ยอดรวมอัตโนมัติ: <strong className="text-teal-800 font-bold">{totalCount}</strong> ราย
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 rounded-xl transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>บันทึก Consultation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
