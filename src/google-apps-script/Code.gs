/**
 * ==============================================================================
 * SICU1 Incharge Nurse - Google Apps Script Web API Backend
 * ==============================================================================
 *
 * สถาปัตยกรรม:
 * SICU Incharge Nurse Web App -> Google Apps Script Web API -> Google Sheets
 *
 * แหล่งจัดเก็บข้อมูลจริงเพียงแห่งเดียว: Google Sheets
 * ไม่ใช้ Firebase / Firestore / Database อื่นใดทั้งสิ้น
 *
 * ชื่อชีต (Tabs):
 * 1. Active_Shift     - เวรที่กำลังปฏิบัติหน้าที่ปัจจุบัน (Active Live Shift)
 * 2. Shifts_History   - บันทึกประวัติเวรทั้งหมด (Primary Key: id / shiftId)
 * 3. Handover_Items   - รายการเรื่องส่งต่อข้อมูลปัจจุบัน (Active Handover Items)
 * 4. Handover_History - บันทึกประวัติเรื่องส่งต่อที่ถูกเก็บถาวร (Archive with source_handover_id)
 * 5. Pending_Charts   - รายการชาร์ตค้าง (Pending Medical Records)
 * 6. Valuable_Items   - บันทึกทรัพย์สินมีค่าผู้ป่วย (Patient Valuable Items)
 * 7. Nurses           - บัญชีรายชื่อพยาบาลประจำวอร์ด (Ward Nurses Directory)
 * 8. Settings         - การตั้งค่าระบบวอร์ด (Ward Settings)
 * ==============================================================================
 */

var SHEET_NAMES = {
  ACTIVE_SHIFT: 'Active_Shift',
  SHIFTS_HISTORY: 'Shifts_History',
  HANDOVER_ITEMS: 'Handover_Items',
  HANDOVER_HISTORY: 'Handover_History',
  PENDING_CHARTS: 'Pending_Charts',
  VALUABLE_ITEMS: 'Valuable_Items',
  NURSES: 'Nurses',
  SETTINGS: 'Settings'
};

