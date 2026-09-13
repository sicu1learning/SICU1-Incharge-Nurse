/**
 * ==============================================================================
 * SICU1 Incharge Nurse - Google Apps Script Web API Backend
 * ==============================================================================
 *
 * สถาปัตยกรรม:
 * SICU Incharge Nurse Web App -> Google Apps Script Web API -> Google Sheets
 *
 * แหล่งจัดเก็บข้อมูลจริงเพียงแห่งเดียว: Google Sheets
 * ไม่ใช้ Database อื่นใดทั้งสิ้น
 *
 * วิธีการติดตั้งใน Google Sheets:
 * 1. เปิด Google Sheet ที่ต้องการใช้เป็นฐานข้อมูล
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) -> Apps Script
 * 3. ลบโค้ดเดิมทั้งหมดในไฟล์ Code.gs แล้ววางโค้ดชุดนี้ลงไป
 * 4. คลิก "บันทึก" (Save / ไอคอนแผ่นดิสก์)
 * 5. คลิก "ทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภท: "เว็บแอป" (Web app)
 * 7. ตั้งค่า:
 *    - คำอธิบาย: SICU1 Incharge Nurse API
 *    - ดำเนินการในฐานะ: "ฉัน" (Execute as: Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: "ทุกคน" (Who has access: Anyone)  *** สำคัญมาก ***
 * 8. คลิก "ทำให้ใช้งานได้" (Deploy) และให้สิทธิ์การเข้าถึง (Authorize access)
 * 9. คัดลอก "URL ของเว็บแอป" (Web app URL เช่น https://script.google.com/macros/s/.../exec)
 *    นำไปวางในหน้าตั้งค่าของระบบ SICU1 Incharge Nurse
 * ==============================================================================
 */

// ชื่อแท็บชีตต่างๆ ในระบบ
var SHEET_NAMES = {
  ACTIVE_SHIFT: 'Active_Shift',
  SHIFTS_HISTORY: 'Shifts_History',
  HANDOVER_ITEMS: 'Handover_Items',
  PENDING_CHARTS: 'Pending_Charts',
  SETTINGS: 'Settings'
};

/**
 * Handle GET Requests
 * รองรับการดึงข้อมูลสถานะปัจจุบัน, ประวัติเวร, และทดสอบการเชื่อมต่อ (Ping)
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
    } else if (action === 'getHistory') {
      result = handleGetHistory();
    } else if (action === 'getSettings') {
      result = handleGetSettings();
    } else {
      result = { success: false, error: 'Unknown GET action: ' + action };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    });
  }
}

/**
 * Handle POST Requests
 * รองรับการบันทึกเวรปัจจุบัน, ประวัติเวร, การส่งเวร, และชาร์ตค้าง
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

    var action = payload.action || 'saveState';
    var result;

    if (action === 'saveState') {
      result = handleSaveState(payload);
    } else if (action === 'saveShift') {
      result = handleSaveShift(payload);
    } else if (action === 'deleteShift') {
      result = handleDeleteShift(payload);
    } else if (action === 'saveHandovers') {
      result = handleSaveHandovers(payload.handoverItems || []);
    } else if (action === 'savePendingCharts') {
      result = handleSavePendingCharts(payload.pendingCharts || []);
    } else if (action === 'saveSettings') {
      result = handleSaveSettings(payload.settings || {});
    } else if (action === 'ping') {
      result = handlePing();
    } else {
      result = { success: false, error: 'Unknown POST action: ' + action };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    });
  }
}

/**
 * Helper: ส่งคืน JSON Response
 */
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Helper: ดึงหรือสร้าง Sheet พร้อมตั้ง Header อัตโนมัติ
 */
function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#004d40').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// -----------------------------------------------------------------------------
// Action Handlers
// -----------------------------------------------------------------------------

/**
 * ทดสอบการเชื่อมต่อ
 */
function handlePing() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    success: true,
    status: 'connected',
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    timestamp: new Date().toISOString(),
    message: 'SICU1 Incharge Nurse Google Sheets Backend is ONLINE'
  };
}

/**
 * ดึงสถานะปัจจุบันของวอร์ด (Active Shift, Stats, Handovers, Pending Charts, Settings)
 */
