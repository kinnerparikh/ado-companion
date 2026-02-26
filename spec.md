# Product Requirements Spec (Non‑Technical)

## Product Name (working)
**ADO Companion** (browser extension for Chrome + Edge)

---

## 1) Problem Statement
Users who work in Azure DevOps (ADO) waste time and attention by:
- Constantly checking ADO to see whether **their builds** are progressing or finished.
- Manually keeping track of **their open pull requests**, and repeatedly navigating to them.

---

## 2) Goal
Create a Chrome + Edge browser extension that:
1. **Shows task-level progress** for builds that are associated with the authenticated user.
2. **Tracks the user’s open PRs** across configured projects, and optionally manages them in browser bookmarks.

This product must reduce “status-checking overhead” without requiring ADO SSO; it must work with a **PAT that expires every 7 days**.

---

## 3) Target User
- A developer who uses ADO daily and initiates builds and PRs frequently.
- Wants a quick “single glance” view without opening ADO.

---

## 4) Supported Scope / Constraints

### Supported
- **One ADO Organization per extension profile**
  - At setup, user provides:
    - **Organization name** (e.g., `msazure`)
    - **PAT** (Personal Access Token)
- **Multiple projects within that organization**
  - User can track:
    - Explicit projects (e.g., `msazure/project1`, `msazure/project2`)
    - Or wildcard for all projects (`msazure/*`)

### Not Supported (by design)
- Multiple ADO organizations at the same time.
- Authenticating using Microsoft email, SSO, or any interactive corporate sign-in.

---

## 5) Core Definitions (to avoid ambiguity)

### “Builds associated with me”
A build is considered “mine” if **any** of the following are true:
- The build was **manually queued** by the user.
- The build was **triggered by a commit authored by the user**.
- The build is a **PR build** for a PR **created by the user**.

### “Running pipelines”
A running pipeline is a build that is currently in progress.  
Only running builds appear in the **Running Pipelines** section.

### “Task-level progress”
Progress is measured using **individual tasks**:
- Builds may contain multiple jobs.
- Jobs contain multiple tasks.
- The extension computes:
  - **Completed tasks / Total tasks**
- Progress must be broken down by job.

---

## 6) User Experience Requirements

### 6.1 Extension Surfaces
The extension must have two user-facing surfaces:

#### A) Popover (extension icon)
Contains two sections:
1. **Pull Requests**
2. **Running Pipelines**

#### B) Options / Configuration Page
Used to configure authentication, projects, polling, PR behavior, and bookmarks.

---

### 6.2 Popover: Pull Requests Section

- Can be toggled **ON / OFF** in options.
- Shows **only PRs created by the user**.
- Shows **only active PRs** (not merged or abandoned).
- Scoped to configured projects.
- Supports two modes:
  1. **Bookmark Mode (enabled)**
     - PRs are added to a bookmark folder.
  2. **In‑Popover Mode (bookmarks disabled)**
     - PRs are shown only in the popover.

Each PR entry must show:
- PR title
- Project name
- Repository name (if available)
- Clickable link to open PR in ADO

---

### 6.3 Popover: Running Pipelines Section

- Shows **only running builds**.
- Shows only builds **associated with the user**.
- Scoped to configured projects.
- Pipelines are ordered by **time initiated**.

Each pipeline entry must show:
- Pipeline name
- Project name
- Time initiated or relative time
- Link to open build in ADO
- Task-level progress (`X / Y tasks`)
- Job-level breakdown
- Status (running, failed, canceled)

#### Removal Rule
- Once a build finishes, fails, or is canceled, it is removed from the list on next refresh.

---

## 7) Configuration / Options Page Requirements

### 7.1 Authentication
- User inputs:
  - Organization name
  - PAT
- Connection is validated on save.
- If invalid:
  - User is alerted.
  - Extension does not appear “connected”.
- PAT validity is periodically rechecked.
- If PAT expires:
  - User is clearly alerted.
  - Tracking pauses until updated.

---

### 7.2 Project Tracking
- Users can add:
  - `org/projectName`
  - `org/*`
- Only projects matching the configured org are allowed.
- Wildcard means all projects are tracked.

---

### 7.3 Polling / Refresh
- User controls:
  - Active polling interval (while builds running)
  - Idle polling interval (no builds running)
- Default behavior is **hybrid**:
  - Faster when builds are active
  - Slower when idle
- Opening popover triggers immediate refresh attempt.

---

### 7.4 Pull Request Settings
- Toggle PR section ON / OFF
- Choose PR mode:
  - Bookmarks enabled
  - Bookmarks disabled
- If bookmarks enabled:
  - User defines bookmark folder name
  - Default: `Open PRs`

---

## 8) Bookmark Behavior (when enabled)

### 8.1 Folder Creation
- Folder is created if it does not exist.
- Existing folder is reused.
- Changing folder name updates where PRs are written going forward.

### 8.2 Adding PRs
- Active PRs created by user are added as bookmarks.

### 8.3 Removing Closed PRs
- When a PR is merged or abandoned:
  - Its bookmark is automatically removed.

### 8.4 Safety
- Extension removes **only bookmarks it created**.
- Must not delete unrelated user bookmarks.

---

## 9) Alerts, Errors, and Feedback

### Authentication Failure
- User is alerted.
- Popover shows disconnected state.
- Options page directs user to update PAT.

### Temporary Errors
- No alert spam.
- Popover shows:
  - Last updated time
  - Refresh failure indicator

### Data Freshness
- Popover displays last update timestamp.

---

## 10) Ordering and Display Rules

### Running Pipelines
- Sorted by **time initiated** (most recent first recommended).

### Pull Requests
- Sorted by **most recently updated**.

---

## 11) Security & Privacy
- PAT stored locally using browser extension storage.
- No data sent outside Azure DevOps.
- No analytics or third‑party tracking.
- Display only minimum required data.

---

## 12) Success Criteria
A user can:
1. Authenticate with org + PAT successfully.
2. Configure projects with explicit list or wildcard.
3. View running builds with task-level progress.
4. Track PRs without visiting ADO.
5. Be clearly notified when PAT expires.

---

## 13) Acceptance Criteria

### Authentication
- Valid PAT → connected state.
- Invalid/expired PAT → alert + disconnected state.

### Projects
- `org/*` tracks all projects.
- Explicit projects only track those projects.

### Pipelines
- Running builds appear with task + job progress.
- Finished builds disappear on refresh.
- Ordered by initiation time.

### Pull Requests
- Only user-created PRs shown.
- Closed PRs removed.
- Bookmark behavior follows configuration.
- PR section can be toggled.

### Polling
- Hybrid polling by default.
- User overrides respected.
- Popover triggers refresh.

---

## 14) Explicit Non‑Goals
- No multi‑org support.
- No SSO or Microsoft login.
- No non‑ADO Git support.
- No global build dashboards.
- No push notifications (for now).

---

## 15) Open Decisions (optional)
1. Running pipeline ordering direction (default: most recent first)
2. PR ordering (default: most recently updated)
3. Whether PR bookmarks are managed when PR section is disabled