var DEFAULT_NURSES = [
  'นัฐภร จันทร์ฟ้าเลื่อม',
  'ธิดาพร เท้งสี',
  'ชมพูนุท เล็งสาย',
  'สุพรรณษา คุ้มครอง',
  'เกศินี กำเนิดรัตน์',
  'วิมลมาศ สุโกมล',
  'จุฑารัตน์ คุณานุศาสน์',
  'สุรีรัตน์ ชาสมบัติ',
  'ปิยพร ธีรศิลป์',
  'สัจจพร งามยิ่งยวด'
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
    } else if (action === 'getAllData') {
      result = handleGetAllData();
    } else if (action === 'getShifts') {
      result = handleGetShifts();
    } else if (action === 'getNurses') {
      result = handleGetNurses();
    } else if (action === 'getValuableItems') {
      result = handleGetValuableItems();
    } else if (action === 'getPendingCharts') {
      result = handleGetPendingCharts();
    } else if (action === 'getHandoverItems') {
      result = handleGetHandoverItems();
    } else if (action === 'getHandoverHistory') {
      result = handleGetHandoverHistory();
    } else if (action === 'getState') {
      result = handleGetState();
    } else if (action === 'getHistory') {
      result = handleGetShifts();
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

    if (action === 'getAllData') {
      result = handleGetAllData();
    } else if (action === 'getShifts') {
      result = handleGetShifts();
    } else if (action === 'getNurses') {
      result = handleGetNurses();
    } else if (action === 'getValuableItems') {
      result = handleGetValuableItems();
    } else if (action === 'getPendingCharts') {
      result = handleGetPendingCharts();
    } else if (action === 'getHandoverItems') {
      result = handleGetHandoverItems();
    } else if (action === 'getHandoverHistory') {
      result = handleGetHandoverHistory();
    } else if (action === 'saveShift') {
      result = handleSaveShift(payload);
    } else if (action === 'saveValuableItem') {
      result = handleSaveValuableItem(payload);
    } else if (action === 'savePendingChart') {
      result = handleSavePendingChart(payload);
    } else if (action === 'saveHandoverItem') {
      result = handleSaveHandoverItem(payload);
    } else if (action === 'archiveHandoverItem') {
      result = handleArchiveHandoverItem(payload);
    } else if (action === 'deleteShift') {
      result = handleDeleteShift(payload);
    } else if (action === 'deleteValuableItem') {
      result = handleDeleteValuableItem(payload);
    } else if (action === 'deletePendingChart') {
      result = handleDeletePendingChart(payload);
    } else if (action === 'saveNurses') {
      result = handleSaveNurses(payload);
    } else if (action === 'saveState') {
      result = handleSaveState(payload);
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
 * Helper: Send JSON Response with CORS headers
 */
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Helper: Get or Create Sheet with headers
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

/**
 * Test Connection Ping
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
 * Get All Central Data at Once
 */
function handleGetAllData() {
  var stateResult = handleGetState();
  var shiftsResult = handleGetShifts();
  var nursesResult = handleGetNurses();
  var valuableResult = handleGetValuableItems();
  var pendingResult = handleGetPendingCharts();
  var handoverResult = handleGetHandoverItems();
  var handoverHistoryResult = handleGetHandoverHistory();
  var settingsResult = handleGetSettings();

  return {
    success: true,
    activeShift: stateResult.data ? stateResult.data.activeShift : null,
    patientStats: stateResult.data ? stateResult.data.patientStats : null,
    shifts: shiftsResult.shifts || [],
    nurses: nursesResult.nurses || [],
    valuableItems: valuableResult.valuableItems || [],
    pendingCharts: pendingResult.pendingCharts || [],
    handoverItems: handoverResult.handoverItems || [],
    handoverHistory: handoverHistoryResult.handoverHistory || [],
    settings: settingsResult.settings || {},
    timestamp: new Date().toISOString()
  };
}

/**
 * Get Shifts from Shifts_History
 */
function handleGetShifts() {
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
 * Get Nurse Directory from Nurses Sheet
 */
function handleGetNurses() {
  var sheet = getOrCreateSheet(SHEET_NAMES.NURSES, ['name', 'role', 'status', 'updatedAt']);
  var lastRow = sheet.getLastRow();
  var nurses = [];

  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (var i = 0; i < data.length; i++) {
      var name = String(data[i][0] || '').trim();
      if (name) {
        nurses.push(name);
      }
    }
  }

  // If sheet is freshly created, seed default nurses so ward has initial list
  if (nurses.length === 0) {
    nurses = DEFAULT_NURSES;
    var rows = nurses.map(function(n) {
      return [n, 'พยาบาลวิชาชีพ', 'active', new Date().toISOString()];
    });
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  }

  return {
    success: true,
    nurses: nurses
  };
}

/**
 * Save Nurse Directory
 */
function handleSaveNurses(payload) {
  var nurses = payload.nurses || [];
  if (!Array.isArray(nurses)) {
    return { success: false, error: 'Invalid nurses list' };
  }

  var sheet = getOrCreateSheet(SHEET_NAMES.NURSES, ['name', 'role', 'status', 'updatedAt']);
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 4).clearContent();
  }

  if (nurses.length > 0) {
    var rows = nurses.map(function(n) {
      return [String(n).trim(), 'พยาบาลวิชาชีพ', 'active', new Date().toISOString()];
    });
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  }

  return {
    success: true,
    count: nurses.length
  };
}

/**
 * Get Valuable Items from Valuable_Items Sheet
 */
function handleGetValuableItems() {
  var sheet = getOrCreateSheet(SHEET_NAMES.VALUABLE_ITEMS, [
    'id', 'patientName', 'hn', 'bedNumber', 'itemDescription',
    'custodian', 'receiver', 'status', 'dateAdded', 'notes',
    'shiftId', 'createdAt', 'updatedAt'
  ]);

  var items = [];
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[0]) {
        items.push({
          id: String(row[0]),
          patientName: String(row[1] || ''),
          hn: String(row[2] || ''),
          bedNumber: String(row[3] || ''),
          itemDescription: String(row[4] || ''),
          custodian: String(row[5] || ''),
          receiver: String(row[6] || ''),
          status: String(row[7] || 'stored'),
          dateAdded: String(row[8] || ''),
          notes: String(row[9] || ''),
          shiftId: String(row[10] || ''),
          createdAt: String(row[11] || ''),
          updatedAt: String(row[12] || '')
        });
      }
    }
  }

  return {
    success: true,
    valuableItems: items
  };
}

/**
 * Save / Update Valuable Item
 * Primary key: id. If id exists, updates row; otherwise appends row.
 */
