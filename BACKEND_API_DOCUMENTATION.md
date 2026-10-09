# Backend API Documentation
**Smart Maintenance Request & Escalation System (SMRES)**

This document explains every Backend API endpoint in the system. It breaks down what each endpoint does, how it works, and how the "Intelligence Engine" is implemented behind the scenes in simple, easy-to-understand language.

---

## 1. Ticket Submission & Intelligence APIs

These APIs are used when an employee creates a maintenance request. They trigger the intelligence algorithms to automatically analyze the ticket.

### `POST /api/tickets/preview-priority`
* **What it does:** Allows the frontend to show a "Live Preview" of the priority score before the user even clicks submit.
* **How it works:** It takes the 0-5 scores provided by the user (Safety, Operational Impact, People Affected, Time Sensitivity) and runs them through the **Smart Priority Engine**. It also scans the description for emergency keywords (like "gas leak").
* **Implementation:** Returns a breakdown of the math `(8*Safety + 5*Ops + 4*People + 3*Time)`, the final Recommended Priority (Critical, High, Medium, Low), and any safety warnings.

### `POST /api/tickets/check-duplicate`
* **What it does:** Checks if someone else has already reported the exact same issue.
* **How it works:** It grabs all currently active tickets from the database and runs them through the **Duplicate Detector**. 
* **Implementation:** Uses text similarity (Jaccard scoring) combined with checking if the tickets share the same Category, Building, or Equipment ID. Returns a confidence percentage (e.g., "85% match").

### `POST /api/tickets` (Main Create Endpoint)
* **What it does:** The main endpoint to submit a new maintenance request.
* **How it works:** This is the master workflow. When a ticket is submitted, it automatically does four intelligent things in the background:
  1. Runs the **Priority Engine** to assign a priority and catch emergencies.
  2. Runs the **Duplicate Detector** to flag if it's a copy of another ticket.
  3. Runs the **SLA Service** to stamp a strict deadline timestamp on the ticket (e.g., 1 minute for Critical, 10 minutes for Low).
  4. Runs the **Technician Service** to find the best available technician based on skills and workload.
* **Implementation:** Saves all this data into the PostgreSQL/SQLite database and creates an Activity Log history showing exactly *why* it made those decisions.

---

## 2. Ticket Management & Admin APIs

These APIs are used to view, manage, and process tickets. They enforce role-based permissions (Admins vs. Employees).

### `GET /api/tickets`
* **What it does:** Fetches a list of tickets to display on the dashboard.
* **How it works:** It supports searching and filtering (by category, priority, status). 
* **Implementation:** Enforces security. If an `employee` requests the list, they only see the tickets they submitted. If an `admin` or `facility_manager` requests it, they see everything.

### `GET /api/tickets/{ticket_id}`
* **What it does:** Fetches the full, detailed view of a single ticket.
* **How it works:** Includes the full audit history (Activity Logs) of who did what and when. It also dynamically calculates if the ticket is currently "Overdue" by comparing the current time against the SLA Deadline.

### `PATCH /api/tickets/{ticket_id}/status`
* **What it does:** Changes the status of a ticket (e.g., Pending ➡️ In Progress ➡️ Resolved).
* **How it works:** Employees cannot resolve tickets; only admins can. 
* **Implementation:** When marked as "Resolved", it stops the SLA timers, releases the assigned technician from their workload, and logs the final resolution notes.

---

## 3. Intelligent Action APIs

These APIs allow administrators to override the AI or take manual action on the intelligent recommendations.

### `POST /api/tickets/{ticket_id}/assign`
* **What it does:** Assigns a specific technician to a ticket.
* **How it works:** The frontend shows the "Recommended" technician, but the admin uses this API to actually lock them in.
* **Implementation:** It increases the technician's `active_tickets_count` (which affects their future availability score) and automatically changes the ticket status to "In Progress".

### `POST /api/tickets/{ticket_id}/override-priority`
* **What it does:** Lets an admin manually change the AI-calculated priority.
* **How it works:** If the AI said "Medium" but the admin knows it's "Critical", they can override it. 
* **Implementation:** Requires the admin to provide a typed "Reason". It updates the priority, recalculates the SLA deadlines based on the new priority, and leaves a permanent audit log of the override.

### `POST /api/tickets/{ticket_id}/escalate`
* **What it does:** Manually triggers an escalation to higher management.
* **How it works:** While the background automated SLA worker automatically escalates overdue tickets, this API allows an admin to escalate a ticket immediately if they feel it's necessary.
* **Implementation:** Updates the `escalation_level` (Level 1, Level 2) and records the escalation timestamp.

### `POST /api/tickets/{ticket_id}/link-duplicate/{target_ticket_id}`
* **What it does:** Links a duplicate ticket to a master ticket.
* **How it works:** If the Duplicate Detector flagged a ticket, the admin can click "Confirm Link".
* **Implementation:** It sets the `duplicate_of_id` field so that the duplicate is officially tracked under the original master incident.

---

## 4. Proactive Analytics APIs

### `GET /api/recurring?min_occurrences=X`
* **What it does:** Finds maintenance hotspots before they break completely.
* **How it works:** Uses the **Recurring Issue Service** to group historical tickets by Building, Category, and Equipment.
* **Implementation:** If it sees that the AC in Building B has broken 3 times this month, it returns a "Persistent failure cluster" warning, suggesting that the team stops doing quick fixes and schedules a full overhaul instead.

---

### Summary of How the System Flows:
1. **Sarah (Employee)** types a request. The frontend calls `/preview-priority` and `/check-duplicate` to instantly warn her if it's an emergency or already reported.
2. She clicks submit, calling `POST /api/tickets`. The backend does all the math, sets the SLA deadlines, and saves it.
3. **Marcus (Admin)** looks at his dashboard using `GET /api/tickets`. He sees the new ticket.
4. Marcus opens the ticket, sees the recommended technician, and assigns them using `POST /api/tickets/{ticket_id}/assign`.
5. If the technician takes too long, the background SLA worker notices the deadline passed and escalates it automatically, or Marcus can do it manually via `/escalate`.
6. Finally, Marcus uses `/status` to resolve the ticket, closing the loop!
