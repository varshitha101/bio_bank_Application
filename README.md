# Bio-Bank-App

Bio-Bank-App is a web-based application for managing and tracking biological sample data, including blood, specimen, and primary culture samples. It provides features for sample registration, storage management, patient tracking, and data visualization.

## Features

- **User Authentication:** Secure login for authorized users.
- **Sample Registration:** Add and manage blood, specimen, and primary culture samples.
- **Box Management:** Visualize and manage storage boxes for different sample types.
- **Patient Tracking:** Search, view, and edit patient and sample data.
- **Data Sharing:** Share selected patient/sample data with external collaborators.
- **Progress Tracking:** Multi-step forms with progress indicators.
- **Data Visualization:** Integrated charts and statistics for sample data.
- **Export/Download:** Download sample and patient data as needed.

## Project Structure

```
Bio-Bank-App/
├── assets/
│   ├── css/
│   ├── images/
│   ├── scss/
│   └── vendor/
├── chart.js
├── default.html
├── home.html
├── index.js
├── login.html
├── README.md
├── search.html
├── statistics.html
├── todo.html
```

## Setup & Running

1. **Install [Visual Studio Code](https://code.visualstudio.com/).**
2. Open the project folder in VS Code.
3. Install the **Live Server** extension by Ritwick Dey from the Extensions Marketplace.
4. Click on `login.html` and select **"Go Live"** on the bottom right side of the VS Code tab to run the app in your browser.

For a video guide on starting the server with Live Server in VS Code, see: [How to use Live Server in VS Code](https://www.youtube.com/watch?v=9kEOkw_LvGU)

# Deployment

Deployment link - https://varshitha101.github.io/bio_bank_Application/login.html

## Version Control

### Version 1.7.1

Issues Resolved:

- Redesigned Login Page
- Added logo in the navbar
- Updated text in the Add Sample form
- Update Export script

### Version 1.7.2

Issues Resolved:

- MRN Number not being displayed
- The logic for editing patient details has been updated in both the Search tab and the To-Do tab.

Changes Made:

- Content Update in Login page.

### Version 1.7.3

Issues Resolved:

- In Search Tab - Reset function added (Sample Search).
- Issues in Excel.
- Issues related Pop messages when Cancel or Save & Exit is clicked.

Changes Made:

- Bio Bank Id should be of length 6(2 Alphabet + 4 Digits and not spaces).
- Keyboard Input allowed for date and time entry.
- Added Shared Sample Information in Excel.
- Changes in Subtype Options
- RCB score need to be greater than 3.28 and added 0 in RCB Class

### Version 1.7.4

Issues Resolved:

- Date is enabled in statistics page

### Version 1.7.5

Issues Resolved:

- Excel related issues.
- Statistic page related issue.
- Search filter related issues.
- Navigation and Form submission related issues.

### Version 1.7.6

Issues Resolved

- Issues in the Excel.
- Alert message for "No data" in sample search appeared twice.
- Date was not displayed while viewing samples.

Changes Made:

- New logo has been updated.

### Version 1.7.13

Issues Resolved:

- Issue resolved with excel download where Tissue Box Name column was missing for FT
- Issue resolved related mrn not being displayed and data getting cleared in bbnmrn node in firbase (tested at 3G network)
  1. Added condition to check mrn and bioBankId.
  2. Added loading screen to waiting mrn and data is loaded

### Version 1.7.14

Issues Resolved:

- The issue related to the MRN number has been resolved.
- The Biobank ID has been disabled while editing the sample entry form through Pending Follow-up.
