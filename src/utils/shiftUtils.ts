import { ShiftType, ShiftInfo } from '../types';

export const THAI_MONTH_MAP: Record<string, number> = {
  'มกราคม': 1, 'ม.ค.': 1, 'ม.ค': 1,
  'กุมภาพันธ์': 2, 'ก.พ.': 2, 'ก.พ': 2,
  'มีนาคม': 3, 'มี.ค.': 3, 'มี.ค': 3,
  'เมษายน': 4, 'เม.ย.': 4, 'เม.ย': 4,
  'พฤษภาคม': 5, 'พ.ค.': 5, 'พ.ค': 5,
  'มิถุนายน': 6, 'มิ.ย.': 6, 'มิ.ย': 6,
  'กรกฎาคม': 7, 'ก.ค.': 7, 'ก.ค': 7,
  'สิงหาคม': 8, 'ส.ค.': 8, 'ส.ค': 8,
  'กันยายน': 9, 'ก.ย.': 9, 'ก.ย': 9,
  'ตุลาคม': 10, 'ต.ค.': 10, 'ต.ค': 10,
  'พฤศจิกายน': 11, 'พ.ย.': 11, 'พ.ย': 11,
  'ธันวาคม': 12, 'ธ.ค.': 12, 'ธ.ค': 12,
};

export const ENG_MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * Returns year, month, day, hours, minutes in Thailand timezone (Asia/Bangkok, GMT+7)
 * to prevent date jumping ("เด้งวันที่") across time zones.
 */
export function getBangkokDateTimeParts(date: Date = new Date()): {
  day: number;
  month: number;
  year: number;
  hours: number;
  minutes: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let hours = date.getHours();
    let minutes = date.getMinutes();

    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      else if (p.type === 'month') month = parseInt(p.value, 10);
      else if (p.type === 'year') year = parseInt(p.value, 10);
      else if (p.type === 'hour') hours = parseInt(p.value, 10);
      else if (p.type === 'minute') minutes = parseInt(p.value, 10);
    }
    const thaiYear = year < 2400 ? year + 543 : year;
    return { day, month, year: thaiYear, hours, minutes };
  } catch {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return {
      day: d,
      month: m,
      year: y < 2400 ? y + 543 : y,
      hours: date.getHours(),
      minutes: date.getMinutes(),
    };
  }
}

/**
 * Parses any date format safely without time zone bouncing:
 * - Google Apps Script raw string: "Tue Aug 01 2569 00:00:00 GMT+0700 (中南半島時間)"
 * - Standard Thai format: "DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY"
 * - ISO string: "2026-09-13T09:29:49.158Z", "2026-08-01"
 * - Thai month words: "1 สิงหาคม 2569", "13 ก.ย. 2569"
 * - Embedded shift ID: "shift-afternoon-13-09-2569"
 */
export function parseThaiDate(dateInput: any): { day: number; month: number; year: number } {
  if (!dateInput) {
    const now = getBangkokDateTimeParts();
    return { day: now.day, month: now.month, year: now.year };
  }

  if (dateInput instanceof Date) {
    const parts = getBangkokDateTimeParts(dateInput);
    return { day: parts.day, month: parts.month, year: parts.year };
  }

  if (typeof dateInput !== 'string') {
    const now = getBangkokDateTimeParts();
    return { day: now.day, month: now.month, year: now.year };
  }

  const s = dateInput.trim();
  if (!s) {
    const now = getBangkokDateTimeParts();
    return { day: now.day, month: now.month, year: now.year };
  }

  // 1. Standard Thai format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2500;
    else if (year < 2400) year += 543;
    return { day, month, year };
  }

  // 2. English date strings (e.g. "Tue Aug 01 2569 00:00:00 GMT+0700 (中南半島時間)" or "01 Aug 2569")
  const engMatch =
    s.match(/([a-zA-Z]{3,9})\s+(\d{1,2})\s+(\d{4})/i) ||
    s.match(/(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})/i);
  if (engMatch) {
    let mStr = '';
    let day = 0;
    let year = 0;
    if (isNaN(Number(engMatch[1]))) {
      mStr = engMatch[1].toLowerCase();
      day = parseInt(engMatch[2], 10);
      year = parseInt(engMatch[3], 10);
    } else {
      day = parseInt(engMatch[1], 10);
      mStr = engMatch[2].toLowerCase();
      year = parseInt(engMatch[3], 10);
    }
    const month = ENG_MONTH_MAP[mStr];
    if (month && day && year) {
      if (year < 2400) year += 543;
      return { day, month, year };
    }
  }

  // 3. Thai month format (e.g. "1 สิงหาคม 2569" or "13 ก.ย. 2569")
  for (const [mName, mNum] of Object.entries(THAI_MONTH_MAP)) {
    if (s.includes(mName)) {
      const parts = s.replace(mName, ' ').trim().split(/\s+/);
      if (parts.length >= 2) {
        const day = parseInt(parts[0], 10);
        let year = parseInt(parts[1], 10);
        if (day && year) {
          if (year < 2400) year += 543;
          return { day, month: mNum, year };
        }
      }
    }
  }

  // 4. ISO format YYYY-MM-DD (e.g. 2026-08-01 or 2026-09-13T09:29:49.158Z)
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    // If ISO with time in UTC (e.g. ends with Z), convert using Bangkok timezone (+7)
    if (s.includes('T') && s.includes('Z')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const p = getBangkokDateTimeParts(d);
        return { day: p.day, month: p.month, year: p.year };
      }
    }
    if (year < 2400) year += 543;
    return { day, month, year };
  }

  // 5. Check if string contains DD-MM-YYYY pattern anywhere (e.g. in shift ID "shift-afternoon-13-09-2569")
  const embeddedMatch = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (embeddedMatch) {
    let day = parseInt(embeddedMatch[1], 10);
    let month = parseInt(embeddedMatch[2], 10);
    let year = parseInt(embeddedMatch[3], 10);
    if (year < 2400) year += 543;
    return { day, month, year };
  }

  const fallback = getBangkokDateTimeParts();
  return { day: fallback.day, month: fallback.month, year: fallback.year };
}

