/**
 * ==============================================================================
 * SICU1 Incharge Nurse - Google Apps Script Web API Backend
 * ==============================================================================
 * สถาปัตยกรรม:
 * SICU Incharge Nurse Web App -> Google Apps Script Web API -> Google Sheets
 *
 * แหล่งจัดเก็บข้อมูลจริงเพียงแห่งเดียว: Google Sheets (Google Spreadsheet)
 * ไม่ใช้ Firebase, Firestore, SQLite, หรือ Cloud SQL ใดๆ ทั้งสิ้น
 *
 * โครงสร้าง 10 Sheet มาตรฐานใน Google Spreadsheet:
 * 1. Summary_CurrentShift: ข้อมูลสรุปสถานะเวรปัจจุบัน ยอดผู้ป่วย สถิติ และ Snapshot วอร์ด
 * 2. staff: รายชื่อพยาบาลและเจ้าหน้าที่ประจำวอร์ด
 * 3. Doctor staff: รายชื่อแพทย์เจ้าของไข้
 * 4. Shifts_History: บันทึกประวัติเวรทั้งหมดอย่างละเอียด พร้อมคอลัมน์ JSON สำรอง
 * 5. Handovers: รายการเรื่องส่งต่อระหว่างเวรที่กำลังดำเนินการ (Active Handovers)
 * 6. Pending_Charts: รายการชาร์ตค้าง สถานะ และจำนวนวันค้าง
 * 7. Equipment_Log / Equipment_Wean_Log: บันทึกการใช้อุปกรณ์และการหย่าเครื่องช่วยหายใจ
 * 8. Movement_Records: รายการรับใหม่ ย้ายเข้า ย้ายออก เสียชีวิต
 * 9. Consultations: รายการ Consult แพทย์เฉพาะทาง
 * 10. Incidents_Risk_Log: รายการอุบัติการณ์และความเสี่ยงทางคลินิก
 * (พร้อม Handover_History, Valuable_Items, และ Settings เพื่อความสมบูรณ์แบบของระบบ)
 * ==============================================================================
 */

var SHEET_NAMES = {
  SUMMARY_CURRENT_SHIFT: 'Summary_CurrentShift', // ข้อมูลสรุปสถานะเวรปัจจุบัน
  STAFF: 'staff',                               // รายชื่อพยาบาลและเจ้าหน้าที่
  DOCTOR_STAFF: 'Doctor staff',                 // รายชื่อแพทย์เจ้าของไข้
  SHIFTS_HISTORY: 'Shifts_History',             // บันทึกประวัติเวรทั้งหมด
  HANDOVERS: 'Handovers',                       // เรื่องส่งต่อระหว่างเวร
  PENDING_CHARTS: 'Pending_Charts',             // รายการชาร์ตค้าง
  EQUIPMENT_LOG: 'Equipment_Log',               // บันทึกการใช้อุปกรณ์
  EQUIPMENT_WEAN_LOG: 'Equipment_Wean_Log',     // บันทึกการหย่าเครื่องช่วยหายใจ
  MOVEMENT_RECORDS: 'Movement_Records',         // รับใหม่ ย้ายเข้า ย้ายออก เสียชีวิต
  CONSULTATIONS: 'Consultations',               // รายการ Consult
  INCIDENTS_RISK_LOG: 'Incidents_Risk_Log',     // อุบัติการณ์และความเสี่ยง
  HANDOVER_HISTORY: 'Handover_History',         // ประวัติการส่งต่อที่เก็บถาวร
  VALUABLE_ITEMS: 'Valuable_Items',             // บันทึกทรัพย์สินมีค่าผู้ป่วย
  SETTINGS: 'Settings',                         // การตั้งค่าระบบวอร์ด
  // ชื่อเดิมสำหรับรองรับย้อนหลัง (Backward Compatibility)
  ACTIVE_SHIFT: 'Summary_CurrentShift',
  NURSES: 'staff',
  HANDOVER_ITEMS: 'Handovers'
};

var DEFAULT_NURSES = [
  'นัฐกร จันทร์ฟ้าเลื่อม',
  'ธิดาพร เท้งสี',
  'ชมพูนุท เล็งสาย',
  'สุพรรณษา คุ้มครอง',
  'เกศินี กำเนิดรัตน์',
  'วิมลมาศ สุโกมล',
  'จุฑารัตน์ คุณานุศาสน์',
  'สุรีรัตน์ ชาสมบัติ',
  'ปิยพร ธีรศิลป์',
  'สัจจพร งามยิ่งยศ'
];

var DEFAULT_DOCTORS = [
  'นพ.ธีระพงษ์ (General Surgery)',
  'พญ.กานต์พิชชา (Cardiovascular Surgery)',
  'นพ.วรวิทย์ (Neurosurgery)',
  'พญ.สุชาดา (Trauma / Critical Care)',
  'นพ.อัครเดช (Orthopedics)',
  'นพ.อนุชา (Thoracic Surgery)',
  'พญ.นลินี (Surgical ICU Fellow)',
  'นพ.พงศกร (Pediatric Surgery)'
];

