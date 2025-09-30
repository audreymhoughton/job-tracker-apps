# Google Sheets Automations: Status Tracking & Smart Link Titles

Google Apps Script utilities that make Google Sheets smarter for managing application trackers or similar workflows.  
The scripts automate **status summaries**, enforce a **6-month rule**, and create **readable link titles**.

---

## ✨ Features

### 📊 Status Tracking
- **Automatic Status Summary**  
  Builds a live `Status Summary` sheet with counts, percentages, and a pie chart of values from Column C.  

- **Color-Coded Chart**  
  Assigns stable, distinct colors to each status category.  

- **6-Month Rule**  
  If Column E contains a date older than 6 months, Column C is set to `Completely Ignored`  
  (unless already marked `Rejected` or `Position Filled`).  

- **Live Updates**  
  The summary refreshes automatically when Column C changes, or via the **Status Tools** menu.

---

### 🔗 Smart Link Titles
- **Column J Auto-Formatting**  
  Pasting a URL into Column J converts it to a clickable `HYPERLINK` with the label  
  `"Column A | Column D"`.  

- **Dynamic Retitling**  
  If Column A or D values change, Column J updates its label while preserving the original URL.  

- **One-Click Cleanup**  
  A menu option retrofits all existing links in Column J to the correct format,  
  whether they were plain URLs, formulas, or rich-text links.

---

## 🚀 Installation

1. Open your Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Delete any existing code in the editor.
4. Paste the contents of this repo’s `.gs` files.
5. Save the project, then reload your sheet.

---

## 📋 Usage

After installing and reloading:

- You’ll see two new menus in your sheet:
  - **Status Tools**
    - *Rebuild Status Summary & Chart*
    - *Mark old entries as “Completely Ignored”*
  - **Link Tools**
    - *Clean up Column J link titles*
- Edits in Column C, A, D, or J will trigger the scripts automatically.
- Run menu items manually at any time to force updates.

---

## 🛠 Use Cases

- Job application tracking
- CRM-style contact logs
- Project or task status boards
- Any workflow needing clean link titles and status reporting

## 📜 License
Released under the MIT License.  
You are free to use, modify, and distribute this project with attribution and without warranty.

