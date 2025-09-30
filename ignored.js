function checkDatesAndUpdateC() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();

  var E_COL = 5; // Column E
  var C_COL = 3; // Column C
  var firstDataRow = 2; // skip header row

  var sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Get all values in columns E and C at once
  var dateValues = sheet.getRange(firstDataRow, E_COL, lastRow - firstDataRow + 1).getValues();
  var cValues    = sheet.getRange(firstDataRow, C_COL, lastRow - firstDataRow + 1).getValues();

  for (var i = 0; i < dateValues.length; i++) {
    var row = i + firstDataRow;
    var val = dateValues[i][0];
    var currentC = (cValues[i][0] || "").toString().trim();

    // Skip if C is "Rejected" or "Position Filled"
    if (currentC === "Rejected" || currentC === "Position Filled") {
      continue;
    }

    // Validate date in E
    var dateVal = (Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val))
      ? val
      : (typeof val === "string" && !isNaN(Date.parse(val)) ? new Date(val) : null);

    if (!dateVal) continue; // not a date → skip

    if (dateVal < sixMonthsAgo) {
      sheet.getRange(row, C_COL).setValue("Completely Ignored");
    }
    // else: leave C untouched
  }
}
