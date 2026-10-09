# Smart Maintenance Request & Escalation System (SMRES)

SMRES is an intelligent, full-stack enterprise facility maintenance platform designed to solve critical operational failures: neglected complaints, delayed life-safety responses, duplicate tickets, improper technician assignments, and recurring asset breakdowns.

---

## 🌟 Key Features

### 1. Smart Priority Engine (Explainable Formula)
Calculates a transparent, calibrated priority score (0–100) using multi-factor evaluation:
$$\text{Score} = (8 \times \text{Safety}) + (5 \times \text{Operational Impact}) + (4 \times \text{Affected People}) + (3 \times \text{Time Sensitivity})$$

- **Threshold Calibration**:
  - **Critical (75–100 pts)**: SLA response window of **1.0 hour**.
  - **High (50–74 pts)**: SLA response window of **4.0 hours**.
  - **Medium (25–49 pts)**: SLA response window of **24.0 hours**.
  - **Low (0–24 pts)**: SLA response window of **48.0 hours**.
- **Independent Life-Safety Emergency Alert**: Hazardous keywords (e.g., *gas leak*, *electrical fire*, *smoke*, *sparking*, *structural collapse*) or a maximum safety score (5/5) automatically flag life-safety warnings and elevate the ticket to **Critical** independently of numerical scores.
- **Admin Override**: Facility managers can override recommendations with mandatory audit justification notes.

### 2. Duplicate Incident Detection
Evaluates new submissions against unresolved tickets using:
- Maintenance Category match (30%)
- Geographic / Building / Equipment match (35%)
- Description token similarity (35%)
- Flags potential duplicates with match confidence percentages and links tickets without discarding reports.

### 3. SLA Monitoring & Automated Idempotent Escalation
- Background periodic worker checks SLA deadlines every 30 seconds.
- Automatically escalates overdue requests to **Level 1 (Facility Manager)** and **Level 2 (Operations Director)**.
- Prevents duplicate escalation cycles and suspends checks once resolved.
- Fallback manual escalation trigger available for urgent staff requests.

### 4. Skill-Based Technician Dispatch
- Matches maintenance categories (`Electrical`, `HVAC`, `Plumbing`, `Structural`, `Fire & Safety`) with technician certifications.
- Balances active workload queues to prevent technician burnout.
- Explains dispatch recommendations.

### 5. Recurring Issue & Asset Failure Clustering
- Analyzes historical failures across categories, buildings, and equipment tags.
- Surfaces recurring breakdown clusters and suggests proactive preventive inspections before catastrophic failures.

### 6. Interactive Demo Role Switcher
- Instant toggle between **Employee** (`Sarah Jenkins`, `David Chen`) and **Facility Manager / Admin** (`Marcus Vance`, `Elena Rostova`).
- Backend enforces role permissions on status transitions, priority overrides, and technician assignments.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide React
- **Backend**: Python 3.14 / FastAPI, SQLAlchemy ORM, Pydantic V2, Uvicorn
- **Database**: SQLite (auto-seeded on startup)
- **Testing**: Pytest (16 automated tests)

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone the Repository
```bash
git clone https://github.com/sanket200511/SMRES.git
cd SMRES
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run the FastAPI backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend initializes the SQLite database (`smres.db`) and seeds realistic demo data automatically.
- API Documentation (Swagger): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Testing

Run the complete backend test suite:
```bash
python -m pytest backend/tests -v
```

### Test Coverage Highlights:
- `test_priority_engine.py`: Formula weights, boundary limits, keyword emergency overrides.
- `test_duplicate_detector.py`: Cross-matching of category, location, and description similarity.
- `test_sla_escalation.py`: SLA deadline calculations, automated escalation, and idempotency.
- `test_api.py`: End-to-end API lifecycle, role permission enforcement, technician assignments, and recurring pattern clustering.

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
