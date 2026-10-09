# Smart Maintenance Request & Escalation System (SMRES)

SMRES is an intelligent, full-stack enterprise facility maintenance management platform designed to solve critical operational failures: neglected complaints, delayed life-safety responses, duplicate tickets, improper technician assignments, and recurring asset breakdowns.

---

## 👥 Engineering Team & Module Ownership

- **Shivam (Developer 1)**: Database models, schemas, and core FastAPI CRUD endpoints.
- **Shivani (Developer 2)**: Intelligence services (Smart Priority Engine, Duplicate Detection, Technician Dispatch, SLA Service).
- **Atharva (Developer 3)**: React frontend, enterprise UI dashboard, and REST API integration.
- **Sanket (Developer 4 - Integration Lead)**: Full-stack integration, intelligence orchestration, PostgreSQL test pipeline, cross-module validation, and demo verification.

---

## 🌟 Key Features & Intelligence Services

### 1. Smart Priority Engine (Explainable Formula)
Calculates a transparent, calibrated priority score (0–100) using multi-factor evaluation:
$$\text{Score} = (8 \times \text{Safety}) + (5 \times \text{Operational Impact}) + (4 \times \text{Affected People Score}) + (3 \times \text{Time Sensitivity})$$

#### Documented Affected People Mapping Rule:
- **0 people**: Score `0` (Isolated asset / no direct occupant impact)
- **1–5 people**: Score `1` (Single workstation or private office)
- **6–20 people**: Score `2` (Team room or shared zone)
- **21–50 people**: Score `3` (Department wing)
- **51–200 people**: Score `4` (Entire floor or large common facility)
- **>200 people**: Score `5` (Building-wide or campus-wide operational impact)

#### Calibrated Thresholds:
- **Critical (75–100 pts)**: SLA response window of **1.0 hour** (Demo mode: **1 minute**).
- **High (50–74 pts)**: SLA response window of **4.0 hours** (Demo mode: **2 minutes**).
- **Medium (25–49 pts)**: SLA response window of **24.0 hours** (Demo mode: **5 minutes**).
- **Low (0–24 pts)**: SLA response window of **48.0 hours** (Demo mode: **10 minutes**).

- **Independent Life-Safety Emergency Alert**: Hazardous keywords (*gas leak*, *electrical fire*, *smoke*, *sparking*, *structural collapse*, *chemical spill*) or a maximum safety score (5/5) automatically flag life-safety warnings and elevate the ticket to **Critical** independently of numerical scores.
- **Admin Override**: Facility managers can override recommendations with mandatory audit justification notes.

### 2. Duplicate Incident Detection
Evaluates new submissions against active unresolved tickets using composite similarity:
- Maintenance Category match (30%)
- Geographic / Building / Equipment match (35%)
- Description token Jaccard similarity (35%)
- Flags potential duplicates with match confidence percentages and links tickets without discarding reports.

### 3. SLA Monitoring & Automated Idempotent Escalation
- Background worker checks SLA deadlines every 15–30 seconds.
- Automatically escalates overdue requests to **Level 1 (Facility Manager)** and **Level 2 (Operations Director)**.
- **Idempotent**: Prevents repeated escalation events and suspends checks once resolved.
- Work status remains independent (a ticket can remain `In Progress` while `is_escalated = True`).
- Fallback manual escalation trigger available for urgent staff requests.

### 4. Skill-Based Technician Dispatch
- Matches maintenance categories (`Electrical`, `HVAC`, `Plumbing`, `Structural`, `Fire & Safety`) with technician certifications.
- Balances active workload queues to prevent technician burnout.
- Explains dispatch recommendations (*"Certified in HVAC, Air Conditioning • Current workload: 1 active ticket"*).

### 5. Recurring Issue & Asset Failure Clustering
- Analyzes historical failures across categories, buildings, and equipment tags.
- Surfaces recurring breakdown clusters (e.g. `HVAC-CHILLER-02` in Building B) and suggests proactive preventive inspections before catastrophic failures.

### 6. Interactive Demo Role Switcher
- Instant toggle between **Employee** (`Sarah Jenkins`, `David Chen`) and **Facility Manager / Admin** (`Marcus Vance`, `Elena Rostova`).
- Backend enforces role permissions on status transitions, priority overrides, and technician assignments (returns HTTP 403 Forbidden for unauthorized employee actions).

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Lucide React
- **Backend**: Python 3.10+ / FastAPI, SQLAlchemy 2.0 ORM, Pydantic V2, Uvicorn, PyJWT
- **Database**: PostgreSQL 18 (Mandatory primary database, running on port 5433 with trust auth)
- **Migrations**: Alembic (`backend/alembic/`)
- **Testing**: Pytest (36 automated tests covering unit, API, auth, assignment, and PostgreSQL integration)

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL 14+ (default configured on port `5433` or via `DATABASE_URL`)