/**
 * Handle GET Requests
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'ping';
    var result;

    if (action === 'ping') {
      result = handlePing();
    } else if (action === 'getState') {
      result = handleGetState();
    } else if (action === 'getAllData') {
      result = handleGetAllData();
    } else if (action === 'getShifts' || action === 'getHistory') {
      result = handleGetShifts();
    } else if (action === 'getStaff' || action === 'getNurses') {
      result = handleGetStaff();
    } else if (action === 'getDoctorStaff') {
      result = handleGetDoctorStaff();
    } else if (action === 'getHandoverItems' || action === 'getHandovers') {
      result = handleGetHandoverItems();
    } else if (action === 'getHandoverHistory') {
      result = handleGetHandoverHistory();
    } else if (action === 'getPendingCharts') {
      result = handleGetPendingCharts();
    } else if (action === 'getMovementRecords') {
      result = handleGetMovementRecords();
    } else if (action === 'getConsultations') {
      result = handleGetConsultations();
    } else if (action === 'getIncidents') {
      result = handleGetIncidents();
    } else if (action === 'getValuableItems') {
      result = handleGetValuableItems();
    } else if (action === 'getSettings') {
      result = handleGetSettings();
    } else if (action === 'initSheets' || action === 'setupSheets') {
      result = handleInitSheets();
    } else if (action === 'resetAllData' || action === 'clearAllData') {
      result = handleResetAllData();
    } else {
      result = handleGetState();
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString(), stack: error.stack });
  }
}

/**
 * Handle POST Requests
 */
function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || 'getAllData';
    var result;

    if (action === 'ping') {
      result = handlePing();
    } else if (action === 'getState') {
      result = handleGetState();
    } else if (action === 'getAllData') {
      result = handleGetAllData();
    } else if (action === 'saveShift') {
      result = handleSaveShift(payload);
    } else if (action === 'deleteShift') {
      result = handleDeleteShift(payload);
    } else if (action === 'saveHandoverItem') {
      result = handleSaveHandoverItem(payload);
    } else if (action === 'deleteHandoverItem') {
      result = handleDeleteHandoverItem(payload);
    } else if (action === 'archiveHandoverItem') {
      result = handleArchiveHandoverItem(payload);
    } else if (action === 'saveHandovers') {
      result = handleSaveHandovers(payload.handoverItems || []);
    } else if (action === 'savePendingChart') {
      result = handleSavePendingChart(payload);
    } else if (action === 'deletePendingChart') {
      result = handleDeletePendingChart(payload);
    } else if (action === 'savePendingCharts') {
      result = handleSavePendingCharts(payload.pendingCharts || []);
    } else if (action === 'saveStaff' || action === 'saveNurses') {
      result = handleSaveStaff(payload);
    } else if (action === 'saveDoctorStaff') {
      result = handleSaveDoctorStaff(payload);
    } else if (action === 'saveMovementRecord') {
      result = handleSaveMovementRecord(payload);
    } else if (action === 'saveConsultation') {
      result = handleSaveConsultation(payload);
    } else if (action === 'saveIncident') {
      result = handleSaveIncident(payload);
    } else if (action === 'saveValuableItem') {
      result = handleSaveValuableItem(payload);
    } else if (action === 'deleteValuableItem') {
      result = handleDeleteValuableItem(payload);
    } else if (action === 'saveState') {
      result = handleSaveState(payload);
    } else if (action === 'saveSettings') {
      result = handleSaveSettings(payload.settings || {});
    } else if (action === 'initSheets') {
      result = handleInitSheets();
    } else if (action === 'resetAllData' || action === 'clearAllData') {
      result = handleResetAllData();
    } else {
      result = { success: false, error: 'Unknown POST action: ' + action };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString(), stack: error.stack });
  }
}

/**
 * Helper: Send JSON Response
 */
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Helper: getOrCreateSheet()
 * ตรวจสอบและสร้างชีตพร้อมหัวตารางภาษาไทย/อังกฤษตามมาตรฐานอัตโนมัติหากยังไม่มีชีตนั้นๆ อยู่
 */
function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  // ตรวจสอบ alias ย้อนหลังหากชื่อใหม่ยังไม่มี
  if (!sheet) {
    if (sheetName === SHEET_NAMES.SUMMARY_CURRENT_SHIFT) {
      sheet = ss.getSheetByName('Active_Shift');
    } else if (sheetName === SHEET_NAMES.STAFF) {
      sheet = ss.getSheetByName('Nurses');
    } else if (sheetName === SHEET_NAMES.HANDOVERS) {
      sheet = ss.getSheetByName('Handover_Items');
    }
  }

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#004d40')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * สร้างและจัดโครงสร้าง 10 Sheet มาตรฐานทั้งหมดใน Google Spreadsheet ทันที
 */
