# ⚗️ Chemical Equipment Parameter Visualizer

> **A Hybrid Web + Desktop Application for Real-Time Chemical Equipment Analytics, Monitoring & Reporting**

[![Python](https://img.shields.io/badge/Python-3.10+-3572A5?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.0.1-092E3F?style=flat-square&logo=djangoproject&logoColor=white)](https://djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![PyQt5](https://img.shields.io/badge/PyQt5-5.15.9-41CD52?style=flat-square)](https://www.riverbankcomputing.com/static/Docs/PyQt5/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.5-FF6384?style=flat-square&logo=chartjs&logoColor=white)](https://www.chartjs.org/)
[![Matplotlib](https://img.shields.io/badge/Matplotlib-3.7-EE4C2C?style=flat-square)](https://matplotlib.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 🚀 Live Deployment Links

| Platform | URL | Status |
|----------|-----|--------|
| 🌐 **Web App (Vercel)** | [chemical-equipment-visualizer-hahr.vercel.app](https://chemical-equipment-visualizer-hahr.vercel.app) | ✅ Live |
| ⚙️ **Backend API (Render)** | [chemical-equipment-visualizer-8csk.onrender.com](https://chemical-equipment-visualizer-8csk.onrender.com) | ✅ Live |

> **Note:** The Render backend is on a free tier — first request after inactivity may take ~50 seconds to spin up.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
  - [Backend (Django)](#backend-django)
  - [Frontend Web (React)](#frontend-web-react)
  - [Frontend Desktop (PyQt5)](#frontend-desktop-pyqt5)
- [API Endpoints](#-api-endpoints)
- [Sample Data](#-sample-data)
- [Screenshots](#-screenshots)
- [How It Works](#-how-it-works)
- [Task Requirement Checklist](#-task-requirement-checklist)

---

## 📌 Project Overview

**Chemical Equipment Parameter Visualizer** is a full-stack hybrid application that enables users to upload CSV datasets containing chemical equipment parameters (flowrate, pressure, temperature) and receive instant analytics, visualizations, alerts, and exportable reports — simultaneously through both a **React web app** and a **PyQt5 desktop app**, both backed by the same **Django REST API**.

The platform goes beyond basic visualization by incorporating **health scoring**, **anomaly detection**, **predictive alerts**, **equipment rankings**, **maintenance scheduling**, and **multi-format report generation (PDF, Excel, CSV)**.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│                                                             │
│   ┌─────────────────┐          ┌─────────────────────┐     │
│   │  React Web App   │          │  PyQt5 Desktop App  │     │
│   │  (Vercel)        │          │  (Local)            │     │
│   │  Chart.js        │          │  Matplotlib         │     │
│   │  Framer Motion   │          │  Pandas             │     │
│   └────────┬────────┘          └──────────┬──────────┘     │
│            │  HTTP / REST                  │  HTTP / REST   │
└────────────┼──────────────────────────────┼────────────────┘
             │                              │
             ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER (Django)                   │
│                       (Render)                              │
│                                                             │
│   ┌──────────────┐  ┌──────────┐  ┌────────────────────┐   │
│   │  REST API     │  │  Pandas  │  │  Report Generators │   │
│   │  (DRF)        │  │  Engine  │  │  (PDF / Excel)     │   │
│   └──────┬───────┘  └────┬─────┘  └────────────────────┘   │
│          │               │                                  │
│          ▼               ▼                                  │
│   ┌─────────────────────────┐                               │
│   │      SQLite / PostgreSQL │                               │
│   │      Database            │                               │
│   └─────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend (Web)** | React.js 19 + Chart.js 4 + Framer Motion | Interactive UI with animated charts & transitions |
| **Frontend (Desktop)** | PyQt5 5.15 + Matplotlib 3.7 | Native desktop GUI with publication-quality charts |
| **Backend** | Django 5.0 + Django REST Framework 3.14 | RESTful API, data processing, report generation |
| **Authentication** | Django Auth + Basic Auth | Secure API access (desktop client) |
| **Data Processing** | Pandas 2.1 + NumPy 1.26 + Scikit-Learn 1.3 | CSV parsing, analytics, linear regression for predictions |
| **PDF Reports** | ReportLab 4.0 | Server-side PDF generation with styled tables |
| **Excel Reports** | Openpyxl 3.1 | Multi-sheet Excel exports with charts & formatting |
| **CORS** | django-cors-headers 4.3 | Cross-origin support for Vercel ↔ Render |
| **Deployment (API)** | Render (Web Service) | Python 3 backend hosting |
| **Deployment (Web)** | Vercel | React app hosting with auto-deploy from GitHub |
| **Database** | SQLite (dev) / PostgreSQL (prod via `dj-database-url`) | Persistent data storage |
| **Version Control** | Git + GitHub | Source code management |

---

## ✨ Features

### Core Features (Required)
- ✅ **CSV Upload** — Both Web and Desktop frontends allow users to upload CSV files to the backend via a single REST endpoint.
- ✅ **Data Summary API** — Returns total record count, average flowrate/pressure/temperature, and equipment type distribution in one response.
- ✅ **Visualization** — Web uses Chart.js (Bar, Line, Doughnut, Radar charts); Desktop uses Matplotlib (Bar, Line, Pie charts) with a chart-type selector.
- ✅ **History Management** — All uploaded datasets are persisted in the database with timestamps; the Trends endpoint queries the last N days of data.
- ✅ **PDF Report Generation** — Server-side PDF reports via ReportLab with styled summary tables and metadata.
- ✅ **Basic Authentication** — The Django backend supports session-based auth; the desktop client uses HTTP Basic Auth.

### Advanced Features (Extras)
- 🏆 **Equipment Rankings** — Automatic scoring and ranking of all equipment by health, efficiency, and performance.
- 🚨 **Alert System** — Real-time critical and warning alerts are generated on upload when parameters breach thresholds. Alerts can be resolved via the UI.
- 🔮 **Predictive Alerts** — Scikit-Learn linear regression is used to forecast equipment failures based on historical parameter trends.
- ⚖️ **Equipment Comparison** — Select up to 3 pieces of equipment and generate a side-by-side comparison chart and table.
- 📊 **Excel Export** — Full multi-sheet Excel reports (Summary, Equipment Details with charts, Rankings, Alerts) generated server-side.
- 🛠️ **Maintenance Scheduling** — View and update maintenance task statuses directly from the web app.
- 💚 **Health Score Circles** — Each equipment card displays an animated SVG health-score gauge computed from flowrate, pressure, and temperature.
- 🌙 **Dark Mode** — Full dark-mode toggle persisted in localStorage (web app).
- 📱 **Responsive Design** — The web app is fully responsive from mobile to desktop viewports.
- ⛶ **Fullscreen Charts** — Any chart can be opened in a fullscreen modal for detailed inspection.
- 🔔 **Toast Notifications** — Animated success/error notifications with auto-dismiss.

---

## 📂 Project Structure

```
chemical-equipment-visualizer/
│
├── backend/                        # Django backend (API + DB)
│   ├── server/                     # Django project settings
│   │   ├── settings.py             # Configuration (CORS, DB, Auth, etc.)
│   │   ├── urls.py                 # Root URL router
│   │   ├── wsgi.py                 # WSGI entry point
│   │   └── asgi.py                 # ASGI entry point
│   ├── equipment/                  # Main Django app
│   │   ├── models.py               # All DB models (Dataset, Alerts, Rankings, etc.)
│   │   ├── views.py                # API views (upload, alerts, reports, rankings, etc.)
│   │   ├── urls.py                 # App-level URL routes
│   │   ├── admin.py                # Admin site registration
│   │   ├── apps.py                 # App configuration
│   │   └── migrations/             # DB migration files
│   ├── manage.py                   # Django management script
│   ├── requirements.txt            # Python dependencies
│   └── build.sh                    # Render deployment build script
│
├── frontend-web/                   # React web application
│   ├── public/                     # Static assets
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── App.js                  # Main app component (all tabs, charts, logic)
│   │   ├── index.js                # React entry point
│   │   ├── index.css               # Base styles
│   │   ├── components/             # Reusable sub-components
│   │   │   ├── UploadCard.js
│   │   │   ├── ChartCard.js
│   │   │   └── SummaryCard.js
│   │   └── styles/                 # CSS stylesheets
│   │       ├── App.css             # Core layout & component styles
│   │       ├── NewFeatures.css     # Alerts, Maintenance, Comparison styles
│   │       ├── RankingsEnhanced.css# Podium & rankings table styles
│   │       └── enhanced-sections.css # Analytics & trend enhancements
│   ├── package.json                # Node dependencies
│   └── .env.production             # API URL configuration
│
├── frontend-desktop/               # PyQt5 desktop application
│   ├── app.py                      # Full desktop app (UI, charts, API calls)
│   └── requirements.txt            # Python dependencies (PyQt5, Matplotlib, etc.)
│
├── sample_data/
│   └── sample_equipment_data.csv   # 15-row sample CSV for testing
│
└── README.md                       # This file
```

---

## ⚙️ Setup & Installation

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Git**

---

### Backend (Django)

```bash
# 1. Clone the repository
git clone https://github.com/Vinayak-123-jpj/chemical-equipment-visualizer.git
cd chemical-equipment-visualizer/backend

# 2. Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run migrations
python manage.py migrate

# 5. (Optional) Create a superuser for Django Admin
python manage.py createsuperuser

# 6. Start the development server
python manage.py runserver
# Backend will be available at: http://127.0.0.1:8000
```

---

### Frontend Web (React)

```bash
# From the repository root
cd frontend-web

# 1. Install dependencies
npm install

# 2. Start the development server
npm start
# Web app will be available at: http://localhost:3000
```

> **Note:** The React app points to `http://127.0.0.1:8000` by default in development. For production, set `REACT_APP_API_URL` in `.env.production` to your deployed backend URL.

---

### Frontend Desktop (PyQt5)

```bash
# From the repository root
cd frontend-desktop

# 1. (Recommended) Create a virtual environment
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the desktop app
python app.py
```

> **Note:** The desktop app sends requests to `http://127.0.0.1:8000` with Basic Auth (`vinayak` / `test@1234`). Ensure the Django backend is running locally before launching.

---

## 📡 API Endpoints

All endpoints are prefixed with `/api/`. The backend is deployed at:
`https://chemical-equipment-visualizer-8csk.onrender.com`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload/` | Upload a CSV file; returns summary stats + type distribution |
| `GET` | `/api/trends/?days=N` | Retrieve historical averages for the last N days |
| `GET` | `/api/alerts/?resolved=false` | Fetch active (or resolved) equipment alerts |
| `POST` | `/api/alerts/<id>/resolve/` | Mark an alert as resolved |
| `GET` | `/api/rankings/` | Get equipment performance rankings (top 20) |
| `POST` | `/api/compare-equipment/` | Compare 2–3 pieces of equipment side-by-side |
| `GET` | `/api/maintenance/` | List scheduled/in-progress maintenance tasks |
| `POST` | `/api/maintenance/create/` | Create a new maintenance schedule entry |
| `POST` | `/api/maintenance/<id>/update/` | Update a maintenance task status |
| `GET` | `/api/report/` | Generate and download a PDF report |
| `GET` | `/api/export/excel/` | Generate and download a multi-sheet Excel report |
| `GET` | `/api/email-reports/` | List user's email report schedules |
| `POST` | `/api/email-reports/schedule/` | Create a new email report schedule |
| `PUT` | `/api/email-reports/<id>/update/` | Update an email schedule |
| `DELETE` | `/api/email-reports/<id>/delete/` | Delete an email schedule |

### Upload CSV — Request & Response

**Request** (`multipart/form-data`):
```
POST /api/upload/
Content-Type: multipart/form-data

file: <your_file.csv>
```

**Expected CSV columns:**
```
Equipment Name, Type, Flowrate, Pressure, Temperature
```

**Response** (`200 OK`):
```json
{
  "total_records": 15,
  "avg_flowrate": 126.53,
  "avg_pressure": 6.19,
  "avg_temperature": 117.07,
  "type_distribution": {
    "Pump": 4,
    "Compressor": 2,
    "Valve": 3,
    "HeatExchanger": 2,
    "Reactor": 2,
    "Condenser": 2
  }
}
```

---

## 📄 Sample Data

A sample CSV file is provided at `sample_data/sample_equipment_data.csv` for quick testing:

| Equipment Name | Type | Flowrate | Pressure | Temperature |
|----------------|------|----------|----------|-------------|
| Pump-1 | Pump | 120 | 5.2 | 110 |
| Compressor-1 | Compressor | 95 | 8.4 | 95 |
| Valve-1 | Valve | 60 | 4.1 | 105 |
| HeatExchanger-1 | HeatExchanger | 150 | 6.2 | 130 |
| Reactor-1 | Reactor | 140 | 7.5 | 140 |
| ... | ... | ... | ... | ... |

The file contains **15 rows** across **6 equipment types** and is ideal for demonstrating all features including alerts (Compressor-1 triggers a pressure warning) and distribution charts.

---

## 📸 Screenshots

### Web App — Dashboard
![Web Dashboard](https://i.imgur.com/placeholder1.png)
*Upload CSV → instant summary cards, animated distribution charts (Bar / Line / Doughnut), and export buttons.*

### Web App — Equipment Cards with Health Scores
![Equipment Cards](https://i.imgur.com/placeholder2.png)
*Each card shows an animated SVG health gauge, status badge, and key metrics. Compare mode allows side-by-side analysis.*

### Web App — Rankings Leaderboard
![Rankings](https://i.imgur.com/placeholder3.png)
*Top 3 equipment on a gold/silver/bronze podium with animated score rings; full table below.*

### Desktop App — PyQt5 Dashboard
![Desktop Dashboard](https://i.imgur.com/placeholder4.png)
*Native PyQt5 interface with stat cards, Matplotlib charts, searchable/sortable equipment table, and CSV export.*

---

## 🔄 How It Works

1. **User uploads a CSV** via the web or desktop frontend.
2. The frontend sends a `POST /api/upload/` multipart request to the Django backend.
3. **Django (Pandas)** reads the CSV, validates the required columns, and computes:
   - Summary statistics (averages, counts, type distribution)
   - Per-equipment **health scores** based on flowrate/pressure/temperature thresholds
   - **Alerts** for any parameters breaching critical/warning thresholds
   - **Equipment rankings** sorted by overall health score
4. All data is **persisted** to the database (`Dataset`, `EquipmentParameter`, `EquipmentAlert`, `EquipmentRanking` models).
5. The summary JSON is returned to the frontend, which **updates the UI in real time** — charts re-render, stat cards animate, and the equipment grid populates.
6. On subsequent visits, the frontend fetches **trends**, **alerts**, **rankings**, and **maintenance schedules** from dedicated endpoints to populate the remaining tabs.
7. **Report generation** (PDF / Excel) is triggered on-demand; the backend streams the file directly as a download response.

---

## ✅ Task Requirement Checklist

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 1 | CSV Upload (Web + Desktop) | ✅ Done | Both frontends upload to `POST /api/upload/` |
| 2 | Data Summary API | ✅ Done | Returns count, averages, type distribution |
| 3 | Visualization (Chart.js + Matplotlib) | ✅ Done | Web: Bar/Line/Doughnut/Radar · Desktop: Bar/Line/Pie |
| 4 | History Management (last 5 datasets) | ✅ Done | All datasets stored; `/api/trends/` queries by date range |
| 5 | PDF Report Generation | ✅ Done | ReportLab-based PDF with summary table |
| 6 | Basic Authentication | ✅ Done | Django Auth; desktop uses HTTP Basic Auth |
| 7 | Sample CSV for demo | ✅ Done | `sample_data/sample_equipment_data.csv` (15 rows) |
| — | GitHub Source Code | ✅ Done | [Vinayak-123-jpj/chemical-equipment-visualizer](https://github.com/Vinayak-123-jpj/chemical-equipment-visualizer) |
| — | README with setup instructions | ✅ Done | This file |
| — | Web deployment link | ✅ Done | [Vercel](https://chemical-equipment-visualizer-hahr.vercel.app) |
| — | Backend deployment link | ✅ Done | [Render](https://chemical-equipment-visualizer-8csk.onrender.com) |

---

## 🏅 Bonus / Extra Implementations

| Feature | Technology |
|---------|------------|
| Equipment Health Scoring | Custom scoring algorithm (flowrate/pressure/temp thresholds) |
| Anomaly Detection | Z-score based (mean ± 2σ) |
| Predictive Failure Alerts | Scikit-Learn `LinearRegression` on historical trends |
| Equipment Comparison | POST endpoint + grouped Bar chart |
| Maintenance Scheduling | Full CRUD with priority & status management |
| Multi-Sheet Excel Export | Openpyxl with charts, color-coded alerts & medal highlights |
| Dark Mode | CSS variables + localStorage persistence |
| Animated UI | Framer Motion transitions + CSS keyframe animations |
| Fullscreen Chart Modal | Any chart can be expanded to a fullscreen overlay |
| Responsive Layout | Mobile-first CSS with media queries down to 480px |
| Email Report Scheduling | API endpoints for configuring automated report schedules |

---

## 📝 License

This project is licensed under the **MIT License**.

---

*Built with ❤️ — Chemical Equipment Parameter Visualizer (Hybrid Web + Desktop App)*
