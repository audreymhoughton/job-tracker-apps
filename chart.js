/***********************
 * CONFIG
 ***********************/
const SUMMARY_SHEET_NAME = "Status Summary"; // where summary + chart live
// If you KNOW your data sheet's name, set it here. Example: "Applications"
const DATA_SHEET_NAME    = null;             // null = auto-detect data sheet
const STATUS_COL         = 3;                // Column C has statuses
const FIRST_DATA_ROW     = 2;                // skip header row

// Palette used for new/unseen statuses (edit to taste)
const COLOR_PALETTE = [
  "#3366CC","#DC3912","#FF9900","#109618","#990099",
  "#0099C6","#DD4477","#66AA00","#B82E2E","#316395",
  "#994499","#22AA99","#AAAA11","#6633CC","#E67300",
  "#8B0707","#651067","#329262","#5574A6","#3B3EAC"
];

/***********************
 * MENUS & AUTO-UPDATE
 ***********************/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Status Tools")
    .addItem("Rebuild Status Summary & Chart", "rebuildStatusSummaryAndChart")
    .addItem("Mark C = 'Completely Ignored' (E > 6 months)", "checkDatesAndUpdateC")
    .addItem("Debug: What sheet & rows?", "debugStatusTools")
    .addToUi();
}

function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const dataSheet = getDataSheet_();
  if (!dataSheet) return;

  // Only react to edits on the data sheet
  if (sheet.getName() !== dataSheet.getName()) return;

  const colStart = e.range.getColumn();
  const colEnd   = colStart + e.range.getNumColumns() - 1;
  if (colEnd < STATUS_COL || colStart > STATUS_COL) return; // edits didn’t touch col C

  rebuildStatusSummaryAndChart();
}

/***********************
 * PART 1: 6-MONTHS RULE (manual sweep)
 * If E is a date > 6 months old → set C = "Completely Ignored"
 * EXCEPT when C is "Rejected" or "Position Filled" (don’t overwrite)
 ***********************/
function checkDatesAndUpdateC() {
  const sheet   = getDataSheet_();
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < FIRST_DATA_ROW) return;

  const E_COL = 5;
  const C_COL = STATUS_COL;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);

  const numRows = lastRow - FIRST_DATA_ROW + 1;
  const eValues = sheet.getRange(FIRST_DATA_ROW, E_COL, numRows, 1).getValues();
  const cValues = sheet.getRange(FIRST_DATA_ROW, C_COL, numRows, 1).getValues();

  for (let i = 0; i < numRows; i++) {
    const row = FIRST_DATA_ROW + i;
    const eVal = eValues[i][0];
    const cVal = (cValues[i][0] || "").toString().trim();

    // Protect these statuses from being changed
    if (cVal === "Rejected" || cVal === "Position Filled") continue;

    const dateVal = isValidDate_(eVal) ? coerceDate_(eVal) : null;
    if (!dateVal) continue;

    if (dateVal < cutoff) {
      sheet.getRange(row, C_COL).setValue("Completely Ignored");
    }
  }
}

/***********************
 * PART 2: SUMMARY + PIE CHART
 * Summary columns: A:Status | B:Count | C:Percent | D:Color
 ***********************/
function rebuildStatusSummaryAndChart() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = getDataSheet_();
  if (!dataSheet) {
    SpreadsheetApp.getUi().alert("No data sheet found. Set DATA_SHEET_NAME or ensure a sheet has values in Column C (from row 2).");
    return;
  }
  const summarySheet = getOrCreateSummarySheet_(ss);

  const lastRow = dataSheet.getLastRow();
  if (lastRow < FIRST_DATA_ROW) {
    writeSummaryTable_(summarySheet, []);
    buildOrUpdateChart_(summarySheet, 1, []);
    return;
  }

  // Read statuses from Column C
  const numRows = lastRow - FIRST_DATA_ROW + 1;
  const statusVals = dataSheet.getRange(FIRST_DATA_ROW, STATUS_COL, numRows, 1).getValues();

  // Count non-blank statuses
  const counts = {};
  statusVals.forEach(r => {
    const s = (r[0] || "").toString().trim();
    if (!s) return;
    counts[s] = (counts[s] || 0) + 1;
  });

  if (Object.keys(counts).length === 0) {
    writeSummaryTable_(summarySheet, []);
    buildOrUpdateChart_(summarySheet, 1, []);
    return;
  }

  // Sort by count desc then name
  const statuses = Object.keys(counts).sort((a,b) => counts[b] - counts[a] || a.localeCompare(b));
  const total = statuses.reduce((acc, s) => acc + counts[s], 0);

  // Rows: [Status, Count, Percent]
  const rows = statuses.map(s => [s, counts[s], counts[s] / (total || 1)]);

  // Build/extend stable color map (persisted in summary)
  const existingMap = readColorMapFromSummary_(summarySheet); // {Status -> #hex}
  const used = new Set(Object.values(existingMap).filter(isHexColor_));
  const colorMap = {...existingMap};

  for (const s of statuses) {
    if (!colorMap[s] || !isHexColor_(colorMap[s])) {
      const next = nextUnusedPaletteColor_(used) || colorFromHash_(s);
      colorMap[s] = next;
      used.add(next);
    }
  }

  // Write table (A:B:C) then write colors in D
  writeSummaryTable_(summarySheet, rows);
  if (rows.length) {
    summarySheet.getRange(2, 4, rows.length, 1).setValues(rows.map(r => [colorMap[r[0]]]));
  }

  // Update chart (uses A:B) with colors ordered to match rows
  const colorList = rows.map(r => colorMap[r[0]]);
  buildOrUpdateChart_(summarySheet, rows.length + 1, colorList);
}

