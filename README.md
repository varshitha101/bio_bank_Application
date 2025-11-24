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

## Version Control

### Version 1.7.13

- Issue resolved with excel download where Tissue Box Name column was missing for FT
- Issue resolved related mrn not being displayed and data getting cleared in bbnmrn node in firbase
  1. Added condition to check mrn and bioBankId.
  2. Added loading screen to waiting mrn and data is loaded