function handleSaveValuableItem(payload) {
  var item = payload.item || payload;
  if (!item || !item.id) {
    return { success: false, error: 'Missing valuable item id' };
  }

  var sheet = getOrCreateSheet(SHEET_NAMES.VALUABLE_ITEMS, [
    'id', 'patientName', 'hn', 'bedNumber', 'itemDescription',
    'custodian', 'receiver', 'status', 'dateAdded', 'notes',
    'shiftId', 'createdAt', 'updatedAt'
  ]);

  var row = [
    item.id,
    item.patientName || '',
    item.hn || '',
    item.bedNumber || '',
    item.itemDescription || '',
    item.custodian || '',
    item.receiver || '',
    item.status || 'stored',
    item.dateAdded || '',
    item.notes || '',
    item.shiftId || '',
    item.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];

  var lastRow = sheet.getLastRow();
  var foundRow = -1;

  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(item.id)) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return {
    success: true,
    item: item,
    message: 'Valuable item saved'
  };
}

/**
 * Delete Valuable Item
 */
function handleDeleteValuableItem(payload) {
  var id = payload.id || payload.itemId;
  if (!id) return { success: false, error: 'Missing item id' };

  var sheet = getOrCreateSheet(SHEET_NAMES.VALUABLE_ITEMS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true };

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      return { success: true, message: 'Deleted valuable item' };
    }
  }

  return { success: true };
}

/**
 * Get Active Handover Items from Handover_Items Sheet
 */
function handleGetHandoverItems() {
  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_ITEMS, [
    'id', 'title', 'details', 'patientName', 'bedNumber',
    'priority', 'category', 'createdBy', 'createdAt', 'shiftId', 'isCompleted'
  ]);

  var items = [];
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[0]) {
        items.push({
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

  return {
    success: true,
    handoverItems: items
  };
}

/**
 * Get Archived Handover History from Handover_History Sheet
 */
function handleGetHandoverHistory() {
  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_HISTORY, [
    'id', 'source_handover_id', 'title', 'details', 'patientName',
    'bedNumber', 'priority', 'category', 'createdBy', 'createdAt',
    'shiftId', 'isCompleted', 'archivedAt', 'archivedBy', 'archiveReason'
  ]);

  var history = [];
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, 15).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[0] || row[1]) {
        history.push({
          id: String(row[0] || ''),
          source_handover_id: String(row[1] || row[0] || ''),
          title: String(row[2] || ''),
          details: String(row[3] || ''),
          patientName: String(row[4] || ''),
          bedNumber: String(row[5] || ''),
          priority: String(row[6] || 'normal'),
          category: String(row[7] || ''),
          createdBy: String(row[8] || ''),
          createdAt: String(row[9] || ''),
          shiftId: String(row[10] || ''),
          isCompleted: Boolean(row[11]),
          archivedAt: String(row[12] || ''),
          archivedBy: String(row[13] || ''),
          archiveReason: String(row[14] || '')
        });
      }
    }
  }

  // Sort newest archived first
  history.sort(function(a, b) {
    return new Date(b.archivedAt || 0).getTime() - new Date(a.archivedAt || 0).getTime();
  });

  return {
    success: true,
    handoverHistory: history
  };
}

/**
 * Save / Update Handover Item
 * Primary key: id. If id exists, updates row; otherwise appends row.
 */
function handleSaveHandoverItem(payload) {
  var item = payload.item || payload;
  if (!item || !item.id) {
    return { success: false, error: 'Missing handover item id' };
  }

  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_ITEMS, [
    'id', 'title', 'details', 'patientName', 'bedNumber',
    'priority', 'category', 'createdBy', 'createdAt', 'shiftId', 'isCompleted'
  ]);

  var row = [
    item.id,
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

  var lastRow = sheet.getLastRow();
  var foundRow = -1;

  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(item.id)) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return {
    success: true,
    item: item,
    message: 'Handover item saved'
  };
}

/**
 * Archive Handover Item
 * Moves record from Handover_Items to Handover_History with source_handover_id
 * Does NOT permanently delete from Google Sheets.
 */