function handleInitSheets() {
  var created = [];

  // 1. Summary_CurrentShift
  getOrCreateSheet(SHEET_NAMES.SUMMARY_CURRENT_SHIFT, [
    'shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo', 'isActive',
    'carriedOver', 'currentRemaining', 'ventilatorCount', 'category5Count', 'category4Count',
    'oxygenCount', 'postOpCount', 'createdAt', 'updatedAt', 'fullDataJson'
  ]);
  created.push(SHEET_NAMES.SUMMARY_CURRENT_SHIFT);

  // 2. staff
  var staffSheet = getOrCreateSheet(SHEET_NAMES.STAFF, [
    'id', 'name', 'role', 'status', 'phone', 'notes', 'updatedAt'
  ]);
  if (staffSheet.getLastRow() < 2) {
    for (var i = 0; i < DEFAULT_NURSES.length; i++) {
      staffSheet.appendRow(['staff-' + (i + 1), DEFAULT_NURSES[i], 'RN พยาบาลวิชาชีพ', 'ปฏิบัติงาน', '', '', new Date().toISOString()]);
    }
  }
  created.push(SHEET_NAMES.STAFF);

  // 3. Doctor staff
  var docSheet = getOrCreateSheet(SHEET_NAMES.DOCTOR_STAFF, [
    'id', 'name', 'department', 'specialty', 'phone', 'status', 'updatedAt'
  ]);
  if (docSheet.getLastRow() < 2) {
    for (var d = 0; d < DEFAULT_DOCTORS.length; d++) {
      docSheet.appendRow(['doc-' + (d + 1), DEFAULT_DOCTORS[d], 'ศัลยศาสตร์', 'Surgical Staff', '', 'ประจำการ', new Date().toISOString()]);
    }
  }
  created.push(SHEET_NAMES.DOCTOR_STAFF);

  // 4. Shifts_History
  getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY, [
    'shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo',
    'carriedOver', 'transferredIn', 'admittedNew', 'transferredOut', 'againstAdvice',
    'deceased', 'deceasedPostOp24Hr', 'admitDischarge24Hr', 'referOut', 'currentRemaining',
    'category5Count', 'category4Count', 'ventilatorCount', 'oxygenCount', 'postOpCount',
    'staffHead', 'staffRn', 'staffNa', 'staffClerk', 'staffTotal',
    'weanVentilator', 'weanFoley', 'weanPeripheral', 'weanCentral', 'weanAssess', 'weanAttempt', 'weanSuccess',
    'consultTotal', 'incidentCount', 'fullDataJson', 'createdAt', 'updatedAt'
  ]);
  created.push(SHEET_NAMES.SHIFTS_HISTORY);

  // 5. Handovers
  getOrCreateSheet(SHEET_NAMES.HANDOVERS, [
    'id', 'title', 'details', 'patientName', 'bedNumber', 'priority', 'category', 'createdBy', 'createdAt', 'shiftId', 'isCompleted', 'updatedAt'
  ]);
  created.push(SHEET_NAMES.HANDOVERS);

  // 6. Pending_Charts
  getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS, [
    'id', 'patientName', 'hn', 'doctors', 'location', 'dateAdded', 'daysPending', 'note', 'shiftId', 'status', 'updatedAt'
  ]);
  created.push(SHEET_NAMES.PENDING_CHARTS);

  // 7. Equipment_Log / Equipment_Wean_Log
  getOrCreateSheet(SHEET_NAMES.EQUIPMENT_LOG, [
    'id', 'shiftId', 'date', 'shiftType', 'inchargeName', 'ventilatorCount', 'foleyCatheter', 'peripheralLine', 'centralLine', 'weanAssess', 'weanAttempt', 'weanSuccess', 'notes', 'createdAt'
  ]);
  getOrCreateSheet(SHEET_NAMES.EQUIPMENT_WEAN_LOG, [
    'id', 'shiftId', 'date', 'shiftType', 'inchargeName', 'ventilatorUse', 'foleyCatheter', 'peripheralLine', 'centralLine', 'weanAssess', 'weanAttempt', 'weanSuccess', 'notes', 'createdAt'
  ]);
  created.push(SHEET_NAMES.EQUIPMENT_LOG);

  // 8. Movement_Records
  getOrCreateSheet(SHEET_NAMES.MOVEMENT_RECORDS, [
    'id', 'shiftId', 'date', 'shiftType', 'type', 'patientName', 'hn', 'bedNumber', 'wardOrHospital', 'time', 'details', 'createdAt'
  ]);
  created.push(SHEET_NAMES.MOVEMENT_RECORDS);

  // 9. Consultations
  getOrCreateSheet(SHEET_NAMES.CONSULTATIONS, [
    'id', 'shiftId', 'date', 'shiftType', 'department', 'doctorName', 'patientName', 'hn', 'reason', 'status', 'urgent', 'createdAt'
  ]);
  created.push(SHEET_NAMES.CONSULTATIONS);

  // 10. Incidents_Risk_Log
  getOrCreateSheet(SHEET_NAMES.INCIDENTS_RISK_LOG, [
    'id', 'shiftId', 'date', 'shiftType', 'category', 'severityLevel', 'description', 'patientName', 'hn', 'immediateAction', 'reportedBy', 'createdAt'
  ]);
  created.push(SHEET_NAMES.INCIDENTS_RISK_LOG);

  // Complementary Sheets
  getOrCreateSheet(SHEET_NAMES.HANDOVER_HISTORY, [
    'id', 'source_handover_id', 'title', 'details', 'patientName', 'bedNumber', 'priority', 'category', 'createdBy', 'createdAt', 'shiftId', 'isCompleted', 'archivedAt', 'archivedBy', 'archiveReason'
  ]);
  getOrCreateSheet(SHEET_NAMES.VALUABLE_ITEMS, [
    'id', 'patientName', 'hn', 'bedNumber', 'itemDescription', 'custodian', 'receiver', 'status', 'dateAdded', 'notes', 'shiftId', 'createdAt', 'updatedAt'
  ]);
  getOrCreateSheet(SHEET_NAMES.SETTINGS, ['key', 'value', 'updatedAt']);

  return { success: true, message: 'All standard ward sheets initialized successfully', sheets: created };
}