function handleGetState() {
  var activeShiftSheet = getOrCreateSheet(SHEET_NAMES.ACTIVE_SHIFT, [
    'shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo',
    'isActive', 'createdAt', 'updatedAt', 'statsJson', 'movementRecordsJson',
    'consultationDataJson', 'staffDataJson', 'equipmentWeanDataJson', 'incidentDataJson'
  ]);

  var activeShift = null;
  var patientStats = null;

  var lastRow = activeShiftSheet.getLastRow();
  if (lastRow >= 2) {
    var values = activeShiftSheet.getRange(2, 1, 1, 14).getValues()[0];
    try {
      var stats = values[8] ? JSON.parse(values[8]) : null;
      var movementRecords = values[9] ? JSON.parse(values[9]) : [];
      var consultationData = values[10] ? JSON.parse(values[10]) : null;
      var staffData = values[11] ? JSON.parse(values[11]) : null;
      var equipmentWeanData = values[12] ? JSON.parse(values[12]) : null;
      var incidentData = values[13] ? JSON.parse(values[13]) : null;

      activeShift = {
        id: String(values[0] || ''),
        date: String(values[1] || ''),
        shiftType: String(values[2] || ''),
        inchargeName: String(values[3] || ''),
        previousShiftInfo: String(values[4] || ''),
        isActive: Boolean(values[5]),
        createdAt: String(values[6] || ''),
        updatedAt: String(values[7] || ''),
        stats: stats,
        movementRecords: movementRecords,
        consultationData: consultationData,
        staffData: staffData,
        equipmentWeanData: equipmentWeanData,
        incidentData: incidentData,
        handoverItems: [],
        pendingCharts: []
      };
      patientStats = stats;
    } catch (e) {
      // JSON parse fallback
    }
  }

  // ดึงรายการส่งเวร (Handover Items)
  var handoverSheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_ITEMS, [
    'id', 'title', 'details', 'patientName', 'bedNumber',
    'priority', 'category', 'createdBy', 'createdAt', 'shiftId', 'isCompleted'
  ]);
  var handoverItems = [];
  var hLastRow = handoverSheet.getLastRow();
  if (hLastRow >= 2) {
    var hData = handoverSheet.getRange(2, 1, hLastRow - 1, 11).getValues();
    for (var i = 0; i < hData.length; i++) {
      var row = hData[i];
      if (row[0]) {
        handoverItems.push({
          id: String(row[0]),
          title: String(row[1] || ''),
          details: String(row[2] || ''),
          patientName: String(row[3] || ''),
          bedNumber: String(row[4] || ''),
          priority: String(row[5] || 'normal'),
          category: String(row[6] || ''),
          createdBy: String(row[7] || ''),
          createdAt: String(row[8] || ''),
          shiftId: String(row[9] || ''),
          isCompleted: Boolean(row[10])
        });
      }
    }
  }

  // ดึงรายการชาร์ตค้าง (Pending Charts)
  var pendingSheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS, [
    'id', 'patientName', 'hn', 'doctors', 'location',
    'dateAdded', 'daysPending', 'note', 'shiftId', 'status'
  ]);
  var pendingCharts = [];
  var pLastRow = pendingSheet.getLastRow();
  if (pLastRow >= 2) {
    var pData = pendingSheet.getRange(2, 1, pLastRow - 1, 10).getValues();
    for (var j = 0; j < pData.length; j++) {
      var pRow = pData[j];
      if (pRow[0]) {
        var doctors = [];
        try {
          doctors = pRow[3] ? JSON.parse(pRow[3]) : [];
        } catch (e) {
          doctors = pRow[3] ? [String(pRow[3])] : [];
        }
        pendingCharts.push({
          id: String(pRow[0]),
          patientName: String(pRow[1] || ''),
          hn: String(pRow[2] || ''),
          doctors: doctors,
          location: String(pRow[4] || 'SICU'),
          dateAdded: String(pRow[5] || ''),
          daysPending: Number(pRow[6]) || 0,
          note: String(pRow[7] || ''),
          shiftId: String(pRow[8] || ''),
          status: String(pRow[9] || 'pending')
        });
      }
    }
  }

  // ดึงการตั้งค่า
  var settings = handleGetSettings().settings || {};

  return {
    success: true,
    data: {
      activeShift: activeShift,
      patientStats: patientStats,
      handoverItems: handoverItems,
      pendingCharts: pendingCharts,
      settings: settings,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * ดึงประวัติเวรทั้งหมดจากแท็บ Shifts_History
 */
function handleGetHistory() {
  var historySheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY, [
    'shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo',
    'carriedOver', 'transferredIn', 'admittedNew', 'transferredOut', 'againstAdvice',
    'deceased', 'deceasedPostOp24Hr', 'admitDischarge24Hr', 'referOut', 'currentRemaining',
    'category5Count', 'category4Count', 'ventilatorCount', 'oxygenCount', 'postOpCount',
    'staffHead', 'staffRn', 'staffNa', 'staffClerk', 'staffTotal',
    'weanVentilator', 'weanFoley', 'weanPeripheral', 'weanCentral', 'weanAssess', 'weanAttempt', 'weanSuccess',
    'consultTotal', 'incidentCount', 'fullDataJson', 'createdAt', 'updatedAt'
  ]);

  var shifts = [];
  var lastRow = historySheet.getLastRow();
  if (lastRow >= 2) {
    var data = historySheet.getRange(2, 1, lastRow - 1, 37).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var shiftId = String(row[0] || '');
      if (!shiftId) continue;

      var fullData = null;
      if (row[34]) {
        try {
          fullData = JSON.parse(row[34]);
        } catch (e) {}
      }

      if (fullData && fullData.id) {
        shifts.push(fullData);
      } else {
        // สร้าง ShiftInfo จากคอลัมน์มาตรฐาน
        shifts.push({
          id: shiftId,
          date: String(row[1] || ''),
          shiftType: String(row[2] || ''),
          inchargeName: String(row[3] || ''),
          previousShiftInfo: String(row[4] || ''),
          isActive: false,
          createdAt: String(row[35] || ''),
          updatedAt: String(row[36] || ''),
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
          },
          handoverItems: [],
          pendingCharts: []
        });
      }
    }
  }

  return {
    success: true,
    shifts: shifts
  };
}

