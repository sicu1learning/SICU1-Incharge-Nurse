import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Code,
  Globe,
  Smartphone,
  Laptop,
  ArrowRight,
  ShieldCheck,
  ServerOff,
} from 'lucide-react';
import {
  subscribeGasStatus,
  GasConnectionStatus,
  getStoredGasUrl,
  setStoredGasUrl,
  testGasConnection,
  getStoredSpreadsheetInfo,
} from '../services/googleAppsScriptService';
import { refreshFromGoogleSheets } from '../services/wardDataService';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({ isOpen, onClose }) => {
  const [gasUrl, setGasUrl] = useState<string>(getStoredGasUrl);
  const [status, setStatus] = useState<GasConnectionStatus>({
    state: 'not_configured',
    url: '',
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'instructions' | 'code'>('settings');

  useEffect(() => {
    const unsub = subscribeGasStatus((s) => {
      setStatus(s);
      if (s.url && !gasUrl) {
        setGasUrl(s.url);
      }
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    if (!gasUrl.trim()) {
      setTestResult({ success: false, message: 'กรุณากรอก Google Apps Script Web App URL' });
      return;
    }
    setStoredGasUrl(gasUrl.trim());
    setIsTesting(true);
    setTestResult(null);

    const res = await testGasConnection(gasUrl.trim());
    setIsTesting(false);
    if (res.success) {
      setTestResult({
        success: true,
        message: `เชื่อมต่อสำเร็จ: ${res.spreadsheetName || 'Google Sheets'}`,
      });
      // Trigger initial pull
      refreshFromGoogleSheets();
    } else {
      setTestResult({
        success: false,
        message: res.error || 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบ URL หรือสิทธิ์ Anyone',
      });
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await refreshFromGoogleSheets();
    setIsSyncing(false);
    if (res.success) {
      setTestResult({ success: true, message: 'ซิงค์ข้อมูลจาก Google Sheets สำเร็จแล้ว' });
    } else {
      setTestResult({ success: false, message: res.error || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล' });
    }
  };

  const appsScriptCode = `/**
 * SICU1 Incharge Nurse - Google Apps Script Web API
 * Google Sheets Backend
 */
var SHEET_NAMES = {
  ACTIVE_SHIFT: 'Active_Shift',
  SHIFTS_HISTORY: 'Shifts_History',
  HANDOVER_ITEMS: 'Handover_Items',
  PENDING_CHARTS: 'Pending_Charts',
  SETTINGS: 'Settings'
};

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'ping';
    var result;
    if (action === 'ping') result = handlePing();
    else if (action === 'getState') result = handleGetState();
    else if (action === 'getHistory') result = handleGetHistory();
    else if (action === 'getSettings') result = handleGetSettings();
    else result = { success: false, error: 'Unknown action: ' + action };
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch (err) { payload = e.parameter || {}; }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    var action = payload.action || 'saveState';
    var result;
    if (action === 'saveState') result = handleSaveState(payload);
    else if (action === 'saveShift') result = handleSaveShift(payload);
    else if (action === 'deleteShift') result = handleDeleteShift(payload);
    else if (action === 'saveHandovers') result = handleSaveHandovers(payload.handoverItems || []);
    else if (action === 'savePendingCharts') result = handleSavePendingCharts(payload.pendingCharts || []);
    else if (action === 'saveSettings') result = handleSaveSettings(payload.settings || {});
    else if (action === 'ping') result = handlePing();
    else result = { success: false, error: 'Unknown POST action: ' + action };
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

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
      activeShift = {
        id: String(values[0] || ''),
        date: String(values[1] || ''),
        shiftType: String(values[2] || ''),
        inchargeName: String(values[3] || ''),
        previousShiftInfo: String(values[4] || ''),
        isActive: Boolean(values[5]),
        createdAt: String(values[6] || ''),
        updatedAt: String(values[7] || ''),
        stats: values[8] ? JSON.parse(values[8]) : null,
        movementRecords: values[9] ? JSON.parse(values[9]) : [],
        consultationData: values[10] ? JSON.parse(values[10]) : null,
        staffData: values[11] ? JSON.parse(values[11]) : null,
        equipmentWeanData: values[12] ? JSON.parse(values[12]) : null,
        incidentData: values[13] ? JSON.parse(values[13]) : null,
        handoverItems: [],
        pendingCharts: []
      };
      patientStats = activeShift.stats;
    } catch(e) {}
  }
  var handoverSheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_ITEMS, [
    'id', 'title', 'details', 'patientName', 'bedNumber', 'priority', 'category', 'createdBy', 'createdAt', 'shiftId', 'isCompleted'
  ]);
  var handoverItems = [];
  var hLastRow = handoverSheet.getLastRow();
  if (hLastRow >= 2) {
    var hData = handoverSheet.getRange(2, 1, hLastRow - 1, 11).getValues();
    for (var i = 0; i < hData.length; i++) {
      var row = hData[i];
      if (row[0]) {
        handoverItems.push({
          id: String(row[0]), title: String(row[1] || ''), details: String(row[2] || ''),
          patientName: String(row[3] || ''), bedNumber: String(row[4] || ''),
          priority: String(row[5] || 'normal'), category: String(row[6] || ''),
          createdBy: String(row[7] || ''), createdAt: String(row[8] || ''),
          shiftId: String(row[9] || ''), isCompleted: Boolean(row[10])
        });
      }
    }
  }
  var pendingSheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS, [
    'id', 'patientName', 'hn', 'doctors', 'location', 'dateAdded', 'daysPending', 'note', 'shiftId', 'status'
  ]);
  var pendingCharts = [];
  var pLastRow = pendingSheet.getLastRow();
  if (pLastRow >= 2) {
    var pData = pendingSheet.getRange(2, 1, pLastRow - 1, 10).getValues();
    for (var j = 0; j < pData.length; j++) {
      var pRow = pData[j];
      if (pRow[0]) {
        var doctors = [];
        try { doctors = pRow[3] ? JSON.parse(pRow[3]) : []; } catch(e) { doctors = [String(pRow[3])]; }
        pendingCharts.push({
          id: String(pRow[0]), patientName: String(pRow[1] || ''), hn: String(pRow[2] || ''),
          doctors: doctors, location: String(pRow[4] || 'SICU'), dateAdded: String(pRow[5] || ''),
          daysPending: Number(pRow[6]) || 0, note: String(pRow[7] || ''), shiftId: String(pRow[8] || ''),
          status: String(pRow[9] || 'pending')
        });
      }
    }
  }
  return {
    success: true,
    data: {
      activeShift: activeShift, patientStats: patientStats,
      handoverItems: handoverItems, pendingCharts: pendingCharts,
      updatedAt: new Date().toISOString()
    }
  };
}

function handleGetHistory() {
  var historySheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY, ['shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo', 'fullDataJson', 'createdAt', 'updatedAt']);
  var shifts = [];
  var lastRow = historySheet.getLastRow();
  if (lastRow >= 2) {
    var data = historySheet.getRange(2, 1, lastRow - 1, 37).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      var fullData = null;
      if (row[34]) {
        try { fullData = JSON.parse(row[34]); } catch (e) {}
      }
      if (fullData && fullData.id) shifts.push(fullData);
    }
  }
  return { success: true, shifts: shifts };
}

function handleSaveState(payload) {
  var shift = payload.currentShift || payload.activeShift;
  var stats = payload.patientStats || (shift ? shift.stats : null);
  if (shift) {
    var activeShiftSheet = getOrCreateSheet(SHEET_NAMES.ACTIVE_SHIFT, [
      'shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo',
      'isActive', 'createdAt', 'updatedAt', 'statsJson', 'movementRecordsJson',
      'consultationDataJson', 'staffDataJson', 'equipmentWeanDataJson', 'incidentDataJson'
    ]);
    var rowValues = [
      shift.id || '', shift.date || '', shift.shiftType || '', shift.inchargeName || '', shift.previousShiftInfo || '',
      true, shift.createdAt || new Date().toISOString(), new Date().toISOString(),
      JSON.stringify(stats || shift.stats || {}), JSON.stringify(shift.movementRecords || []),
      JSON.stringify(shift.consultationData || {}), JSON.stringify(shift.staffData || {}),
      JSON.stringify(shift.equipmentWeanData || {}), JSON.stringify(shift.incidentData || {})
    ];
    activeShiftSheet.getRange(2, 1, 1, rowValues.length).setValues([rowValues]);
  }
  if (Array.isArray(payload.handoverItems)) handleSaveHandovers(payload.handoverItems);
  if (Array.isArray(payload.pendingCharts)) handleSavePendingCharts(payload.pendingCharts);
  return { success: true, message: 'Saved to Google Sheets', updatedAt: new Date().toISOString() };
}

function handleSaveShift(payload) {
  var shift = payload.shift || payload.currentShift;
  if (!shift || !shift.id) return { success: false, error: 'Missing shift.id' };
  var historySheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY, ['shiftId', 'date', 'shiftType', 'inchargeName', 'previousShiftInfo', 'fullDataJson', 'createdAt', 'updatedAt']);
  var stats = shift.stats || {};
  var row = [
    shift.id, shift.date || '', shift.shiftType || '', shift.inchargeName || '', shift.previousShiftInfo || '',
    Number(stats.carriedOver) || 0, Number(stats.transferredIn) || 0, Number(stats.admittedNew) || 0, Number(stats.transferredOut) || 0,
    Number(stats.againstAdvice) || 0, Number(stats.deceased) || 0, Number(stats.deceasedPostOp24Hr) || 0, Number(stats.admitDischarge24Hr) || 0,
    Number(stats.referOut) || 0, Number(stats.currentRemaining) || 0, Number(stats.category5Count) || 0, Number(stats.category4Count) || 0,
    Number(stats.ventilatorCount) || 0, Number(stats.oxygenCount) || 0, Number(stats.postOpCount) || 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    JSON.stringify(shift), shift.createdAt || new Date().toISOString(), new Date().toISOString()
  ];
  var lastRow = historySheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var ids = historySheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(shift.id)) { foundRow = i + 2; break; }
    }
  }
  if (foundRow > 0) historySheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  else historySheet.appendRow(row);
  if (shift.isActive !== false) handleSaveState({ currentShift: shift });
  return { success: true, message: 'Shift saved', shiftId: shift.id };
}

function handleDeleteShift(payload) {
  var shiftId = payload.shiftId || payload.id;
  if (!shiftId) return { success: false, error: 'Missing shiftId' };
  var historySheet = getOrCreateSheet(SHEET_NAMES.SHIFTS_HISTORY);
  var lastRow = historySheet.getLastRow();
  if (lastRow < 2) return { success: true };
  var ids = historySheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(shiftId)) {
      historySheet.deleteRow(i + 2);
      return { success: true };
    }
  }
  return { success: true };
}

function handleSaveHandovers(items) {
  var sheet = getOrCreateSheet(SHEET_NAMES.HANDOVER_ITEMS, ['id', 'title', 'details', 'patientName', 'bedNumber', 'priority', 'category', 'createdBy', 'createdAt', 'shiftId', 'isCompleted']);
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
  if (!items || items.length === 0) return { success: true };
  var rows = items.map(function(item) {
    return [
      item.id || '', item.title || '', item.details || '', item.patientName || '', item.bedNumber || '',
      item.priority || 'normal', item.category || '', item.createdBy || '', item.createdAt || new Date().toISOString(),
      item.shiftId || '', Boolean(item.isCompleted)
    ];
  });
  sheet.getRange(2, 1, rows.length, 11).setValues(rows);
  return { success: true, count: rows.length };
}

function handleSavePendingCharts(charts) {
  var sheet = getOrCreateSheet(SHEET_NAMES.PENDING_CHARTS, ['id', 'patientName', 'hn', 'doctors', 'location', 'dateAdded', 'daysPending', 'note', 'shiftId', 'status']);
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, 10).clearContent();
  if (!charts || charts.length === 0) return { success: true };
  var rows = charts.map(function(chart) {
    return [
      chart.id || '', chart.patientName || '', chart.hn || '', JSON.stringify(chart.doctors || []),
      chart.location || 'SICU', chart.dateAdded || '', Number(chart.daysPending) || 0,
      chart.note || '', chart.shiftId || '', chart.status || 'pending'
    ];
  });
  sheet.getRange(2, 1, rows.length, 10).setValues(rows);
  return { success: true, count: rows.length };
}

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
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const storedInfo = getStoredSpreadsheetInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004d40] to-[#00695c] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Google Sheets Web API (ฐานข้อมูลกลาง)</h2>
              <p className="text-xs text-teal-100/80">
                สถาปัตยกรรม: Web App → Google Apps Script → Google Sheets (ไม่มี Database อื่น)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">สถานะ:</span>
            {status.state === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ออนไลน์ (Online Real-time)
              </span>
            ) : status.state === 'connecting' || isTesting ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-300">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                กำลังทดสอบการเชื่อมต่อ...
              </span>
            ) : status.state === 'error' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-semibold border border-rose-300">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                เชื่อมต่อไม่สำเร็จ
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-semibold">
                ยังไม่ได้เชื่อมต่อ URL
              </span>
            )}

            {status.lastSyncedAt && (
              <span className="text-slate-500 hidden sm:inline">
                (ซิงค์ล่าสุด: {status.lastSyncedAt} น.)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {storedInfo.url && (
              <a
                href={storedInfo.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium hover:underline"
              >
                <span>เปิด Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#004d40] text-[#004d40]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ตั้งค่า URL การเชื่อมต่อ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'instructions'
                ? 'border-[#004d40] text-[#004d40]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            วิธีติดตั้ง Google Apps Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-[#004d40] text-[#004d40]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>โค้ด Apps Script (Code.gs)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Architecture Guarantee Card */}
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 space-y-2 text-xs leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-teal-950 text-sm">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Google Sheets Single Source of Truth</span>
                </div>
                <p>
                  ระบบนี้ใช้ <strong>Google Sheets กลาง</strong> เป็นฐานข้อมูลเพียงแห่งเดียว
                  ไม่มีการใช้ Database Server, Firebase, SQL, หรือ Local Database อื่นใด
                  ข้อมูลทุกเวรที่บันทึกจาก <strong>Computer, Tablet, หรือ Mobile</strong> จะถูกส่งตรงไปยัง Google Sheets ทันที
                </p>
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Google Apps Script Web App URL <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAndTest}
                    disabled={isTesting || !gasUrl.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#004d40] hover:bg-[#005a4b] disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังทดสอบ...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>บันทึก &amp; ทดสอบ</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  URL ต้องลงท้ายด้วย <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">/exec</code> และตั้งค่าสิทธิ์ให้ "ทุกคน (Anyone)" เข้าถึงได้
                </p>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.message}</p>
                    {!testResult.success && (
                      <p className="text-[11px] text-rose-700 mt-1">
                        คำแนะนำ: ตรวจสอบว่าใน Apps Script ตอน Deploy ได้เลือก <strong>"Who has access: Anyone"</strong> หรือยัง
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between flex-wrap gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing || status.state !== 'connected'}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>ดึงข้อมูลล่าสุดจาก Sheets เดี๋ยวนี้</span>
                </button>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5" /> Computer
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" /> Tablet / Mobile
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>ขั้นตอนการติดตั้ง Google Apps Script ใน Google Sheets</span>
              </h3>
              <ol className="list-decimal pl-5 space-y-2.5">
                <li>
                  เปิด <strong>Google Sheets</strong> เปล่าที่ต้องการใช้เก็บข้อมูลของหอผู้ป่วย SICU1
                </li>
                <li>
                  ไปที่เมนูด้านบน คลิก <strong>ส่วนขยาย (Extensions)</strong> &rarr; <strong>Apps Script</strong>
                </li>
                <li>
                  เปิดแท็บ <strong>"โค้ด Apps Script"</strong> ด้านบน แล้วคลิกปุ่ม <strong>"คัดลอกโค้ดทั้งหมด"</strong>
                </li>
                <li>
                  ในหน้าจอ Apps Script ลบโค้ดเดิมในไฟล์ <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">Code.gs</code> ออกทั้งหมด แล้ว <strong>วางโค้ดที่คัดลอกลงไป</strong>
                </li>
                <li>
                  คลิกไอคอน <strong>บันทึก (Save)</strong>
                </li>
                <li>
                  คลิกปุ่มสีน้ำเงินมุมขวาบน <strong>ทำให้ใช้งานได้ (Deploy)</strong> &rarr; <strong>การทำให้ใช้งานได้รายการใหม่ (New deployment)</strong>
                </li>
                <li>
                  เลือกประเภท: <strong>เว็บแอป (Web app)</strong>
                </li>
                <li>
                  ตั้งค่าดังนี้ (สำคัญมาก):
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600">
                    <li><strong>ดำเนินการในฐานะ (Execute as):</strong> "ฉัน" (Me - อีเมลของคุณ)</li>
                    <li><strong>ผู้ที่มีสิทธิ์เข้าถึง (Who has access):</strong> <span className="text-emerald-700 font-bold">"ทุกคน" (Anyone)</span></li>
                  </ul>
                </li>
                <li>
                  คลิก <strong>ทำให้ใช้งานได้ (Deploy)</strong> &rarr; กดให้สิทธิ์การเข้าถึง (Authorize access)
                </li>
                <li>
                  คัดลอก <strong>URL ของเว็บแอป (Web app URL)</strong> นำมาวางในแท็บ <strong>"ตั้งค่า URL การเชื่อมต่อ"</strong> ของระบบนี้
                </li>
              </ol>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                💡 <strong>หมายเหตุ:</strong> ระบบจะสร้างแท็บชีต <code className="font-mono">Active_Shift</code>, <code className="font-mono">Shifts_History</code>, <code className="font-mono">Handover_Items</code>, <code className="font-mono">Pending_Charts</code> และ <code className="font-mono">Settings</code> พร้อมหัวตารางให้อัตโนมัติทันทีที่มีการบันทึกครั้งแรก
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  ไฟล์ Code.gs (สำหรับวางใน Google Sheets Apps Script)
                </span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>คัดลอกเรียบร้อย!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกโค้ดทั้งหมด</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[350px] leading-relaxed border border-slate-800">
                {appsScriptCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            ระบบจัดเก็บข้อมูลใน Google Sheets เท่านั้น ปราศจาก Database ทุกประเภท
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