/**
 * Ping Connection Test
 */
function handlePing() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().map(function(s) { return s.getName(); });
  return {
    success: true,
    status: 'connected',
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    sheets: sheets,
    timestamp: new Date().toISOString(),
    message: 'SICU1 Incharge Nurse Google Sheets Backend is ONLINE'
  };
}

/**
 * Get Active State
 */
function handleGetState() {
  var summarySheet = getOrCreateSheet(SHEET_NAMES.SUMMARY_CURRENT_SHIFT);
  var activeShift = null;
  var patientStats = null;

  var lastRow = summarySheet.getLastRow();
  if (lastRow >= 2) {
    var rowValues = summarySheet.getRange(2, 1, 1, summarySheet.getLastColumn()).getValues()[0];
    var shiftId = String(rowValues[0] || '').trim();
    if (shiftId) {
      var jsonCol = rowValues.length >= 16 ? rowValues[15] : '';
      if (jsonCol && typeof jsonCol === 'string' && jsonCol.charAt(0) === '{') {
        try {
          activeShift = JSON.parse(jsonCol);
          if (activeShift && activeShift.stats) patientStats = activeShift.stats;
        } catch (e) {}
      }

      if (!activeShift) {
        activeShift = {
          id: shiftId,
          date: String(rowValues[1] || ''),
          shiftType: String(rowValues[2] || ''),
          inchargeName: String(rowValues[3] || ''),
          previousShiftInfo: String(rowValues[4] || ''),
          isActive: Boolean(rowValues[5]),
          stats: {
            carriedOver: Number(rowValues[6]) || 0,
            currentRemaining: Number(rowValues[7]) || 0,
            ventilatorCount: Number(rowValues[8]) || 0,
            category5Count: Number(rowValues[9]) || 0,
            category4Count: Number(rowValues[10]) || 0,
            oxygenCount: Number(rowValues[11]) || 0,
            postOpCount: Number(rowValues[12]) || 0
          }
        };
        patientStats = activeShift.stats;
      }
    }
  }

  var handoversRes = handleGetHandoverItems();
  var pendingChartsRes = handleGetPendingCharts();
  var staffRes = handleGetStaff();
  var doctorRes = handleGetDoctorStaff();
  var settingsRes = handleGetSettings();

  return {
    success: true,
    activeShift: activeShift,
    patientStats: patientStats,
    handoverItems: handoversRes.handoverItems || [],
    pendingCharts: pendingChartsRes.pendingCharts || [],
    staff: staffRes.staff || [],
    nurses: staffRes.nurses || [],
    doctors: doctorRes.doctors || [],
    settings: settingsRes.settings || {},
    timestamp: new Date().toISOString()
  };
}

/**
 * Get All Data Central Bundle
 */
function handleGetAllData() {
  var stateRes = handleGetState();
  var shiftsRes = handleGetShifts();
  var valuableRes = handleGetValuableItems();
  var handoverHistoryRes = handleGetHandoverHistory();

  return {
    success: true,
    activeShift: stateRes.activeShift,
    patientStats: stateRes.patientStats,
    shifts: shiftsRes.shifts || [],
    staff: stateRes.staff || [],
    nurses: stateRes.nurses || [],
    doctors: stateRes.doctors || [],
    handoverItems: stateRes.handoverItems || [],
    pendingCharts: stateRes.pendingCharts || [],
    valuableItems: valuableRes.valuableItems || [],
    handoverHistory: handoverHistoryRes.handoverHistory || [],
    settings: stateRes.settings || {},
    timestamp: new Date().toISOString()
  };
}

/**
 * Shifts History
 */
function handleGetShifts() {
  var sheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, shifts: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var shifts = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var shiftId = String(row[0] || '').trim();
    if (!shiftId) continue;

    var fullJson = row.length >= 35 ? row[34] : '';
    var shiftObj = null;
    if (fullJson && typeof fullJson === 'string' && fullJson.charAt(0) === '{') {
      try { shiftObj = JSON.parse(fullJson); } catch (e) {}
    }

    if (!shiftObj) {
      shiftObj = {
        id: shiftId,
        date: String(row[1] || ''),
        shiftType: String(row[2] || ''),
        inchargeName: String(row[3] || ''),
        previousShiftInfo: String(row[4] || ''),
        stats: {
          carriedOver: Number(row[5]) || 0,
          transferredIn: Number(row[6]) || 0,
          admittedNew: Number(row[7]) || 0,
          transferredOut: Number(row[8]) || 0,
          againstAdvice: Number(row[9]) || 0,
          deceased: Number(row[10]) || 0,
          deceasedPostOp24Hr: Number(row[11]) || 0,
          admitDischarge24Hr: Number(row[12]) || 0,
          referOut: Number(row[13]) || 0,
          currentRemaining: Number(row[14]) || 0,
          category5Count: Number(row[15]) || 0,
          category4Count: Number(row[16]) || 0,
          ventilatorCount: Number(row[17]) || 0,
          oxygenCount: Number(row[18]) || 0,
          postOpCount: Number(row[19]) || 0
        }
      };
    }
    shifts.push(shiftObj);
  }

  return { success: true, shifts: shifts };
}