/**
 * บันทึกสถานะปัจจุบันทั้งหมด (Active Shift + Stats + Handovers + Pending Charts)
 */
function handleSaveState(payload) {
  var shift = payload.currentShift || payload.activeShift;
  var stats = payload.patientStats || (shift ? shift.stats : null);
  var handoverItems = payload.handoverItems;
  var pendingCharts = payload.pendingCharts;

  if (shift) {
    var activeShiftSheet = getOrCreateSheet(SHEET_NAMES.ACTIVE_SHIFT, [
      'shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo',
      'isActive', 'createdAt', 'updatedAt', 'statsJson', 'movementRecordsJson',
      'consultationDataJson', 'staffDataJson', 'equipmentWeanDataJson', 'incidentDataJson'
    ]);

    var rowValues = [
      shift.id || '',
      shift.date || '',
      shift.shiftType || '',
      shift.inchargeName || '',
      shift.previousShiftInfo || '',
      true,
      shift.createdAt || new Date().toISOString(),
      new Date().toISOString(),
      JSON.stringify(stats || shift.stats || {}),
      JSON.stringify(shift.movementRecords || []),
      JSON.stringify(shift.consultationData || {}),
      JSON.stringify(shift.staffData || {}),
      JSON.stringify(shift.equipmentWeanData || {}),
      JSON.stringify(shift.incidentData || {})
    ];

    // ทับที่แถว 2 (Active Shift มีเพียงเวรเดียวที่เป็น Live)
    activeShiftSheet.getRange(2, 1, 1, rowValues.length).setValues([rowValues]);
  }

  if (Array.isArray(handoverItems)) {
    handleSaveHandovers(handoverItems);
  }

  if (Array.isArray(pendingCharts)) {
    handleSavePendingCharts(pendingCharts);
  }

  return {
    success: true,
    message: 'Saved state successfully to Google Sheets',
    updatedAt: new Date().toISOString()
  };
}

/**
 * บันทึกเวร (ทั้งบันทึกเวรใหม่ หรือแก้ไขเวรในประวัติ)
 */
function handleSaveShift(payload) {
  var shift = payload.shift || payload.currentShift;
  if (!shift || !shift.id) {
    return { success: false, error: 'Missing shift data or shift.id' };
  }

  var historySheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY, [
    'shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo',
    'carriedOver', 'transferredIn', 'admittedNew', 'transferredOut', 'againstAdvice',
    'deceased', 'deceasedPostOp24Hr', 'admitDischarge24Hr', 'referOut', 'currentRemaining',
    'category5Count', 'category4Count', 'ventilatorCount', 'oxygenCount', 'postOpCount',
    'staffHead', 'staffRn', 'staffNa', 'staffClerk', 'staffTotal',
    'weanVentilator', 'weanFoley', 'weanPeripheral', 'weanCentral', 'weanAssess', 'weanAttempt', 'weanSuccess',
    'consultTotal', 'incidentCount', 'fullDataJson', 'createdAt', 'updatedAt'
  ]);

  var stats = shift.stats || {};
  var staff = shift.staffData || {};
  var wean = shift.equipmentWeanData || {};
  var consult = shift.consultationData || {};
  var incident = shift.incidentData || {};

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
    Number(staff.naCount || staff.pnCount) || 0,
    Number(staff.clerkCount) || 0,
    Number(staff.totalStaff) || 0,
    Number(wean.ventilatorUse) || 0,
    Number(wean.foleyCatheter) || 0,
    Number(wean.peripheralLine) || 0,
    Number(wean.centralLine) || 0,
    Number(wean.weanAssess) || 0,
    Number(wean.weanAttempt) || 0,
    Number(wean.weanSuccess) || 0,
    Number(consult.totalCount) || 0,
    Number(incident.totalIncidentCount || 0),
    JSON.stringify(shift),
    shift.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];

  var lastRow = historySheet.getLastRow();
  var foundRow = -1;

  if (lastRow >= 2) {
    var ids = historySheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(shift.id)) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow > 0) {
    historySheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    historySheet.appendRow(row);
  }

  // หากระบุว่าเป็นเวรที่กำลังทำงาน (Active) ให้อัปเดตแท็บ Active_Shift ด้วย
  if (shift.isActive !== false) {
    handleSaveState({ currentShift: shift });
  }

  return {
    success: true,
    message: 'Shift saved to Google Sheets successfully',
    shiftId: shift.id
  };
}