### Option A: One-Command Automated Setup (Recommended)

Run the included PowerShell automation scripts from the project root:

```powershell
# 1. Install dependencies, apply Alembic migrations, and seed demo records:
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

# 2. Launch full application (PostgreSQL + FastAPI + Vite React):
powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1

# 3. Stop all services when finished:
powershell -ExecutionPolicy Bypass -File scripts/stop-demo.ps1
```

### Option B: Manual Setup

#### 1. Backend & Database
```powershell
# Install Python dependencies
pip install -r backend/requirements.txt

# Run Alembic migrations and seed demo data
cd backend
alembic upgrade head
python ..\scripts\seed_demo.py
cd ..

# Run FastAPI backend with PostgreSQL:
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- API Documentation (Swagger UI): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

#### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
- Live Web Application: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Testing on PostgreSQL

Run the complete backend test suite against PostgreSQL:
```bash
python -m pytest backend/tests -v
```

### Test Results Summary (23 Passed, 0 Failed):
- **Scenario 1 — Normal Request**: Employee creates request, priority calculated, SLA assigned, persisted in PostgreSQL (`PASSED`).
- **Scenario 2 — Critical Safety Hazard**: Emergency keyword (`gas leak`) triggers safety alert and Critical priority (`PASSED`).
- **Scenario 3 — Potential Duplicate**: Active unresolved issue detected as duplicate without discarding report (`PASSED`).
- **Scenario 4 — Technician Assignment**: Admin dispatches certified technician, updates queue workload, logs audit trail (`PASSED`).
- **Scenario 5 — SLA Auto-Escalation**: Overdue open ticket escalates to Level 1, work status remains In Progress, check is idempotent (`PASSED`).
- **Scenario 6 — Resolution Lifecycle**: Admin marks ticket resolved with notes; subsequent SLA runs ignore resolved ticket (`PASSED`).
- **Scenario 7 — Role Authorization**: Employee attempting status change, override, or assignment is blocked with HTTP 403 (`PASSED`).
- **Priority Engine & Emergency Overrides**: Mathematical formula, boundary tests, and keyword overrides (`PASSED`).
- **Duplicate Detector**: Composite category, location, and token Jaccard similarity tests (`PASSED`).
- **SLA Deadlines**: Dynamic SLA window calculation and auto-escalation idempotency (`PASSED`).

---

## 📋 Two-Minute Hackathon Demo Script

1. **Role Switcher & Dashboard Overview**:
   - Open [http://localhost:5173](http://localhost:5173) as **Marcus Vance (Facility Operations Lead)**.
   - Observe summary cards: Critical tickets, active escalations, and overdue SLA breaches.
2. **Submit a High-Priority Emergency Request**:
   - Switch role to **Sarah Jenkins (Employee)** using the sidebar switcher.
   - Click **+ New Maintenance Request**.
   - Enter Title: `Smell of gas leak in cafeteria preparation area`.
   - Category: `Fire & Safety`, Location: `Building A, Cafeteria Kitchen`.
   - Observe the **Live Priority Preview** instantly flagging a **Critical Priority** and an **Emergency Hazard Alert** banner!
   - Click **Submit Request**.
3. **Duplicate Detection Demonstration**:
   - Click **+ New Maintenance Request** again.
   - Enter Title: `Gas odor leaking near cafeteria stoves`.
   - Observe the **Potential Duplicate Request Detected** warning alerting the user of existing ticket `REQ-1001`.
4. **Admin Triage & Technician Dispatch**:
   - Switch role back to **Marcus Vance (Admin)**.
   - Open ticket `REQ-1001`.
   - View explainable mathematical formula breakdown.
   - Review skill-based dispatch recommendation (*Maya Lin - Certified in Fire & Safety*).
   - Click **Assign** to dispatch the technician; status moves to `In Progress`.
5. **SLA Monitoring & Auto-Escalation**:
   - Review ticket `REQ-1003` (created >24 hours ago).
   - Click **Run SLA Monitor** in the header to run immediate check.
   - Observe ticket auto-escalating to `Level 1 Escalation` with audit logs.
6. **Resolving the Ticket**:
   - Click **Mark as Resolved**, enter resolution notes (*"Isolated gas supply valve and replaced seal gasket"*), and confirm.
   - Switch back to **Sarah Jenkins** to see the updated resolved status and audit history.
7. **Recurring Failure Analytics**:
   - Navigate to **Recurring Issues** in the sidebar.
   - Review the failure cluster for `Building B - HVAC (HVAC-CHILLER-02)` with 3 incidents and preventive maintenance recommendations.

---

## 📄 License
MIT License. Built for hackathon demonstration.