function handleSaveShift(payload) {
  var shift = payload.shift || payload.currentShift;
  if (!shift || !shift.id) return { success: false, error: 'Missing shift.id' };

  var historySheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY);
  var stats = shift.stats || {};
  var staff = shift.staffData || {};
  var wean = shift.equipmentWeanData || {};

  var row = [
    shift.id,
    shift.date || '',
    shift.shiftType || '',
    shift.inchargeName || '',
    shift.previousShiftInfo || '',
    Number(stats.carriedOver) || 0,
    Number(stats.transferredIn) || 0,
    Number(stats.admittedNew) || 0,
    Number(stats.transferredOut) || 0,
    Number(stats.againstAdvice) || 0,
    Number(stats.deceased) || 0,
    Number(stats.deceasedPostOp24Hr) || 0,
    Number(stats.admitDischarge24Hr) || 0,
    Number(stats.referOut) || 0,
    Number(stats.currentRemaining) || 0,
    Number(stats.category5Count) || 0,
    Number(stats.category4Count) || 0,
    Number(stats.ventilatorCount) || 0,
    Number(stats.oxygenCount) || 0,
    Number(stats.postOpCount) || 0,
    Number(staff.headCount) || 0,
    Number(staff.rnCount) || 0,
    Number(staff.naCount) || 0,
    Number(staff.clerkCount) || 0,
    Number(staff.totalStaff) || 0,
    Number(wean.ventilatorUse) || 0,
    Number(wean.foleyCatheter) || 0,
    Number(wean.peripheralLine) || 0,
    Number(wean.centralLine) || 0,
    Number(wean.weanAssess) || 0,
    Number(wean.weanAttempt) || 0,
    Number(wean.weanSuccess) || 0,
    Number(shift.consultationData ? shift.consultationData.totalCount : 0) || 0,
    Number(shift.incidentData ? (shift.incidentData.details ? 1 : 0) : 0),
    JSON.stringify(shift),
    shift.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];

  var lastRow = historySheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var ids = historySheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(shift.id)) { foundRow = i + 2; break; }
    }
  }

  if (foundRow > 0) {
    historySheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    historySheet.appendRow(row);
  }

  // Also update Summary_CurrentShift if active
  if (shift.isActive !== false) {
    var summarySheet = getOrCreateSheet(SHEET_NAMES.SUMMARY_CURRENT_SHIFT);
    var sumRow = [
      shift.id, shift.date || '', shift.shiftType || '', shift.inchargeName || '', shift.previousShiftInfo || '', true,
      Number(stats.carriedOver) || 0, Number(stats.currentRemaining) || 0, Number(stats.ventilatorCount) || 0,
      Number(stats.category5Count) || 0, Number(stats.category4Count) || 0, Number(stats.oxygenCount) || 0, Number(stats.postOpCount) || 0,
      shift.createdAt || new Date().toISOString(), new Date().toISOString(), JSON.stringify(shift)
    ];
    var sLast = summarySheet.getLastRow();
    if (sLast >= 2) summarySheet.getRange(2, 1, sLast - 1, summarySheet.getLastColumn()).clearContent();
    summarySheet.getRange(2, 1, 1, sumRow.length).setValues([sumRow]);
  }

  return { success: true, message: 'Shift saved', shiftId: shift.id };
}

function handleDeleteShift(payload) {
  var shiftId = payload.shiftId || payload.id;
  if (!shiftId) return { success: false, error: 'Missing shiftId' };

  var sheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true };

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(shiftId)) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
  return { success: true, message: 'Shift deleted' };
}

/**
 * Handovers
 */
function handleGetHandoverItems() {
  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, handoverItems: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var items = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;
    items.push({
      id: id,
      title: String(row[1] || ''),
      details: String(row[2] || ''),
      patientName: String(row[3] || ''),
      bedNumber: String(row[4] || ''),
      priority: String(row[5] || 'normal'),
      category: String(row[6] || 'general'),
      createdBy: String(row[7] || ''),
      createdAt: String(row[8] || ''),
      shiftId: String(row[9] || ''),
      isCompleted: Boolean(row[10]),
      updatedAt: String(row[11] || '')
    });
  }
  return { success: true, handoverItems: items };
}

function handleSaveHandoverItem(payload) {
  var item = payload.item || payload;
  if (!item || !item.id) return { success: false, error: 'Missing handover item id' };

  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVERS);
  var row = [
    item.id, item.title || '', item.details || '', item.patientName || '', item.bedNumber || '',
    item.priority || 'normal', item.category || 'general', item.createdBy || '', item.createdAt || new Date().toISOString(),
    item.shiftId || '', Boolean(item.isCompleted), new Date().toISOString()
  ];

  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(item.id)) { foundRow = i + 2; break; }
    }
  }

  if (foundRow > 0) sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);

  return { success: true, item: item, message: 'Handover item saved' };
}

function handleDeleteHandoverItem(payload) {
  var id = payload.id || payload.itemId;
  if (!id) return { success: false, error: 'Missing id' };

  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true };

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
  return { success: true, message: 'Handover item deleted' };
}