/**
 * ลบเวรออกจากแท็บ Shifts_History
 */
function handleDeleteShift(payload) {
  var shiftId = payload.shiftId || payload.id;
  if (!shiftId) {
    return { success: false, error: 'Missing shiftId' };
  }

  var historySheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY);
  var lastRow = historySheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, message: 'History sheet empty' };
  }

  var ids = historySheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(shiftId)) {
      historySheet.deleteRow(i + 2);
      return { success: true, message: 'Deleted shift: ' + shiftId };
    }
  }

  return { success: true, message: 'Shift ID not found: ' + shiftId };
}

/**
 * เขียนทับรายการ Handover ทั้งหมด
 */
function handleSaveHandovers(items) {
  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_ITEMS, [
    'id', 'title', 'details', 'patientName', 'bedNumber',
    'priority', 'category', 'createdBy', 'createdAt', 'shiftId', 'isCompleted'
  ]);

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
  }

  if (!items || items.length === 0) {
    return { success: true, count: 0 };
  }

  var rows = items.map(function(item) {
    return [
      item.id || '',
      item.title || '',
      item.details || '',
      item.patientName || '',
      item.bedNumber || '',
      item.priority || 'normal',
      item.category || '',
      item.createdBy || '',
      item.createdAt || new Date().toISOString(),
      item.shiftId || '',
      Boolean(item.isCompleted)
    ];
  });

  sheet.getRange(2, 1, rows.length, 11).setValues(rows);
  return { success: true, count: rows.length };
}

/**
 * เขียนทับรายการ Pending Charts ทั้งหมด
 */
function handleSavePendingCharts(charts) {
  var sheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS, [
    'id', 'patientName', 'hn', 'doctors', 'location',
    'dateAdded', 'daysPending', 'note', 'shiftId', 'status'
  ]);

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 10).clearContent();
  }

  if (!charts || charts.length === 0) {
    return { success: true, count: 0 };
  }

  var rows = charts.map(function(chart) {
    return [
      chart.id || '',
      chart.patientName || '',
      chart.hn || '',
      JSON.stringify(chart.doctors || []),
      chart.location || 'SICU',
      chart.dateAdded || '',
      Number(chart.daysPending) || 0,
      chart.note || '',
      chart.shiftId || '',
      chart.status || 'pending'
    ];
  });

  sheet.getRange(2, 1, rows.length, 10).setValues(rows);
  return { success: true, count: rows.length };
}

/**
 * บันทึกการตั้งค่าวอร์ด
 */
function handleSaveSettings(settings) {
  var sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS, ['key', 'value', 'updatedAt']);

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  }

  var keys = Object.keys(settings || {});
  if (keys.length === 0) {
    return { success: true };
  }

  var rows = keys.map(function(k) {
    var val = typeof settings[k] === 'object' ? JSON.stringify(settings[k]) : String(settings[k]);
    return [k, val, new Date().toISOString()];
  });

  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  return { success: true, count: rows.length };
}

/**
 * ดึงการตั้งค่าวอร์ด
 */
function handleGetSettings() {
  var sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS, ['key', 'value', 'updatedAt']);
  var lastRow = sheet.getLastRow();
  var settings = {};

  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      var k = String(data[i][0]);
      var v = data[i][1];
      if (k) {
        try {
          settings[k] = JSON.parse(v);
        } catch (e) {
          settings[k] = v;
        }
      }
    }
  }

  return {
    success: true,
    settings: settings
  };
}
