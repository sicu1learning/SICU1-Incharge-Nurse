export type ShiftType = 'เวรเช้า' | 'เวรบ่าย' | 'เวรดึก';

export interface MovementRecord {
  id?: string;
  patientName: string; // ชื่อ/สกุล
  diagnosis: string; // Dx.
  status: string; // สถานะ(รับ/ย้าย จาก..)
  note?: string; // หมายเหตุเพิ่มเติม
}

export interface ConsultationItem {
  id: string;
  department: string;
  doctor?: string;
  patientInfo?: string;
  details?: string;
}

export interface ConsultationData {
  totalCount: number; // ผลรวม (อัตโนมัติ)
  departmentCounts?: Record<string, number>; // e.g. { 'Sx': 5, 'Med': 4, 'Nephro': 3, 'PT': 5, 'OB': 2 }
  customDepartments?: string[]; // รายชื่อแผนกที่เพิ่มเอง
  notes?: string;
  items?: ConsultationItem[];
}

export interface StaffData {
  headCount?: number; // 1. Head (หัวหน้าตึก / Incharge)
  rnCount: number; // 2. RN (พยาบาลวิชาชีพ)
  naCount?: number; // 3. NA (ผู้ช่วยเหลือคนไข้)
  clerkCount?: number; // 4. Clerk (เจ้าหน้าที่ธุรการ / เสมียน)
  pnCount?: number; // alias for NA / PN
  otCount?: number;
  leaveCount?: number;
  totalStaff: number;
  notes?: string;
}

export interface EquipmentWeanData {
  // 7 รายการหลัก บันทึกการใช้อุปกรณ์/Wean
  ventilatorUse: number; // 1. ใช้เครื่องช่วยหายใจ
  foleyCatheter: number; // 2. คาสายสวนปัสสาวะ
  peripheralLine: number; // 3. Peripheral line
  centralLine: number; // 4. Central line
  weanAssess: number; // 5. ประเมินWean
  weanAttempt: number; // 6. ได้รับการwean
  weanSuccess: number; // 7. weanสำเร็จ

  // Compatibility / optional fields
  ettCount?: number;
  ventCount?: number;
  weanCount?: number;
  highFlowCount?: number;
  pumpCount?: number;
  details?: string;
}

export interface SpecificClinicalRisk {
  anastomosisLeakage: number; // - anastomosis leakage
  peInFxLongBone: number; // - PE in Fx.long bone
  hemoPneumoPostCLine: number; // - Hemo/Pneumothorax post C-line
  akiInMultipleTm: number; // - AKI in multiple TM
  tmWithShock: number; // - TM with shock
  iicpInTm: number; // - IICP in TM
}

export interface ClinicalIncidents {
  reAdmit48Hr: number; // - Re admit in 48 hr
  unplannedCpr: number; // - Unplan CPR
  unplannedExtubation: number; // - Unplan extubation
  equipmentNotReady: number; // - อุปกรณ์ ไม่พร้อมใช้
  serviceComplaint: number; // - ข้อร้องเรียนบริการ
  wrongPatientId: number; // - ระบุตัวผู้ป่วยผิดคน
  medicationError: number; // - บริหารยาผิดพลาด
  bloodTransfusionError: number; // - การให้เลือดผิดพลาด
  phlebitis: number; // - การเกิด Phlebitis
  workplaceAccident: number; // - อุบัติเหตุการทำงาน

  // Safety & Infection Indicators
  pressureSore?: number; // - แผลกดทับ
  cauti?: number; // - ติดเชื้อ CAUTI
  vap?: number; // - ติดเชื้อ VAP
  clabsi?: number; // - ติดเชื้อ CLABSI
  fall?: number; // - พลัดตกหกล้ม
}

export interface IncidentData {
  // 1. Specific Clinical Risk
  anastomosisLeakage?: number;
  peInFxLongBone?: number;
  hemoPneumoPostCLine?: number;
  akiInMultipleTm?: number;
  tmWithShock?: number;
  iicpInTm?: number;
  specificRisk?: SpecificClinicalRisk;