function handleArchiveHandoverItem(payload) {
  var id = payload.id || payload.itemId;
  if (!id) return { success: false, error: 'Missing id' };

  var activeSheet = getOrCreateSheet(SHEET_NAMES.HANDOVERS);
  var lastRow = activeSheet.getLastRow();
  if (lastRow < 2) return { success: true };

  var ids = activeSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      var rowData = activeSheet.getRange(i + 2, 1, 1, activeSheet.getLastColumn()).getValues()[0];
      var archiveSheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_HISTORY);
      var archiveRow = [
        'arch-' + Date.now(), rowData[0], rowData[1], rowData[2], rowData[3], rowData[4],
        rowData[5], rowData[6], rowData[7], rowData[8], rowData[9], true,
        new Date().toISOString(), payload.archivedBy || 'Incharge Nurse', payload.archiveReason || 'ส่งต่อเรียบร้อยแล้ว'
      ];
      archiveSheet.appendRow(archiveRow);
      activeSheet.deleteRow(i + 2);
      return { success: true, source_handover_id: id };
    }
  }
  return { success: true };
}

function handleSaveHandovers(items) {
  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVERS);
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  if (!items || items.length === 0) return { success: true, count: 0 };

  var rows = items.map(function(item) {
    return [
      item.id || '', item.title || '', item.details || '', item.patientName || '', item.bedNumber || '',
      item.priority || 'normal', item.category || 'general', item.createdBy || '', item.createdAt || new Date().toISOString(),
      item.shiftId || '', Boolean(item.isCompleted), new Date().toISOString()
    ];
  });
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return { success: true, count: rows.length };
}

function handleGetHandoverHistory() {
  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_HISTORY);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, handoverHistory: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var history = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    history.push({
      id: r[0],
      source_handover_id: r[1],
      title: r[2],
      details: r[3],
      patientName: r[4],
      bedNumber: r[5],
      priority: r[6],
      category: r[7],
      createdBy: r[8],
      createdAt: r[9],
      shiftId: r[10],
      isCompleted: Boolean(r[11]),
      archivedAt: r[12],
      archivedBy: r[13],
      archiveReason: r[14]
    });
  }
  return { success: true, handoverHistory: history };
}

/**
 * Pending Charts
 */
function handleGetPendingCharts() {
  var sheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, pendingCharts: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var charts = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;

    var doctors = [];
    try {
      var dJson = row[3];
      doctors = (typeof dJson === 'string' && dJson.charAt(0) === '[') ? JSON.parse(dJson) : (dJson ? [dJson] : []);
    } catch (e) {
      doctors = row[3] ? [String(row[3])] : [];
    }

    charts.push({
      id: id,
      patientName: String(row[1] || ''),
      hn: String(row[2] || ''),
      doctors: doctors,
      location: String(row[4] || 'SICU 1'),
      dateAdded: String(row[5] || ''),
      daysPending: Number(row[6]) || 1,
      note: String(row[7] || ''),
      shiftId: String(row[8] || ''),
      status: String(row[9] || 'pending'),
      updatedAt: String(row[10] || '')
    });
  }
  return { success: true, pendingCharts: charts };
}

function handleSavePendingChart(payload) {
  var chart = payload.chart || payload;
  if (!chart || !chart.id) return { success: false, error: 'Missing chart id' };

  var sheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS);
  var row = [
    chart.id, chart.patientName || '', chart.hn || '', JSON.stringify(chart.doctors || []),
    chart.location || 'SICU 1', chart.dateAdded || '', Number(chart.daysPending) || 1,
    chart.note || '', chart.shiftId || '', chart.status || 'pending', new Date().toISOString()
  ];

  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(chart.id)) { foundRow = i + 2; break; }
    }
  }

  if (foundRow > 0) sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);

  return { success: true, chart: chart, message: 'Pending chart saved' };
}

function handleDeletePendingChart(payload) {
  var id = payload.id || payload.chartId;
  if (!id) return { success: false, error: 'Missing chart id' };

  var sheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true };

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
  return { success: true, message: 'Pending chart deleted' };
}

function handleSavePendingCharts(charts) {
  var sheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS);
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  if (!charts || charts.length === 0) return { success: true, count: 0 };

  var rows = charts.map(function(chart) {
    return [
      chart.id || '', chart.patientName || '', chart.hn || '', JSON.stringify(chart.doctors || []),
      chart.location || 'SICU 1', chart.dateAdded || '', Number(chart.daysPending) || 1,
      chart.note || '', chart.shiftId || '', chart.status || 'pending', new Date().toISOString()
    ];
  });
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return { success: true, count: rows.length };
}

/**
 * Staff & Nurses
 */
function handleGetStaff() {
  var sheet = getOrCreateSheet(SHEET_NAMES.STAFF);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, staff: [], nurses: DEFAULT_NURSES };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var staffList = [];
  var nurseNames = [];

  for (var i = 0; i < data.length; i++) {
    var name = String(data[i][1] || '').trim();
    if (name) {
      staffList.push({
        id: data[i][0] || ('staff-' + (i + 1)),
        name: name,
        role: data[i][2] || 'RN',
        status: data[i][3] || 'active',
        phone: data[i][4] || '',
        notes: data[i][5] || ''
      });
      nurseNames.push(name);
    }
  }

  return { success: true, staff: staffList, nurses: nurseNames.length > 0 ? nurseNames : DEFAULT_NURSES };
}

