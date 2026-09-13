import { ShiftType, ShiftInfo } from '../types';

/**
 * Parses a date string in format "DD/MM/YYYY", "D/M/YY", "DD/MM/BBBB", etc.
 * Handles Thai Buddhist Era (พ.ศ.) years like 2569 or 69.
 */
export function parseThaiDate(dateStr: string): { day: number; month: number; year: number } {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear() + 543;

  if (!dateStr || typeof dateStr !== 'string') {
    return { day: currentDay, month: currentMonth, year: currentYear };
  }

  const cleaned = dateStr.trim().replace(/[-.]/g, '/');
  const parts = cleaned.split('/');

  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10) || currentDay;
    let month = parseInt(parts[1], 10) || currentMonth;
    let year = parseInt(parts[2], 10) || currentYear;

    // Handle 2-digit Buddhist year (e.g., 69 -> 2569)
    if (year < 100) {
      year += 2500;
    }
    // If entered in AD (e.g., 2026 -> convert to BE 2569)
    else if (year < 2400) {
      year += 543;
    }

    return { day, month, year };
  }

  return { day: currentDay, month: currentMonth, year: currentYear };
}

/**
 * Formats day, month, and Buddhist year into "DD/MM/YYYY" (e.g., "21/08/2569")
 */
export function formatThaiDate(day: number, month: number, year: number): string {
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year);
  return `${dd}/${mm}/${yyyy}`;
}

export const THAI_MONTH_NAMES = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

/**
 * Returns Thai month label e.g. "สิงหาคม 2569" from a date string
 */
export function getThaiMonthYear(dateStr: string): { key: string; label: string; month: number; year: number } {
  const { month, year } = parseThaiDate(dateStr);
  const key = `${String(month).padStart(2, '0')}/${year}`;
  const label = `${THAI_MONTH_NAMES[month - 1] || ''} ${year}`;
  return { key, label, month, year };
}


/**
 * Safely adds or subtracts days to a Thai Buddhist date string.
 */