  // 2. อุบัติการณ์ (Incidents)
  reAdmit48Hr?: number;
  unplannedCpr?: number;
  unplannedExtubation?: number;
  equipmentNotReady?: number;
  serviceComplaint?: number;
  wrongPatientId?: number;
  medicationError?: number;
  bloodTransfusionError?: number;
  phlebitis?: number;
  workplaceAccident?: number;
  incidents?: ClinicalIncidents;

  // 3. Safety & Infection Indicators
  pressureSore?: number;
  cauti?: number;
  vap?: number;
  clabsi?: number;
  fall?: number;

  // Compatibility fields
  infectionCount?: number;
  fallPressureUlcer?: number;
  medError?: number;
  cprCount?: number;
  totalRiskCount?: number;
  totalIncidentCount?: number;
  details?: string;
}

export interface ShiftInfo {
  id: string;
  date: string; // e.g. "22/08/2569"
  shiftType: ShiftType;
  inchargeName: string;
  previousShiftInfo?: string; // e.g. "เวรบ่าย 21/08/2569"
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  stats?: PatientStats;
  handoverItems?: HandoverItem[];
  pendingCharts?: PendingChart[];
  movementNotes?: string[]; // backward compatibility
  movementRecords?: MovementRecord[]; // ข้อมูล ย้าย/รับ/จำหน่าย เพิ่มเติม (-ชื่อ/สกุล -Dx. -สถานะ(รับ/ย้าย จาก..))
  consultationData?: ConsultationData; // ยอด consulttation
  staffData?: StaffData; // ยอดเจ้าหน้าที่
  equipmentWeanData?: EquipmentWeanData; // บันทึกการใช้อุปกรณ์/Wean
  incidentData?: IncidentData; // ข้อมูลตัวชี้วัด/อุบัติการณ์
}

export interface PatientStats {
  carriedOver: number; // ยอดยกมา
  transferredIn: number; // รับย้าย (+)
  admittedNew: number; // รับใหม่ (+)
  transferredOut: number; // ย้ายไป (-)
  againstAdvice?: number; // ไม่สมัครใจอยู่ (-)
  deceased: number; // เสียชีวิต (-)
  deceasedPostOp24Hr?: number; // เสียชีวิตใน 24 hr. หลังผ่าตัด
  admitDischarge24Hr?: number; // รับและ D/C ใน 24 hr.
  referOut: number; // Refer out (-)
  currentRemaining: number; // คงพยาบาล
  category5Count: number; // ประเภท 5
  category4Count: number; // ประเภท 4
  ventilatorCount?: number; // Ventilator (ผู้ป่วย On เครื่องช่วยหายใจ)
  oxygenCount?: number; // Oxygen (ผู้ป่วย On ออกซิเจน)
  postOpCount?: number; // Post op (ผู้ป่วยหลังผ่าตัด)
}

export type HandoverPriority = 'normal' | 'urgent' | 'critical';

export interface HandoverItem {
  id: string;
  title: string;
  details: string;
  patientName?: string;
  bedNumber?: string;
  priority?: HandoverPriority;
  category?: string;
  createdBy: string;
  createdAt: string;
  shiftId: string;
  isCompleted?: boolean;
}

export type ChartLocation = 'SICU' | 'ห้องคิดเงิน' | 'ห้องประชุมSx' | 'Wardอื่นๆ' | 'โต๊ะหัวหน้า';

export interface PendingChart {
  id: string;
  patientName: string;
  hn?: string;
  doctors: string[];
  location: ChartLocation;
  dateAdded: string; // e.g. "22/08/2569"
  daysPending: number;
  note?: string;
  shiftId: string;
  status: 'pending' | 'completed' | 'resolved';
}

export type ValuableItemStatus = 'stored' | 'returned' | 'transferred' | 'active';

export interface ValuableItem {
  id: string;
  patientName: string;
  hn?: string;
  bedNumber?: string;
  itemDescription: string;
  custodian: string; // ผู้รับฝาก/ผู้บันทึก
  receiver?: string; // ผู้รับมอบ/ส่งคืน
  status: ValuableItemStatus; // 'stored' | 'returned' | 'transferred' | 'active'
  dateAdded: string;
  notes?: string;
  shiftId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface HandoverHistoryItem extends HandoverItem {
  source_handover_id: string;
  archivedAt: string;
  archivedBy?: string;
  archiveReason?: string;
}