function handleSaveStaff(payload) {
  var sheet = getOrCreateSheet(SHEET_NAMES.STAFF);
  var staff = payload.staff || payload.nurses || [];
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();

  if (Array.isArray(staff) && staff.length > 0) {
    var rows = staff.map(function(item, idx) {
      if (typeof item === 'string') {
        return ['staff-' + (idx + 1), item, 'RN พยาบาลวิชาชีพ', 'ปฏิบัติงาน', '', '', new Date().toISOString()];
      }
      return [
        item.id || ('staff-' + (idx + 1)), item.name || '', item.role || 'RN',
        item.status || 'active', item.phone || '', item.notes || '', new Date().toISOString()
      ];
    });
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  return { success: true, count: staff.length };
}

/**
 * Doctor Staff
 */
function handleGetDoctorStaff() {
  var sheet = getOrCreateSheet(SHEET_NAMES.DOCTOR_STAFF);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, doctors: DEFAULT_DOCTORS };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var doctors = [];
  for (var i = 0; i < data.length; i++) {
    var name = String(data[i][1] || '').trim();
    if (name) doctors.push(name);
  }
  return { success: true, doctors: doctors.length > 0 ? doctors : DEFAULT_DOCTORS };
}

function handleSaveDoctorStaff(payload) {
  var sheet = getOrCreateSheet(SHEET_NAMES.DOCTOR_STAFF);
  var doctors = payload.doctors || [];
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();

  if (Array.isArray(doctors) && doctors.length > 0) {
    var rows = doctors.map(function(doc, idx) {
      var name = typeof doc === 'string' ? doc : (doc.name || '');
      return ['doc-' + (idx + 1), name, 'ศัลยศาสตร์', 'Surgical Staff', '', 'ประจำการ', new Date().toISOString()];
    });
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  return { success: true, count: doctors.length };
}

/**
 * Movement Records (รับใหม่ ย้ายเข้า ย้ายออก เสียชีวิต)
 */
function handleGetMovementRecords() {
  var sheet = getOrCreateSheet(SHEET_NAMES.MOVEMENT_RECORDS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, records: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var records = [];
  for (var i = 0; i < data.length; i++) {
    records.push({
      id: data[i][0],
      shiftId: data[i][1],
      date: data[i][2],
      shiftType: data[i][3],
      type: data[i][4],
      patientName: data[i][5],
      hn: data[i][6],
      bedNumber: data[i][7],
      wardOrHospital: data[i][8],
      time: data[i][9],
      details: data[i][10],
      createdAt: data[i][11]
    });
  }
  return { success: true, records: records };
}

function handleSaveMovementRecord(payload) {
  var record = payload.record || payload;
  var sheet = getOrCreateSheet(SHEET_NAMES.MOVEMENT_RECORDS);
  var row = [
    record.id || ('mov-' + Date.now()), record.shiftId || '', record.date || '', record.shiftType || '',
    record.type || '', record.patientName || '', record.hn || '', record.bedNumber || '',
    record.wardOrHospital || '', record.time || '', record.details || '', new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { success: true, record: record };
}

/**
 * Consultations
 */
function handleGetConsultations() {
  var sheet = getOrCreateSheet(SHEET_NAMES.CONSULTATIONS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, consultations: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var list = [];
  for (var i = 0; i < data.length; i++) {
    list.push({
      id: data[i][0],
      shiftId: data[i][1],
      date: data[i][2],
      shiftType: data[i][3],
      department: data[i][4],
      doctorName: data[i][5],
      patientName: data[i][6],
      hn: data[i][7],
      reason: data[i][8],
      status: data[i][9],
      urgent: Boolean(data[i][10]),
      createdAt: data[i][11]
    });
  }
  return { success: true, consultations: list };
}

function handleSaveConsultation(payload) {
  var item = payload.consultation || payload;
  var sheet = getOrCreateSheet(SHEET_NAMES.CONSULTATIONS);
  var row = [
    item.id || ('con-' + Date.now()), item.shiftId || '', item.date || '', item.shiftType || '',
    item.department || '', item.doctorName || '', item.patientName || '', item.hn || '',
    item.reason || '', item.status || 'รอตรวจ', Boolean(item.urgent), new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { success: true, consultation: item };
}

/**
 * Incidents & Risk Log
 */
function handleGetIncidents() {
  var sheet = getOrCreateSheet(SHEET_NAMES.INCIDENTS_RISK_LOG);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, incidents: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var list = [];
  for (var i = 0; i < data.length; i++) {
    list.push({
      id: data[i][0],
      shiftId: data[i][1],
      date: data[i][2],
      shiftType: data[i][3],
      category: data[i][4],
      severityLevel: data[i][5],
      description: data[i][6],
      patientName: data[i][7],
      hn: data[i][8],
      immediateAction: data[i][9],
      reportedBy: data[i][10],
      createdAt: data[i][11]
    });
  }
  return { success: true, incidents: list };
}

function handleSaveIncident(payload) {
  var item = payload.incident || payload;
  var sheet = getOrCreateSheet(SHEET_NAMES.INCIDENTS_RISK_LOG);
  var row = [
    item.id || ('inc-' + Date.now()), item.shiftId || '', item.date || '', item.shiftType || '',
    item.category || '', item.severityLevel || '', item.description || '', item.patientName || '',
    item.hn || '', item.immediateAction || '', item.reportedBy || '', new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { success: true, incident: item };
}

/**
 * Valuable Items
 */
function handleGetValuableItems() {
  var sheet = getOrCreateSheet(SHEET_NAMES.VALUABLE_ITEMS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, valuableItems: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var list = [];
  for (var i = 0; i < data.length; i++) {
    if (!data[i][0]) continue;
    list.push({
      id: data[i][0],
      patientName: data[i][1],
      hn: data[i][2],
      bedNumber: data[i][3],
      itemDescription: data[i][4],
      custodian: data[i][5],
      receiver: data[i][6],
      status: data[i][7],
      dateAdded: data[i][8],
      notes: data[i][9],
      shiftId: data[i][10]
    });
  }
  return { success: true, valuableItems: list };
}

function handleSaveValuableItem(payload) {
  var item = payload.item || payload;
  if (!item || !item.id) return { success: false, error: 'Missing valuable item id' };

  var sheet = getOrCreateSheet(SHEET_NAMES.VALUABLE_ITEMS);
  var row = [
    item.id, item.patientName || '', item.hn || '', item.bedNumber || '',
    item.itemDescription || '', item.custodian || '', item.receiver || '',
    item.status || 'safe_kept', item.dateAdded || '', item.notes || '',
    item.shiftId || '', item.createdAt || new Date().toISOString(), new Date().toISOString()
  ];

  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(item.id)) { foundRow = i + 2; break; }
    }
  }

  if (foundRow > 0) sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);

  return { success: true, item: item };
}

function handleDeleteValuableItem(payload) {
  var id = payload.id;
  if (!id) return { success: false, error: 'Missing item id' };

  var sheet = getOrCreateSheet(SHEET_NAMES.VALUABLE_ITEMS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true };

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
  return { success: true };
}

/**
 * Settings
 */
function handleGetSettings() {
  var sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS, ['key', 'value', 'updatedAt']);
  var settings = {};
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0]) settings[data[i][0]] = data[i][1];
    }
  }
  return { success: true, settings: settings };
}

