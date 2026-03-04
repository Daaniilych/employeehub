# Employee Management Platform - Final Documentation

This file is the single consolidated documentation for the finished diploma project.

It replaces previous separate docs:
- `README.md`
- `QUICK_START.md`
- `INSTALLATION.md`
- `DEPLOYMENT.md`
- `PROJECT_GUIDE.md`
- `USER_GUIDE.md`
- `FEATURES.md`
- `PERMISSIONS_GUIDE.md`
- `PERMISSIONS_CHEATSHEET.md`
- `RESPONSIVE_DESIGN.md`
- `CHANGELOG.md`
- `FINAL_SUMMARY.md`
- `OPIS_PROJEKTU.md`
- `CHAT_FEATURES.md`
- `CHAT_UPDATE_SUMMARY.md`
- `CHANGELOG_CHAT.md`
- `START_PROJECT.md`

## 1) Project Overview

Employee Management Platform is a full-stack web system for:
- company membership and role management,
- time tracking (clock in/out),
- scanner terminal for QR-based operations,
- reporting (Excel/PDF),
- permissions-based access control,
- multilingual interface and localized reports.

## 2) Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Realtime: Socket.IO
- Database: SQLite via `sql.js` (file-based DB)
- Reports: ExcelJS + PDFKit
- Authentication: JWT-based API auth

Database file by default:
- `./database/company.db`
- configurable through `DB_PATH`

## 3) Core Functional Modules

### 3.1 Authentication and Company Context
- Login/Register
- User can belong to company
- Active company context is stored and reused

### 3.2 Members and Roles
- Member listing and role assignment
- Flexible role permissions
- Hierarchy level support
- Owner role with elevated management rights

### 3.3 Time Tracking
- Personal clock in/out
- Status and recent logs
- Visibility based on hierarchy and permissions
- Scanner terminal support

### 3.4 Scanner Terminal
- Dedicated terminal mode for fast QR input
- Separate adaptive UI for tablet/mobile
- Continuous scanner-ready focus handling

### 3.5 Reports
- Generate reports in Excel/PDF
- Date range and member filters
- Field selection
- Language-aware report text
- Report history and file download

## 4) Permissions Model

Project uses explicit permissions with implied permissions for selected parent rights.

Examples of important permission groups:
- Time logs: `view_all_timelogs`, `scan_others`, `use_scanner_terminal`
- Members: `remove_members`, `assign_roles`, `manage_members`
- Roles: `view_roles`, `create_roles`, `edit_roles`, `delete_roles`, `manage_roles`
- Reports: `view_reports`, `create_reports`
- Company settings: `view_company_settings`, `edit_company_settings`, `manage_company`
- Invite code: `view_invite_code`, `refresh_invite_code`

Notes:
- Legacy/removed permissions are sanitized for compatibility.
- Owner has full company-level access.

## 5) Time Log and Report Behavior

- A shift is grouped by `clock_in` date in reports.
- Cross-midnight shift is counted under the day the employee clocked in.
- Open shift (`clock_out` is null) is not finalized until clock out.

## 6) Realtime Behavior

Socket events synchronize key state across users:
- employee clock-in/clock-out updates,
- invite code refresh broadcast to company members.

## 7) Responsive Design Status

Responsive behavior implemented for:
- dashboard cards and live timers,
- scanner terminal (tablet/mobile fit and compact feedback layout),
- key forms and lists.

## 8) Performance Optimizations Applied

Latest project-wide optimization pass includes:
- route-based code splitting in `App.jsx`,
- reduced fallback polling frequency (socket-first updates),
- optimized heavy dashboard data transforms (maps/memoization),
- reduced scanner CPU load (scan interval tuning),
- removal/guarding of noisy runtime debug logs,
- memoized report member filtering,
- backend DB indexes for frequent query paths.

## 9) Project Structure (High Level)

- `frontend/` - React client
- `backend/` - Express API and DB logic
- `database/` - SQLite DB file storage
- `assets/` - static assets/screenshots

## 10) Run and Build

Typical local workflow:
1. Install dependencies
2. Start frontend + backend
3. Open app in browser

Production flow:
1. Build frontend
2. Serve frontend bundle
3. Run backend API
4. Persist DB file and reports directory

## 11) Deployment Notes

- Ensure writable paths for:
  - DB file (`DB_PATH`),
  - generated reports directory (`backend/reports`).
- Keep environment variables separated for dev/prod.
- Add reverse proxy for HTTPS and routing in production.

## 12) Final State and Diploma Positioning

This project is in completed state for diploma presentation:
- full-stack implementation,
- real business workflows,
- role-based security,
- reporting and localization,
- responsive UI and scanner workflow,
- documented architecture and practical optimization work.

## 13) Future Improvements (Optional)

- PostgreSQL migration for higher concurrency and scaling
- formal DB migrations framework
- deeper backend query optimization for large datasets
- E2E test automation for core flows
- observability dashboards (metrics/tracing)

---

Last update: consolidated final documentation.
