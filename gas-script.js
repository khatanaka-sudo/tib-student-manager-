// ========================================
// TIB学生メンバー管理システム - GAS Backend
// ========================================

// スプレッドシートのシート名
const SHEET_MEMBERS = 'メンバー';
const SHEET_ATTENDANCE = '出席記録';
const SHEET_MENTORING = 'メンタリング';
const SHEET_PITCH = 'ピッチチーム';

/**
 * Webアプリのエントリーポイント（GET/POST両対応）
 */
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

/**
 * リクエストを処理
 */
function handleRequest(e) {
  try {
    const action = e.parameter.action || e.parameters?.action?.[0];
    
    if (!action) {
      return createResponse({ error: 'アクションが指定されていません' }, 400);
    }

    let result;
    
    switch(action) {
      // メンバー関連
      case 'getMembers':
        result = getMembers();
        break;
      case 'addMember':
        result = addMember(JSON.parse(e.parameter.data || e.postData?.contents));
        break;
      case 'deleteMember':
        result = deleteMember(e.parameter.id);
        break;
      
      // 出席記録関連
      case 'getAttendance':
        result = getAttendance();
        break;
      case 'saveAttendance':
        result = saveAttendance(JSON.parse(e.parameter.data || e.postData?.contents));
        break;
      
      // メンタリング関連
      case 'getMentoring':
        result = getMentoring();
        break;
      case 'addMentoring':
        result = addMentoring(JSON.parse(e.parameter.data || e.postData?.contents));
        break;
      case 'deleteMentoring':
        result = deleteMentoring(e.parameter.id);
        break;
      
      // ピッチ関連
      case 'getPitchTeams':
        result = getPitchTeams();
        break;
      case 'addPitchTeam':
        result = addPitchTeam(JSON.parse(e.parameter.data || e.postData?.contents));
        break;
      case 'deletePitchTeam':
        result = deletePitchTeam(e.parameter.id);
        break;
      
      default:
        return createResponse({ error: '不明なアクション: ' + action }, 400);
    }
    
    return createResponse({ success: true, data: result });
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * レスポンスを作成
 */
function createResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * アクティブなスプレッドシートを取得
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  
  return sheet;
}

/**
 * シートの初期化（見出し行を設定）
 */
function initializeSheet(sheet, sheetName) {
  let headers = [];
  
  switch(sheetName) {
    case SHEET_MEMBERS:
      headers = ['ID', '名前', 'よみがな', '大学', '学年', '役割', '関心分野', 'メールアドレス', '登録日'];
      break;
    case SHEET_ATTENDANCE:
      headers = ['年月', 'メンバーID', '出席'];
      break;
    case SHEET_MENTORING:
      headers = ['ID', 'メンバーID', '日付', 'メンター名', '形式', 'メモ'];
      break;
    case SHEET_PITCH:
      headers = ['ID', 'チーム名', '代表者名', 'TIB所属', 'ステータス', '登録日'];
      break;
  }
  
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
  }
}

// ========================================
// メンバー関連の関数
// ========================================

function getMembers() {
  const sheet = getSheet(SHEET_MEMBERS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const members = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // IDがある行のみ
      members.push({
        id: row[0],
        name: row[1] || '',
        kana: row[2] || '',
        uni: row[3] || '',
        grade: row[4] || '',
        role: row[5] || '一般メンバー',
        interest: row[6] || '',
        email: row[7] || '',
        createdAt: row[8] || ''
      });
    }
  }
  
  return members;
}

function addMember(memberData) {
  const sheet = getSheet(SHEET_MEMBERS);
  const lastRow = sheet.getLastRow();
  
  // 新しいIDを生成
  let maxId = 0;
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    ids.forEach(row => {
      if (row[0] && !isNaN(row[0])) {
        maxId = Math.max(maxId, parseInt(row[0]));
      }
    });
  }
  const newId = maxId + 1;
  
  const newRow = [
    newId,
    memberData.name || '',
    memberData.kana || '',
    memberData.uni || '',
    memberData.grade || '',
    memberData.role || '一般メンバー',
    memberData.interest || '',
    memberData.email || '',
    memberData.createdAt || new Date().toISOString().split('T')[0]
  ];
  
  sheet.appendRow(newRow);
  return { id: newId };
}

function deleteMember(id) {
  const sheet = getSheet(SHEET_MEMBERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { error: 'メンバーが見つかりません' };
}

// ========================================
// 出席記録関連の関数
// ========================================

function getAttendance() {
  const sheet = getSheet(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return {};
  
  const attendance = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const month = row[0]; // '2026-04'
    const memberId = row[1];
    const isPresent = row[2];
    
    if (!attendance[month]) {
      attendance[month] = {};
    }
    attendance[month][memberId] = isPresent;
  }
  
  return attendance;
}

function saveAttendance(attendanceData) {
  const sheet = getSheet(SHEET_ATTENDANCE);
  
  // 既存のデータを削除（全クリア）
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  // 新しいデータを追加
  const rows = [];
  for (const month in attendanceData) {
    for (const memberId in attendanceData[month]) {
      rows.push([month, memberId, attendanceData[month][memberId]]);
    }
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  
  return { success: true };
}

// ========================================
// メンタリング関連の関数
// ========================================

function getMentoring() {
  const sheet = getSheet(SHEET_MENTORING);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const logs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      logs.push({
        id: row[0],
        memberId: row[1],
        date: row[2] || '',
        mentor: row[3] || '',
        type: row[4] || '',
        note: row[5] || ''
      });
    }
  }
  
  return logs;
}

function addMentoring(logData) {
  const sheet = getSheet(SHEET_MENTORING);
  const lastRow = sheet.getLastRow();
  
  // 新しいIDを生成
  let maxId = 0;
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    ids.forEach(row => {
      if (row[0] && !isNaN(row[0])) {
        maxId = Math.max(maxId, parseInt(row[0]));
      }
    });
  }
  const newId = maxId + 1;
  
  const newRow = [
    newId,
    logData.memberId,
    logData.date || '',
    logData.mentor || '',
    logData.type || '',
    logData.note || ''
  ];
  
  sheet.appendRow(newRow);
  return { id: newId };
}

function deleteMentoring(id) {
  const sheet = getSheet(SHEET_MENTORING);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { error: 'メンタリング記録が見つかりません' };
}

// ========================================
// ピッチチーム関連の関数
// ========================================

function getPitchTeams() {
  const sheet = getSheet(SHEET_PITCH);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const teams = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      teams.push({
        id: row[0],
        team: row[1] || '',
        leader: row[2] || '',
        tib: row[3] || 'no',
        status: row[4] || '',
        createdAt: row[5] || ''
      });
    }
  }
  
  return teams;
}

function addPitchTeam(teamData) {
  const sheet = getSheet(SHEET_PITCH);
  const lastRow = sheet.getLastRow();
  
  // 新しいIDを生成
  let maxId = 0;
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    ids.forEach(row => {
      if (row[0] && !isNaN(row[0])) {
        maxId = Math.max(maxId, parseInt(row[0]));
      }
    });
  }
  const newId = maxId + 1;
  
  const newRow = [
    newId,
    teamData.team || '',
    teamData.leader || '',
    teamData.tib || 'no',
    teamData.status || '',
    teamData.createdAt || new Date().toISOString().split('T')[0]
  ];
  
  sheet.appendRow(newRow);
  return { id: newId };
}

function deletePitchTeam(id) {
  const sheet = getSheet(SHEET_PITCH);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { error: 'チームが見つかりません' };
}