function handleSaveSettings(settings) {
  var sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS, ['key', 'value', 'updatedAt']);
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  var keys = Object.keys(settings || {});
  if (keys.length === 0) return { success: true };
  var rows = keys.map(function(k) { return [k, String(settings[k]), new Date().toISOString()]; });
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  return { success: true };
}

/**
 * Save Active State Snapshot
 */
function handleSaveState(payload) {
  var currentShift = payload.currentShift || payload.activeShift;
  if (currentShift) {
    var summarySheet = getOrCreateSheet(SHEET_NAMES.SUMMARY_CURRENT_SHIFT);
    var stats = currentShift.stats || {};
    var row = [
      currentShift.id || '', currentShift.date || '', currentShift.shiftType || '', currentShift.inchargeName || '',
      currentShift.previousShiftInfo || '', Boolean(currentShift.isActive),
      Number(stats.carriedOver) || 0, Number(stats.currentRemaining) || 0, Number(stats.ventilatorCount) || 0,
      Number(stats.category5Count) || 0, Number(stats.category4Count) || 0, Number(stats.oxygenCount) || 0, Number(stats.postOpCount) || 0,
      currentShift.createdAt || new Date().toISOString(), new Date().toISOString(), JSON.stringify(currentShift)
    ];

    var lastRow = summarySheet.getLastRow();
    if (lastRow >= 2) summarySheet.getRange(2, 1, lastRow - 1, summarySheet.getLastColumn()).clearContent();
    summarySheet.getRange(2, 1, 1, row.length).setValues([row]);
  }

  if (Array.isArray(payload.handoverItems)) handleSaveHandovers(payload.handoverItems);
  if (Array.isArray(payload.pendingCharts)) handleSavePendingCharts(payload.pendingCharts);

  return { success: true, message: 'Ward state saved to Google Sheets', updatedAt: new Date().toISOString() };
}

/**
 * ลบข้อมูลที่ค้างเก่าทั้งหมด reset ข้อมูล เพื่อเริ่มต้นใหม่
 * เคลียร์แถวข้อมูลทิ้งทั้งหมด โดยคงหัวตารางมาตรฐานไว้ครบถ้วน
 */
function handleResetAllData() {
  var sheetsToClear = [
    SHEET_NAMES.SUMMARY_CURRENT_SHIFT,
    SHEET_NAMES.HANDOVERS,
    SHEET_NAMES.PENDING_CHARTS,
    SHEET_NAMES.MOVEMENT_RECORDS,
    SHEET_NAMES.CONSULTATIONS,
    SHEET_NAMES.INCIDENTS_RISK_LOG,
    SHEET_NAMES.EQUIPMENT_LOG,
    SHEET_NAMES.EQUIPMENT_WEAN_LOG,
    SHEET_NAMES.VALUABLE_ITEMS
  ];

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  for (var i = 0; i < sheetsToClear.length; i++) {
    var sheet = ss.getSheetByName(sheetsToClear[i]);
    if (sheet && sheet.getLastRow() >= 2) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  }

  // Ensure standard sheets are initialized
  handleInitSheets();

  return {
    success: true,
    message: 'ลบข้อมูลที่ค้างเก่าทั้งหมด และรีเซ็ตข้อมูลเริ่มต้นใหม่เรียบร้อยแล้ว ไม่มีข้อมูลปลอมและไม่มีบันทึกเดิมค้าง'
  };
}