/**
 * Normalizes any date representation into standard clean Thai Buddhist date string: "DD/MM/YYYY"
 * Example:
 * - "Tue Aug 01 2569 00:00:00 GMT+0700 (中南半島時間)" -> "01/08/2569"
 * - "13-09-2569" -> "13/09/2569"
 * - "2026-08-01" -> "01/08/2569"
 */
export function normalizeThaiDate(dateInput: any): string {
  if (!dateInput) {
    const now = getBangkokDateTimeParts();
    return formatThaiDate(now.day, now.month, now.year);
  }
  const { day, month, year } = parseThaiDate(dateInput);
  return formatThaiDate(day, month, year);
}

export const getThaiDateDisplay = normalizeThaiDate;

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
 * 1. ดึก 24:00–08:00 (preceding is บ่าย of yesterday)
 * 2. เช้า 08:00–16:00 (preceding is ดึก of today)
 * 3. บ่าย 16:00–24:00 (preceding is เช้า of today)
 *
 * Rules:
 * - Carry-forward ต้องดึงจากเวรก่อนหน้าตามลำดับเวลาเท่านั้น
 * - ห้ามดึงข้อมูลจากเวรที่ไม่เกี่ยวข้อง
 * - ห้ามใช้ข้อมูลจากวันที่อื่นเป็นค่าเริ่มต้น
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

  // 2. Search for exact chronological match only
  const exactMatch = filtered.find(
    (s) => s.shiftType === prevType && isSameThaiDate(s.date, prevDate)
  );
  if (exactMatch) return exactMatch;

  // Do NOT fallback to random or unrelated dates/shifts
  return null;
}

/**
 * Returns current date in Thai format (DD/MM/YYYY) and current shift based on Bangkok (GMT+7) local time
 */
export function getCurrentThaiDateAndShift(): {
  date: string;
  shiftType: ShiftType;
  timeStr: string;
  isoDate: string;
} {
  const bkk = getBangkokDateTimeParts();
  const date = formatThaiDate(bkk.day, bkk.month, bkk.year);

  const hours = bkk.hours;
  let shiftType: ShiftType = 'เวรเช้า';
  if (hours >= 0 && hours < 8) {
    shiftType = 'เวรดึก';
  } else if (hours >= 8 && hours < 16) {
    shiftType = 'เวรเช้า';
  } else {
    shiftType = 'เวรบ่าย';
  }

  const minutes = String(bkk.minutes).padStart(2, '0');
  const timeStr = `${date} ${String(hours).padStart(2, '0')}:${minutes} น.`;

  return { date, shiftType, timeStr, isoDate: new Date().toISOString() };
}

/**
 * Creates a new active shift object for the current day and shift period
 */
export function createCurrentLiveShift(latestHistoryShift?: ShiftInfo): ShiftInfo {
  const { date, shiftType, timeStr, isoDate } = getCurrentThaiDateAndShift();
  const shiftSlug = shiftType === 'เวรดึก' ? 'night' : shiftType === 'เวรเช้า' ? 'morning' : 'afternoon';
  const id = `shift-${shiftSlug}-${date.replace(/\//g, '-')}`;

  const prev = getPreviousShift(shiftType, date);
  const isPreceding = Boolean(
    latestHistoryShift &&
    latestHistoryShift.shiftType === prev.prevType &&
    isSameThaiDate(latestHistoryShift.date, prev.prevDate)
  );

  const prevInfo = isPreceding && latestHistoryShift
    ? `${latestHistoryShift.shiftType} (${latestHistoryShift.date})`
    : `${prev.prevType} (${prev.prevDate})`;

  const carriedOver = isPreceding && latestHistoryShift?.stats?.currentRemaining !== undefined
    ? latestHistoryShift.stats.currentRemaining
    : 0;
  const cat5 = isPreceding && latestHistoryShift?.stats?.category5Count !== undefined
    ? latestHistoryShift.stats.category5Count
    : 0;
  const cat4 = isPreceding && latestHistoryShift?.stats?.category4Count !== undefined
    ? latestHistoryShift.stats.category4Count
    : 0;

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

