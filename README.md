
# Job Tracker App

Automates job application tracking in Google Sheets using Google Apps Script and clasp.
Reduces manual spreadsheet work by generating link titles, cleaning outdated entries, and enabling simple summaries.

---

## Quick Start

Prerequisites:
- A Google Sheet (you can create your own with columns A–J)
- Node.js and npm installed
- Google account access to Apps Script

Install clasp and log in:
```bash
npm install -g @google/clasp
clasp login
````

Link this project to your Apps Script (container-bound Sheet):

```bash
# In your Sheet: Extensions -> Apps Script (creates a bound script)
# Then get the Script ID from Apps Script: Project Settings -> Script ID
clasp clone <SCRIPT_ID>
```

Configure Script Properties (in Apps Script: File -> Project properties -> Script properties):

* SHEET\_ID = your Google Sheet ID
* DEFAULT\_DELAY = 2000
* MAX\_RETRIES = 3

Run:

* Refresh the Sheet. The script triggers on paste into Column J.

---

## Features

* Dynamic link titles: Column J links auto-titled from other columns (e.g., "Column A | Column D")
* Automatic cleanup: updates old titles to stay in sync
* Paste trigger: runs immediately on paste (no manual execution)
* Resilience: basic retries and throttling
* Planned: CSV log rotation; Salesforce + Microsoft Teams integration

---

## Development

Clone and install dependencies:

```bash
git clone https://github.com/audreymhoughton/job-tracker-apps.git
cd job-tracker-apps
npm install
```

Push local code to Apps Script:

```bash
clasp push
```

---

## Roadmap

* Publish a one-click template Google Sheet
* Add CSV logging and rotation
* Add Salesforce and Teams integration
* Add animated GIF demo

---

## 📜 License
Released under the MIT License.  
You are free to use, modify, and distribute this project with attribution and without warranty.

