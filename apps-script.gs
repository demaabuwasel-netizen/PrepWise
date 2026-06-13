// Google Apps Script to receive PrepWise logging events
// Deploy as: New → Deployment → Type: Web app → Execute as: Me → Allow: Anyone

// --- CONFIGURATION ---
// If this is a standalone script, paste your Spreadsheet ID here
// You can find it in the URL of your sheet: .../d/[SPREADSHEET_ID]/edit
const SPREADSHEET_ID = "15CLIVmIbJYNnXJRqJLqzNXhfDsOK3H4XmCRck0mQwYM"; 

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("No data received in post body.");
    }
    
    const data = JSON.parse(e.postData.contents);
    const timestamp = new Date().toISOString();

    if (data.eventType === 'CV_SUBMISSION') {
      logCVSubmission(data, timestamp);
    } else if (data.eventType === 'INTERVIEW_START') {
      logInterviewStart(data, timestamp);
    } else if (data.eventType === 'QUESTION_ASKED') {
      logQuestion(data, timestamp);
    } else if (data.eventType === 'ANSWER_SUBMITTED') {
      logAnswer(data, timestamp);
    } else if (data.eventType === 'INTERVIEW_COMPLETE') {
      logInterviewComplete(data, timestamp);
    } else if (data.eventType === 'MOUSE_LOGS') {
      logMouseData(data, timestamp);
    }

    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(name) {
  let ss;
  if (SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) throw new Error("Could not find Spreadsheet. Please check SPREADSHEET_ID.");
  
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'Events') {
      sheet.appendRow(['Timestamp', 'Event Type', 'User/Context', 'Details', 'Preview/Metadata']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#f3f3f3');
    } else if (name === 'Mouse') {
      sheet.appendRow(['Timestamp', 'User', 'Page', 'Record Count']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f3f3f3');
    }
  }
  return sheet;
}

function logCVSubmission(data, timestamp) {
  const sheet = getOrCreateSheet('Events');
  sheet.appendRow([
    timestamp,
    'CV_SUBMISSION',
    data.userProfile?.name || '',
    JSON.stringify({
      field: data.userProfile?.field,
      skills: data.userProfile?.skills,
      experience: data.userProfile?.experience
    }),
    JSON.stringify(data.cvExtracted)
  ]);
}

function logInterviewStart(data, timestamp) {
  const sheet = getOrCreateSheet('Events');
  sheet.appendRow([
    timestamp,
    'INTERVIEW_START',
    data.userName || '',
    JSON.stringify({
      mode: data.interviewMode,
      field: data.userField
    }),
    data.jobDescription?.substring(0, 500) || ''
  ]);
}

function logQuestion(data, timestamp) {
  const sheet = getOrCreateSheet('Events');
  sheet.appendRow([
    timestamp,
    'QUESTION_ASKED',
    '',
    JSON.stringify({
      index: data.questionIndex,
      mode: data.interviewMode
    }),
    data.questionText?.substring(0, 500) || ''
  ]);
}

function logAnswer(data, timestamp) {
  const sheet = getOrCreateSheet('Events');
  sheet.appendRow([
    timestamp,
    'ANSWER_SUBMITTED',
    '',
    JSON.stringify({
      questionIndex: data.questionIndex,
      duration: data.durationSeconds,
      answerLength: data.answerLength
    }),
    data.answerPreview || ''
  ]);
}

function logInterviewComplete(data, timestamp) {
  const sheet = getOrCreateSheet('Events');
  sheet.appendRow([
    timestamp,
    'INTERVIEW_COMPLETE',
    '',
    JSON.stringify({
      duration: data.durationSeconds,
      score: data.overallScore
    }),
    data.feedbackSummary || ''
  ]);
}

function logMouseData(data, timestamp) {
  const sheet = getOrCreateSheet('Mouse');
  sheet.appendRow([
    timestamp,
    '',
    '',
    data.recordCount || data.records?.length || 0
  ]);
}
