import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle2, ShieldAlert, ShieldCheck, Activity, HeartPulse, RotateCcw } from 'lucide-react';
import { IncidentData } from '../../types';

interface IncidentIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: IncidentData;
  onSave: (data: IncidentData) => void;
  previousIncidentData?: IncidentData;
  previousShiftLabel?: string;
}

export const IncidentIndicatorModal: React.FC<IncidentIndicatorModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  previousIncidentData,
  previousShiftLabel,
}) => {
  // 1. Specific Clinical Risk (6 รายการ)
  const [anastomosisLeakage, setAnastomosisLeakage] = useState<number | string>(
    initialData?.anastomosisLeakage ?? initialData?.specificRisk?.anastomosisLeakage ?? 0
  );
  const [peInFxLongBone, setPeInFxLongBone] = useState<number | string>(
    initialData?.peInFxLongBone ?? initialData?.specificRisk?.peInFxLongBone ?? 0
  );
  const [hemoPneumoPostCLine, setHemoPneumoPostCLine] = useState<number | string>(
    initialData?.hemoPneumoPostCLine ?? initialData?.specificRisk?.hemoPneumoPostCLine ?? 0
  );
  const [akiInMultipleTm, setAkiInMultipleTm] = useState<number | string>(
    initialData?.akiInMultipleTm ?? initialData?.specificRisk?.akiInMultipleTm ?? 0
  );
  const [tmWithShock, setTmWithShock] = useState<number | string>(
    initialData?.tmWithShock ?? initialData?.specificRisk?.tmWithShock ?? 0
  );
  const [iicpInTm, setIicpInTm] = useState<number | string>(
    initialData?.iicpInTm ?? initialData?.specificRisk?.iicpInTm ?? 0
  );

  // 2. อุบัติการณ์ (10 รายการ)
  const [reAdmit48Hr, setReAdmit48Hr] = useState<number | string>(
    initialData?.reAdmit48Hr ?? initialData?.incidents?.reAdmit48Hr ?? 0
  );
  const [unplannedCpr, setUnplannedCpr] = useState<number | string>(
    initialData?.unplannedCpr ?? initialData?.cprCount ?? initialData?.incidents?.unplannedCpr ?? 0
  );
  const [unplannedExtubation, setUnplannedExtubation] = useState<number | string>(
    initialData?.unplannedExtubation ?? initialData?.incidents?.unplannedExtubation ?? 0
  );
  const [equipmentNotReady, setEquipmentNotReady] = useState<number | string>(
    initialData?.equipmentNotReady ?? initialData?.incidents?.equipmentNotReady ?? 0
  );
  const [serviceComplaint, setServiceComplaint] = useState<number | string>(
    initialData?.serviceComplaint ?? initialData?.incidents?.serviceComplaint ?? 0
  );
  const [wrongPatientId, setWrongPatientId] = useState<number | string>(
    initialData?.wrongPatientId ?? initialData?.incidents?.wrongPatientId ?? 0
  );
  const [medicationError, setMedicationError] = useState<number | string>(
    initialData?.medicationError ?? initialData?.medError ?? initialData?.incidents?.medicationError ?? 0
  );
  const [bloodTransfusionError, setBloodTransfusionError] = useState<number | string>(
    initialData?.bloodTransfusionError ?? initialData?.incidents?.bloodTransfusionError ?? 0
  );
  const [phlebitis, setPhlebitis] = useState<number | string>(
    initialData?.phlebitis ?? initialData?.incidents?.phlebitis ?? 0
  );
  const [workplaceAccident, setWorkplaceAccident] = useState<number | string>(
    initialData?.workplaceAccident ?? initialData?.incidents?.workplaceAccident ?? 0
  );

  const [details, setDetails] = useState<string>(initialData?.details ?? '');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setAnastomosisLeakage(initialData?.anastomosisLeakage ?? initialData?.specificRisk?.anastomosisLeakage ?? 0);
      setPeInFxLongBone(initialData?.peInFxLongBone ?? initialData?.specificRisk?.peInFxLongBone ?? 0);
      setHemoPneumoPostCLine(initialData?.hemoPneumoPostCLine ?? initialData?.specificRisk?.hemoPneumoPostCLine ?? 0);
      setAkiInMultipleTm(initialData?.akiInMultipleTm ?? initialData?.specificRisk?.akiInMultipleTm ?? 0);
      setTmWithShock(initialData?.tmWithShock ?? initialData?.specificRisk?.tmWithShock ?? 0);
      setIicpInTm(initialData?.iicpInTm ?? initialData?.specificRisk?.iicpInTm ?? 0);

      setReAdmit48Hr(initialData?.reAdmit48Hr ?? initialData?.incidents?.reAdmit48Hr ?? 0);
      setUnplannedCpr(initialData?.unplannedCpr ?? initialData?.cprCount ?? initialData?.incidents?.unplannedCpr ?? 0);
      setUnplannedExtubation(initialData?.unplannedExtubation ?? initialData?.incidents?.unplannedExtubation ?? 0);
      setEquipmentNotReady(initialData?.equipmentNotReady ?? initialData?.incidents?.equipmentNotReady ?? 0);
      setServiceComplaint(initialData?.serviceComplaint ?? initialData?.incidents?.serviceComplaint ?? 0);
      setWrongPatientId(initialData?.wrongPatientId ?? initialData?.incidents?.wrongPatientId ?? 0);
      setMedicationError(initialData?.medicationError ?? initialData?.medError ?? initialData?.incidents?.medicationError ?? 0);
      setBloodTransfusionError(initialData?.bloodTransfusionError ?? initialData?.incidents?.bloodTransfusionError ?? 0);
      setPhlebitis(initialData?.phlebitis ?? initialData?.incidents?.phlebitis ?? 0);
      setWorkplaceAccident(initialData?.workplaceAccident ?? initialData?.incidents?.workplaceAccident ?? 0);

      setDetails(initialData?.details ?? '');
      setFeedbackMessage(null);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetAll = () => {
    setAnastomosisLeakage(0);
    setPeInFxLongBone(0);
    setHemoPneumoPostCLine(0);
    setAkiInMultipleTm(0);
    setTmWithShock(0);
    setIicpInTm(0);

    setReAdmit48Hr(0);
    setUnplannedCpr(0);
    setUnplannedExtubation(0);
    setEquipmentNotReady(0);
    setServiceComplaint(0);
    setWrongPatientId(0);
    setMedicationError(0);
    setBloodTransfusionError(0);
    setPhlebitis(0);
    setWorkplaceAccident(0);
    setFeedbackMessage('ล้างค่าตัวชี้วัด/อุบัติการณ์เป็น 0 เรียบร้อย');
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const totalSpecificRisk =
    Number(anastomosisLeakage || 0) +
    Number(peInFxLongBone || 0) +
    Number(hemoPneumoPostCLine || 0) +
    Number(akiInMultipleTm || 0) +
    Number(tmWithShock || 0) +
    Number(iicpInTm || 0);

  const totalIncidents =
    Number(reAdmit48Hr || 0) +
    Number(unplannedCpr || 0) +
    Number(unplannedExtubation || 0) +
    Number(equipmentNotReady || 0) +
    Number(serviceComplaint || 0) +
    Number(wrongPatientId || 0) +
    Number(medicationError || 0) +
    Number(bloodTransfusionError || 0) +
    Number(phlebitis || 0) +
    Number(workplaceAccident || 0);

  const grandTotal = totalSpecificRisk + totalIncidents;

  const handleSave = () => {
    const al = Number(anastomosisLeakage || 0);
    const pe = Number(peInFxLongBone || 0);
    const hp = Number(hemoPneumoPostCLine || 0);
    const aki = Number(akiInMultipleTm || 0);
    const shock = Number(tmWithShock || 0);
    const iicp = Number(iicpInTm || 0);

    const reAdm = Number(reAdmit48Hr || 0);
    const cpr = Number(unplannedCpr || 0);
    const ue = Number(unplannedExtubation || 0);
    const equip = Number(equipmentNotReady || 0);
    const comp = Number(serviceComplaint || 0);
    const wrongId = Number(wrongPatientId || 0);
    const medErr = Number(medicationError || 0);
    const bloodErr = Number(bloodTransfusionError || 0);
    const phleb = Number(phlebitis || 0);
    const workAcc = Number(workplaceAccident || 0);

    onSave({
      anastomosisLeakage: al,
      peInFxLongBone: pe,
      hemoPneumoPostCLine: hp,
      akiInMultipleTm: aki,
      tmWithShock: shock,
      iicpInTm: iicp,
      specificRisk: {
        anastomosisLeakage: al,
        peInFxLongBone: pe,
        hemoPneumoPostCLine: hp,
        akiInMultipleTm: aki,
        tmWithShock: shock,
        iicpInTm: iicp,
      },
      reAdmit48Hr: reAdm,
      unplannedCpr: cpr,
      unplannedExtubation: ue,
      equipmentNotReady: equip,
      serviceComplaint: comp,
      wrongPatientId: wrongId,
      medicationError: medErr,
      bloodTransfusionError: bloodErr,
      phlebitis: phleb,
      workplaceAccident: workAcc,
      incidents: {
        reAdmit48Hr: reAdm,
        unplannedCpr: cpr,
        unplannedExtubation: ue,
        equipmentNotReady: equip,
        serviceComplaint: comp,
        wrongPatientId: wrongId,
        medicationError: medErr,
        bloodTransfusionError: bloodErr,
        phlebitis: phleb,
        workplaceAccident: workAcc,
      },
      // Backward compatibility fields
      cprCount: cpr,
      medError: medErr,
      totalRiskCount: totalSpecificRisk,
      totalIncidentCount: totalIncidents,
      details: details.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-700 via-rose-800 to-red-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-['Prompt',sans-serif]">
                ข้อมูลตัวชี้วัด / อุบัติการณ์
              </h3>
              <p className="text-[11px] text-amber-100/90 font-normal">
                Specific Clinical Risk (6 รายการ) และ อุบัติการณ์ (10 รายการ)
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
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Indicator Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              grandTotal === 0
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {grandTotal === 0 ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <div>
                <span className="font-bold block text-xs font-['Prompt',sans-serif]">
                  {grandTotal === 0
                    ? 'ไม่มีรายงานความเสี่ยง/อุบัติการณ์ในเวรนี้'
                    : `มีบันทึกความเสี่ยง ${totalSpecificRisk} รายการ และ อุบัติการณ์ ${totalIncidents} ครั้ง`}
                </span>
                <span className="text-[11px] opacity-80">
                  {grandTotal === 0
                    ? 'สถิติตัวชี้วัดคุณภาพ ICU อยู่ในเกณฑ์มาตรฐาน'
                    : 'ระบบจะนำยอดไปสรุปรวมในรายงานประจำเดือนโดยอัตโนมัติ'}
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                grandTotal === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              รวม {grandTotal}
            </span>
          </div>

          {/* หมวดที่ 1: Specific Clinical Risk (6 รายการ) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 font-['Prompt',sans-serif]">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                <span>1. Specific Clinical Risk (ความเสี่ยงทางคลินิกเฉพาะ)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                รวม {totalSpecificRisk} ราย
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Anastomosis leakage */}
              <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/80 flex items-center justify-between hover:border-amber-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    Anastomosis leakage
                  </span>
                  <span className="text-[10px] text-slate-500">รอยต่อลำไส้รั่วซึมหลังผ่าตัด</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={anastomosisLeakage}
                    onChange={(e) =>
                      setAnastomosisLeakage(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-amber-800 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 2. PE in Fx.long bone */}
              <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/80 flex items-center justify-between hover:border-amber-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    PE in Fx.long bone
                  </span>
                  <span className="text-[10px] text-slate-500">ลิ่มเลือดอุดกั้นปอดใน Fx. กระดูกยาว</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={peInFxLongBone}
                    onChange={(e) =>
                      setPeInFxLongBone(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-amber-800 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 3. Hemo/Pneumothorax post C-line */}
              <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/80 flex items-center justify-between hover:border-amber-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    Hemo/Pneumothorax post C-line
                  </span>
                  <span className="text-[10px] text-slate-500">ภาวะเลือด/ลมในช่องอกหลังใส่ C-line</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={hemoPneumoPostCLine}
                    onChange={(e) =>
                      setHemoPneumoPostCLine(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-amber-800 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 4. AKI in multiple TM */}
              <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/80 flex items-center justify-between hover:border-amber-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    AKI in multiple TM
                  </span>
                  <span className="text-[10px] text-slate-500">ไตวายเฉียบพลันในผู้ป่วยบาดเจ็บหลายระบบ</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={akiInMultipleTm}
                    onChange={(e) =>
                      setAkiInMultipleTm(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-amber-800 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 5. TM with shock */}
              <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/80 flex items-center justify-between hover:border-amber-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    TM with shock
                  </span>
                  <span className="text-[10px] text-slate-500">ผู้ป่วย Trauma ที่มีภาวะ Shock</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={tmWithShock}
                    onChange={(e) =>
                      setTmWithShock(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-amber-800 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 6. IICP in TM */}
              <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/80 flex items-center justify-between hover:border-amber-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    IICP in TM
                  </span>
                  <span className="text-[10px] text-slate-500">ภาวะความดันในกะโหลกศีรษะสูงใน Trauma</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={iicpInTm}
                    onChange={(e) =>
                      setIicpInTm(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-amber-800 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>
            </div>
          </div>

          {/* หมวดที่ 2: อุบัติการณ์ (10 รายการ) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5 font-['Prompt',sans-serif]">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                <span>2. อุบัติการณ์และเหตุการณ์ไม่พึงประสงค์ (Incidents)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                รวม {totalIncidents} ครั้ง
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Re admit in 48 hr */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    Re admit in 48 hr
                  </span>
                  <span className="text-[10px] text-slate-500">รับกลับเข้ารักษาซ้ำใน ICU ภายใน 48 ชม.</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={reAdmit48Hr}
                    onChange={(e) =>
                      setReAdmit48Hr(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 2. Unplan CPR */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    Unplan CPR
                  </span>
                  <span className="text-[10px] text-slate-500">ช่วยฟื้นคืนชีพฉุกเฉินไม่ได้วางแผน</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={unplannedCpr}
                    onChange={(e) =>
                      setUnplannedCpr(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ครั้ง</span>
                </div>
              </div>

              {/* 3. Unplan extubation */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    Unplan extubation
                  </span>
                  <span className="text-[10px] text-slate-500">ท่อช่วยหายใจเลื่อน/หลุดโดยไม่ได้วางแผน</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={unplannedExtubation}
                    onChange={(e) =>
                      setUnplannedExtubation(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ครั้ง</span>
                </div>
              </div>

              {/* 4. อุปกรณ์ ไม่พร้อมใช้ */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    อุปกรณ์ไม่พร้อมใช้
                  </span>
                  <span className="text-[10px] text-slate-500">เครื่องมือชำรุด/ขาดแคลน/ขัดข้อง</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={equipmentNotReady}
                    onChange={(e) =>
                      setEquipmentNotReady(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ครั้ง</span>
                </div>
              </div>

              {/* 5. ข้อร้องเรียนบริการ */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    ข้อร้องเรียนบริการ
                  </span>
                  <span className="text-[10px] text-slate-500">ข้อร้องเรียนจากผู้ป่วยหรือญาติ</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={serviceComplaint}
                    onChange={(e) =>
                      setServiceComplaint(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">เรื่อง</span>
                </div>
              </div>

              {/* 6. ระบุตัวผู้ป่วยผิดคน */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    ระบุตัวผู้ป่วยผิดคน
                  </span>
                  <span className="text-[10px] text-slate-500">ความผิดพลาดในการระบุตัวผู้ป่วย</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={wrongPatientId}
                    onChange={(e) =>
                      setWrongPatientId(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ครั้ง</span>
                </div>
              </div>

              {/* 7. บริหารยาผิดพลาด */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    บริหารยาผิดพลาด
                  </span>
                  <span className="text-[10px] text-slate-500">Medication Administration Error</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={medicationError}
                    onChange={(e) =>
                      setMedicationError(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ครั้ง</span>
                </div>
              </div>

              {/* 8. การให้เลือดผิดพลาด */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    การให้เลือดผิดพลาด
                  </span>
                  <span className="text-[10px] text-slate-500">Blood Transfusion Error / Reaction</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={bloodTransfusionError}
                    onChange={(e) =>
                      setBloodTransfusionError(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ครั้ง</span>
                </div>
              </div>

              {/* 9. การเกิด Phlebitis */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    การเกิด Phlebitis
                  </span>
                  <span className="text-[10px] text-slate-500">หลอดเลือดดำส่วนปลายอักเสบ</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={phlebitis}
                    onChange={(e) =>
                      setPhlebitis(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ราย</span>
                </div>
              </div>

              {/* 10. อุบัติเหตุการทำงาน */}
              <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex items-center justify-between hover:border-rose-300 transition">
                <div className="pr-2 min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    อุบัติเหตุการทำงาน
                  </span>
                  <span className="text-[10px] text-slate-500">เข็มทิ่มแทง / สัมผัสสารคัดหลั่ง / หกล้ม</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={workplaceAccident}
                    onChange={(e) =>
                      setWorkplaceAccident(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-[10px]">ครั้ง</span>
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
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
};
