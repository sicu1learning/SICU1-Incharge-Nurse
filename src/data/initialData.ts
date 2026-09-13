import { ShiftInfo, PatientStats, HandoverItem, PendingChart } from '../types';
import { createCurrentLiveShift } from '../utils/shiftUtils';

export const DEFAULT_DOCTORS: string[] = [
  'นพ./พญ. จุฑาภรณ์',
  'นพ./พญ. พีรพัฒน์',
  'นพ./พญ. อัญชลี',
  'นพ./พญ. กฤติน',
  'นพ./พญ. ภัทรทริยา',
  'นพ./พญ. ณัฐ',
  'นพ./พญ. ธนภูมิ',
];

export const INITIAL_PATIENT_STATS: PatientStats = {
  carriedOver: 0,
  transferredIn: 0,
  admittedNew: 0,
  transferredOut: 0,
  againstAdvice: 0,
  deceased: 0,
  deceasedPostOp24Hr: 0,
  admitDischarge24Hr: 0,
  referOut: 0,
  currentRemaining: 0,
  category5Count: 0,
  category4Count: 0,
};

export const INITIAL_PENDING_CHARTS: PendingChart[] = [];

export const INITIAL_HANDOVER_ITEMS: HandoverItem[] = [];

export const INITIAL_SHIFTS_HISTORY: ShiftInfo[] = [];

// Live Current Shift initialized for current time (clean state with 0 counts)
export const getLiveInitialShift = (): ShiftInfo => {
  return createCurrentLiveShift();
};

export const INITIAL_SHIFT: ShiftInfo = getLiveInitialShift();


