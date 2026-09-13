import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Calendar,
  User,
  Moon,
  Sun,
  Sunset,
  Activity,
  ChevronDown,
  FileText,
  Trash2,
  Stethoscope,
  Users,
  Wind,
  AlertTriangle,
  Copy,
  Lock,
} from 'lucide-react';
import {
  ShiftInfo,
  ShiftType,
  PatientStats,
  HandoverItem,
  PendingChart,
  MovementRecord,
  ConsultationData,
  StaffData,
  EquipmentWeanData,
  IncidentData,
} from '../types';
import { getNextShift, addDaysThai, findPreviousShiftInList } from '../utils/shiftUtils';
import { subscribeNurseList, syncNurseListToCloud } from '../services/wardDataService';
import { ConsultationModal } from './modals/ConsultationModal';
import { StaffCountModal } from './modals/StaffCountModal';
import { EquipmentWeanModal } from './modals/EquipmentWeanModal';
import { IncidentIndicatorModal } from './modals/IncidentIndicatorModal';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShift: (newShift: ShiftInfo) => void;
  currentShift: ShiftInfo;
  shiftsHistory?: ShiftInfo[];
  activeHandoverItems?: HandoverItem[];
  activePendingCharts?: PendingChart[];
}

export const DEFAULT_NURSES: string[] = [
  'นัฐภร จันทร์ฟ้าเลื่อม',
  'ธิดาพร เท้งสี',
  'ชมพูนุท เล็งสาย',
  'สุพรรณษา คุ้มครอง',
  'เกศินี กำเนิดรัตน์',
  'วิมลมาศ สุโกมล',
  'จุฑารัตน์ คุณานุศาสน์',
  'สุรีรัตน์ ชาสมบัติ',
  'ปิยพร ธีรศิลป์',
  'สัจจพร งามยิ่งยวด',
];

