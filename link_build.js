/***********************
 * CONFIG (unique names)
 ***********************/
const LINK_FIRST_ROW = 2;   // data starts on row 2
const COL_A = 1;
const COL_D = 4;
const COL_J = 10;

/***********************
 * MENU
 ***********************/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Link Tools")
    .addItem("Clean up Column J link titles", "fixAllLinkTitlesInColumnJ")
    .addToUi();
}

/***********************
 * AUTO:
 * - Paste/type URL in J -> wrap as HYPERLINK(url,"A | D")
 * - Edit A or D -> retitle J (preserve URL)
 ***********************/
function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const row   = e.range.getRow();
  const col   = e.range.getColumn();

  if (row < LINK_FIRST_ROW) return;

  // If user edited J (single cell), format/retitle it
  if (col === COL_J && e.range.getNumColumns() === 1 && e.range.getNumRows() === 1) {
    // Prefer the live URL; then set label = A | D
    const url = getUrlFromJ_(sheet, row);
    if (url) {
      setJHyperlink_(sheet, row, url, buildLinkLabel_(
        sheet.getRange(row, COL_A).getDisplayValue(),
        sheet.getRange(row, COL_D).getDisplayValue()
      ));
    } else {
      // If it was a plain URL just typed, e.value will have it
      const typed = e.value;
      if (typed && isUrl_(typed)) {
        setJHyperlink_(sheet, row, typed, buildLinkLabel_(
          sheet.getRange(row, COL_A).getDisplayValue(),
          sheet.getRange(row, COL_D).getDisplayValue()
        ));
      }
    }
    return;
  }

  // If user edited A or D, retitle J for that row (keep URL)
  if (col === COL_A || col === COL_D) {
    retitleJ_(sheet, row);
  }
}

/***********************
 * ONE-CLICK CLEANUP
 * Retitles ALL J cells to "A | D" (keeps existing URL from formula, rich text, or plain text)
 ***********************/
function fixAllLinkTitlesInColumnJ() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < LINK_FIRST_ROW) return;

  for (let row = LINK_FIRST_ROW; row <= lastRow; row++) {
    const url = getUrlFromJ_(sheet, row);
    if (!url) continue; // nothing useful in J
    const label = buildLinkLabel_(
      sheet.getRange(row, COL_A).getDisplayValue(),
      sheet.getRange(row, COL_D).getDisplayValue()
    );
    setJHyperlink_(sheet, row, url, label);
  }
}

/***********************
 * CORE HELPERS
 ***********************/
function retitleJ_(sheet, row) {
  const url = getUrlFromJ_(sheet, row);
  if (!url) return;
  const label = buildLinkLabel_(
    sheet.getRange(row, COL_A).getDisplayValue(),
    sheet.getRange(row, COL_D).getDisplayValue()
  );
  setJHyperlink_(sheet, row, url, label);
}

/**
 * Get URL from J via:
 * 1) RichTextValue link (works for formulas & auto-link text)
 * 2) HYPERLINK(...) formula parsing (handles comma or semicolon)
 * 3) Plain text URL
 */
function getUrlFromJ_(sheet, row) {
  const rng = sheet.getRange(row, COL_J);

  // 1) Rich text link (most reliable, resolves formula references too)
  try {
    const rtv = rng.getRichTextValue();
    if (rtv) {
      const runs = rtv.getRuns();
      for (const run of runs) {
        const u = run.getLinkUrl();
        if (u) return u;
      }
    }
  } catch (_) { /* ignore */ }

  // 2) HYPERLINK formula parsing (fallback)
  const f = rng.getFormula();
  if (f && /^=HYPERLINK\(/i.test(f)) {
    const m = f.match(/^=HYPERLINK\(\s*"([^"]*)"\s*[,;]\s*"(?:[^"]*)"\s*\)\s*$/i);
    if (m) return m[1].replace(/""/g, '"');
    // If the URL is a reference (e.g., =HYPERLINK(B2,"...")), rich text should've found it.
  }

  // 3) Plain text URL
  const txt = String(rng.getDisplayValue() || "").trim();
  if (isUrl_(txt)) return txt;

  return null;
}

function setJHyperlink_(sheet, row, url, label) {
  const safeUrl   = String(url   || "").replace(/"/g, '""');
  const a = String(label || "").replace(/"/g, '""');
  sheet.getRange(row, COL_J).setFormula(`=HYPERLINK("${safeUrl}","${a}")`);
}

/***********************
 * LABEL + VALIDATION
 ***********************/
function buildLinkLabel_(aDisplay, dDisplay) {
  const a = String(aDisplay || "").trim();
  const d = String(dDisplay || "").trim();
  if (a && d) return `${a} | ${d}`;
  if (a) return a;
  if (d) return d;
  return "Link";
}

function isUrl_(s) {
  return /^https?:\/\/\S+/i.test(String(s));
}
