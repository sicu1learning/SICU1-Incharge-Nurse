import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  Wind,
  Activity,
  Stethoscope,
  FileText,
  Users,
  Calendar,
} from 'lucide-react';
import { ShiftInfo } from '../../types';
import { printHtmlElement } from '../../utils/printReport';
import {
  parseThaiDate,
  getThaiMonthYear,
  getShiftRank,
  THAI_MONTH_NAMES,
} from '../../utils/shiftUtils';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: ShiftInfo[];
  initialMonth?: string;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  initialTab?: 'wean' | 'patients' | 'consult' | 'indicators' | 'all';
}

interface ThaiMonthOption {
  key: string;
  label: string;
  month: number;
  year: number;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  shifts,
  initialMonth,
  selectedMonth: selectedMonthProp,
  onMonthChange,
  initialTab = 'wean',
}) => {
  // Extract all available months
  const availableMonths = useMemo(() => {
    const map = new Map<string, ThaiMonthOption>();
    shifts.forEach((s) => {
      if (s.date) {
        const info = getThaiMonthYear(s.date);
        if (!map.has(info.key)) {
          map.set(info.key, info);
        }
      }
    });

    const arr = Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return arr;
  }, [shifts]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    selectedMonthProp || initialMonth || (availableMonths[0]?.key ?? 'all')
  );

  // Active printable topic tab
  const [activeTab, setActiveTab] = useState<'wean' | 'patients' | 'consult' | 'indicators' | 'all'>(
    initialTab
  );

  // Sync state whenever modal is opened or props change from parent
  useEffect(() => {
    if (isOpen) {
      if (selectedMonthProp !== undefined) {
        setSelectedMonth(selectedMonthProp);
      } else if (initialMonth) {
        setSelectedMonth(initialMonth);
      }
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, selectedMonthProp, initialMonth, initialTab]);

  const handleMonthSelect = (monthKey: string) => {
    setSelectedMonth(monthKey);
    onMonthChange?.(monthKey);
  };

  // Filter shifts for the selected month
  const targetShifts = useMemo(() => {
    if (selectedMonth === 'all') return shifts;
    return shifts.filter((s) => {
      const { key } = getThaiMonthYear(s.date);
      return key === selectedMonth;
    });
  }, [shifts, selectedMonth]);

  const currentMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'ทุกเดือน (ข้อมูลทั้งหมด)';
    const found = availableMonths.find((m) => m.key === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [selectedMonth, availableMonths]);

  // --- Group shifts by date ---
  const dailyDataList = useMemo(() => {
    const groups = new Map<string, ShiftInfo[]>();
    targetShifts.forEach((s) => {
      if (!groups.has(s.date)) {
        groups.set(s.date, []);
      }
      groups.get(s.date)!.push(s);
    });

    const dates = Array.from(groups.keys()).sort((a, b) => {
      const pA = parseThaiDate(a);
      const pB = parseThaiDate(b);
      if (pA.year !== pB.year) return pB.year - pA.year;
      if (pA.month !== pB.month) return pB.month - pA.month;
      return pB.day - pA.day;
    });

    return dates.map((date) => {
      const dayShifts = groups.get(date)!;
      // Sort shifts: ดึก -> เช้า -> บ่าย
      const shiftOrder: Record<string, number> = { 'เวรดึก': 1, 'เวรเช้า': 2, 'เวรบ่าย': 3 };
      dayShifts.sort((a, b) => (shiftOrder[a.shiftType] || 0) - (shiftOrder[b.shiftType] || 0));

      const firstShift = dayShifts[0];
      const lastShift = dayShifts[dayShifts.length - 1];

      // Equipment & Wean data is recorded ONLY on afternoon shift (เวรบ่าย)
      const weanShift = dayShifts.find((s) => s.shiftType === 'เวรบ่าย');

      const eq = weanShift?.equipmentWeanData;

      const carriedOver = firstShift?.stats?.carriedOver ?? 0;
      const admittedNew = dayShifts.reduce((acc, s) => acc + (s.stats?.admittedNew ?? 0), 0);
      const transferredIn = dayShifts.reduce((acc, s) => acc + (s.stats?.transferredIn ?? 0), 0);
      const transferredOut = dayShifts.reduce((acc, s) => acc + (s.stats?.transferredOut ?? 0), 0);
      const againstAdvice = dayShifts.reduce((acc, s) => acc + (s.stats?.againstAdvice ?? 0), 0);
      const deceased = dayShifts.reduce((acc, s) => acc + (s.stats?.deceased ?? 0), 0);
      const deceasedPostOp24Hr = dayShifts.reduce((acc, s) => acc + (s.stats?.deceasedPostOp24Hr ?? 0), 0);
      const admitDischarge24Hr = dayShifts.reduce((acc, s) => acc + (s.stats?.admitDischarge24Hr ?? 0), 0);
      const referOut = dayShifts.reduce((acc, s) => acc + (s.stats?.referOut ?? 0), 0);
      const currentRemaining = lastShift?.stats?.currentRemaining ?? 0;

      // Equipment & Wean
      const ventUse = eq?.ventilatorUse ?? weanShift?.stats?.ventilatorCount ?? 0;
      const foleyCath = eq?.foleyCatheter ?? 0;
      const periLine = eq?.peripheralLine ?? 0;
      const cLine = eq?.centralLine ?? 0;
      const weanAss = eq?.weanAssess ?? 0;
      const weanAtt = eq?.weanAttempt ?? 0;
      const weanSucc = eq?.weanSuccess ?? 0;

      return {
        date,
        dayShifts,
        inchargeName: weanShift?.inchargeName || '-',
        carriedOver,
        admittedNew,
        transferredIn,
        transferredOut,
        againstAdvice,
        deceased,
        deceasedPostOp24Hr,
        admitDischarge24Hr,
        referOut,
        currentRemaining,
        // Equipment/Wean
        ventUse,
        foleyCath,
        periLine,
        cLine,
        weanAss,
        weanAtt,
        weanSucc,
      };
    });
  }, [targetShifts]);

  // Totals for Equipment / Wean
  const totalVentUse = dailyDataList.reduce((acc, d) => acc + d.ventUse, 0);
  const totalFoleyCath = dailyDataList.reduce((acc, d) => acc + d.foleyCath, 0);
  const totalPeriLine = dailyDataList.reduce((acc, d) => acc + d.periLine, 0);
  const totalCLine = dailyDataList.reduce((acc, d) => acc + d.cLine, 0);
  const totalWeanAss = dailyDataList.reduce((acc, d) => acc + d.weanAss, 0);
  const totalWeanAtt = dailyDataList.reduce((acc, d) => acc + d.weanAtt, 0);
  const totalWeanSucc = dailyDataList.reduce((acc, d) => acc + d.weanSucc, 0);

  const weanSuccessRate =
    totalWeanAtt > 0 ? ((totalWeanSucc / totalWeanAtt) * 100).toFixed(1) : '0';

  // All individual shifts sorted chronologically
  const sortedShifts = useMemo(() => {
    return [...targetShifts].sort((a, b) => {
      const pA = parseThaiDate(a.date);
      const pB = parseThaiDate(b.date);
      if (pA.year !== pB.year) return pA.year - pB.year;
      if (pA.month !== pB.month) return pA.month - pB.month;
      if (pA.day !== pB.day) return pA.day - pB.day;
      const rankA = getShiftRank(a.shiftType);
      const rankB = getShiftRank(b.shiftType);
      return rankA - rankB;
    });
  }, [targetShifts]);

  // Patient Movement Totals across all shifts
  const totalAdmittedNew = sortedShifts.reduce((acc, s) => acc + (s.stats?.admittedNew ?? 0), 0);
  const totalTransferredIn = sortedShifts.reduce((acc, s) => acc + (s.stats?.transferredIn ?? 0), 0);
  const totalTransferredOut = sortedShifts.reduce((acc, s) => acc + (s.stats?.transferredOut ?? 0), 0);
  const totalAgainstAdvice = sortedShifts.reduce((acc, s) => acc + (s.stats?.againstAdvice ?? 0), 0);
  const totalDeceased = sortedShifts.reduce((acc, s) => acc + (s.stats?.deceased ?? 0), 0);
  const totalDeceasedPostOp24Hr = sortedShifts.reduce((acc, s) => acc + (s.stats?.deceasedPostOp24Hr ?? 0), 0);
  const totalAdmitDischarge24Hr = sortedShifts.reduce((acc, s) => acc + (s.stats?.admitDischarge24Hr ?? 0), 0);
  const totalReferOut = sortedShifts.reduce((acc, s) => acc + (s.stats?.referOut ?? 0), 0);

  // Consultations Breakdown
  const consultStats = useMemo(() => {
    let totalConsultCount = 0;
    const deptTotals: Record<string, number> = {};

    sortedShifts.forEach((s) => {
      const c = s.consultationData;
      if (c) {
        totalConsultCount += c.totalCount || 0;
        if (c.departmentCounts) {
          Object.entries(c.departmentCounts).forEach(([dept, count]) => {
            const num = Number(count) || 0;
            if (num > 0) {
              deptTotals[dept] = (deptTotals[dept] || 0) + num;
            }
          });
        }
      }
    });

    const allShiftConsultLogs = sortedShifts.map((s) => {
      const c = s.consultationData;
      const depts: string[] = [];
      if (c?.departmentCounts) {
        Object.entries(c.departmentCounts).forEach(([dept, count]) => {
          if (Number(count) > 0) {
            depts.push(`${dept} (${count})`);
          }
        });
      }
      let details = c?.notes || '';
      if (c?.items && c.items.length > 0) {
        const itemStr = c.items
          .map(
            (it) =>
              `${it.department}${it.doctor ? ` - ${it.doctor}` : ''}${it.details ? `: ${it.details}` : ''}`
          )
          .join('; ');
        details = details ? `${details} | ${itemStr}` : itemStr;
      }
      return {
        id: s.id,
        date: s.date,
        shiftType: s.shiftType,
        inchargeName: s.inchargeName || '-',
        totalCount: c?.totalCount || 0,
        departments: depts,
        details: details || '-',
      };
    });

    return {
      totalConsultCount,
      deptTotals,
      allShiftConsultLogs,
    };
  }, [sortedShifts]);

  // Incidents Breakdown
  const incidentStats = useMemo(() => {
    let totalRiskCount = 0;
    let totalClinicalCount = 0;
    let totalSafetyCount = 0;

    const specificRiskTotals = {
      anastomosisLeakage: 0,
      peInFxLongBone: 0,
      hemoPneumoPostCLine: 0,
      akiInMultipleTm: 0,
      tmWithShock: 0,
      iicpInTm: 0,
    };

    const clinicalTotals = {
      reAdmit48Hr: 0,
      unplannedCpr: 0,
      unplannedExtubation: 0,
      equipmentNotReady: 0,
      serviceComplaint: 0,
      wrongPatientId: 0,
      medicationError: 0,
      bloodTransfusionError: 0,
      phlebitis: 0,
      workplaceAccident: 0,
    };

    const safetyTotals = {
      pressureSore: 0,
      cauti: 0,
      vap: 0,
      clabsi: 0,
      fall: 0,
    };

    const allShiftIncidentLogs = sortedShifts.map((s) => {
      const inc = s.incidentData;
      const sr = inc?.specificRisk;
      const ic = inc?.incidents;

      const al = sr?.anastomosisLeakage ?? inc?.anastomosisLeakage ?? 0;
      const pe = sr?.peInFxLongBone ?? inc?.peInFxLongBone ?? 0;
      const hp = sr?.hemoPneumoPostCLine ?? inc?.hemoPneumoPostCLine ?? 0;
      const aki = sr?.akiInMultipleTm ?? inc?.akiInMultipleTm ?? 0;
      const tm = sr?.tmWithShock ?? inc?.tmWithShock ?? 0;
      const iicp = sr?.iicpInTm ?? inc?.iicpInTm ?? 0;

      specificRiskTotals.anastomosisLeakage += al;
      specificRiskTotals.peInFxLongBone += pe;
      specificRiskTotals.hemoPneumoPostCLine += hp;
      specificRiskTotals.akiInMultipleTm += aki;
      specificRiskTotals.tmWithShock += tm;
      specificRiskTotals.iicpInTm += iicp;

      const ra = ic?.reAdmit48Hr ?? inc?.reAdmit48Hr ?? 0;
      const ucpr = ic?.unplannedCpr ?? inc?.unplannedCpr ?? (inc as any)?.cprCount ?? 0;
      const ue = ic?.unplannedExtubation ?? inc?.unplannedExtubation ?? (inc as any)?.extubation ?? 0;
      const enr = ic?.equipmentNotReady ?? inc?.equipmentNotReady ?? 0;
      const sc = ic?.serviceComplaint ?? inc?.serviceComplaint ?? 0;
      const wid = ic?.wrongPatientId ?? inc?.wrongPatientId ?? 0;
      const me = ic?.medicationError ?? inc?.medicationError ?? (inc as any)?.medError ?? 0;
      const bt = ic?.bloodTransfusionError ?? inc?.bloodTransfusionError ?? 0;
      const ph = ic?.phlebitis ?? inc?.phlebitis ?? 0;
      const wa = ic?.workplaceAccident ?? inc?.workplaceAccident ?? 0;

      clinicalTotals.reAdmit48Hr += ra;
      clinicalTotals.unplannedCpr += ucpr;
      clinicalTotals.unplannedExtubation += ue;
      clinicalTotals.equipmentNotReady += enr;
      clinicalTotals.serviceComplaint += sc;
      clinicalTotals.wrongPatientId += wid;
      clinicalTotals.medicationError += me;
      clinicalTotals.bloodTransfusionError += bt;
      clinicalTotals.phlebitis += ph;
      clinicalTotals.workplaceAccident += wa;

      const ps = ic?.pressureSore ?? (inc as any)?.pressureSore ?? 0;
      const cauti = ic?.cauti ?? (inc as any)?.cauti ?? 0;
      const vap = ic?.vap ?? (inc as any)?.vap ?? 0;
      const clabsi = ic?.clabsi ?? (inc as any)?.clabsi ?? 0;
      const fall = ic?.fall ?? (inc as any)?.fall ?? 0;

      safetyTotals.pressureSore += ps;
      safetyTotals.cauti += cauti;
      safetyTotals.vap += vap;
      safetyTotals.clabsi += clabsi;
      safetyTotals.fall += fall;

      const risksList: string[] = [];
      if (al > 0) risksList.push(`Anastomosis leak (${al})`);
      if (pe > 0) risksList.push(`PE in Fx.bone (${pe})`);
      if (hp > 0) risksList.push(`Hemo/Pneumo C-line (${hp})`);
      if (aki > 0) risksList.push(`AKI multiple TM (${aki})`);
      if (tm > 0) risksList.push(`TM shock (${tm})`);
      if (iicp > 0) risksList.push(`IICP in TM (${iicp})`);

      const incsList: string[] = [];
      if (ra > 0) incsList.push(`Re-admit 48h (${ra})`);
      if (ucpr > 0) incsList.push(`Unplanned CPR (${ucpr})`);
      if (ue > 0) incsList.push(`Unplanned Extubation (${ue})`);
      if (enr > 0) incsList.push(`อุปกรณ์ไม่พร้อม (${enr})`);
      if (sc > 0) incsList.push(`ข้อร้องเรียน (${sc})`);
      if (wid > 0) incsList.push(`ระบุตัวผิดคน (${wid})`);
      if (me > 0) incsList.push(`บริหารยาผิด (${me})`);
      if (bt > 0) incsList.push(`ให้เลือดผิด (${bt})`);
      if (ph > 0) incsList.push(`Phlebitis (${ph})`);
      if (wa > 0) incsList.push(`อุบัติเหตุทำงาน (${wa})`);
      if (ps > 0) incsList.push(`แผลกดทับ (${ps})`);
      if (cauti > 0) incsList.push(`CAUTI (${cauti})`);
      if (vap > 0) incsList.push(`VAP (${vap})`);
      if (clabsi > 0) incsList.push(`CLABSI (${clabsi})`);
      if (fall > 0) incsList.push(`พลัดตกหกล้ม (${fall})`);

      const shiftTotal =
        al + pe + hp + aki + tm + iicp +
        ra + ucpr + ue + enr + sc + wid + me + bt + ph + wa +
        ps + cauti + vap + clabsi + fall;

      return {
        id: s.id,
        date: s.date,
        shiftType: s.shiftType,
        inchargeName: s.inchargeName || '-',
        risks: risksList,
        incidents: incsList,
        details: inc?.details || '-',
        totalCount: shiftTotal,
      };
    });

    totalRiskCount = Object.values(specificRiskTotals).reduce((a, b) => a + b, 0);
    totalClinicalCount = Object.values(clinicalTotals).reduce((a, b) => a + b, 0);
    totalSafetyCount = Object.values(safetyTotals).reduce((a, b) => a + b, 0);
    const grandTotal = totalRiskCount + totalClinicalCount + totalSafetyCount;

    return {
      totalRiskCount,
      totalClinicalCount,
      totalSafetyCount,
      grandTotal,
      specificRiskTotals,
      clinicalTotals,
      safetyTotals,
      allShiftIncidentLogs,
    };
  }, [sortedShifts]);

  const handlePrint = () => {
    const titles: Record<string, string> = {
      wean: `รายงานสรุปการใช้อุปกรณ์และการหย่าเครื่องช่วยหายใจ - ${currentMonthLabel}`,
      patients: `รายงานสรุปสถิติผู้ป่วยและการเคลื่อนย้าย - ${currentMonthLabel}`,
      consult: `รายงานสรุปยอดการส่ง Consult - ${currentMonthLabel}`,
      indicators: `รายงานสรุปตัวชี้วัดและอุบัติการณ์ - ${currentMonthLabel}`,
      all: `รายงานสรุปภาพรวมประจำเดือน SICU 1 - ${currentMonthLabel}`,
    };

    const activeTitle = titles[activeTab] || `รายงานสรุปประจำเดือน - ${currentMonthLabel}`;
    printHtmlElement('monthly-report-printable-content', activeTitle);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#02333a] via-[#004d40] to-[#00796b] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-teal-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold font-['Prompt',sans-serif]">
                  พิมพ์รายงานสรุปประจำเดือน
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-950/70 border border-teal-400/40 text-teal-200 text-xs font-bold">
                  {currentMonthLabel}
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-normal">
                เลือกหัวข้อที่ต้องการและสั่งพิมพ์เอกสารรายงานประจำเดือน (ขนาด A4 / PDF)
              </p>
            </div>
          </div>

          {/* Month Selector & Close Button */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthSelect(e.target.value)}
                className="appearance-none bg-white text-slate-800 text-xs font-bold pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-xs"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    📅 {m.label}
                  </option>
                ))}
                <option value="all">📅 ทุกเดือน (ทั้งหมด)</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
                ▼
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons Toolbar & Topic Selector Tabs */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0 no-print">
          {/* Navigation Tabs for each printable topic */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full">
            <button
              type="button"
              onClick={() => setActiveTab('wean')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                activeTab === 'wean'
                  ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>1. ใช้อุปกรณ์ / Wean</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('patients')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                activeTab === 'patients'
                  ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. สถิติผู้ป่วย</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('consult')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                activeTab === 'consult'
                  ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>3. ยอด Consult</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('indicators')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                activeTab === 'indicators'
                  ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>4. ตัวชี้วัด/อุบัติการณ์</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>5. สรุปภาพรวมทั้งหมด</span>
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-100/70 text-slate-900 text-xs">
          
          {/* TOPIC 1: EQUIPMENT & WEANING REPORT PRINT FORM */}
          {activeTab === 'wean' && (
            <div id="monthly-report-printable-content" className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-300 shadow-sm space-y-5 font-['Prompt',sans-serif] printable-area mx-auto max-w-4xl">
              {/* Document Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1 relative">
                <div className="no-print absolute right-0 top-0">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    title="สั่งพิมพ์แบบฟอร์มนี้ (A4 / PDF)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์รายงาน</span>
                  </button>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 pr-24 sm:pr-0">
                  แบบฟอร์มสรุปบันทึกการใช้อุปกรณ์และการหย่าเครื่องช่วยหายใจ (Weaning) ประจำเดือน
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  หอผู้ป่วยศัลยกรรม 1 (SICU1) · ประจำเดือน: <strong className="text-slate-900 font-bold">{currentMonthLabel}</strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  (รวบรวมข้อมูล 7 รายการหลัก บันทึกสรุปประจำวันจากเวรบ่าย) · วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Table of Daily Equipment & Wean */}
              <div className="space-y-2">
                <table className="w-full text-left text-[11px] border border-slate-400 border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-400 text-slate-900">
                    <tr>
                      <th className="p-1.5 border-r border-slate-300">วันที่</th>
                      <th className="p-1.5 border-r border-slate-300">พยาบาลหัวหน้าเวร (บ่าย)</th>
                      <th className="p-1.5 text-center border-r border-slate-300">1.เครื่องช่วยหายใจ</th>
                      <th className="p-1.5 text-center border-r border-slate-300">2.Foley's Cath</th>
                      <th className="p-1.5 text-center border-r border-slate-300">3.Peripheral Line</th>
                      <th className="p-1.5 text-center border-r border-slate-300">4.Central Line</th>
                      <th className="p-1.5 text-center border-r border-slate-300">5.ประเมิน Wean</th>
                      <th className="p-1.5 text-center border-r border-slate-300">6.ได้รับการ Wean</th>
                      <th className="p-1.5 text-center">7.Wean สำเร็จ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {dailyDataList.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50/60">
                        <td className="p-1.5 font-medium border-r border-slate-300">{d.date}</td>
                        <td className="p-1.5 border-r border-slate-300 text-slate-700">{d.inchargeName}</td>
                        <td className="p-1.5 text-center border-r border-slate-300 font-semibold">{d.ventUse}</td>
                        <td className="p-1.5 text-center border-r border-slate-300">{d.foleyCath}</td>
                        <td className="p-1.5 text-center border-r border-slate-300">{d.periLine}</td>
                        <td className="p-1.5 text-center border-r border-slate-300">{d.cLine}</td>
                        <td className="p-1.5 text-center border-r border-slate-300">{d.weanAss}</td>
                        <td className="p-1.5 text-center border-r border-slate-300">{d.weanAtt}</td>
                        <td className="p-1.5 text-center font-bold text-teal-800">{d.weanSucc}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-black border-t-2 border-slate-600 text-slate-900">
                    <tr>
                      <td className="p-2 border-r border-slate-300">รวมทั้งสิ้น</td>
                      <td className="p-2 border-r border-slate-300">{dailyDataList.length} วัน</td>
                      <td className="p-2 text-center border-r border-slate-300">{totalVentUse}</td>
                      <td className="p-2 text-center border-r border-slate-300">{totalFoleyCath}</td>
                      <td className="p-2 text-center border-r border-slate-300">{totalPeriLine}</td>
                      <td className="p-2 text-center border-r border-slate-300">{totalCLine}</td>
                      <td className="p-2 text-center border-r border-slate-300">{totalWeanAss}</td>
                      <td className="p-2 text-center border-r border-slate-300">{totalWeanAtt}</td>
                      <td className="p-2 text-center font-extrabold text-teal-900">{totalWeanSucc}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Key Metric Highlight */}
                <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-teal-900">
                    สรุปผลการประเมินการหย่าเครื่องช่วยหายใจ (Wean Success Rate):
                  </span>
                  <span className="text-sm font-black text-teal-800">
                    {weanSuccessRate}% <span className="text-xs font-normal text-teal-700">({totalWeanSucc}/{totalWeanAtt} รายที่ได้รับการ Wean)</span>
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-10">
                  <p>ลงชื่อ.............................................................. ผู้จัดทำรายงาน</p>
                  <p>(....................................................................)</p>
                  <p>ตำแหน่ง พยาบาลวิชาชีพ</p>
                </div>
                <div className="space-y-10">
                  <p>ลงชื่อ.............................................................. หัวหน้าหอผู้ป่วย</p>
                  <p>(....................................................................)</p>
                  <p>ตำแหน่ง หัวหน้าหอผู้ป่วยศัลยกรรม 1 (SICU1)</p>
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 2: PATIENT CENSUS & MOVEMENTS REPORT PRINT FORM */}
          {activeTab === 'patients' && (
            <div id="monthly-report-printable-content" className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-300 shadow-sm space-y-5 font-['Prompt',sans-serif] printable-area mx-auto max-w-4xl">
              {/* Document Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1 relative">
                <div className="no-print absolute right-0 top-0">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    title="สั่งพิมพ์แบบฟอร์มนี้ (A4 / PDF)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์รายงาน</span>
                  </button>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 pr-24 sm:pr-0">
                  แบบฟอร์มสรุปสถิติผู้ป่วยและการเคลื่อนย้ายประจำเดือน (แสดงข้อมูลทุกเวร)
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  หอผู้ป่วยศัลยกรรม 1 (SICU1) · ประจำเดือน: <strong className="text-slate-900 font-bold">{currentMonthLabel}</strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  วันที่พิมพ์รายงาน: {new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Summary Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2.5 border border-slate-300 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500 block font-medium">รับใหม่รวม</span>
                  <strong className="text-sm font-bold text-teal-800">+{totalAdmittedNew} ราย</strong>
                </div>
                <div className="p-2.5 border border-slate-300 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500 block font-medium">รับย้ายรวม</span>
                  <strong className="text-sm font-bold text-emerald-800">+{totalTransferredIn} ราย</strong>
                </div>
                <div className="p-2.5 border border-slate-300 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500 block font-medium">ย้ายออกรวม</span>
                  <strong className="text-sm font-bold text-amber-800">-{totalTransferredOut} ราย</strong>
                </div>
                <div className="p-2.5 border border-slate-300 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500 block font-medium">ไม่สมัครใจอยู่</span>
                  <strong className="text-sm font-bold text-orange-700">-{totalAgainstAdvice} ราย</strong>
                </div>
                <div className="p-2.5 border border-slate-300 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500 block font-medium">เสียชีวิตรวม</span>
                  <strong className="text-sm font-bold text-rose-700">{totalDeceased} ราย</strong>
                </div>
                <div className="p-2.5 border border-slate-300 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500 block font-medium">Refer out</span>
                  <strong className="text-sm font-bold text-purple-700">{totalReferOut} ราย</strong>
                </div>
              </div>

              {/* Sub-breakdown details for deaths & DC 24hr */}
              <div className="flex flex-wrap gap-4 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 justify-center">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span>- เสียชีวิต 24 hr. หลัง post op:</span>
                  <strong className="text-rose-800 font-bold">{totalDeceasedPostOp24Hr} ราย</strong>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span>- รับและ D/C ใน 24 hr:</span>
                  <strong className="text-slate-900 font-bold">{totalAdmitDischarge24Hr} ราย</strong>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span>- ยอดรับเข้าสะสม (รับใหม่ + รับย้าย):</span>
                  <strong className="text-teal-900 font-bold">+{totalAdmittedNew + totalTransferredIn} ราย</strong>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span>- ยอดจำหน่าย/ย้ายสะสม:</span>
                  <strong className="text-slate-900 font-bold">-{totalTransferredOut + totalAgainstAdvice + totalDeceased + totalReferOut} ราย</strong>
                </div>
              </div>

              {/* Shift-by-Shift Table (แสดงข้อมูลทุกเวร) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>ตารางบันทึกสถิติผู้ป่วยรายเวร (แสดงข้อมูลทุกเวร - รวม {sortedShifts.length} เวร)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border border-slate-400 border-collapse">
                    <thead className="bg-slate-100 font-bold border-b border-slate-400 text-slate-900">
                      <tr>
                        <th className="p-1.5 border-r border-slate-300 w-24">วันที่</th>
                        <th className="p-1.5 text-center border-r border-slate-300 w-16">เวร</th>
                        <th className="p-1.5 border-r border-slate-300 w-28">Incharge</th>
                        <th className="p-1.5 text-center border-r border-slate-300">ยอดยกมา</th>
                        <th className="p-1.5 text-center border-r border-slate-300">รับใหม่</th>
                        <th className="p-1.5 text-center border-r border-slate-300">รับย้าย</th>
                        <th className="p-1.5 text-center border-r border-slate-300">ย้ายไป</th>
                        <th className="p-1.5 text-center border-r border-slate-300">ไม่สมัครใจ</th>
                        <th className="p-1.5 text-center border-r border-slate-300">เสียชีวิต</th>
                        <th className="p-1.5 text-center border-r border-slate-300">Dead 24h</th>
                        <th className="p-1.5 text-center border-r border-slate-300">D/C 24h</th>
                        <th className="p-1.5 text-center border-r border-slate-300">Refer out</th>
                        <th className="p-1.5 text-center font-bold">คงพยาบาล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {sortedShifts.length > 0 ? (
                        sortedShifts.map((s) => {
                          const st = s.stats;
                          return (
                            <tr key={s.id} className="hover:bg-slate-50/60">
                              <td className="p-1.5 font-medium border-r border-slate-300 whitespace-nowrap">{s.date}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 font-semibold text-teal-800 whitespace-nowrap">{s.shiftType}</td>
                              <td className="p-1.5 border-r border-slate-300 text-slate-700 whitespace-nowrap">{s.inchargeName || '-'}</td>
                              <td className="p-1.5 text-center border-r border-slate-300">{st?.carriedOver ?? 0}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 font-semibold text-teal-800">+{st?.admittedNew ?? 0}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 font-semibold text-emerald-800">+{st?.transferredIn ?? 0}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 font-semibold text-amber-800">-{st?.transferredOut ?? 0}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 font-semibold text-orange-800">-{st?.againstAdvice ?? 0}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 text-rose-700 font-medium">{st?.deceased ?? 0}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 text-slate-600">{st?.deceasedPostOp24Hr ?? 0}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 text-slate-600">{st?.admitDischarge24Hr ?? 0}</td>
                              <td className="p-1.5 text-center border-r border-slate-300 text-purple-700 font-medium">{st?.referOut ?? 0}</td>
                              <td className="p-1.5 text-center font-bold text-slate-900">{st?.currentRemaining ?? 0}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={13} className="p-6 text-center text-slate-400">
                            ไม่มีข้อมูลเวรในเดือนนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-600 text-slate-900">
                      <tr>
                        <td colSpan={3} className="p-2 border-r border-slate-300 text-center font-bold">
                          รวมทั้งสิ้น ({sortedShifts.length} เวร)
                        </td>
                        <td className="p-2 text-center border-r border-slate-300">-</td>
                        <td className="p-2 text-center border-r border-slate-300 font-bold text-teal-900">+{totalAdmittedNew}</td>
                        <td className="p-2 text-center border-r border-slate-300 font-bold text-emerald-900">+{totalTransferredIn}</td>
                        <td className="p-2 text-center border-r border-slate-300 font-bold text-amber-900">-{totalTransferredOut}</td>
                        <td className="p-2 text-center border-r border-slate-300 font-bold text-orange-900">-{totalAgainstAdvice}</td>
                        <td className="p-2 text-center border-r border-slate-300 text-rose-900 font-bold">{totalDeceased}</td>
                        <td className="p-2 text-center border-r border-slate-300 text-rose-900 font-bold">{totalDeceasedPostOp24Hr}</td>
                        <td className="p-2 text-center border-r border-slate-300 text-slate-900 font-bold">{totalAdmitDischarge24Hr}</td>
                        <td className="p-2 text-center border-r border-slate-300 text-purple-900 font-bold">{totalReferOut}</td>
                        <td className="p-2 text-center">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-10">
                  <p>ลงชื่อ.............................................................. ผู้จัดทำรายงาน</p>
                  <p>(....................................................................)</p>
                  <p>ตำแหน่ง พยาบาลวิชาชีพ</p>
                </div>
                <div className="space-y-10">
                  <p>ลงชื่อ.............................................................. หัวหน้าหอผู้ป่วย</p>
                  <p>(....................................................................)</p>
                  <p>ตำแหน่ง หัวหน้าหอผู้ป่วยศัลยกรรม 1 (SICU1)</p>
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 3: CONSULTATIONS REPORT PRINT FORM */}
          {activeTab === 'consult' && (
            <div id="monthly-report-printable-content" className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-300 shadow-sm space-y-5 font-['Prompt',sans-serif] printable-area mx-auto max-w-4xl">
              {/* Document Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1 relative">
                <div className="no-print absolute right-0 top-0">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    title="สั่งพิมพ์แบบฟอร์มนี้ (A4 / PDF)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์รายงาน</span>
                  </button>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 pr-24 sm:pr-0">
                  แบบฟอร์มสรุปรายงานการส่งปรึกษาแพทย์ (Consultation Summary) ประจำเดือน
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  หอผู้ป่วยศัลยกรรม 1 (SICU1) · ประจำเดือน: <strong className="text-slate-900 font-bold">{currentMonthLabel}</strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  วันที่พิมพ์รายงาน: {new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Section 3.1: Table of Consults by Department */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3.1 สรุปยอดการส่ง Consult แยกตามสาขาวิชา / แผนก
                </h3>
                <table className="w-full text-left text-xs border border-slate-400 border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-400 text-slate-900">
                    <tr>
                      <th className="p-2 border-r border-slate-300 w-16 text-center">ลำดับ</th>
                      <th className="p-2 border-r border-slate-300">สาขาวิชา / แผนกที่ส่ง Consult</th>
                      <th className="p-2 text-center border-r border-slate-300 w-32">จำนวน (ครั้ง/ราย)</th>
                      <th className="p-2 text-center w-32">สัดส่วน (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {Object.entries(consultStats.deptTotals).length > 0 ? (
                      Object.entries(consultStats.deptTotals).map(([dept, count], idx) => {
                        const numCount = Number(count) || 0;
                        const pct = consultStats.totalConsultCount > 0
                          ? ((numCount / consultStats.totalConsultCount) * 100).toFixed(1)
                          : '0';
                        return (
                          <tr key={dept} className="hover:bg-slate-50/60">
                            <td className="p-2 text-center font-medium border-r border-slate-300">{idx + 1}</td>
                            <td className="p-2 font-semibold text-slate-900 border-r border-slate-300">{dept}</td>
                            <td className="p-2 text-center font-bold text-teal-800 border-r border-slate-300">{numCount}</td>
                            <td className="p-2 text-center text-slate-600">{pct}%</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          ไม่มีข้อมูลการส่ง Consult ในเดือนนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-black border-t-2 border-slate-600 text-slate-900">
                    <tr>
                      <td colSpan={2} className="p-2.5 border-r border-slate-300 text-right">
                        รวมส่ง Consult ทั้งสิ้น:
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-300 text-teal-900 font-extrabold text-sm">
                        {consultStats.totalConsultCount} ครั้ง
                      </td>
                      <td className="p-2.5 text-center text-slate-700">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Section 3.2: Shift-by-Shift Consultations Log Table (แสดงข้อมูลทุกเวร) */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3.2 ตารางบันทึกการส่ง Consult แยกตามรายเวร (แสดงข้อมูลทุกเวร - รวม {consultStats.allShiftConsultLogs.length} เวร)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-400 border-collapse">
                    <thead className="bg-slate-100 font-bold border-b border-slate-400 text-slate-900">
                      <tr>
                        <th className="p-2 border-r border-slate-300 w-28">วันที่</th>
                        <th className="p-2 text-center border-r border-slate-300 w-20">เวร</th>
                        <th className="p-2 border-r border-slate-300 w-36">Incharge</th>
                        <th className="p-2 border-r border-slate-300">แผนกที่ส่ง Consult</th>
                        <th className="p-2 text-center w-28">ยอดรวม (ครั้ง)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {consultStats.allShiftConsultLogs.length > 0 ? (
                        consultStats.allShiftConsultLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="p-2 font-medium border-r border-slate-300 whitespace-nowrap">{log.date}</td>
                            <td className="p-2 text-center font-semibold text-teal-800 border-r border-slate-300 whitespace-nowrap">{log.shiftType}</td>
                            <td className="p-2 border-r border-slate-300 whitespace-nowrap">{log.inchargeName}</td>
                            <td className="p-2 border-r border-slate-300">
                              {log.departments.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {log.departments.map((d, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-300 rounded text-[10px] font-semibold">
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-center font-bold text-slate-900">
                              {log.totalCount > 0 ? (
                                <span className="text-teal-800 font-black">{log.totalCount}</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            ไม่มีข้อมูลเวรในเดือนนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-600 text-slate-900">
                      <tr>
                        <td colSpan={4} className="p-2 border-r border-slate-300 text-right">
                          รวมส่ง Consult ทุกเวรทั้งสิ้น:
                        </td>
                        <td className="p-2 text-center text-teal-900 font-extrabold text-sm">
                          {consultStats.totalConsultCount} ครั้ง
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-10">
                  <p>ลงชื่อ.............................................................. ผู้จัดทำรายงาน</p>
                  <p>(....................................................................)</p>
                  <p>ตำแหน่ง พยาบาลวิชาชีพ</p>
                </div>
                <div className="space-y-10">
                  <p>ลงชื่อ.............................................................. หัวหน้าหอผู้ป่วย</p>
                  <p>(....................................................................)</p>
                  <p>ตำแหน่ง หัวหน้าหอผู้ป่วยศัลยกรรม 1 (SICU1)</p>
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 4: QUALITY INDICATORS & INCIDENTS REPORT PRINT FORM */}
          {activeTab === 'indicators' && (
            <div id="monthly-report-printable-content" className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-300 shadow-sm space-y-5 font-['Prompt',sans-serif] printable-area mx-auto max-w-4xl">
              {/* Document Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1 relative">
                <div className="no-print absolute right-0 top-0">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    title="สั่งพิมพ์แบบฟอร์มนี้ (A4 / PDF)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์รายงาน</span>
                  </button>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 pr-24 sm:pr-0">
                  แบบฟอร์มสรุปรายงานตัวชี้วัดคุณภาพและความเสี่ยงทางคลินิกประจำเดือน (แสดงข้อมูลทุกเวร)
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  หอผู้ป่วยศัลยกรรม 1 (SICU1) · ประจำเดือน: <strong className="text-slate-900 font-bold">{currentMonthLabel}</strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  วันที่พิมพ์รายงาน: {new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Specific Risks, Incidents & Quality Indicators Tables */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Specific Risks */}
                  <div className="border border-slate-400 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 p-2.5 font-bold text-slate-900 border-b border-slate-400 flex items-center justify-between">
                      <span>1. ความเสี่ยงทางคลินิกจำเพาะ (Specific Clinical Risk)</span>
                      <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold">{incidentStats.totalRiskCount} ครั้ง</span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        <tr>
                          <td className="p-2 border-r border-slate-200">1.1 Anastomosis leakage</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.specificRiskTotals.anastomosisLeakage} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">1.2 PE in Fx.long bone</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.specificRiskTotals.peInFxLongBone} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">1.3 Hemo/Pneumothorax post C-line</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.specificRiskTotals.hemoPneumoPostCLine} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">1.4 AKI in multiple TM</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.specificRiskTotals.akiInMultipleTm} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">1.5 TM with shock</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.specificRiskTotals.tmWithShock} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">1.6 IICP in TM</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.specificRiskTotals.iicpInTm} ครั้ง</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 2. Clinical Incidents & Quality */}
                  <div className="border border-slate-400 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 p-2.5 font-bold text-slate-900 border-b border-slate-400 flex items-center justify-between">
                      <span>2. อุบัติการณ์ทางคลินิก (Clinical Incidents - 10 รายการ)</span>
                      <span className="text-xs bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded font-bold">{incidentStats.totalClinicalCount} ครั้ง</span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.1 Re-admit in 48 hr</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.reAdmit48Hr} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.2 Unplanned CPR</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.unplannedCpr} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.3 Unplanned Extubation (ท่อหลุด/ดึงท่อ)</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.unplannedExtubation} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.4 อุปกรณ์ไม่พร้อมใช้</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.equipmentNotReady} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.5 ข้อร้องเรียนการบริการ</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.serviceComplaint} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.6 ระบุตัวผู้ป่วยผิดคน</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.wrongPatientId} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.7 บริหารยาผิดพลาด (Med Error)</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.medicationError} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.8 การให้เลือดผิดพลาด</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.bloodTransfusionError} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.9 หลอดเลือดดำอักเสบ (Phlebitis)</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.phlebitis} ครั้ง</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200">2.10 อุบัติเหตุจากการทำงาน</td>
                          <td className="p-2 text-right font-bold text-slate-900 w-24">{incidentStats.clinicalTotals.workplaceAccident} ครั้ง</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Safety & Infection Indicators */}
                <div className="border border-slate-400 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 p-2.5 font-bold text-slate-900 border-b border-slate-400 flex items-center justify-between">
                    <span>3. ตัวชี้วัดการติดเชื้อและความปลอดภัยในโรงพยาบาล</span>
                    <span className="text-xs bg-teal-100 text-teal-900 border border-teal-300 px-2 py-0.5 rounded font-bold">{incidentStats.totalSafetyCount} ครั้ง</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-200 text-center text-xs">
                    <div className="p-2.5">
                      <span className="text-slate-600 block text-[11px]">แผลกดทับ (Pressure Sore)</span>
                      <strong className="text-base font-bold text-slate-900 mt-1 block">{incidentStats.safetyTotals.pressureSore} ครั้ง</strong>
                    </div>
                    <div className="p-2.5">
                      <span className="text-slate-600 block text-[11px]">ติดเชื้อ CAUTI</span>
                      <strong className="text-base font-bold text-slate-900 mt-1 block">{incidentStats.safetyTotals.cauti} ครั้ง</strong>
                    </div>
                    <div className="p-2.5">
                      <span className="text-slate-600 block text-[11px]">ติดเชื้อ VAP</span>
                      <strong className="text-base font-bold text-slate-900 mt-1 block">{incidentStats.safetyTotals.vap} ครั้ง</strong>
                    </div>
                    <div className="p-2.5">
                      <span className="text-slate-600 block text-[11px]">ติดเชื้อ CLABSI</span>
                      <strong className="text-base font-bold text-slate-900 mt-1 block">{incidentStats.safetyTotals.clabsi} ครั้ง</strong>
                    </div>
                    <div className="p-2.5">
                      <span className="text-slate-600 block text-[11px]">พลัดตกหกล้ม (Fall)</span>
                      <strong className="text-base font-bold text-slate-900 mt-1 block">{incidentStats.safetyTotals.fall} ครั้ง</strong>
                    </div>
                  </div>
                </div>

                {/* 4. Shift Incidents Log Table (แสดงข้อมูลทุกเวร) */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    4. บันทึกรายงานอุบัติการณ์และความเสี่ยงทางคลินิกแยกตามรายเวร (แสดงข้อมูลทุกเวร - รวม {incidentStats.allShiftIncidentLogs.length} เวร)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-400 border-collapse">
                      <thead className="bg-slate-100 font-bold border-b border-slate-400 text-slate-900">
                        <tr>
                          <th className="p-2 border-r border-slate-300 w-24">วันที่</th>
                          <th className="p-2 text-center border-r border-slate-300 w-16">เวร</th>
                          <th className="p-2 border-r border-slate-300 w-28">Incharge</th>
                          <th className="p-2 border-r border-slate-300 w-44">ความเสี่ยงจำเพาะที่พบ</th>
                          <th className="p-2 border-r border-slate-300 w-44">อุบัติการณ์ / ตัวชี้วัดที่พบ</th>
                          <th className="p-2 border-r border-slate-300">รายละเอียด / บันทึกการจัดการ</th>
                          <th className="p-2 text-center w-20">รวม (ครั้ง)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {incidentStats.allShiftIncidentLogs.length > 0 ? (
                          incidentStats.allShiftIncidentLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50">
                              <td className="p-2 font-medium border-r border-slate-300 whitespace-nowrap">{log.date}</td>
                              <td className="p-2 text-center font-semibold text-teal-800 border-r border-slate-300 whitespace-nowrap">{log.shiftType}</td>
                              <td className="p-2 border-r border-slate-300 whitespace-nowrap">{log.inchargeName}</td>
                              <td className="p-2 border-r border-slate-300">
                                {log.risks.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {log.risks.map((r, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[10px] font-medium">
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-2 border-r border-slate-300">
                                {log.incidents.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {log.incidents.map((incItem, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-300 rounded text-[10px] font-medium">
                                        {incItem}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-slate-600 border-r border-slate-300 text-xs">{log.details}</td>
                              <td className="p-2 text-center font-bold">
                                {log.totalCount > 0 ? (
                                  <span className="text-rose-700 font-black">{log.totalCount}</span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400">
                              ไม่มีข้อมูลเวรในเดือนนี้
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-100 font-black border-t-2 border-slate-600 text-slate-900">
                        <tr>
                          <td colSpan={6} className="p-2 border-r border-slate-300 text-right">
                            รวมอุบัติการณ์และความเสี่ยงทุกเวรทั้งสิ้น:
                          </td>
                          <td className="p-2 text-center text-rose-900 font-extrabold text-sm">
                            {incidentStats.grandTotal} ครั้ง
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-10">
                  <p>ลงชื่อ.............................................................. ผู้จัดทำรายงาน</p>
                  <p>(....................................................................)</p>
                  <p>ตำแหน่ง พยาบาลวิชาชีพ</p>
                </div>
                <div className="space-y-10">
                  <p>ลงชื่อ.............................................................. หัวหน้าหอผู้ป่วย</p>
                  <p>(....................................................................)</p>
                  <p>ตำแหน่ง หัวหน้าหอผู้ป่วยศัลยกรรม 1 (SICU1)</p>
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 5: FULL COMPREHENSIVE MONTHLY REPORT (ALL IN ONE - SUMMARY ONLY) */}
          {activeTab === 'all' && (
            <div id="monthly-report-printable-content" className="p-4 sm:p-5 bg-white rounded-xl border border-slate-300 shadow-xs space-y-2.5 font-['Prompt',sans-serif] printable-area single-page-summary mx-auto max-w-4xl text-slate-900">
              {/* Document Header */}
              <div className="text-center pb-2 border-b-2 border-slate-800 space-y-0.5 relative">
                <div className="no-print absolute right-0 top-0">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    title="สั่งพิมพ์แบบฟอร์มนี้ (A4 / PDF)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์รายงาน</span>
                  </button>
                </div>
                <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 pr-20 sm:pr-0">
                  แบบฟอร์มสรุปรายงานภาพรวมประจำเดือน ศัลยกรรม 1 (SICU1)
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  หอผู้ป่วยศัลยกรรม 1 (SICU1) · ประจำเดือน: <strong className="text-slate-900 font-bold">{currentMonthLabel}</strong> · วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Section 1: Equipment & Weaning Summary */}
              <div className="space-y-1.5 p-2 bg-slate-50 border border-slate-300 rounded-lg">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                    1. สรุปบันทึกการใช้อุปกรณ์และการหย่าเครื่องช่วยหายใจ (Equipment &amp; Weaning Summary)
                  </h3>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                    อัตรา Wean สำเร็จ: {weanSuccessRate}% ({totalWeanSucc}/{totalWeanAtt} ราย)
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-center text-xs">
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block leading-tight">1. Ventilator-days</span>
                    <strong className="text-xs font-bold text-slate-900">{totalVentUse}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block leading-tight">2. Foley's Cath</span>
                    <strong className="text-xs font-bold text-slate-900">{totalFoleyCath}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block leading-tight">3. Peripheral Line</span>
                    <strong className="text-xs font-bold text-slate-900">{totalPeriLine}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block leading-tight">4. Central Line</span>
                    <strong className="text-xs font-bold text-slate-900">{totalCLine}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block leading-tight">5. ประเมิน Wean</span>
                    <strong className="text-xs font-bold text-teal-800">{totalWeanAss} ราย</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block leading-tight">6. ได้รับ Wean</span>
                    <strong className="text-xs font-bold text-amber-700">{totalWeanAtt} ราย</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block leading-tight">7. Wean สำเร็จ</span>
                    <strong className="text-xs font-bold text-emerald-700">{totalWeanSucc} ราย</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Patient Stats Summary */}
              <div className="space-y-1.5 p-2 bg-slate-50 border border-slate-300 rounded-lg">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                    2. สรุปสถิติผู้ป่วยและการเคลื่อนย้ายประจำเดือน (Patient Census &amp; Movements)
                  </h3>
                  <span className="text-[10px] font-bold text-slate-700">
                    รับเข้า: +{totalAdmittedNew + totalTransferredIn} ราย | จำหน่าย/ย้าย: -{totalTransferredOut + totalAgainstAdvice + totalDeceased + totalReferOut} ราย
                  </span>
                </div>
                
                {/* 6 Core Statistics */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-xs">
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block font-medium">รับใหม่รวม</span>
                    <strong className="text-xs font-bold text-teal-800">+{totalAdmittedNew}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block font-medium">รับย้ายรวม</span>
                    <strong className="text-xs font-bold text-emerald-800">+{totalTransferredIn}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block font-medium">ย้ายออกรวม</span>
                    <strong className="text-xs font-bold text-amber-800">-{totalTransferredOut}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block font-medium">ไม่สมัครใจอยู่</span>
                    <strong className="text-xs font-bold text-orange-700">-{totalAgainstAdvice}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block font-medium">เสียชีวิตรวม</span>
                    <strong className="text-xs font-bold text-rose-700">{totalDeceased}</strong>
                  </div>
                  <div className="p-1 border border-slate-300 rounded bg-white">
                    <span className="text-[9px] text-slate-500 block font-medium">Refer out</span>
                    <strong className="text-xs font-bold text-purple-700">{totalReferOut}</strong>
                  </div>
                </div>

                {/* Sub-breakdown details for deaths & DC 24hr */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                  <div className="p-1 border border-slate-200 rounded bg-white flex justify-between items-center">
                    <span className="text-slate-600">เสียชีวิต post op 24h:</span>
                    <strong className="text-rose-800 font-bold">{totalDeceasedPostOp24Hr} ราย</strong>
                  </div>
                  <div className="p-1 border border-slate-200 rounded bg-white flex justify-between items-center">
                    <span className="text-slate-600">รับและ D/C ใน 24h:</span>
                    <strong className="text-slate-900 font-bold">{totalAdmitDischarge24Hr} ราย</strong>
                  </div>
                  <div className="p-1 border border-slate-200 rounded bg-white flex justify-between items-center">
                    <span className="text-slate-600">ยอดรับเข้าสะสม:</span>
                    <strong className="text-teal-900 font-bold">+{totalAdmittedNew + totalTransferredIn} ราย</strong>
                  </div>
                  <div className="p-1 border border-slate-200 rounded bg-white flex justify-between items-center">
                    <span className="text-slate-600">ยอดจำหน่ายสะสม:</span>
                    <strong className="text-slate-900 font-bold">-{totalTransferredOut + totalAgainstAdvice + totalDeceased + totalReferOut} ราย</strong>
                  </div>
                </div>
              </div>

              {/* Section 3: Consult Summary */}
              <div className="space-y-1 p-2 bg-slate-50 border border-slate-300 rounded-lg">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                    3. สรุปยอดการส่ง Consult ประจำเดือน (Consultation Summary)
                  </h3>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                    รวมส่ง Consult ทั้งสิ้น {consultStats.totalConsultCount} ครั้ง
                  </span>
                </div>
                {Object.entries(consultStats.deptTotals).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px]">
                    {Object.entries(consultStats.deptTotals).map(([dept, count]) => {
                      const numCount = Number(count) || 0;
                      const pct = consultStats.totalConsultCount > 0
                        ? ((numCount / consultStats.totalConsultCount) * 100).toFixed(1)
                        : '0';
                      return (
                        <div key={dept} className="p-1 border border-slate-300 rounded bg-white flex justify-between items-center">
                          <span className="text-slate-700 font-medium truncate mr-1">{dept}:</span>
                          <span className="text-slate-900 font-bold whitespace-nowrap">
                            {numCount} <span className="text-[9px] text-slate-500 font-normal">({pct}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-1 text-[10px] text-slate-400">
                    ไม่มีข้อมูลการส่ง Consult ในเดือนนี้
                  </div>
                )}
              </div>

              {/* Section 4: Incidents & Quality Indicators Summary (Only Show Items With Events) */}
              {(() => {
                const specificRiskItems = [
                  { name: 'Anastomosis leakage', count: incidentStats.specificRiskTotals.anastomosisLeakage },
                  { name: 'PE in Fx.long bone', count: incidentStats.specificRiskTotals.peInFxLongBone },
                  { name: 'Hemo/Pneumo post C-Line', count: incidentStats.specificRiskTotals.hemoPneumoPostCLine },
                  { name: 'AKI in Multiple Trauma', count: incidentStats.specificRiskTotals.akiInMultipleTm },
                  { name: 'Trauma with Shock', count: incidentStats.specificRiskTotals.tmWithShock },
                  { name: 'IICP in Trauma', count: incidentStats.specificRiskTotals.iicpInTm },
                ].filter((item) => item.count > 0);

                const clinicalIncidentItems = [
                  { name: 'Re-admit 48 hr.', count: incidentStats.clinicalTotals.reAdmit48Hr },
                  { name: 'Unplanned CPR', count: incidentStats.clinicalTotals.unplannedCpr },
                  { name: 'Unplanned Extubation', count: incidentStats.clinicalTotals.unplannedExtubation },
                  { name: 'อุปกรณ์ช่วยชีวิตไม่พร้อมใช้', count: incidentStats.clinicalTotals.equipmentNotReady },
                  { name: 'ข้อร้องเรียนการบริการ', count: incidentStats.clinicalTotals.serviceComplaint },
                  { name: 'ระบุตัวผู้ป่วยผิดคน', count: incidentStats.clinicalTotals.wrongPatientId },
                  { name: 'Medication Error', count: incidentStats.clinicalTotals.medicationError },
                  { name: 'Blood Transfusion Error', count: incidentStats.clinicalTotals.bloodTransfusionError },
                  { name: 'Phlebitis', count: incidentStats.clinicalTotals.phlebitis },
                  { name: 'อุบัติเหตุจากการทำงาน', count: incidentStats.clinicalTotals.workplaceAccident },
                ].filter((item) => item.count > 0);

                const safetyItems = [
                  { name: 'แผลกดทับ (Pressure Sore)', count: incidentStats.safetyTotals.pressureSore },
                  { name: 'ติดเชื้อ CAUTI', count: incidentStats.safetyTotals.cauti },
                  { name: 'ติดเชื้อ VAP', count: incidentStats.safetyTotals.vap },
                  { name: 'ติดเชื้อ CLABSI', count: incidentStats.safetyTotals.clabsi },
                  { name: 'พลัดตกหกล้ม (Fall)', count: incidentStats.safetyTotals.fall },
                ].filter((item) => item.count > 0);

                return (
                  <div className="space-y-1.5 p-2 bg-slate-50 border border-slate-300 rounded-lg">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                        4. สรุปตัวชี้วัดคุณภาพ อุบัติการณ์ และความเสี่ยงทางคลินิก (Quality &amp; Risk Summary)
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        incidentStats.grandTotal > 0
                          ? 'text-rose-800 bg-rose-100 border-rose-200'
                          : 'text-emerald-800 bg-emerald-100 border-emerald-200'
                      }`}>
                        {incidentStats.grandTotal > 0 ? `มีรายงานรวม ${incidentStats.grandTotal} ครั้ง` : 'ปกติทุกรายการ (0 ครั้ง)'}
                      </span>
                    </div>

                    {incidentStats.grandTotal === 0 ? (
                      <div className="py-2.5 px-3 bg-white border border-slate-200 rounded text-center">
                        <p className="text-[10.5px] font-bold text-emerald-700">
                          ✓ ไม่พบรายงานอุบัติการณ์หรือความเสี่ยงทางคลินิกในเดือนนี้ (ปกติทุกรายการ 0 ครั้ง)
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                        {/* Col 1: Specific Risks (Show only if count > 0) */}
                        <div className="border border-slate-300 rounded bg-white overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="bg-amber-50/80 px-2 py-1 font-bold text-amber-900 border-b border-slate-200 flex justify-between items-center">
                              <span>4.1 ความเสี่ยงจำเพาะ</span>
                              <span className="text-amber-800 font-extrabold">{incidentStats.totalRiskCount} ครั้ง</span>
                            </div>
                            {specificRiskItems.length > 0 ? (
                              <div className="divide-y divide-slate-100 p-1">
                                {specificRiskItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between py-0.5 px-1 items-center">
                                    <span className="text-slate-700">{item.name}</span>
                                    <strong className="text-rose-700 font-bold">{item.count} ครั้ง</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-2 text-center text-[9.5px] text-slate-400 italic">
                                ไม่มีรายงานความเสี่ยงจำเพาะ (0)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Col 2: Clinical Incidents (Show only if count > 0) */}
                        <div className="border border-slate-300 rounded bg-white overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="bg-rose-50/80 px-2 py-1 font-bold text-rose-900 border-b border-slate-200 flex justify-between items-center">
                              <span>4.2 อุบัติการณ์คลินิก</span>
                              <span className="text-rose-800 font-extrabold">{incidentStats.totalClinicalCount} ครั้ง</span>
                            </div>
                            {clinicalIncidentItems.length > 0 ? (
                              <div className="divide-y divide-slate-100 p-1">
                                {clinicalIncidentItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between py-0.5 px-1 items-center">
                                    <span className="text-slate-700">{item.name}</span>
                                    <strong className="text-rose-700 font-bold">{item.count} ครั้ง</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-2 text-center text-[9.5px] text-slate-400 italic">
                                ไม่มีรายงานอุบัติการณ์คลินิก (0)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Col 3: Safety / Hospital Acquired (Show only if count > 0) */}
                        <div className="border border-slate-300 rounded bg-white overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="bg-teal-50/80 px-2 py-1 font-bold text-teal-900 border-b border-slate-200 flex justify-between items-center">
                              <span>4.3 ความปลอดภัย/ติดเชื้อ</span>
                              <span className="text-teal-800 font-extrabold">{incidentStats.totalSafetyCount} ครั้ง</span>
                            </div>
                            {safetyItems.length > 0 ? (
                              <div className="divide-y divide-slate-100 p-1">
                                {safetyItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between py-0.5 px-1 items-center">
                                    <span className="text-slate-700">{item.name}</span>
                                    <strong className="text-rose-700 font-bold">{item.count} ครั้ง</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-2 text-center text-[9.5px] text-slate-400 italic">
                                ไม่มีรายงานการติดเชื้อ/ตกเตียง (0)
                              </div>
                            )}
                          </div>
                          <div className="p-1 bg-slate-100 border-t border-slate-200 text-center rounded-b">
                            <span className="text-[9px] text-slate-600 block">สรุปรวม 3 หมวดความเสี่ยง</span>
                            <strong className="text-[11px] font-bold text-rose-900">
                              {incidentStats.totalRiskCount} + {incidentStats.totalClinicalCount} + {incidentStats.totalSafetyCount} = {incidentStats.grandTotal} ครั้ง
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Signatures */}
              <div className="pt-3 grid grid-cols-2 gap-4 text-center text-[11px]">
                <div className="space-y-4">
                  <p>ลงชื่อ.............................................................. ผู้จัดทำรายงาน</p>
                  <p>(....................................................................)</p>
                  <p className="text-slate-600">ตำแหน่ง พยาบาลวิชาชีพ</p>
                </div>
                <div className="space-y-4">
                  <p>ลงชื่อ.............................................................. หัวหน้าหอผู้ป่วย</p>
                  <p>(....................................................................)</p>
                  <p className="text-slate-600">ตำแหน่ง หัวหน้าหอผู้ป่วยศัลยกรรม 1 (SICU1)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0 no-print">
          <span className="text-[11px] text-slate-500">
            ระบบบันทึกและส่งต่อเวร SICU 1 · ฟอร์มรายงานมาตรฐานขนาด A4 พร้อมพิมพ์และบันทึกเป็น PDF
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์รายงาน (A4/PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