function handleArchiveHandoverItem(payload) {
  var id = payload.id || payload.itemId;
  if (!id) {
    return { success: false, error: 'Missing id for archive' };
  }

  var activeSheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_ITEMS);
  var historySheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_HISTORY, [
    'id', 'source_handover_id', 'title', 'details', 'patientName',
    'bedNumber', 'priority', 'category', 'createdBy', 'createdAt',
    'shiftId', 'isCompleted', 'archivedAt', 'archivedBy', 'archiveReason'
  ]);

  var lastRow = activeSheet.getLastRow();
  if (lastRow < 2) {
    return { success: false, error: 'Handover items sheet is empty' };
  }

  var data = activeSheet.getRange(2, 1, lastRow - 1, 11).getValues();
  var foundIndex = -1;
  var targetRow = null;

  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      foundIndex = i + 2;
      targetRow = data[i];
      break;
    }
  }

  if (foundIndex === -1 || !targetRow) {
    return { success: false, error: 'Item not found in active handovers: ' + id };
  }

  // Create archive history row
  var archiveId = 'arch-' + new Date().getTime();
  var historyRow = [
    archiveId,
    String(targetRow[0]), // source_handover_id
    String(targetRow[1] || ''),
    String(targetRow[2] || ''),
    String(targetRow[3] || ''),
    String(targetRow[4] || ''),
    String(targetRow[5] || 'normal'),
    String(targetRow[6] || ''),
    String(targetRow[7] || ''),
    String(targetRow[8] || ''),
    String(targetRow[9] || ''),
    Boolean(targetRow[10]),
    new Date().toISOString(),
    payload.archivedBy || payload.inchargeName || '',
    payload.archiveReason || 'Archived from Dashboard'
  ];

  // Append to Handover_History
  historySheet.appendRow(historyRow);

  // Delete from Handover_Items active sheet
  activeSheet.deleteRow(foundIndex);

  return {
    success: true,
    message: 'Handover item moved to Handover_History',
    source_handover_id: id,
    archiveId: archiveId
  };
}

/**
 * Get Pending Charts
 */
function handleGetPendingCharts() {
  var sheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS, [
    'id', 'patientName', 'hn', 'doctors', 'location',
    'dateAdded', 'daysPending', 'note', 'shiftId', 'status'
  ]);

  var pendingCharts = [];
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    for (var j = 0; j < data.length; j++) {
      var row = data[j];
      if (row[0]) {
        var doctors = [];
        try {
          doctors = row[3] ? JSON.parse(row[3]) : [];
        } catch (e) {
          doctors = row[3] ? [String(row[3])] : [];
        }
        pendingCharts.push({
          id: String(row[0]),
          patientName: String(row[1] || ''),
          hn: String(row[2] || ''),
          doctors: doctors,
          location: String(row[4] || 'SICU'),
          dateAdded: String(row[5] || ''),
          daysPending: Number(row[6]) || 0,
          note: String(row[7] || ''),
          shiftId: String(row[8] || ''),
          status: String(row[9] || 'pending')
        });
      }
    }
  }

  return {
    success: true,
    pendingCharts: pendingCharts
  };
}

/**
 * Save / Update Pending Chart
 * Primary key: id. If id exists, updates row; otherwise appends row.
 */
function handleSavePendingChart(payload) {
  var chart = payload.chart || payload;
  if (!chart || !chart.id) {
    return { success: false, error: 'Missing pending chart id' };
  }

  var sheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS, [
    'id', 'patientName', 'hn', 'doctors', 'location',
    'dateAdded', 'daysPending', 'note', 'shiftId', 'status'
  ]);

  var row = [
    chart.id,
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

  var lastRow = sheet.getLastRow();
  var foundRow = -1;

  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(chart.id)) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return {
    success: true,
    chart: chart,
    message: 'Pending chart saved'
  };
}

/**
 * Delete Pending Chart
 */
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
      return { success: true, message: 'Deleted pending chart' };
    }
  }

  return { success: true };
}

/**
 * Get Active Shift & State
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
    } catch (e) {}
  }

  var handovers = handleGetHandoverItems().handoverItems || [];
  var pendingCharts = handleGetPendingCharts().pendingCharts || [];
  var settings = handleGetSettings().settings || {};

  return {
    success: true,
    data: {
      activeShift: activeShift,
      patientStats: patientStats,
      handoverItems: handovers,
      pendingCharts: pendingCharts,
      settings: settings,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Save Active State
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
 * Save Shift to Shifts_History
 * Primary key: id / shiftId. If id exists, updates row; otherwise appends row.
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

  // If marked active, update Active_Shift sheet as well
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
 * Delete Shift from Shifts_History
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
 * Save Batch Handovers
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
 * Save Batch Pending Charts
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
 * Save Ward Settings
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
 * Get Ward Settings
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
