# Backend API Documentation
**Smart Maintenance Request & Escalation System (SMRES)**

This document lists all **15 backend APIs** powering the system. It is written in simple, easy-to-understand language to explain exactly what each endpoint does and how it helps the system run intelligently.

---

### 🧠 1. Intelligence & Automation APIs
These APIs power the automated, intelligent decision-making features before and after a ticket is created.

1. **`POST /api/tickets/preview-priority`**
   * **Use:** Called by the frontend while the employee is typing a request. It runs the math formula and checks for safety hazards to show a "live preview" of the priority (e.g., "Critical") before they even click submit.

2. **`POST /api/tickets/check-duplicate`**
   * **Use:** Called by the frontend before submission to check if the issue has already been reported. It compares the text, location, and category to warn the user (e.g., *"This looks 85% similar to an existing broken AC ticket"*).

3. **`GET /api/recurring`**
   * **Use:** Analyzes historical database records to find failing assets. It is used by the dashboard to show proactive alerts like: *"The AC in Building B has broken 3 times this month; schedule a preventative overhaul."*

---

### 📝 2. Core Ticketing APIs
These APIs handle the actual creation and viewing of maintenance requests.

4. **`POST /api/tickets`**
   * **Use:** The main endpoint to submit a new maintenance request. It automatically runs the priority engine, duplicate checker, sets the SLA deadline timers, and recommends the best technician—all in one go—and then saves the ticket to the database.

5. **`GET /api/tickets`**
   * **Use:** Fetches the list of tickets to display on the main dashboard. It securely filters data so employees only see their own tickets, while admins and facility managers see everything.

6. **`GET /api/tickets/{ticket_id}`**
   * **Use:** Opens a specific ticket to view its full details, the calculated SLA deadline countdown, and the complete audit history of who did what.

---

### 🛠️ 3. Admin Action & Override APIs
These APIs allow administrators to update tickets, manage workflows, and manually override the AI's recommendations.

7. **`PATCH /api/tickets/{ticket_id}/status`**
   * **Use:** Used by admins to change a ticket's status to `In Progress` or `Resolved`. (When a ticket is resolved, it automatically stops the SLA deadline timer).

8. **`POST /api/tickets/{ticket_id}/assign`**
   * **Use:** The AI *recommends* a technician, but this API is used by the admin to actually lock in the assignment. It updates the technician's active workload count.

9. **`POST /api/tickets/{ticket_id}/override-priority`**
   * **Use:** If the AI scores a ticket as "Low" but an admin knows it's an emergency, they use this API to force the priority to "Critical". It forces them to log a justification reason in the audit history.

10. **`POST /api/tickets/{ticket_id}/escalate`**
    * **Use:** Used by admins to manually trigger an escalation (Level 1 or Level 2) if a ticket is being ignored. *(Note: the system also does this automatically in the background when SLAs breach).*

11. **`POST /api/tickets/{ticket_id}/link-duplicate/{target_ticket_id}`**
    * **Use:** If a duplicate is detected, the admin uses this API to officially link the new ticket as a "child" of the original "master" ticket so they can be tracked together.

---

### 📊 4. System & Helper APIs
These are standard utility APIs used to populate dropdowns, dashboard charts, and verify the system is online.

12. **`GET /api/stats/dashboard`**
    * **Use:** Fetches the aggregated numbers (e.g., Total open tickets, Overdue SLA count, Critical alerts) used to draw the charts on the admin dashboard.

13. **`GET /api/technicians`**
    * **Use:** Fetches the list of all technicians, their skills, and their current active workload to populate the manual assignment dropdowns.

14. **`GET /api/users`**
    * **Use:** Fetches the list of employees/users to populate the "Role Switcher" dropdown used in the hackathon demo.

15. **`GET /api/health`**
    * **Use:** A simple ping API to verify that the backend server is online and the database is successfully connected.
