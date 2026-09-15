import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  ArrowLeft,
  Calendar,
  Search,
  Download,
  Trash2,
  Edit3,
  Moon,
  Sun,
  Sunrise,
  CheckCircle2,
  FileText,
  MessageSquare,
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  Printer,
  Wind,
  Stethoscope,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';
import { ShiftInfo, PatientStats, HandoverItem, PendingChart } from '../types';
import {
  compareShiftsDesc,
  getThaiMonthYear,
  parseThaiDate,
  getShiftRank,
  normalizeThaiDate,
} from '../utils/shiftUtils';
import { EditShiftModal } from './EditShiftModal';
import { MonthlyReportModal } from './modals/MonthlyReportModal';

interface HandoverLogsViewProps {
  shifts: ShiftInfo[];
  currentShift: ShiftInfo;
  onBackToDashboard: () => void;
  onSelectShift: (shift: ShiftInfo) => void;
  onEditShift?: (updatedShift: ShiftInfo) => void;
  onDeleteShift: (shiftId: string) => void;
  onOpenRestoreGoogleSheets?: () => void;
}

export const HandoverLogsView: React.FC<HandoverLogsViewProps> = ({
  shifts,
  currentShift,
  onBackToDashboard,
  onSelectShift,
  onEditShift,
  onDeleteShift,
  onOpenRestoreGoogleSheets,
}) => {
  const safeShiftsList = Array.isArray(shifts) ? shifts : [];
  const sortedShifts = useMemo(() => [...safeShiftsList].sort(compareShiftsDesc), [safeShiftsList]);

  // Extract all unique months from available shifts
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    sortedShifts.forEach((s) => {
      if (!s) return;
      const { key, label } = getThaiMonthYear(s.date || '');
      if (!map.has(key)) {
        map.set(key, label);
      }
    });
    if (map.size === 0) {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear() + 543;
      const { key, label } = getThaiMonthYear(`${currentDay}/${currentMonth}/${currentYear}`);
      map.set(key, label);
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [sortedShifts]);

  // Default to first available month (e.g. "09/2569") or "all"
  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0]?.key || 'all'
  );

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.some((m) => m.key === selectedMonth) && selectedMonth !== 'all') {
      setSelectedMonth(availableMonths[0].key);
    }
  }, [availableMonths, selectedMonth]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showMonthlySummary, setShowMonthlySummary] = useState<boolean>(false);
  const [isMonthlyReportModalOpen, setIsMonthlyReportModalOpen] = useState<boolean>(false);
  const [monthlyTab, setMonthlyTab] = useState<'patients' | 'wean' | 'consult' | 'indicators'>('patients');
  const [reportModalTab, setReportModalTab] = useState<'wean' | 'patients' | 'consult' | 'indicators' | 'all'>('patients');
  const [shiftToDelete, setShiftToDelete] = useState<ShiftInfo | null>(null);
  const [shiftToEdit, setShiftToEdit] = useState<ShiftInfo | null>(null);

  const handleOpenReportModal = (tab?: 'wean' | 'patients' | 'consult' | 'indicators' | 'all') => {
    if (tab) {
      setReportModalTab(tab);
    } else {
      setReportModalTab(monthlyTab);
    }
    setIsMonthlyReportModalOpen(true);
  };

  // Filtered shifts matching selected month and search term
  const filteredShifts = useMemo(() => {
    return sortedShifts.filter((shift) => {
      if (!shift) return false;
      const q = searchTerm.toLowerCase();
      const inchargeStr = (shift.inchargeName || '').toLowerCase();
      const shiftTypeStr = (shift.shiftType || '').toLowerCase();
      const dateStr = (shift.date || '').toLowerCase();
      const matchesSearch =
        inchargeStr.includes(q) ||
        shiftTypeStr.includes(q) ||
        dateStr.includes(q);

      if (selectedMonth !== 'all') {
        const { key } = getThaiMonthYear(shift.date || '');
        if (key !== selectedMonth) return false;
      }

      return matchesSearch;
    });
  }, [sortedShifts, selectedMonth, searchTerm]);

  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    currentShift?.id || (sortedShifts.length > 0 ? sortedShifts[0]?.id : '')
  );

  // Adjust selection if currently selected shift was deleted
  useEffect(() => {
    if (filteredShifts.length > 0) {
      if (!filteredShifts.some((s) => s.id === selectedShiftId)) {
        setSelectedShiftId(filteredShifts[0].id);
      }
    } else if (sortedShifts.length > 0) {
      if (!sortedShifts.some((s) => s.id === selectedShiftId)) {
        setSelectedShiftId(sortedShifts[0].id);
      }
    }
  }, [filteredShifts, sortedShifts, selectedShiftId]);

  const selectedShift = useMemo(() => {
    return (
      filteredShifts.find((s) => s.id === selectedShiftId) ||
      filteredShifts[0] ||
      sortedShifts.find((s) => s.id === selectedShiftId) ||
      sortedShifts[0] ||
      null
    );
  }, [filteredShifts, sortedShifts, selectedShiftId]);

  const handleConfirmDelete = () => {
    if (!shiftToDelete) return;
    const deletingId = shiftToDelete.id;
    onDeleteShift(deletingId);
    setShiftToDelete(null);
  };

  // Target shifts for month summary calculation
  const targetShiftsForSummary = useMemo(() => {
    if (selectedMonth === 'all') return sortedShifts;
    return sortedShifts.filter((s) => {
      if (!s) return false;
      const { key } = getThaiMonthYear(s.date || '');
      return key === selectedMonth;
    });
  }, [sortedShifts, selectedMonth]);

  // Dynamic month label
  const currentMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') {
      return 'ทุกเดือน (ทั้งหมด)';
    }
    const found = availableMonths.find((m) => m.key === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [selectedMonth, availableMonths]);

  // Calculate stats totals for the selected month
  const totalTransferredIn = targetShiftsForSummary.reduce(
    (acc, s) => acc + (s.stats?.transferredIn || 0),
    0
  );
  const totalAdmittedNew = targetShiftsForSummary.reduce(
    (acc, s) => acc + (s.stats?.admittedNew || 0),
    0
  );
  const totalTransferredOut = targetShiftsForSummary.reduce(
    (acc, s) => acc + (s.stats?.transferredOut || 0),
    0
  );
  const totalAgainstAdvice = targetShiftsForSummary.reduce(
    (acc, s) => acc + (s.stats?.againstAdvice || 0),
    0
  );
  const totalDeceased = targetShiftsForSummary.reduce(
    (acc, s) => acc + (s.stats?.deceased || 0),
    0
  );
  const totalDeceasedPostOp24Hr = targetShiftsForSummary.reduce(
    (acc, s) => acc + (s.stats?.deceasedPostOp24Hr || 0),
    0
  );
  const totalAdmitDischarge24Hr = targetShiftsForSummary.reduce(
    (acc, s) => acc + (s.stats?.admitDischarge24Hr || 0),
    0
  );
  const totalReferOut = targetShiftsForSummary.reduce(
    (acc, s) => acc + (s.stats?.referOut || 0),
    0
  );

  // Group and calculate daily summary breakdown for the selected period
  const dailySummaryList = useMemo(() => {
    const groups = new Map<string, ShiftInfo[]>();
    targetShiftsForSummary.forEach((s) => {
      if (!groups.has(s.date)) {
        groups.set(s.date, []);
      }
      groups.get(s.date)!.push(s);
    });

    // Sort dates in reverse chronological order
    const dates = Array.from(groups.keys()).sort((a, b) => {
      const pA = parseThaiDate(a);
      const pB = parseThaiDate(b);
      if (pA.year !== pB.year) return pB.year - pA.year;
      if (pA.month !== pB.month) return pB.month - pA.month;
      return pB.day - pA.day;
    });

    return dates.map((date) => {
      const dayShifts = [...groups.get(date)!];
      // Sort shifts within the day chronologically: ดึก (1) -> เช้า (2) -> บ่าย (3)
      dayShifts.sort((a, b) => getShiftRank(a.shiftType) - getShiftRank(b.shiftType));

      const firstShift = dayShifts[0];
      const lastShift = dayShifts[dayShifts.length - 1];

      const carriedOver = firstShift.stats?.carriedOver ?? 0;
      const admittedNew = dayShifts.reduce((acc, s) => acc + (s.stats?.admittedNew ?? 0), 0);
      const transferredIn = dayShifts.reduce((acc, s) => acc + (s.stats?.transferredIn ?? 0), 0);
      const transferredOut = dayShifts.reduce((acc, s) => acc + (s.stats?.transferredOut ?? 0), 0);
      const againstAdvice = dayShifts.reduce((acc, s) => acc + (s.stats?.againstAdvice ?? 0), 0);
      const deceased = dayShifts.reduce((acc, s) => acc + (s.stats?.deceased ?? 0), 0);
      const deceasedPostOp24Hr = dayShifts.reduce((acc, s) => acc + (s.stats?.deceasedPostOp24Hr ?? 0), 0);
      const admitDischarge24Hr = dayShifts.reduce((acc, s) => acc + (s.stats?.admitDischarge24Hr ?? 0), 0);
      const referOut = dayShifts.reduce((acc, s) => acc + (s.stats?.referOut ?? 0), 0);
      const currentRemaining = lastShift.stats?.currentRemaining ?? 0;
      const category5Count = lastShift.stats?.category5Count ?? 0;
      const category4Count = lastShift.stats?.category4Count ?? 0;

      return {
        date,
        dayShifts,
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
        category5Count,
        category4Count,
      };
    });
  }, [targetShiftsForSummary]);

  // Equipment & Wean Daily Breakdown for Selected Month (เฉพาะเวรบ่ายเท่านั้น)
  const weanDailyList = useMemo(() => {
    return dailySummaryList.map((d) => {
      // Find the afternoon shift (บันทึกเฉพาะเวรบ่าย)
      const weanShift = d.dayShifts.find((s) => s.shiftType === 'เวรบ่าย');

      const eq = weanShift?.equipmentWeanData;
      const ventUse = eq?.ventilatorUse ?? (weanShift ? weanShift?.stats?.ventilatorCount ?? 0 : 0);
      const foleyCath = eq?.foleyCatheter ?? 0;
      const periLine = eq?.peripheralLine ?? 0;
      const cLine = eq?.centralLine ?? 0;
      const weanAss = eq?.weanAssess ?? 0;
      const weanAtt = eq?.weanAttempt ?? 0;
      const weanSucc = eq?.weanSuccess ?? 0;

      return {
        date: d.date,
        inchargeName: weanShift?.inchargeName || '-',
        shiftType: weanShift?.shiftType || 'เวรบ่าย',
        ventUse,
        foleyCath,
        periLine,
        cLine,
        weanAss,
        weanAtt,
        weanSucc,
      };
    });
  }, [dailySummaryList]);

  // Aggregate monthly totals for Equipment & Wean
  const totalVentUse = useMemo(() => weanDailyList.reduce((acc, d) => acc + d.ventUse, 0), [weanDailyList]);
  const totalFoleyCath = useMemo(() => weanDailyList.reduce((acc, d) => acc + d.foleyCath, 0), [weanDailyList]);
  const totalPeriLine = useMemo(() => weanDailyList.reduce((acc, d) => acc + d.periLine, 0), [weanDailyList]);
  const totalCLine = useMemo(() => weanDailyList.reduce((acc, d) => acc + d.cLine, 0), [weanDailyList]);
  const totalWeanAss = useMemo(() => weanDailyList.reduce((acc, d) => acc + d.weanAss, 0), [weanDailyList]);
  const totalWeanAtt = useMemo(() => weanDailyList.reduce((acc, d) => acc + d.weanAtt, 0), [weanDailyList]);
  const totalWeanSucc = useMemo(() => weanDailyList.reduce((acc, d) => acc + d.weanSucc, 0), [weanDailyList]);
  const weanSuccessRate = totalWeanAtt > 0 ? ((totalWeanSucc / totalWeanAtt) * 100).toFixed(1) : '0';

  // Consultations Breakdown for the Month
  const monthlyConsultationSummary = useMemo(() => {
    let totalConsults = 0;
    const deptTotals: Record<string, number> = {};

    targetShiftsForSummary.forEach((s) => {
      if (s.consultationData) {
        totalConsults += s.consultationData.totalCount || 0;
        if (s.consultationData.departmentCounts) {
          Object.entries(s.consultationData.departmentCounts).forEach(([dept, count]) => {
            deptTotals[dept] = (deptTotals[dept] || 0) + (Number(count) || 0);
          });
        }
      }
    });

    return {
      totalConsults,
      deptTotals: Object.entries(deptTotals)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    };
  }, [targetShiftsForSummary]);

  // Incidents & Quality Indicators Summary for the Month
  const monthlyIncidentsSummary = useMemo(() => {
    const specificRiskTotals = {
      anastomosisLeakage: 0,
      peInFxLongBone: 0,
      hemoPneumoPostCLine: 0,
      akiInMultipleTm: 0,
      tmWithShock: 0,
      iicpInTm: 0,
    };

    const clinicalIncidentTotals = {
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

    const shiftIncidentLogs: Array<{
      date: string;
      shiftType: string;
      inchargeName: string;
      risks: string[];
      incidents: string[];
      details?: string;
      totalCount: number;
    }> = [];

    targetShiftsForSummary.forEach((s) => {
      const inc = s.incidentData;
      if (!inc) return;

      const sr = inc.specificRisk;
      const al = sr?.anastomosisLeakage ?? inc.anastomosisLeakage ?? 0;
      const pe = sr?.peInFxLongBone ?? inc.peInFxLongBone ?? 0;
      const hp = sr?.hemoPneumoPostCLine ?? inc.hemoPneumoPostCLine ?? 0;
      const aki = sr?.akiInMultipleTm ?? inc.akiInMultipleTm ?? 0;
      const tm = sr?.tmWithShock ?? inc.tmWithShock ?? 0;
      const iicp = sr?.iicpInTm ?? inc.iicpInTm ?? 0;

      specificRiskTotals.anastomosisLeakage += al;
      specificRiskTotals.peInFxLongBone += pe;
      specificRiskTotals.hemoPneumoPostCLine += hp;
      specificRiskTotals.akiInMultipleTm += aki;
      specificRiskTotals.tmWithShock += tm;
      specificRiskTotals.iicpInTm += iicp;

      const ic = inc.incidents;
      const ra = ic?.reAdmit48Hr ?? inc.reAdmit48Hr ?? 0;
      const ucpr = ic?.unplannedCpr ?? inc.unplannedCpr ?? (inc as any).cprCount ?? 0;
      const ue = ic?.unplannedExtubation ?? inc.unplannedExtubation ?? (inc as any).extubation ?? 0;
      const enr = ic?.equipmentNotReady ?? inc.equipmentNotReady ?? 0;
      const sc = ic?.serviceComplaint ?? inc.serviceComplaint ?? 0;
      const wid = ic?.wrongPatientId ?? inc.wrongPatientId ?? 0;
      const me = ic?.medicationError ?? inc.medicationError ?? (inc as any).medError ?? 0;
      const bt = ic?.bloodTransfusionError ?? inc.bloodTransfusionError ?? 0;
      const ph = ic?.phlebitis ?? inc.phlebitis ?? 0;
      const wa = ic?.workplaceAccident ?? inc.workplaceAccident ?? 0;

      clinicalIncidentTotals.reAdmit48Hr += ra;
      clinicalIncidentTotals.unplannedCpr += ucpr;
      clinicalIncidentTotals.unplannedExtubation += ue;
      clinicalIncidentTotals.equipmentNotReady += enr;
      clinicalIncidentTotals.serviceComplaint += sc;
      clinicalIncidentTotals.wrongPatientId += wid;
      clinicalIncidentTotals.medicationError += me;
      clinicalIncidentTotals.bloodTransfusionError += bt;
      clinicalIncidentTotals.phlebitis += ph;
      clinicalIncidentTotals.workplaceAccident += wa;

      const ps = ic?.pressureSore ?? (inc as any).pressureSore ?? 0;
      const cauti = ic?.cauti ?? (inc as any).cauti ?? 0;
      const vap = ic?.vap ?? (inc as any).vap ?? 0;
      const clabsi = ic?.clabsi ?? (inc as any).clabsi ?? 0;
      const fall = ic?.fall ?? (inc as any).fall ?? 0;

      safetyTotals.pressureSore += ps;
      safetyTotals.cauti += cauti;
      safetyTotals.vap += vap;
      safetyTotals.clabsi += clabsi;
      safetyTotals.fall += fall;

      // Track shift log
      const risksList: string[] = [];
      if (al > 0) risksList.push(`Anastomosis leakage (${al})`);
      if (pe > 0) risksList.push(`PE in Fx.long bone (${pe})`);
      if (hp > 0) risksList.push(`Hemo/Pneumothorax post C-line (${hp})`);
      if (aki > 0) risksList.push(`AKI in multiple TM (${aki})`);
      if (tm > 0) risksList.push(`TM with shock (${tm})`);
      if (iicp > 0) risksList.push(`IICP in TM (${iicp})`);

      const incsList: string[] = [];
      if (ra > 0) incsList.push(`Re-admit in 48 hr (${ra})`);
      if (ucpr > 0) incsList.push(`Unplanned CPR (${ucpr})`);
      if (ue > 0) incsList.push(`Unplanned Extubation (${ue})`);
      if (enr > 0) incsList.push(`อุปกรณ์ไม่พร้อมใช้ (${enr})`);
      if (sc > 0) incsList.push(`ข้อร้องเรียน (${sc})`);
      if (wid > 0) incsList.push(`ระบุตัวผิดคน (${wid})`);
      if (me > 0) incsList.push(`บริหารยาผิดพลาด (${me})`);
      if (bt > 0) incsList.push(`ให้เลือดผิดพลาด (${bt})`);
      if (ph > 0) incsList.push(`Phlebitis (${ph})`);
      if (wa > 0) incsList.push(`อุบัติเหตุการทำงาน (${wa})`);
      if (ps > 0) incsList.push(`แผลกดทับ (${ps})`);
      if (cauti > 0) incsList.push(`CAUTI (${cauti})`);
      if (vap > 0) incsList.push(`VAP (${vap})`);
      if (clabsi > 0) incsList.push(`CLABSI (${clabsi})`);
      if (fall > 0) incsList.push(`พลัดตกหกล้ม (${fall})`);

      const shiftTotal =
        al + pe + hp + aki + tm + iicp +
        ra + ucpr + ue + enr + sc + wid + me + bt + ph + wa +
        ps + cauti + vap + clabsi + fall;

      if (shiftTotal > 0 || inc.details) {
        shiftIncidentLogs.push({
          date: s.date,
          shiftType: s.shiftType,
          inchargeName: s.inchargeName,
          risks: risksList,
          incidents: incsList,
          details: inc.details,
          totalCount: shiftTotal,
        });
      }
    });

    const totalRisks = Object.values(specificRiskTotals).reduce((a, b) => a + b, 0);
    const totalClinicalIncidents = Object.values(clinicalIncidentTotals).reduce((a, b) => a + b, 0);
    const totalSafety = Object.values(safetyTotals).reduce((a, b) => a + b, 0);
    const grandTotal = totalRisks + totalClinicalIncidents + totalSafety;

    return {
      specificRiskTotals,
      clinicalIncidentTotals,
      safetyTotals,
      totalRisks,
      totalClinicalIncidents,
      totalSafety,
      grandTotal,
      shiftIncidentLogs,
    };
  }, [targetShiftsForSummary]);

  const getShiftIcon = (type: string) => {
    if (type === 'เวรดึก') return <Moon className="w-5 h-5 text-indigo-500" />;
    if (type === 'เวรเช้า') return <Sunrise className="w-5 h-5 text-amber-500" />;
    return <Sun className="w-5 h-5 text-teal-600" />;
  };

  const getShiftIconBg = (type: string) => {
    if (type === 'เวรดึก') return 'bg-indigo-50 text-indigo-600';
    if (type === 'เวรเช้า') return 'bg-amber-50 text-amber-600';
    return 'bg-teal-50 text-teal-600';
  };

  // Helper to safely format CSV cells
  const csvEscape = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Export CSV for single shift
  const handleExportShiftCSV = (shift: ShiftInfo) => {
    const rows: (string | number)[][] = [
      ['SICU1 Shift Report', shift.date, shift.shiftType],
      ['Incharge', shift.inchargeName],
      ['Updated At', shift.updatedAt || shift.date],
      [],
      ['Patient Census (ข้อมูลยอดผู้ป่วย)'],
      [
        'ยอดยกมา',
        'รับใหม่',
        'รับย้าย',
        'ย้ายไป',
        'ไม่สมัครใจอยู่',
        'เสียชีวิต',
        'Refer out',
        'คงพยาบาล',
        'ประเภท 5',
        'ประเภท 4',
        'Ventilator',
        'Oxygen',
        'Post op',
        'เสียชีวิตใน 24 hr. หลังผ่าตัด',
        'รับและ D/C ใน 24 hr.',
      ],
      [
        shift.stats?.carriedOver ?? 0,
        shift.stats?.admittedNew ?? 0,
        shift.stats?.transferredIn ?? 0,
        shift.stats?.transferredOut ?? 0,
        shift.stats?.againstAdvice ?? 0,
        shift.stats?.deceased ?? 0,
        shift.stats?.referOut ?? 0,
        shift.stats?.currentRemaining ?? 0,
        shift.stats?.category5Count ?? 0,
        shift.stats?.category4Count ?? 0,
        shift.stats?.ventilatorCount ?? 0,
        shift.stats?.oxygenCount ?? 0,
        shift.stats?.postOpCount ?? 0,
        shift.stats?.deceasedPostOp24Hr ?? 0,
        shift.stats?.admitDischarge24Hr ?? 0,
      ],
      [],
      ['Staff (ยอดเจ้าหน้าที่)'],
      ['1.Head', '2.RN', '3.NA', '4.Clerk', 'OT', 'ลา', 'รวมทั้งหมด (คน)'],
      [
        shift.staffData?.headCount ?? 0,
        shift.staffData?.rnCount ?? 0,
        shift.staffData?.naCount ?? shift.staffData?.pnCount ?? 0,
        shift.staffData?.clerkCount ?? 0,
        shift.staffData?.otCount ?? 0,
        shift.staffData?.leaveCount ?? 0,
        shift.staffData?.totalStaff ?? 0,
      ],
      ...(shift.staffData?.notes ? [['หมายเหตุเจ้าหน้าที่', shift.staffData.notes]] : []),
      [],
      ['Movement Records (ข้อมูล ย้าย/รับ/จำหน่าย เพิ่มเติม)'],
      ['ชื่อ/สกุล', 'Dx. (การวินิจฉัย)', 'สถานะ (รับ/ย้าย...)'],
      ...(shift.movementRecords && shift.movementRecords.length > 0
        ? shift.movementRecords.map((m) => [
            m.patientName || '-',
            m.diagnosis || '-',
            m.status || '-',
          ])
        : shift.movementNotes && shift.movementNotes.length > 0
        ? shift.movementNotes.map((note, i) => [`#${i + 1}`, note, ''])
        : [['ไม่มีข้อมูลเพิ่มเติม', '', '']]),
      [],
      ['Consultation (ยอดส่งปรึกษาแพทย์เฉพาะทาง)'],
      ['ผลรวมทั้งหมด (ราย)', shift.consultationData?.totalCount ?? 0],
      ...(shift.consultationData?.departmentCounts &&
      Object.keys(shift.consultationData.departmentCounts).length > 0
        ? [
            ['สาขา/แผนก', 'จำนวนที่ Consult (ราย)'],
            ...Object.entries(shift.consultationData.departmentCounts)
              .filter(([_, c]) => Number(c) > 0)
              .map(([dept, count]) => [dept, count]),
          ]
        : []),
      ...(shift.consultationData?.notes
        ? [['หมายเหตุ Consultation', shift.consultationData.notes]]
        : []),
      ...(shift.consultationData?.items && shift.consultationData.items.length > 0
        ? [
            ['รายละเอียดเคส Consult รายบุคคล'],
            ['แผนก/สาขา', 'ผู้ป่วย/เตียง', 'แพทย์ที่รับ Consult', 'เรื่องที่ปรึกษา/รายละเอียด'],
            ...shift.consultationData.items.map((i) => [
              i.department,
              i.patientInfo || '-',
              i.doctor || '-',
              i.details || '-',
            ]),
          ]
        : []),
      [],
      ['Pending Charts (Chart ค้าง)'],
      ['Patient Name', 'Doctors', 'Location', 'Note'],
      ...(shift.pendingCharts || []).map((c) => [
        c.patientName,
        (c.doctors || []).join('; '),
        c.location,
        c.note || '',
      ]),
      [],
      ['Handover Items (เรื่องส่งต่อข้อมูล)'],
      ['หัวข้อ', 'รายละเอียด', 'สถานะ', 'ผู้บันทึก'],
      ...(shift.handoverItems || []).map((h) => [
        h.title,
        h.details || '-',
        h.isCompleted ? 'เสร็จสิ้น' : 'รอดำเนินการ',
        h.createdBy || '-',
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SICU1_Shift_${shift.date}_${shift.shiftType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Monthly CSV for the selected month containing daily data (ยอดยกมา, รับใหม่, รับย้าย, ย้ายไป, ไม่สมัครใจอยู่, เสียชีวิต, Refer out)
  const handleExportMonthCSV = () => {
    const rows: (string | number)[][] = [
      [`รายงานสรุปภาพรวมประจำเดือน SICU1 - ${currentMonthLabel}`],
      ['วันที่จัดทำรายงาน', new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })],
      ['จำนวนเวรทั้งหมด', targetShiftsForSummary.length],
      [],
      ['=== 1. สรุปยอดผู้ป่วยแยกตามรายวัน (Daily Summary Breakdown) ==='],
      [
        'วันที่',
        'ยอดยกมา',
        'รับใหม่',
        'รับย้าย',
        'ย้ายไป',
        'ไม่สมัครใจอยู่',
        'เสียชีวิต',
        'Refer out',
        'เสียชีวิต 24hr หลังผ่าตัด',
        'รับและ D/C ใน 24hr',
      ],
      ...dailySummaryList.map((d) => [
        d.date,
        d.carriedOver,
        d.admittedNew,
        d.transferredIn,
        d.transferredOut,
        d.againstAdvice,
        d.deceased,
        d.referOut,
        d.deceasedPostOp24Hr,
        d.admitDischarge24Hr,
      ]),
      [
        'รวมยอดทั้งสิ้น (Total)',
        '-',
        totalAdmittedNew,
        totalTransferredIn,
        totalTransferredOut,
        totalAgainstAdvice,
        totalDeceased,
        totalReferOut,
        totalDeceasedPostOp24Hr,
        totalAdmitDischarge24Hr,
      ],
      [],
      ['=== 2. ข้อมูลรายละเอียดแยกตามแต่ละเวร (Detailed Shift-by-Shift Records) ==='],
      [
        'วันที่',
        'เวร',
        'หัวหน้าเวร (Incharge)',
        'ยอดยกมา',
        'รับใหม่',
        'รับย้าย',
        'ย้ายไป',
        'ไม่สมัครใจอยู่',
        'เสียชีวิต',
        'Refer out',
        'คงพยาบาล',
        'ประเภท 5',
        'ประเภท 4',
        'เสียชีวิต 24hr หลังผ่าตัด',
        'รับและ D/C ใน 24hr',
        'จำนวน Chart ค้าง',
        'จำนวนเรื่องส่งต่อ',
      ],
      ...targetShiftsForSummary.map((s) => [
        s.date,
        s.shiftType,
        s.inchargeName,
        s.stats?.carriedOver ?? 0,
        s.stats?.admittedNew ?? 0,
        s.stats?.transferredIn ?? 0,
        s.stats?.transferredOut ?? 0,
        s.stats?.againstAdvice ?? 0,
        s.stats?.deceased ?? 0,
        s.stats?.referOut ?? 0,
        s.stats?.currentRemaining ?? 0,
        s.stats?.category5Count ?? 0,
        s.stats?.category4Count ?? 0,
        s.stats?.deceasedPostOp24Hr ?? 0,
        s.stats?.admitDischarge24Hr ?? 0,
        s.pendingCharts?.length ?? 0,
        s.handoverItems?.length ?? 0,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeMonth = selectedMonth.replace('/', '_');
    link.setAttribute('download', `SICU1_Monthly_Report_${safeMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Wean & Equipment Monthly CSV
  const handleExportWeanMonthCSV = () => {
    const rows: (string | number)[][] = [
      [`รายงานสรุปบันทึกการใช้อุปกรณ์ / Wean รายเดือน SICU 1 - ${currentMonthLabel}`],
      ['วันที่จัดทำรายงาน', new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })],
      ['หมายเหตุ', 'บันทึกข้อมูลสรุปของแต่ละวัน (เน้นเวรบ่าย)'],
      [],
      [
        'วันที่',
        'พยาบาลหัวหน้าเวร (Incharge)',
        '1. ใช้เครื่องช่วยหายใจ (ราย)',
        '2. คาสายสวนปัสสาวะ (ราย)',
        '3. Peripheral line (ราย)',
        '4. Central line (ราย)',
        '5. ประเมิน Wean (ราย)',
        '6. ได้รับการ Wean (ราย)',
        '7. Wean สำเร็จ (ราย)',
      ],
      ...weanDailyList.map((d) => [
        d.date,
        d.inchargeName,
        d.ventUse,
        d.foleyCath,
        d.periLine,
        d.cLine,
        d.weanAss,
        d.weanAtt,
        d.weanSucc,
      ]),
      [
        'รวมยอดทั้งสิ้นประจำเดือน (Monthly Total)',
        '-',
        totalVentUse,
        totalFoleyCath,
        totalPeriLine,
        totalCLine,
        totalWeanAss,
        totalWeanAtt,
        totalWeanSucc,
      ],
      [],
      ['สรุปผลการหย่าเครื่องช่วยหายใจ (Weaning Performance):'],
      ['อัตราความสำเร็จในการ Wean (Wean Success Rate)', `${weanSuccessRate}% (${totalWeanSucc}/${totalWeanAtt})`],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeMonth = selectedMonth.replace('/', '_');
    link.setAttribute('download', `SICU1_Equipment_Wean_Monthly_${safeMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Subheader Navigation and Filter Bar */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition cursor-pointer border border-teal-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>แดชบอร์ด</span>
          </button>

          <div className="w-10 h-10 rounded-xl bg-[#00796b] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <History className="w-5 h-5" />
          </div>

          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-800 font-['Prompt',sans-serif]">
              ประวัติการส่งต่อเวร
            </h2>
            <p className="text-[11px] text-slate-500">
              รวม {sortedShifts.length} เวร
            </p>
          </div>
        </div>

        {/* Filter, Monthly Summary Toggle, Restore button, and Search */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenRestoreGoogleSheets && (
            <button
              type="button"
              onClick={onOpenRestoreGoogleSheets}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer border border-emerald-300/80 shadow-xs"
              title="ดึงข้อมูล backup ใน Google Sheets ที่เคยลงไว้ มาใส่ในประวัติ ในข้อมูลที่หายไป"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>ดึงข้อมูลสำรอง Google Sheets</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMonthlySummary((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border shadow-xs ${
              showMonthlySummary
                ? 'bg-[#02333a] text-teal-200 border-[#02333a]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-500" />
            <span>สรุปภาพรวมประจำเดือน</span>
            {showMonthlySummary ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5 text-teal-300" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
            )}
          </button>

          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-700 pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  📅 {m.label}
                </option>
              ))}
              <option value="all">📅 ทุกเดือน</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหา Incharge, เวร..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Monthly Summary Banner - DYNAMICALLY CHANGES BASED ON SELECTED MONTH */}
      {showMonthlySummary && (
        <div className="bg-[#02333a] text-white rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-300" />
                <h3 className="text-sm md:text-base font-bold tracking-wide text-white">
                  {selectedMonth === 'all'
                    ? 'สรุปภาพรวมทั้งหมด (ทุกเดือน)'
                    : `สรุปภาพรวมประจำเดือน ${currentMonthLabel}`}
                </h3>
              </div>
              <p className="text-[11px] text-teal-200/80 mt-0.5">
                รวมทั้งหมด {targetShiftsForSummary.length} เวร ({dailySummaryList.length} วัน) · ข้อมูลเชื่อมโยงกับแบบฟอร์มพิมพ์รายงาน
              </p>
            </div>

            {/* Quick Actions inside Monthly Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenReportModal(monthlyTab)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer active:scale-95"
                title="เปิดแบบฟอร์มสั่งพิมพ์รายงานประจำเดือน (A4 / PDF)"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์รายงานสรุปประจำเดือน</span>
              </button>
            </div>
          </div>

          {/* Tab Switcher inside Monthly Summary */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setMonthlyTab('patients')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                monthlyTab === 'patients'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-teal-200 hover:bg-white/15'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>1. สรุปยอดผู้ป่วย</span>
            </button>

            <button
              type="button"
              onClick={() => setMonthlyTab('wean')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                monthlyTab === 'wean'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-teal-200 hover:bg-white/15'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>2. บันทึกการใช้อุปกรณ์ / Wean (รายเดือน)</span>
            </button>

            <button
              type="button"
              onClick={() => setMonthlyTab('consult')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                monthlyTab === 'consult'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-teal-200 hover:bg-white/15'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>3. ยอด Consult</span>
            </button>

            <button
              type="button"
              onClick={() => setMonthlyTab('indicators')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                monthlyTab === 'indicators'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-teal-200 hover:bg-white/15'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>4. ข้อมูลตัวชี้วัด/อุบัติการณ์</span>
            </button>
          </div>

          {/* TAB 1: Patient Census */}
          {monthlyTab === 'patients' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-teal-200 font-medium">รับใหม่รวม</span>
                  <div className="text-xl font-black text-teal-300 mt-1">
                    +{totalAdmittedNew} <span className="text-[10px] font-normal text-slate-300">ราย</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-200 font-medium">รับย้ายรวม</span>
                  <div className="text-xl font-black text-emerald-300 mt-1">
                    +{totalTransferredIn} <span className="text-[10px] font-normal text-slate-300">ราย</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-amber-200 font-medium">ย้ายออกรวม</span>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    -{totalTransferredOut} <span className="text-[10px] font-normal text-slate-300">ราย</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-orange-200 font-medium">ไม่สมัครใจอยู่</span>
                  <div className="text-xl font-black text-orange-300 mt-1">
                    -{totalAgainstAdvice} <span className="text-[10px] font-normal text-slate-300">ราย</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-rose-200 font-medium">เสียชีวิต</span>
                  <div className="text-xl font-black text-rose-300 mt-1">
                    {totalDeceased} <span className="text-[10px] font-normal text-slate-300">ราย</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-purple-200 font-medium">Refer out</span>
                  <div className="text-xl font-black text-purple-300 mt-1">
                    {totalReferOut} <span className="text-[10px] font-normal text-slate-300">ราย</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Equipment & Wean Monthly Breakdown */}
          {monthlyTab === 'wean' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200 font-medium">1. เครื่องช่วยหายใจ</div>
                  <div className="text-base font-bold text-white mt-0.5">{totalVentUse}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200 font-medium">2. Foley's Cath</div>
                  <div className="text-base font-bold text-white mt-0.5">{totalFoleyCath}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200 font-medium">3. Peripheral Line</div>
                  <div className="text-base font-bold text-white mt-0.5">{totalPeriLine}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200 font-medium">4. Central Line</div>
                  <div className="text-base font-bold text-white mt-0.5">{totalCLine}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200 font-medium">5. ประเมิน Wean</div>
                  <div className="text-base font-bold text-teal-300 mt-0.5">{totalWeanAss}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200 font-medium">6. ได้รับการ Wean</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">{totalWeanAtt}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200 font-medium">7. Wean สำเร็จ</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">{totalWeanSucc}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-center">
                  <div className="text-[10px] text-emerald-200 font-bold">อัตรา Wean สำเร็จ</div>
                  <div className="text-base font-black text-emerald-300 mt-0.5">{weanSuccessRate}%</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Consultations */}
          {monthlyTab === 'consult' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-white/10 border border-white/15 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-teal-200 font-bold text-xs md:text-sm">
                    <Stethoscope className="w-4 h-4 text-teal-300" />
                    <span>3. สรุปยอดการส่ง Consult ประจำเดือน ({currentMonthLabel})</span>
                  </div>
                  <span className="px-3 py-1 bg-teal-400/20 text-teal-200 text-xs font-bold rounded-lg border border-teal-400/30">
                    รวมส่ง Consult ทั้งสิ้น {monthlyConsultationSummary.totalConsults} ราย
                  </span>
                </div>

                {monthlyConsultationSummary.deptTotals.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
                    {monthlyConsultationSummary.deptTotals.map(([dept, count]) => {
                      const pct = monthlyConsultationSummary.totalConsults > 0
                        ? ((count / monthlyConsultationSummary.totalConsults) * 100).toFixed(1)
                        : '0';
                      return (
                        <div
                          key={dept}
                          className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between hover:bg-black/30 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white font-semibold text-xs">{dept}</span>
                            <span className="text-[10px] text-teal-200/80 font-medium">{pct}%</span>
                          </div>
                          <div className="flex items-baseline justify-between mt-2">
                            <span className="text-[10px] text-slate-300">จำนวนที่ส่ง</span>
                            <span className="text-lg font-black text-teal-300">{count} <span className="text-[10px] font-normal text-slate-300">ราย</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-300 text-xs bg-black/10 rounded-xl border border-white/5">
                    ไม่มีข้อมูลการส่ง Consult ในเดือนนี้
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Quality Indicators & Incidents */}
          {monthlyTab === 'indicators' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Header Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-teal-200 font-bold text-xs md:text-sm">
                    <Activity className="w-4 h-4 text-rose-300" />
                    <span>4. สรุปข้อมูลตัวชี้วัดคุณภาพ &amp; อุบัติการณ์ทางคลินิก ({currentMonthLabel})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-400/20 text-amber-200 text-xs font-bold rounded-lg border border-amber-400/30">
                      Specific Risk: {monthlyIncidentsSummary.totalRisks} ครั้ง
                    </span>
                    <span className="px-2.5 py-1 bg-rose-400/20 text-rose-200 text-xs font-bold rounded-lg border border-rose-400/30">
                      Incidents: {monthlyIncidentsSummary.totalClinicalIncidents + monthlyIncidentsSummary.totalSafety} ครั้ง
                    </span>
                  </div>
                </div>

                {/* Section 1: Specific Clinical Risk (6 items) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-teal-100">
                    <span>1. ความเสี่ยงทางคลินิกจำเพาะ (Specific Clinical Risk - 6 รายการ)</span>
                    <span className="text-teal-300 font-extrabold">{monthlyIncidentsSummary.totalRisks} ครั้ง</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">Anastomosis leakage</span>
                      <span className="text-base font-black text-amber-300 mt-2">
                        {monthlyIncidentsSummary.specificRiskTotals.anastomosisLeakage} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">PE in Fx.long bone</span>
                      <span className="text-base font-black text-amber-300 mt-2">
                        {monthlyIncidentsSummary.specificRiskTotals.peInFxLongBone} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">Hemo/Pneumo post C-line</span>
                      <span className="text-base font-black text-amber-300 mt-2">
                        {monthlyIncidentsSummary.specificRiskTotals.hemoPneumoPostCLine} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">AKI in multiple TM</span>
                      <span className="text-base font-black text-amber-300 mt-2">
                        {monthlyIncidentsSummary.specificRiskTotals.akiInMultipleTm} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">TM with shock</span>
                      <span className="text-base font-black text-amber-300 mt-2">
                        {monthlyIncidentsSummary.specificRiskTotals.tmWithShock} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">IICP in TM</span>
                      <span className="text-base font-black text-amber-300 mt-2">
                        {monthlyIncidentsSummary.specificRiskTotals.iicpInTm} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Clinical Incidents (10 items) */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold text-teal-100">
                    <span>2. อุบัติการณ์และความปลอดภัยทางคลินิก (Clinical Incidents - 10 รายการ)</span>
                    <span className="text-rose-300 font-extrabold">{monthlyIncidentsSummary.totalClinicalIncidents} ครั้ง</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">Re-admit in 48 hr</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.reAdmit48Hr} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">Unplanned CPR</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.unplannedCpr} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">Unplanned Extubation</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.unplannedExtubation} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">อุปกรณ์ไม่พร้อมใช้</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.equipmentNotReady} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">ข้อร้องเรียนบริการ</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.serviceComplaint} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">ระบุตัวผู้ป่วยผิดคน</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.wrongPatientId} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">บริหารยาผิดพลาด (Med Error)</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.medicationError} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">การให้เลือดผิดพลาด</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.bloodTransfusionError} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">หลอดเลือดดำอักเสบ (Phlebitis)</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.phlebitis} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-300 text-[11px] font-medium leading-tight">อุบัติเหตุการทำงาน</span>
                      <span className="text-base font-black text-rose-300 mt-2">
                        {monthlyIncidentsSummary.clinicalIncidentTotals.workplaceAccident} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Shift-by-Shift Incident Logs */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold text-teal-100">
                    <span>3. รายการบันทึกอุบัติการณ์รายเวร (Shift Incidents Log)</span>
                    <span className="text-[11px] text-slate-300">พบ {monthlyIncidentsSummary.shiftIncidentLogs.length} เวรที่มีบันทึก</span>
                  </div>

                  {monthlyIncidentsSummary.shiftIncidentLogs.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-white/10 text-teal-200 border-b border-white/10 font-bold">
                            <th className="p-2.5">วันที่ / เวร</th>
                            <th className="p-2.5">หัวหน้าเวร</th>
                            <th className="p-2.5">รายการที่พบ</th>
                            <th className="p-2.5">รายละเอียด / บันทึกเพิ่มเติม</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                          {monthlyIncidentsSummary.shiftIncidentLogs.map((log, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition">
                              <td className="p-2.5 whitespace-nowrap font-medium text-white">
                                <div>{log.date}</div>
                                <div className="text-[11px] text-teal-300">{log.shiftType}</div>
                              </td>
                              <td className="p-2.5 whitespace-nowrap text-slate-300">{log.inchargeName || '-'}</td>
                              <td className="p-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {log.risks.map((r, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[10px]">
                                      {r}
                                    </span>
                                  ))}
                                  {log.incidents.map((incItem, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30 text-[10px]">
                                      {incItem}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2.5 text-xs text-slate-300">
                                {log.details || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-5 text-slate-300 text-xs bg-black/15 rounded-xl border border-white/5">
                      ✓ ไม่พบรายงานอุบัติการณ์หรือความเสี่ยงในเดือนนี้ (ปกติทุกเวร)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two Column Layout: Shifts List & Selected Shift Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Shifts List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>เวรทั้งหมด ({filteredShifts.length})</span>
          </div>

          {filteredShifts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <History className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-700 font-['Prompt',sans-serif]">
                ไม่พบข้อมูลประวัติเวร
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                ไม่มีรายการเวรในช่วงเวลาที่เลือก หรือหากข้อมูลประวัติเวรหายไป คุณสามารถดึงข้อมูลที่เคยสำรองไว้กลับมาได้
              </p>
              {onOpenRestoreGoogleSheets && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onOpenRestoreGoogleSheets}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>ดึงข้อมูลสำรอง Google Sheets มาใส่ในประวัติ</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShifts.map((shift) => {
                const isSelected = shift.id === selectedShift?.id;
                const pendingCount = shift.pendingCharts?.length ?? 0;
                const handoverCount = shift.handoverItems?.length ?? 0;
                const remaining = shift.stats?.currentRemaining ?? 6;

                return (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShiftId(shift.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-teal-50/40 border-teal-500 shadow-sm ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getShiftIconBg(
                            shift.shiftType
                          )}`}
                        >
                          {getShiftIcon(shift.shiftType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-800 font-['Prompt',sans-serif]">
                              {normalizeThaiDate(shift.date)} · {shift.shiftType}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800">
                              คงพยาบาล {remaining}
                            </span>
                            {(shift.id === currentShift.id || shift.isActive) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00796b] text-white">
                                เวรปัจจุบัน
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Incharge: {shift.inchargeName || 'ยังไม่ระบุ'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShiftToEdit(shift);
                          }}
                          className="text-slate-400 hover:text-teal-700 hover:bg-teal-50 p-1.5 rounded-lg transition cursor-pointer"
                          title="แก้ไขข้อมูลเวรนี้"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShiftToDelete(shift);
                          }}
                          className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                          title="ลบเวรนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        Chart ค้าง: <strong className="text-amber-600">{pendingCount}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        ส่งต่อ: <strong className="text-teal-700">{handoverCount}</strong>
                      </span>
                      {shift.consultationData && (shift.consultationData.totalCount > 0 || (shift.consultationData.items && shift.consultationData.items.length > 0)) && (
                        <span className="flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          Consult: <strong>{shift.consultationData.totalCount}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Shift Report */}
        {selectedShift ? (
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-xs space-y-6">
            {/* Shift Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${getShiftIconBg(
                    selectedShift.shiftType
                  )}`}
                >
                  {getShiftIcon(selectedShift.shiftType)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 font-['Prompt',sans-serif]">
                      รายงานส่งเวร: {normalizeThaiDate(selectedShift.date)} · {selectedShift.shiftType}
                    </h3>
                    {(selectedShift.id === currentShift.id || selectedShift.isActive) && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-teal-600" />
                        เวรปัจจุบัน
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    พยาบาลหัวหน้าเวร: {selectedShift.inchargeName || 'ยังไม่ระบุ'} · ปรับปรุงล่าสุด: {selectedShift.updatedAt || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setShiftToEdit(selectedShift)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-teal-600 bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-semibold transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                  <span>แก้ไขเวรนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportShiftCSV(selectedShift)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>โหลดเวรนี้ (.CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShiftToDelete(selectedShift)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบเวรนี้</span>
                </button>
              </div>
            </div>

            {/* Section 1: สถิติยอดผู้ป่วย (PATIENT CENSUS) */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                สถิติยอดผู้ป่วย (PATIENT CENSUS)
              </h4>

              {/* 8 Metric Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-slate-500 block truncate">ยอดยกมา</span>
                  <span className="text-base sm:text-lg font-bold text-slate-800">
                    {selectedShift.stats?.carriedOver ?? 6}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-sky-700 block truncate">รับย้าย</span>
                  <span className="text-base sm:text-lg font-bold text-[#0284c7]">
                    {selectedShift.stats?.transferredIn ?? 0}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-emerald-700 block truncate">รับใหม่</span>
                  <span className="text-base sm:text-lg font-bold text-[#059669]">
                    {selectedShift.stats?.admittedNew ?? 0}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-amber-700 block truncate">ย้ายไป</span>
                  <span className="text-base sm:text-lg font-bold text-[#d97706]">
                    {selectedShift.stats?.transferredOut ?? 0}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-orange-700 block truncate" title="ไม่สมัครใจอยู่">ไม่สมัครใจ</span>
                  <span className="text-base sm:text-lg font-bold text-[#ea580c]">
                    {selectedShift.stats?.againstAdvice ?? 0}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-rose-700 block truncate">เสียชีวิต</span>
                  <span className="text-base sm:text-lg font-bold text-[#e11d48]">
                    {selectedShift.stats?.deceased ?? 0}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-purple-700 block truncate">Refer out</span>
                  <span className="text-base sm:text-lg font-bold text-[#9333ea]">
                    {selectedShift.stats?.referOut ?? 0}
                  </span>
                </div>
                <div className="bg-[#00796b] text-white rounded-xl p-2.5 text-center shadow-xs">
                  <span className="text-[10px] text-teal-100 block truncate">คงพยาบาล</span>
                  <span className="text-base sm:text-lg font-bold text-white">
                    {selectedShift.stats?.currentRemaining ?? 6}
                  </span>
                </div>
              </div>

              {/* Sub-indicators: Ventilator, Oxygen, Post op */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-sky-50/60 border border-sky-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🫁</span>
                    <span className="text-xs font-bold text-sky-900">Ventilator</span>
                  </div>
                  <span className="text-sm font-bold text-sky-700">
                    {selectedShift.stats?.ventilatorCount ?? 0} <span className="text-[10px] font-normal text-slate-500">ราย</span>
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-teal-50/60 border border-teal-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">💨</span>
                    <span className="text-xs font-bold text-teal-900">Oxygen</span>
                  </div>
                  <span className="text-sm font-bold text-teal-700">
                    {selectedShift.stats?.oxygenCount ?? 0} <span className="text-[10px] font-normal text-slate-500">ราย</span>
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50/60 border border-indigo-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🩺</span>
                    <span className="text-xs font-bold text-indigo-900">Post op</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-700">
                    {selectedShift.stats?.postOpCount ?? 0} <span className="text-[10px] font-normal text-slate-500">ราย</span>
                  </span>
                </div>
              </div>

              {/* Sub-indicators info pill banner if recorded */}
              {((selectedShift.stats?.deceasedPostOp24Hr ?? 0) > 0 ||
                (selectedShift.stats?.admitDischarge24Hr ?? 0) > 0) && (
                <div className="mt-2 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-500 font-medium text-[11px]">สถิติเฉพาะในเวร:</span>
                  {(selectedShift.stats?.deceasedPostOp24Hr ?? 0) > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                      เสียชีวิตใน 24 hr. หลังผ่าตัด: {selectedShift.stats?.deceasedPostOp24Hr} ราย
                    </span>
                  )}
                  {(selectedShift.stats?.admitDischarge24Hr ?? 0) > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold">
                      รับและ D/C ใน 24 hr.: {selectedShift.stats?.admitDischarge24Hr} ราย
                    </span>
                  )}
                </div>
              )}

              {/* Categories */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-600">ประเภทผู้ป่วย :</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                    ประเภท 5 = {selectedShift.stats?.category5Count ?? 0} คน
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                    ประเภท 4 = {selectedShift.stats?.category4Count ?? 0} คน
                  </span>
                </div>
              </div>
            </div>

            {/* Section: ข้อมูล ย้าย/รับ/จำหน่าย เพิ่มเติม (ประวัติเฉพาะเวรนี้) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ข้อมูล ย้าย/รับ/จำหน่าย เพิ่มเติม (
                  {(selectedShift.movementRecords?.length ?? 0) > 0
                    ? selectedShift.movementRecords?.length
                    : selectedShift.movementNotes?.length ?? 0}
                  )
                </h4>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  บันทึกประวัติเฉพาะเวร
                </span>
              </div>

              {(!selectedShift.movementRecords || selectedShift.movementRecords.length === 0) &&
              (!selectedShift.movementNotes || selectedShift.movementNotes.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400 bg-slate-50/50">
                  ไม่มีบันทึกข้อมูล ย้าย/รับ/จำหน่าย เพิ่มเติมในเวรนี้
                </div>
              ) : selectedShift.movementRecords && selectedShift.movementRecords.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedShift.movementRecords.map((rec, idx) => (
                    <div
                      key={rec.id || idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 transition shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800 font-['Prompt',sans-serif]">
                            {rec.patientName || 'ไม่ระบุชื่อ-สกุล'}
                          </span>
                        </div>
                        {rec.status && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100/80 text-teal-800 border border-teal-200">
                            {rec.status}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                        <div className="text-slate-600">
                          <span className="font-semibold text-slate-500">Dx.: </span>
                          <span className="font-medium text-slate-800">{rec.diagnosis || '-'}</span>
                        </div>
                        <div className="text-slate-600">
                          <span className="font-semibold text-slate-500">สถานะ: </span>
                          <span className="font-medium text-teal-700">{rec.status || '-'}</span>
                        </div>
                      </div>

                      {rec.note && (
                        <p className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                          หมายเหตุ: {rec.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedShift.movementNotes?.map((noteText, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-teal-50/30 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap flex-1">
                        {noteText}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: ยอด Consultation (ส่งปรึกษาแพทย์เฉพาะทาง) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🩺</span>
                  <span>ยอด Consultation ประจำเวร</span>
                </h4>
                {selectedShift.consultationData && selectedShift.consultationData.totalCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
                    ผลรวม {selectedShift.consultationData.totalCount} ราย
                  </span>
                )}
              </div>

              {!selectedShift.consultationData ||
              (selectedShift.consultationData.totalCount === 0 &&
                (!selectedShift.consultationData.items ||
                  selectedShift.consultationData.items.length === 0)) ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400 bg-slate-50/50">
                  ไม่มีบันทึกส่ง Consult ในเวรนี้
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/30 space-y-3">
                  {/* Specialty chips */}
                  {selectedShift.consultationData.departmentCounts &&
                    Object.keys(selectedShift.consultationData.departmentCounts).length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-teal-900">
                          สถิติตามสาขา:
                        </span>
                        {Object.entries(selectedShift.consultationData.departmentCounts)
                          .filter(([_, count]) => Number(count) > 0)
                          .map(([name, count]) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-teal-200 text-teal-900 font-semibold text-xs shadow-2xs"
                            >
                              <span>{name}</span>
                              <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center">
                                {count}
                              </span>
                            </span>
                          ))}
                      </div>
                    )}

                  {/* Notes */}
                  {selectedShift.consultationData.notes && (
                    <div className="p-2.5 bg-white rounded-xl border border-teal-100 text-xs text-teal-900">
                      <span className="font-semibold text-teal-700">หมายเหตุ: </span>
                      {selectedShift.consultationData.notes}
                    </div>
                  )}

                  {/* Individual items if any */}
                  {selectedShift.consultationData.items &&
                    selectedShift.consultationData.items.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-teal-800 block">
                          รายการเคสที่บันทึก ({selectedShift.consultationData.items.length} รายการ):
                        </span>
                        {selectedShift.consultationData.items.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[11px]">
                                {item.department}
                              </span>
                              {item.patientInfo && (
                                <span className="font-medium text-slate-800">
                                  {item.patientInfo}
                                </span>
                              )}
                              {item.doctor && (
                                <span className="text-slate-500 text-[11px]">
                                  (พญ./นพ. {item.doctor})
                                </span>
                              )}
                            </div>
                            {item.details && (
                              <span className="text-slate-600 text-[11px] truncate max-w-sm">
                                {item.details}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Section: ยอดเจ้าหน้าที่ประจำเวร */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span>👥</span>
                  <span>ยอดเจ้าหน้าที่ประจำเวร</span>
                </h4>
                {selectedShift.staffData && selectedShift.staffData.totalStaff > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    รวม {selectedShift.staffData.totalStaff} คน
                  </span>
                )}
              </div>

              {!selectedShift.staffData || selectedShift.staffData.totalStaff === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400 bg-slate-50/50">
                  ไม่มีบันทึกยอดเจ้าหน้าที่ในเวรนี้
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-white border border-blue-100 text-center shadow-2xs">
                      <span className="text-[10px] font-semibold text-blue-900 block">1. Head</span>
                      <span className="text-base font-bold text-blue-700">{selectedShift.staffData.headCount ?? 0}</span>
                      <span className="text-[10px] text-slate-400 ml-1">คน</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-blue-100 text-center shadow-2xs">
                      <span className="text-[10px] font-semibold text-blue-900 block">2. RN</span>
                      <span className="text-base font-bold text-blue-700">{selectedShift.staffData.rnCount ?? 0}</span>
                      <span className="text-[10px] text-slate-400 ml-1">คน</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-blue-100 text-center shadow-2xs">
                      <span className="text-[10px] font-semibold text-blue-900 block">3. NA</span>
                      <span className="text-base font-bold text-blue-700">{selectedShift.staffData.naCount ?? selectedShift.staffData.pnCount ?? 0}</span>
                      <span className="text-[10px] text-slate-400 ml-1">คน</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-blue-100 text-center shadow-2xs">
                      <span className="text-[10px] font-semibold text-blue-900 block">4. Clerk</span>
                      <span className="text-base font-bold text-blue-700">{selectedShift.staffData.clerkCount ?? 0}</span>
                      <span className="text-[10px] text-slate-400 ml-1">คน</span>
                    </div>
                  </div>

                  {((selectedShift.staffData.otCount ?? 0) > 0 || (selectedShift.staffData.leaveCount ?? 0) > 0 || selectedShift.staffData.notes) && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-xs text-slate-700">
                      {(selectedShift.staffData.otCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                          OT: {selectedShift.staffData.otCount} คน
                        </span>
                      )}
                      {(selectedShift.staffData.leaveCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                          ลา: {selectedShift.staffData.leaveCount} คน
                        </span>
                      )}
                      {selectedShift.staffData.notes && (
                        <span className="text-slate-600 italic">
                          "{selectedShift.staffData.notes}"
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: รายการส่งต่อข้อมูล */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                รายการส่งต่อข้อมูล ({selectedShift.handoverItems?.length ?? 0})
              </h4>

              {(!selectedShift.handoverItems || selectedShift.handoverItems.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 bg-slate-50/50">
                  ไม่มีบันทึกส่งต่อในเวรนี้
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedShift.handoverItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-slate-800">{item.title}</h5>
                        {item.isCompleted ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            ดำเนินการแล้ว
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-semibold">
                            บันทึกในประวัติ
                          </span>
                        )}
                      </div>
                      {item.details && (
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {item.details}
                        </p>
                      )}
                      {item.createdBy && (
                        <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-2">
                          <span>โดย: {item.createdBy}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: รายการ CHART ค้าง */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                รายการ CHART ค้าง ({selectedShift.pendingCharts?.length ?? 0})
              </h4>

              {(!selectedShift.pendingCharts || selectedShift.pendingCharts.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 bg-slate-50/50">
                  ไม่มีรายการ Chart ค้างในเวรนี้
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedShift.pendingCharts.map((chart) => (
                    <div
                      key={chart.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-base font-bold text-slate-800 font-['Prompt',sans-serif]">
                          {chart.patientName}
                        </h5>
                        <div className="flex items-center gap-1.5">
                          {chart.status === 'resolved' ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                              คืนแล้ว
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                              {chart.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500 font-medium">แพทย์:</span>
                        {chart.doctors && chart.doctors.length > 0 ? (
                          chart.doctors.map((d, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium"
                            >
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>

                      {chart.note && (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs font-medium text-amber-900">
                          {chart.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white rounded-2xl p-10 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3 min-h-[350px]">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-700 font-['Prompt',sans-serif]">
              ไม่มีข้อมูลเวรที่เลือก
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              เลือกเวรจากรายการทางซ้ายมือเพื่อดูรายงานและรายละเอียด หรือเพิ่มเวรใหม่จากปุ่มด้านบน
            </p>
          </div>
        )}
      </div>

      {/* Edit Shift Modal */}
      {shiftToEdit && (
        <EditShiftModal
          isOpen={!!shiftToEdit}
          shift={shiftToEdit}
          shiftsHistory={shifts}
          previousShift={sortedShifts.find((s) => s.id !== shiftToEdit.id)}
          onClose={() => setShiftToEdit(null)}
          onSaveShift={(updated) => {
            if (onEditShift) {
              onEditShift(updated);
            }
            setShiftToEdit(null);
          }}
        />
      )}

      {/* In-App Delete Confirmation Modal */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setShiftToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 font-['Prompt',sans-serif]">
                ยืนยันการลบข้อมูลเวรนี้?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                คุณต้องการลบข้อมูลรายงานเวร{' '}
                <strong className="text-slate-800">
                  {shiftToDelete.date} · {shiftToDelete.shiftType}
                </strong>{' '}
                (Incharge: {shiftToDelete.inchargeName}) ออกจากประวัติการส่งต่อเวรใช่หรือไม่?
              </p>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-0.5">
              <span className="font-semibold block">⚠️ ข้อควรระวัง:</span>
              <span>
                เมื่อลบแล้ว ข้อมูลรายงานเวรและสถิติของเวรนี้จะถูกลบออกจากระบบอย่างถาวร
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShiftToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบเวรนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report Print / Export Modal */}
      <MonthlyReportModal
        isOpen={isMonthlyReportModalOpen}
        onClose={() => setIsMonthlyReportModalOpen(false)}
        shifts={shifts}
        selectedMonth={selectedMonth}
        onMonthChange={(m) => setSelectedMonth(m)}
        initialTab={reportModalTab}
      />
    </div>
  );
};