export const AddShiftModal: React.FC<AddShiftModalProps> = ({
  isOpen,
  onClose,
  onAddShift,
  currentShift,
  shiftsHistory = [],
  activeHandoverItems = [],
  activePendingCharts = [],
}) => {
  const allShifts = React.useMemo(() => {
    const list = shiftsHistory && shiftsHistory.length > 0 ? [...shiftsHistory] : [];
    if (currentShift && !list.some((s) => s.id === currentShift.id)) {
      list.unshift(currentShift);
    }
    return list;
  }, [shiftsHistory, currentShift]);

  const initialNext = getNextShift(
    currentShift.shiftType,
    currentShift.date || '22/08/2569'
  );

  const [date, setDate] = useState<string>(initialNext.nextDate);
  const [shiftType, setShiftType] = useState<ShiftType>(initialNext.nextType);

  const resolvedPreviousShift = React.useMemo(() => {
    return findPreviousShiftInList(allShifts, date, shiftType);
  }, [allShifts, date, shiftType]);

  // Nurse list state
  const [nurseList, setNurseList] = useState<string[]>(() => {
    const saved = localStorage.getItem('sicu_nurse_list');
    return saved ? JSON.parse(saved) : DEFAULT_NURSES;
  });

  useEffect(() => {
    const unsubscribe = subscribeNurseList((cloudNurses) => {
      if (cloudNurses && cloudNurses.length > 0) {
        setNurseList(cloudNurses);
        localStorage.setItem('sicu_nurse_list', JSON.stringify(cloudNurses));
      }
    });
    return () => unsubscribe();
  }, []);

  const [inchargeName, setInchargeName] = useState<string>('');
  const [nurseError, setNurseError] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isAddingNurse, setIsAddingNurse] = useState(false);
  const [newNurseInput, setNewNurseInput] = useState('');

  // Census counts
  const [carriedOver, setCarriedOver] = useState<number | string>(0);
  const [transferredIn, setTransferredIn] = useState<number | string>(0);
  const [admittedNew, setAdmittedNew] = useState<number | string>(0);
  const [transferredOut, setTransferredOut] = useState<number | string>(0);
  const [againstAdvice, setAgainstAdvice] = useState<number | string>(0);
  const [deceased, setDeceased] = useState<number | string>(0);
  const [deceasedPostOp24Hr, setDeceasedPostOp24Hr] = useState<number | string>(0);
  const [admitDischarge24Hr, setAdmitDischarge24Hr] = useState<number | string>(0);
  const [referOut, setReferOut] = useState<number | string>(0);

  // Sub-indicators: Ventilator, Oxygen, Post op
  const [ventilatorCount, setVentilatorCount] = useState<number | string>(0);
  const [oxygenCount, setOxygenCount] = useState<number | string>(0);
  const [postOpCount, setPostOpCount] = useState<number | string>(0);

  // Category counts (real-time typing)
  const [category5, setCategory5] = useState<number | string>(0);
  const [category4, setCategory4] = useState<number | string>(0);

  // Specialized Shift Modules Data States - เริ่มต้นเป็น 0 ตามคำสั่ง
  const [consultationData, setConsultationData] = useState<ConsultationData>({
    totalCount: 0,
    departmentCounts: {},
    customDepartments: [],
    notes: '',
    items: [],
  });
  const [staffData, setStaffData] = useState<StaffData>({
    headCount: 0,
    rnCount: 0,
    naCount: 0,
    clerkCount: 0,
    pnCount: 0,
    otCount: 0,
    leaveCount: 0,
    totalStaff: 0,
    notes: '',
  });
  const [equipmentWeanData, setEquipmentWeanData] = useState<EquipmentWeanData>({
    ventilatorUse: 0,
    foleyCatheter: 0,
    peripheralLine: 0,
    centralLine: 0,
    weanAssess: 0,
    weanAttempt: 0,
    weanSuccess: 0,
    ventCount: 0,
    weanCount: 0,
    ettCount: 0,
    details: '',
  });
  const [incidentData, setIncidentData] = useState<IncidentData>({
    anastomosisLeakage: 0,
    peInFxLongBone: 0,
    hemoPneumoPostCLine: 0,
    akiInMultipleTm: 0,
    tmWithShock: 0,
    iicpInTm: 0,
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
    details: '',
  });

  // Modal open states
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  // Movement data entries: -ชื่อ/สกุล -Dx. -สถานะ(รับ/ย้าย จาก..)
  const [movementList, setMovementList] = useState<
    Array<{ id: string; patientName: string; diagnosis: string; status: string; note?: string }>
  >([{ id: 'mv-1', patientName: '', diagnosis: '', status: '', note: '' }]);

  const handleAddMovement = () => {
    setMovementList((prev) => [
      ...prev,
      {
        id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patientName: '',
        diagnosis: '',
        status: '',
        note: '',
      },
    ]);
  };

  const handleRemoveMovement = (id: string) => {
    setMovementList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMovementChange = (
    id: string,
    field: 'patientName' | 'diagnosis' | 'status' | 'note',
    value: string
  ) => {
    setMovementList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Carry-over option
  const [carryOverPending, setCarryOverPending] = useState(true);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Reset when opened
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const next = getNextShift(
        currentShift.shiftType,
        currentShift.date || '22/08/2569'
      );
      setDate(next.nextDate);
      setShiftType(next.nextType);

      const foundPrev = findPreviousShiftInList(allShifts, next.nextDate, next.nextType);
      const carry =
        foundPrev?.stats?.currentRemaining ??
        foundPrev?.stats?.carriedOver ??
        currentShift.stats?.currentRemaining ??
        currentShift.stats?.carriedOver ??
        0;
      setCarriedOver(carry);
      setTransferredIn(0);
      setAdmittedNew(0);
      setTransferredOut(0);
      setAgainstAdvice(0);
      setDeceased(0);
      setDeceasedPostOp24Hr(0);
      setAdmitDischarge24Hr(0);
      setReferOut(0);
      setVentilatorCount(0);
      setOxygenCount(0);
      setPostOpCount(0);
      setCategory5(0);
      setCategory4(0);
      setInchargeName('');
      setNurseError(false);

      // ล้างค่ายอด Consultation ให้เริ่มต้นเป็น 0 อัตโนมัติ
      setConsultationData({
        totalCount: 0,
        departmentCounts: {},
        customDepartments: [],
        notes: '',
        items: [],
      });

      // ล้างค่ายอดเจ้าหน้าที่, อุปกรณ์/Wean, และอุบัติการณ์ให้เริ่มต้นเป็น 0
      setStaffData({
        headCount: 0,
        rnCount: 0,
        naCount: 0,
        clerkCount: 0,
        pnCount: 0,
        otCount: 0,
        leaveCount: 0,
        totalStaff: 0,
        notes: '',
      });

      setEquipmentWeanData({
        ventilatorUse: 0,
        foleyCatheter: 0,
        peripheralLine: 0,
        centralLine: 0,
        weanAssess: 0,
        weanAttempt: 0,
        weanSuccess: 0,
        ventCount: 0,
        weanCount: 0,
        ettCount: 0,
        details: '',
      });

      setIncidentData({
        anastomosisLeakage: 0,
        peInFxLongBone: 0,
        hemoPneumoPostCLine: 0,
        akiInMultipleTm: 0,
        tmWithShock: 0,
        iicpInTm: 0,
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
        details: '',
      });

      setMovementList([
        {
          id: 'mv-1',
          patientName: '',
          diagnosis: '',
          status: '',
          note: '',
        },
      ]);
      setIsDropdownOpen(false);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, currentShift, allShifts]);

  // Handler when user clicks a shift type button
  const handleSelectShiftType = (selectedType: ShiftType) => {
    setShiftType(selectedType);
    const currentDate = currentShift.date || '22/08/2569';
    let targetDate = currentDate;

    if (currentShift.shiftType === 'เวรดึก') {
      if (selectedType === 'เวรเช้า' || selectedType === 'เวรบ่าย') {
        targetDate = currentDate;
      } else {
        // Next night shift is next day
        targetDate = addDaysThai(currentDate, 1);
      }
    } else if (currentShift.shiftType === 'เวรเช้า') {
      if (selectedType === 'เวรบ่าย') {
        targetDate = currentDate;
      } else {
        targetDate = addDaysThai(currentDate, 1);
      }
    } else {
      // currentShift is 'เวรบ่าย'
      targetDate = addDaysThai(currentDate, 1);
    }
    setDate(targetDate);

    // Automatically update continuous balance (ยอดคงยกมา) from matching previous shift
    const foundPrev = findPreviousShiftInList(allShifts, targetDate, selectedType);
    if (foundPrev?.stats) {
      const carry = foundPrev.stats.currentRemaining ?? foundPrev.stats.carriedOver ?? 0;
      setCarriedOver(carry);
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const foundPrev = findPreviousShiftInList(allShifts, newDate, shiftType);
    if (foundPrev?.stats) {
      const carry = foundPrev.stats.currentRemaining ?? foundPrev.stats.carriedOver ?? 0;
      setCarriedOver(carry);
    }
  };


  // Calculate current remaining
  const currentRemaining = Math.max(
    0,
    Number(carriedOver || 0) +
      Number(transferredIn || 0) +
      Number(admittedNew || 0) -
      Number(transferredOut || 0) -
      Number(againstAdvice || 0) -
      Number(deceased || 0) -
      Number(referOut || 0)
  );

  const handleCategory5Change = (valStr: string) => {
    if (valStr === '') {
      setCategory5('');
      return;
    }
    const val = parseInt(valStr, 10);
    setCategory5(isNaN(val) ? 0 : Math.max(0, val));
  };

  const handleCategory4Change = (valStr: string) => {
    if (valStr === '') {
      setCategory4('');
      return;
    }
    const val = parseInt(valStr, 10);
    setCategory4(isNaN(val) ? 0 : Math.max(0, val));
  };

  if (!isOpen) return null;

  const handleAddNewNurse = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNurseInput.trim()) return;
    const name = newNurseInput.trim();
    if (!nurseList.includes(name)) {
      const updated = [...nurseList, name];
      setNurseList(updated);
      localStorage.setItem('sicu_nurse_list', JSON.stringify(updated));
      syncNurseListToCloud(updated).catch((err) => console.warn('Failed to sync nurse list to cloud:', err));
      setInchargeName(name);
      setNurseError(false);
    }
    setNewNurseInput('');
    setIsAddingNurse(false);
  };

  const handleDeleteNurse = (nameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = nurseList.filter((n) => n !== nameToDelete);
    setNurseList(updated);
    localStorage.setItem('sicu_nurse_list', JSON.stringify(updated));
    syncNurseListToCloud(updated).catch((err) => console.warn('Failed to sync nurse list to cloud:', err));
    if (inchargeName === nameToDelete) {
      setInchargeName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inchargeName.trim()) {
      setNurseError(true);
      setIsDropdownOpen(true);
      return;
    }

    const newStats: PatientStats = {
      carriedOver: Number(carriedOver || 0),
      transferredIn: Number(transferredIn || 0),
      admittedNew: Number(admittedNew || 0),
      transferredOut: Number(transferredOut || 0),
      againstAdvice: Number(againstAdvice || 0),
      deceased: Number(deceased || 0),
      deceasedPostOp24Hr: Number(deceasedPostOp24Hr || 0),
      admitDischarge24Hr: Number(admitDischarge24Hr || 0),
      referOut: Number(referOut || 0),
      currentRemaining,
      category5Count: Number(category5 || 0),
      category4Count: Number(category4 || 0),
      ventilatorCount: Number(ventilatorCount || 0),
      oxygenCount: Number(oxygenCount || 0),
      postOpCount: Number(postOpCount || 0),
    };

    const newShiftId = 'shift-' + Date.now();
    const validMovementRecords: MovementRecord[] = movementList
      .filter(
        (r) =>
          r.patientName.trim().length > 0 ||
          r.diagnosis.trim().length > 0 ||
          r.status.trim().length > 0 ||
          (r.note && r.note.trim().length > 0)
      )
      .map((r, idx) => ({
        id: `move-${Date.now()}-${idx}`,
        patientName: r.patientName.trim(),
        diagnosis: r.diagnosis.trim(),
        status: r.status.trim(),
        note: r.note?.trim() || undefined,
      }));

    const legacyNotes = validMovementRecords.map((r) => {
      let str = `ชื่อ-สกุล: ${r.patientName || '-'}`;
      if (r.diagnosis) str += ` | Dx: ${r.diagnosis}`;
      if (r.status) str += ` | สถานะ: ${r.status}`;
      if (r.note) str += ` (${r.note})`;
      return str;
    });

    const newShift: ShiftInfo = {
      id: newShiftId,
      date,
      shiftType,
      inchargeName: inchargeName.trim(),
      previousShiftInfo: `${currentShift.shiftType} (${currentShift.date})`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: `${date} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
      stats: newStats,
      handoverItems: [...activeHandoverItems],
      pendingCharts: [...activePendingCharts],
      movementRecords: validMovementRecords,
      movementNotes: legacyNotes,
      consultationData,
      staffData,
      equipmentWeanData: shiftType === 'เวรบ่าย' ? equipmentWeanData : undefined,
      incidentData,
    };

    onAddShift(newShift);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-[620px] w-full overflow-hidden border border-slate-200 my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0d1627] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-500/40 text-teal-400 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white font-['Prompt',sans-serif]">
                เปิดบันทึกเวรใหม่ (+ เพิ่มเวร)
              </h3>
              <div className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap mt-0.5">
                <span>เชื่อมโยงจาก:</span>
                <span className="text-[#2dd4bf] font-bold">
                  {currentShift.shiftType} ({currentShift.date})
                </span>
                <span className="text-slate-400">➔</span>
                <span className="text-[#f59e0b] font-bold">
                  {shiftType} ({date})
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Row 1: วันที่ส่งเวร (พ.ศ.) & ช่วงเวลาเวร */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* วันที่ */}
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                วันที่ส่งเวร (พ.ศ.)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  placeholder="23/08/2569"
                  className="w-full pl-10 pr-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* ช่วงเวลาเวร */}
            <div className="sm:col-span-7">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  ช่วงเวลาเวร
                </label>
                <span className="text-[11px] text-slate-400">
                  ลำดับ: ดึก ➔ เช้า ➔ บ่าย
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectShiftType('เวรดึก')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl border transition cursor-pointer ${
                    shiftType === 'เวรดึก'
                      ? 'bg-[#4338ca] text-white border-[#4338ca] font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>ดึก</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectShiftType('เวรเช้า')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl border transition cursor-pointer ${
                    shiftType === 'เวรเช้า'
                      ? 'bg-[#f59e0b] text-white border-[#f59e0b] font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>เช้า</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectShiftType('เวรบ่าย')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl border transition cursor-pointer ${
                    shiftType === 'เวรบ่าย'
                      ? 'bg-[#f59e0b] text-white border-[#f59e0b] font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <Sunset className="w-3.5 h-3.5" />
                  <span>บ่าย</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: พยาบาลหัวหน้าเวร (Incharge Nurse) */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                พยาบาลหัวหน้าเวร (Incharge Nurse) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNurse(!isAddingNurse)}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
              >
                + • เพิ่มชื่ออื่น
              </button>
            </div>

            {/* Inline add new nurse */}
            {isAddingNurse && (
              <div className="mb-2 p-2 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2">
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อพยาบาลหัวหน้าเวร..."
                  value={newNurseInput}
                  onChange={(e) => setNewNurseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewNurse();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewNurse}
                  className="px-3 py-1.5 text-xs bg-[#00796b] text-white rounded-lg font-medium hover:bg-[#00695c] cursor-pointer"
                >
                  เพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingNurse(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Custom dropdown trigger */}
            <div
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setNurseError(false);
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl cursor-pointer transition select-none ${
                nurseError
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : isDropdownOpen
                  ? 'border-teal-500 ring-2 ring-teal-500/20'
                  : inchargeName
                  ? 'border-teal-500/80 hover:border-teal-600'
                  : 'border-slate-300 hover:border-teal-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className={`w-4 h-4 ${inchargeName ? 'text-teal-600' : 'text-slate-400'}`} />
                <span
                  className={`text-xs ${
                    inchargeName ? 'font-semibold text-slate-800' : 'font-normal text-slate-400'
                  }`}
                >
                  {inchargeName || 'เลือกชื่อ..'}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-teal-600' : ''
                }`}
              />
            </div>

            {nurseError && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                * กรุณาเลือกพยาบาลหัวหน้าเวร (Incharge Nurse)
              </p>
            )}

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 py-1 animate-in fade-in-50 zoom-in-95">
                <div
                  onClick={() => {
                    setInchargeName('');
                    setIsDropdownOpen(false);
                  }}
                  className={`px-4 py-2 text-xs cursor-pointer transition flex items-center justify-between ${
                    !inchargeName
                      ? 'bg-slate-100 font-semibold text-slate-500'
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span>เลือกชื่อ..</span>
                </div>
                {nurseList.map((name) => {
                  const isSelected = name === inchargeName;
                  return (
                    <div
                      key={name}
                      onClick={() => {
                        setInchargeName(name);
                        setNurseError(false);
                        setIsDropdownOpen(false);
                      }}
                      className={`group px-3.5 py-2 text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-teal-50 font-semibold text-teal-900'
                          : 'text-slate-700 hover:bg-slate-50 font-normal'
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNurse(name, e)}
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-60 group-hover:opacity-100 flex-shrink-0 cursor-pointer"
                        title="ลบออกจากรายการ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 3: สรุปยอดสถิติผู้ป่วย (Census Calculation) */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600 stroke-[2.5]" />
                <h4 className="text-xs font-bold text-slate-800 font-['Prompt',sans-serif]">
                  สรุปยอดสถิติผู้ป่วย (Census Calculation)
                </h4>
              </div>
              {resolvedPreviousShift && (
                <div className="flex items-center gap-1.5 text-[11px] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-teal-900 shadow-2xs">
                  <span>
                    เวรก่อนหน้า: <strong>{resolvedPreviousShift.shiftType} {resolvedPreviousShift.date}</strong>
                    {resolvedPreviousShift.stats?.currentRemaining !== undefined && (
                      <> (คงเหลือ: <strong>{resolvedPreviousShift.stats.currentRemaining}</strong> คน)</>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCarriedOver(resolvedPreviousShift.stats?.currentRemaining ?? 0)}
                    className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 underline ml-1 cursor-pointer"
                    title="ดึงค่ายอดคงเหลือจากเวรก่อนหน้ามาใส่ในยอดคงยกมา"
                  >
                    <Copy className="w-3 h-3 text-teal-600" />
                    <span>นำยอดต่อเนื่องมา</span>
                  </button>
                </div>
              )}
            </div>

            {/* 7 Metric Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
              <div>
                <span className="text-[11px] font-semibold text-slate-700 text-center block mb-1">
                  ยอดยกมา
                </span>
                <input
                  type="number"
                  min="0"
                  value={carriedOver}
                  onChange={(e) => setCarriedOver(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full py-1.5 text-center text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#0284c7] text-center block mb-1">
                  รับย้าย (+)
                </span>
                <input
                  type="number"
                  min="0"
                  value={transferredIn}
                  onChange={(e) => setTransferredIn(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full py-1.5 text-center text-xs font-bold text-[#0284c7] bg-white border border-[#38bdf8] rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#059669] text-center block mb-1">
                  รับใหม่ (+)
                </span>
                <input
                  type="number"
                  min="0"
                  value={admittedNew}
                  onChange={(e) => setAdmittedNew(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full py-1.5 text-center text-xs font-bold text-[#059669] bg-white border border-[#34d399] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#d97706] text-center block mb-1">
                  ย้ายไป (-)
                </span>
                <input
                  type="number"
                  min="0"
                  value={transferredOut}
                  onChange={(e) => setTransferredOut(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full py-1.5 text-center text-xs font-bold text-[#d97706] bg-white border border-[#fbbf24] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#ea580c] text-center block mb-1 truncate" title="ไม่สมัครใจอยู่ (-)">
                  ไม่สมัครใจอยู่ (-)
                </span>
                <input
                  type="number"
                  min="0"
                  value={againstAdvice}
                  onChange={(e) => setAgainstAdvice(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full py-1.5 text-center text-xs font-bold text-[#ea580c] bg-white border border-[#fdba74] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#e11d48] text-center block mb-1">
                  เสียชีวิต (-)
                </span>
                <input
                  type="number"
                  min="0"
                  value={deceased}
                  onChange={(e) => setDeceased(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full py-1.5 text-center text-xs font-bold text-[#e11d48] bg-white border border-[#f43f5e] rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#9333ea] text-center block mb-1">
                  Refer out (-)
                </span>
                <input
                  type="number"
                  min="0"
                  value={referOut}
                  onChange={(e) => setReferOut(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full py-1.5 text-center text-xs font-bold text-[#9333ea] bg-white border border-[#c084fc] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Sub-indicators: Ventilator, Oxygen, Post op & เสียชีวิต 24hr/รับ-DC */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-['Prompt',sans-serif]">
                  <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                  <span>หัวข้อย่อยสรุปยอดสถิติผู้ป่วย (Sub-Indicators)</span>
                </div>
                <span className="text-[11px] text-slate-400">สถานะสำคัญประจำเวร</span>
              </div>

              {/* 3 Main Requested Sub-indicators: Ventilator, Oxygen, Post op */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Ventilator */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🫁</span>
                    <div>
                      <span className="text-xs font-bold text-sky-900 block leading-tight">Ventilator</span>
                      <span className="text-[10px] text-slate-500">เครื่องช่วยหายใจ</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={ventilatorCount}
                      onChange={(e) => setVentilatorCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 py-1 text-center text-xs font-bold text-sky-700 bg-sky-50/60 border border-sky-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <span className="text-[10px] text-slate-500">ราย</span>
                  </div>
                </div>

                {/* Oxygen */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-teal-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">💨</span>
                    <div>
                      <span className="text-xs font-bold text-teal-900 block leading-tight">Oxygen</span>
                      <span className="text-[10px] text-slate-500">บำบัดออกซิเจน</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={oxygenCount}
                      onChange={(e) => setOxygenCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 py-1 text-center text-xs font-bold text-teal-700 bg-teal-50/60 border border-teal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-slate-500">ราย</span>
                  </div>
                </div>

                {/* Post op */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🩺</span>
                    <div>
                      <span className="text-xs font-bold text-indigo-900 block leading-tight">Post op</span>
                      <span className="text-[10px] text-slate-500">หลังผ่าตัด</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={postOpCount}
                      onChange={(e) => setPostOpCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 py-1 text-center text-xs font-bold text-indigo-700 bg-indigo-50/60 border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500">ราย</span>
                  </div>
                </div>
              </div>

              {/* Specific 24hr items */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/80">
                {/* เสียชีวิตใน 24 hr. หลังผ่าตัด */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-rose-200 bg-white text-xs font-medium text-slate-700 shadow-2xs">
                  <span className="text-[11px] text-rose-800 font-bold whitespace-nowrap">เสียชีวิตใน 24 hr. หลังผ่าตัด:</span>
                  <input
                    type="number"
                    min="0"
                    value={deceasedPostOp24Hr}
                    onChange={(e) => setDeceasedPostOp24Hr(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-12 h-6 text-center text-xs font-bold text-rose-700 bg-rose-50/50 border border-rose-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-500">ราย</span>
                </div>

                {/* รับและ D/C ใน 24 hr. */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-2xs">
                  <span className="text-[11px] text-slate-800 font-bold whitespace-nowrap">รับและ D/C ใน 24 hr.:</span>
                  <input
                    type="number"
                    min="0"
                    value={admitDischarge24Hr}
                    onChange={(e) => setAdmitDischarge24Hr(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-12 h-6 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <span className="text-[10px] text-slate-500">ราย</span>
                </div>
              </div>
            </div>

            {/* Total Remaining Banner */}
            <div className="bg-[#00796b] text-white rounded-xl p-3 px-5 flex items-center justify-between shadow-xs">
              <span className="font-bold text-xs sm:text-sm text-teal-50">
                ยอดผู้ป่วยคงพยาบาล (Total Remaining):
              </span>
              <span className="font-bold text-xl sm:text-2xl text-white font-['Prompt',sans-serif]">
                {currentRemaining} ราย
              </span>
            </div>

            {/* Patient Categories (Real-time typed) */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  ประเภทผู้ป่วย :
                </span>
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  รวม {Number(category5 || 0) + Number(category4 || 0)} / {currentRemaining} คน
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* ประเภท 5 */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-200 bg-rose-50/50 text-xs font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  <span className="text-rose-900 font-bold">ประเภท 5 =</span>
                  <input
                    type="number"
                    min="0"
                    value={category5}
                    onChange={(e) => handleCategory5Change(e.target.value)}
                    placeholder="0"
                    className="w-14 h-7 text-center text-xs font-bold text-rose-700 bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span>คน</span>
                </div>

                {/* ประเภท 4 */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-200 bg-amber-50/50 text-xs font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                  <span className="text-amber-900 font-bold">ประเภท 4 =</span>
                  <input
                    type="number"
                    min="0"
                    value={category4}
                    onChange={(e) => handleCategory4Change(e.target.value)}
                    placeholder="0"
                    className="w-14 h-7 text-center text-xs font-bold text-amber-700 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span>คน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: ข้อมูล ย้าย/รับ/จำหน่าย เพิ่มเติม (ปรับรูปแบบ: -ชื่อ/สกุล -Dx. -สถานะ(รับ/ย้าย จาก..)) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-800 font-['Prompt',sans-serif]">
                  ข้อมูล ย้าย/รับ/จำหน่าย เพิ่มเติม
                </span>
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {movementList.filter((m) => m.patientName.trim() || m.diagnosis.trim() || m.status.trim() || (m.note && m.note.trim())).length} รายการ
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddMovement}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-300 rounded-xl transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>เพิ่มผู้ป่วย</span>
              </button>
            </div>

            {movementList.length === 0 ? (
              <div className="text-center py-3 px-4 bg-white border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                ไม่มีข้อมูล ย้าย/รับ/จำหน่าย เพิ่มเติม (กดปุ่ม "+ เพิ่มผู้ป่วย" เพื่อเพิ่มบันทึก)
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {movementList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs transition hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          #{idx + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMovement(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* ชื่อ/สกุล */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          ชื่อ/สกุล <span className="text-teal-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={item.patientName}
                          onChange={(e) => handleMovementChange(item.id, 'patientName', e.target.value)}
                          placeholder="เช่น นายสมชาย ใจดี หรือ HN"
                          className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition"
                        />
                      </div>

                      {/* Dx. */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Dx. (การวินิจฉัย)
                        </label>
                        <input
                          type="text"
                          value={item.diagnosis}
                          onChange={(e) => handleMovementChange(item.id, 'diagnosis', e.target.value)}
                          placeholder="เช่น Post op Explor Lap, Septic shock"
                          className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    {/* สถานะ (รับ/ย้าย...) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        สถานะ (รับ/ย้าย...)
                      </label>
                      <input
                        type="text"
                        value={item.status}
                        onChange={(e) => handleMovementChange(item.id, 'status', e.target.value)}
                        placeholder="เช่น รับใหม่ER, รับย้ายจาก, ย้ายไป, Refer out, Dead no CPR, Dead CPR"
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition"
                      />
                      {/* Quick presets */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">ตัวเลือกด่วน:</span>
                        {['รับใหม่ER', 'รับย้ายจาก', 'ย้ายไป', 'Refer out', 'Dead no CPR', 'Dead CPR'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleMovementChange(item.id, 'status', preset)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition cursor-pointer border border-slate-200 font-medium"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row 5: Auto-carryover Information */}
          <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span className="text-xs font-semibold text-teal-900">
                ส่งต่อ Chart ค้าง ({activePendingCharts.length} แฟ้ม) และเรื่องส่งต่อ ({activeHandoverItems.length} รายการ) ไปเวรใหม่อัตโนมัติ
              </span>
            </div>
            <span className="text-[11px] font-medium text-teal-700 bg-white px-2 py-0.5 rounded border border-teal-200 whitespace-nowrap">
              คงอยู่จนกว่าจะถูกลบ
            </span>
          </div>

          {/* Row 6: 4 ปุ่มบันทึกข้อมูลเฉพาะด้านท้ายสุด */}
          <div className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 font-['Prompt',sans-serif]">
                บันทึกข้อมูลเฉพาะด้านประจำเวร
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                (กดเพื่อบันทึกข้อมูลเพิ่มเติม)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* ปุ่ม 1: ยอด Consultation */}
              <button
                type="button"
                onClick={() => setIsConsultationModalOpen(true)}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-teal-200 bg-white hover:bg-teal-50/80 hover:border-teal-300 text-slate-700 hover:text-teal-900 transition text-left cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-teal-100/80 text-teal-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">ยอด Consultation</span>
                </div>
                {consultationData.totalCount > 0 ? (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 flex-shrink-0 border border-teal-200">
                    {consultationData.totalCount} ราย
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-slate-400 bg-slate-100 flex-shrink-0">
                    บันทึก
                  </span>
                )}
              </button>

              {/* ปุ่ม 2: ยอดเจ้าหน้าที่ */}
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(true)}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/80 hover:border-blue-300 text-slate-700 hover:text-blue-900 transition text-left cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">ยอดเจ้าหน้าที่</span>
                </div>
                {staffData.totalStaff > 0 ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 flex-shrink-0">
                    {staffData.totalStaff} คน
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-slate-400 bg-slate-100 flex-shrink-0">
                    บันทึก
                  </span>
                )}
              </button>

              {/* ปุ่ม 3: บันทึกการใช้อุปกรณ์/Wean (ล็อคให้ใช้ได้เฉพาะเวรบ่าย) */}
              {shiftType === 'เวรบ่าย' ? (
                <button
                  type="button"
                  onClick={() => setIsEquipmentModalOpen(true)}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-rose-300 bg-rose-50/70 hover:bg-rose-100 hover:border-rose-400 text-slate-800 hover:text-rose-950 transition text-left cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      <Wind className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      บันทึกการใช้อุปกรณ์/Wean <span className="text-rose-700 font-extrabold text-[11px]">(เฉพาะเวรบ่าย)</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 flex-shrink-0">
                    7 รายการ
                  </span>
                </button>
              ) : (
                <div
                  title="บันทึกการใช้อุปกรณ์ / Wean กำหนดให้บันทึกเฉพาะ 'เวรบ่าย' เท่านั้น"
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-400 select-none cursor-not-allowed shadow-2xs opacity-80"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-200/90 text-slate-500 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-600 truncate">
                        บันทึกการใช้อุปกรณ์/Wean
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ล็อคไว้ (บันทึกเฉพาะเวรบ่ายเท่านั้น)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/90 text-slate-600 border border-slate-300 flex-shrink-0 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                    เฉพาะเวรบ่าย
                  </span>
                </div>
              )}

              {/* ปุ่ม 4: ข้อมูลตัวชี้วัด/อุบัติการณ์ */}
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(true)}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-50/80 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition text-left cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">ข้อมูลตัวชี้วัด/อุบัติการณ์</span>
                </div>
                {((incidentData.anastomosisLeakage || 0) +
                  (incidentData.peInFxLongBone || 0) +
                  (incidentData.hemoPneumoPostCLine || 0) +
                  (incidentData.akiInMultipleTm || 0) +
                  (incidentData.tmWithShock || 0) +
                  (incidentData.iicpInTm || 0) +
                  (incidentData.reAdmit48Hr || 0) +
                  (incidentData.unplannedCpr || 0) +
                  (incidentData.unplannedExtubation || 0) +
                  (incidentData.equipmentNotReady || 0) +
                  (incidentData.serviceComplaint || 0) +
                  (incidentData.wrongPatientId || 0) +
                  (incidentData.medicationError || 0) +
                  (incidentData.bloodTransfusionError || 0) +
                  (incidentData.phlebitis || 0) +
                  (incidentData.workplaceAccident || 0)) > 0 ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 flex-shrink-0">
                    มีบันทึก ({(incidentData.anastomosisLeakage || 0) +
                      (incidentData.peInFxLongBone || 0) +
                      (incidentData.hemoPneumoPostCLine || 0) +
                      (incidentData.akiInMultipleTm || 0) +
                      (incidentData.tmWithShock || 0) +
                      (incidentData.iicpInTm || 0) +
                      (incidentData.reAdmit48Hr || 0) +
                      (incidentData.unplannedCpr || 0) +
                      (incidentData.unplannedExtubation || 0) +
                      (incidentData.equipmentNotReady || 0) +
                      (incidentData.serviceComplaint || 0) +
                      (incidentData.wrongPatientId || 0) +
                      (incidentData.medicationError || 0) +
                      (incidentData.bloodTransfusionError || 0) +
                      (incidentData.phlebitis || 0) +
                      (incidentData.workplaceAccident || 0)})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex-shrink-0">
                    ปกติ (0)
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-[#00796b] hover:bg-[#00695c] text-white rounded-xl shadow-sm transition cursor-pointer"
            >
              เริ่มบันทึกเวรนี้
            </button>
          </div>
        </form>
      </div>

      {/* 4 Specialized Modals */}
      <ConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        initialData={consultationData}
        onSave={setConsultationData}
        shiftContextTitle={`${shiftType} ${date}`}
        previousConsultationData={resolvedPreviousShift?.consultationData}
        previousShiftLabel={resolvedPreviousShift ? `${resolvedPreviousShift.shiftType} ${resolvedPreviousShift.date}` : undefined}
      />
      <StaffCountModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        initialData={staffData}
        onSave={setStaffData}
        previousStaffData={resolvedPreviousShift?.staffData}
        previousShiftLabel={resolvedPreviousShift ? `${resolvedPreviousShift.shiftType} ${resolvedPreviousShift.date}` : undefined}
      />
      <EquipmentWeanModal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        shiftType={shiftType}
        initialData={equipmentWeanData}
        onSave={setEquipmentWeanData}
        previousEquipmentData={resolvedPreviousShift?.equipmentWeanData}
        previousShiftLabel={resolvedPreviousShift ? `${resolvedPreviousShift.shiftType} ${resolvedPreviousShift.date}` : undefined}
      />
      <IncidentIndicatorModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        initialData={incidentData}
        onSave={setIncidentData}
        previousIncidentData={resolvedPreviousShift?.incidentData}
        previousShiftLabel={resolvedPreviousShift ? `${resolvedPreviousShift.shiftType} ${resolvedPreviousShift.date}` : undefined}
      />
    </div>
  );
};