export function addDaysThai(dateStr: string, days: number): string {
  const { day, month, year } = parseThaiDate(dateStr);
  const ceYear = year - 543;

  // Use UTC to prevent daylight saving / local time zone shifts
  const d = new Date(Date.UTC(ceYear, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);

  const resDay = d.getUTCDate();
  const resMonth = d.getUTCMonth() + 1;
  const resYear = d.getUTCFullYear() + 543;

  return formatThaiDate(resDay, resMonth, resYear);
}

/**
 * Standard shift order:
 * 1. เวรดึก (Night shift: 00:00 - 08:00)
 * 2. เวรเช้า (Morning shift: 08:00 - 16:00)
 * 3. เวรบ่าย (Afternoon shift: 16:00 - 24:00)
 * Then next day: เวรดึก -> เวรเช้า -> เวรบ่าย
 */
export function getNextShift(
  currentType: ShiftType,
  currentDate: string
): { nextType: ShiftType; nextDate: string } {
  if (currentType === 'เวรดึก') {
    return {
      nextType: 'เวรเช้า',
      nextDate: currentDate,
    };
  }
  if (currentType === 'เวรเช้า') {
    return {
      nextType: 'เวรบ่าย',
      nextDate: currentDate,
    };
  }
  // If 'เวรบ่าย', next shift is 'เวรดึก' of the NEXT day
  return {
    nextType: 'เวรดึก',
    nextDate: addDaysThai(currentDate, 1),
  };
}

/**
 * Calculates the previous shift in the sequence:
 * - เวรดึก day D <- previous was เวรบ่าย day D-1
 * - เวรเช้า day D <- previous was เวรดึก day D
 * - เวรบ่าย day D <- previous was เวรเช้า day D
 */
export function getPreviousShift(
  currentType: ShiftType,
  currentDate: string
): { prevType: ShiftType; prevDate: string } {
  if (currentType === 'เวรดึก') {
    return {
      prevType: 'เวรบ่าย',
      prevDate: addDaysThai(currentDate, -1),
    };
  }
  if (currentType === 'เวรเช้า') {
    return {
      prevType: 'เวรดึก',
      prevDate: currentDate,
    };
  }
  // If 'เวรบ่าย', previous was 'เวรเช้า' on same day
  return {
    prevType: 'เวรเช้า',
    prevDate: currentDate,
  };
}

/**
 * Returns numeric rank for shift within a day (1: ดึก, 2: เช้า, 3: บ่าย)
 */
export function getShiftRank(type: ShiftType | string): number {
  if (type === 'เวรดึก') return 1;
  if (type === 'เวรเช้า') return 2;
  if (type === 'เวรบ่าย') return 3;
  return 0;
}

/**
 * Compares two shifts chronologically.
 * Return > 0 if a is newer than b, < 0 if a is older than b.
 */
export function compareShiftsDesc(
  a?: { date?: string; shiftType?: ShiftType | string } | null,
  b?: { date?: string; shiftType?: ShiftType | string } | null
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const pA = parseThaiDate(a.date || '');
  const pB = parseThaiDate(b.date || '');

  if (pA.year !== pB.year) return pB.year - pA.year;
  if (pA.month !== pB.month) return pB.month - pA.month;
  if (pA.day !== pB.day) return pB.day - pA.day;

  return getShiftRank(b.shiftType || '') - getShiftRank(a.shiftType || '');
}

/**
 * Checks if two Thai date strings represent the same day/month/year.
 */
export function isSameThaiDate(dateA: string, dateB: string): boolean {
  if (!dateA || !dateB) return false;
  const a = parseThaiDate(dateA);
  const b = parseThaiDate(dateB);
  return a.day === b.day && a.month === b.month && a.year === b.year;
}

/**
 * Finds the exact chronological previous shift in shifts history:
 * 1. Look for exact prior shift (e.g. เช้า 2/9/69 -> ดึก 2/9/69; บ่าย 2/9/69 -> เช้า 2/9/69; ดึก 3/9/69 -> บ่าย 2/9/69)
 * 2. If not found, find the most recent shift that is chronologically prior to target.
 * 3. Fallback to newest available shift.
 */
export function findPreviousShiftInList(
  shifts: ShiftInfo[],
  targetDate: string,
  targetType: ShiftType,
  excludeId?: string
): ShiftInfo | null {
  if (!shifts || shifts.length === 0) return null;

  const filtered = shifts.filter((s) => !excludeId || s.id !== excludeId);
  if (filtered.length === 0) return null;

  // 1. Calculate exact chronological previous shift
  const { prevType, prevDate } = getPreviousShift(targetType, targetDate);

  // 2. Search for exact match
  const exactMatch = filtered.find(
    (s) => s.shiftType === prevType && isSameThaiDate(s.date, prevDate)
  );
  if (exactMatch) return exactMatch;

  // 3. Find newest shift that is chronologically before target
  const targetObj = { date: targetDate, shiftType: targetType };
  const sorted = [...filtered].sort(compareShiftsDesc);

  const olderShifts = sorted.filter(
    (s) => compareShiftsDesc(targetObj, s) > 0
  );
  if (olderShifts.length > 0) {
    return olderShifts[0];
  }

  // 4. Fallback to the latest available shift in list
  return sorted[0] || null;
}

/**
 * Returns current date in Thai format (DD/MM/YYYY) and current shift based on real local time
 */
export function getCurrentThaiDateAndShift(): {
  date: string;
  shiftType: ShiftType;
  timeStr: string;
  isoDate: string;
} {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear() + 543;
  const date = formatThaiDate(day, month, year);

  const hours = now.getHours();
  let shiftType: ShiftType = 'เวรเช้า';
  if (hours >= 0 && hours < 8) {
    shiftType = 'เวรดึก';
  } else if (hours >= 8 && hours < 16) {
    shiftType = 'เวรเช้า';
  } else {
    shiftType = 'เวรบ่าย';
  }

  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${date} ${String(hours).padStart(2, '0')}:${minutes} น.`;

  return { date, shiftType, timeStr, isoDate: now.toISOString() };
}

/**
 * Creates a new active shift object for the current day and shift period
 */
export function createCurrentLiveShift(latestHistoryShift?: ShiftInfo): ShiftInfo {
  const { date, shiftType, timeStr, isoDate } = getCurrentThaiDateAndShift();
  const shiftSlug = shiftType === 'เวรดึก' ? 'night' : shiftType === 'เวรเช้า' ? 'morning' : 'afternoon';
  const id = `shift-${shiftSlug}-${date.replace(/\//g, '-')}`;

  const prevInfo = latestHistoryShift
    ? `${latestHistoryShift.shiftType} (${latestHistoryShift.date})`
    : `${getPreviousShift(shiftType, date).prevType} (${getPreviousShift(shiftType, date).prevDate})`;

  const carriedOver = latestHistoryShift?.stats?.currentRemaining ?? 0;
  const cat5 = latestHistoryShift?.stats?.category5Count ?? 0;
  const cat4 = latestHistoryShift?.stats?.category4Count ?? 0;

  return {
    id,
    date,
    shiftType,
    inchargeName: '',
    previousShiftInfo: prevInfo,
    isActive: true,
    createdAt: isoDate,
    updatedAt: timeStr,
    stats: {
      carriedOver,
      transferredIn: 0,
      admittedNew: 0,
      transferredOut: 0,
      againstAdvice: 0,
      deceased: 0,
      deceasedPostOp24Hr: 0,
      admitDischarge24Hr: 0,
      referOut: 0,
      currentRemaining: carriedOver,
      category5Count: cat5,
      category4Count: cat4,
    },
    handoverItems: [],
    pendingCharts: [],
  };
}