/***********************
 * HELPERS
 ***********************/
function getDataSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // If user set a name explicitly, prefer it.
  if (DATA_SHEET_NAME) {
    const named = ss.getSheetByName(DATA_SHEET_NAME);
    if (named) return named;
  }

  // Otherwise, auto-detect: pick the first sheet that is NOT the summary
  // and actually has some nonblank values in Column C (from FIRST_DATA_ROW).
  const sheets = ss.getSheets();
  for (const sh of sheets) {
    if (sh.getName() === SUMMARY_SHEET_NAME) continue;
    const lastRow = sh.getLastRow();
    if (lastRow < FIRST_DATA_ROW) continue;
    const numRows = lastRow - FIRST_DATA_ROW + 1;
    const vals = sh.getRange(FIRST_DATA_ROW, STATUS_COL, Math.max(1, numRows), 1).getValues();
    const hasAny = vals.some(r => String(r[0] || "").trim() !== "");
    if (hasAny) return sh;
  }
  return null; // not found
}

function getOrCreateSummarySheet_(ss) {
  let sh = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SUMMARY_SHEET_NAME);
  return sh;
}

function writeSummaryTable_(sheet, rows) {
  sheet.clearContents();
  // Headers
  sheet.getRange(1,1,1,4).setValues([["Status","Count","Percent","Color"]]);

  if (!rows.length) return;

  // Write A:B:C (Status, Count, Percent)
  sheet.getRange(2,1,rows.length,3).setValues(rows);
  // Format Percent
  sheet.getRange(2,3,rows.length,1).setNumberFormat("0.0%");
}

function readColorMapFromSummary_(summarySheet) {
  const last = summarySheet.getLastRow();
  if (last < 2) return {};
  // A: Status, B: Count, C: Percent, D: Color
  const range = summarySheet.getRange(2, 1, last - 1, 4).getValues();
  const map = {};
  for (const [status,, , color] of range) {
    const s = (status || "").toString().trim();
    const c = (color  || "").toString().trim();
    if (!s) continue;
    if (c) map[s] = c;
  }
  return map;
}

function buildOrUpdateChart_(sheet, totalRows, colorList) {
  // Chart uses A:B (Status | Count)
  const range = sheet.getRange(1,1,Math.max(totalRows,2),2);
  const charts = sheet.getCharts();
  const pieOpts = {
    title: "Status Breakdown",
    legend: { position: "right" },
    pieSliceText: "percentage"
  };

  if (charts.length > 0) {
    const builder = charts[0].modify().asPieChart().addRange(range);
    Object.keys(pieOpts).forEach(k => builder.setOption(k, pieOpts[k]));
    if (colorList && colorList.length) builder.setOption("colors", colorList);
    sheet.updateChart(builder.build());
  } else {
    const builder = sheet.newChart()
      .asPieChart()
      .addRange(range)
      .setPosition(1, 6, 0, 0);
    Object.keys(pieOpts).forEach(k => builder.setOption(k, pieOpts[k]));
    if (colorList && colorList.length) builder.setOption("colors", colorList);
    sheet.insertChart(builder.build());
  }
}

/***********************
 * COLOR + DATE UTILS
 ***********************/
function isHexColor_(s) {
  return /^#([0-9a-f]{6})$/i.test(s);
}

function nextUnusedPaletteColor_(used) {
  for (const c of COLOR_PALETTE) {
    if (!used.has(c)) return c;
  }
  return null;
}

// Deterministic fallback so unseen statuses get stable colors
function colorFromHash_(status) {
  const h = Math.abs(simpleHash_(status));
  const hue = h % 360, sat = 70, lig = 50;
  return hslToHex_(hue, sat, lig);
}

function simpleHash_(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function hslToHex_(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function isValidDate_(v) {
  if (Object.prototype.toString.call(v) === "[object Date]") return !isNaN(v);
  if (typeof v === "string") return !isNaN(Date.parse(v));
  return false;
}
function coerceDate_(v) {
  return (Object.prototype.toString.call(v) === "[object Date]") ? v : new Date(v);
}

/***********************
 * DEBUG (optional)
 ***********************/
function debugStatusTools() {
  const dataSheet = getDataSheet_();
  const ui = SpreadsheetApp.getUi();
  if (!dataSheet) {
    ui.alert("Debug", "No data sheet found. Set DATA_SHEET_NAME or ensure Column C has values.", ui.ButtonSet.OK);
    return;
  }
  const lastRow = dataSheet.getLastRow();
  ui.alert("Debug",
    `Using data sheet: "${dataSheet.getName()}"\nLastRow: ${lastRow}\nStatus column: C\nFirst data row: ${FIRST_DATA_ROW}`,
    ui.ButtonSet.OK);
}
