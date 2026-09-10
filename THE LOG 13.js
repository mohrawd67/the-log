/* ==========================================================================
   THE LOG — RENDER
   Each render* function returns an HTML string for one view. app.js swaps
   #view-root's innerHTML and rewires events after every render — a small,
   from-scratch version of the same "state -> view" idea React automates.
   ========================================================================== */

import { state, subjectExamAverage, subjectExamAverageByType, subjectUnderstanding,
  subjectDiscipline, disciplineBreakdown, overallDiscipline, overallUnderstanding,
  examPercent, thisWeekSummary, strongestWeakestFocus, gymCurrentStreak,
  startOfWeek, daysOfWeek, tasksForDate, weeklyReview,
  studyHoursInRange, learningHoursInRange, gymSessionsInRange, tasksCompletedInRange } from "./state.js";
import { ringSVG, lineChartSVG, barChartSVG } from "./charts.js";

const UNDERSTANDING_LABEL = { not: "Not understood", partial: "Partially understood", understood: "Understood" };
const UNDERSTANDING_CLASS = { not: "status-not", partial: "status-partial", understood: "status-understood" };

function esc(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING.";
  if (h < 18) return "GOOD AFTERNOON.";
  return "GOOD EVENING.";
}

/* ---------------------------------------------------------------------- */
/* MAIN MENU                                                               */
/* ---------------------------------------------------------------------- */

export function renderMenu() {
  const week = thisWeekSummary();
  const { strongest, weakest, focus } = strongestWeakestFocus();

  return `
    <section class="menu-hero">
      <div class="text-hero">THE LOG</div>
      <div class="menu-greeting">${greeting()}</div>
      <div class="menu-sub">READY TO GET BETTER?</div>
    </section>

    <div class="grid grid-5 menu-nav-grid">
      ${navCard("STUDY", "Subjects, exams, understanding", "study", "📘")}
      ${navCard("GYM", "Workouts and training history", "gym", "🏋️")}
      ${navCard("LEARNING", "Programming, CS, AI, projects", "learning", "💻")}
      ${navCard("PLANNER", "Today and this week", "planner", "🗓️")}
      ${navCard("INSIGHTS", "Statistics and progress", "insights", "📊")}
    </div>

    <div class="menu-week-panel">
      <div class="section-head">
        <h2>THIS WEEK</h2>
      </div>
      <div class="menu-week-stats">
        <div class="menu-week-stat"><div class="stat-number">${week.studySessions}</div><div class="stat-label">Study Sessions</div></div>
        <div class="menu-week-stat"><div class="stat-number">${week.gymSessions}</div><div class="stat-label">Gym Sessions</div></div>
        <div class="menu-week-stat"><div class="stat-number">${week.learningHours}h</div><div class="stat-label">Programming</div></div>
        <div class="menu-week-stat"><div class="stat-number">${week.discipline ?? "—"}${week.discipline !== null ? "%" : ""}</div><div class="stat-label">Discipline</div></div>
        <div class="menu-week-stat"><div class="stat-number">${week.understanding ?? "—"}${week.understanding !== null ? "%" : ""}</div><div class="stat-label">Understanding</div></div>
      </div>

      <div class="menu-summary-row">
        <div class="card">
          <div class="menu-summary-tag">Strongest area</div>
          <div class="menu-summary-value">${strongest ? esc(strongest) : "Not enough data yet"}</div>
        </div>
        <div class="card">
          <div class="menu-summary-tag">Weakest area</div>
          <div class="menu-summary-value">${weakest ? esc(weakest) : "Not enough data yet"}</div>
        </div>
        <div class="card">
          <div class="menu-summary-tag">Main focus</div>
          <div class="menu-summary-value">${focus ? esc(focus) : "Add a subject to begin"}</div>
        </div>
      </div>
    </div>
  `;
}

function navCard(title, sub, section, icon) {
  return `
    <a href="#/${section}" class="nav-card">
      <div class="nav-card-icon">${icon}</div>
      <div>
        <div class="nav-card-title">${title}</div>
        <div class="nav-card-sub">${sub}</div>
      </div>
    </a>`;
}

/* ---------------------------------------------------------------------- */
/* STUDY — subject list                                                    */
/* ---------------------------------------------------------------------- */

export function renderStudyList() {
  const subjects = state.subjects;

  const cards = subjects.map((s) => {
    const avg = subjectExamAverage(s);
    const und = subjectUnderstanding(s);
    const disc = subjectDiscipline(s.name);
    const upcoming = [...s.exams].filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    return `
      <a href="#/study/${s.id}" class="card interactive subject-card">
        <div class="subject-card-top">
          <h3>${esc(s.name)}</h3>
          <span class="pill">${s.exams.length} exam${s.exams.length === 1 ? "" : "s"}</span>
        </div>
        <div class="subject-card-stats">
          <div class="subject-mini-stat"><div class="stat-number">${avg ?? "—"}${avg !== null ? "%" : ""}</div><div class="stat-label">Average</div></div>
          <div class="subject-mini-stat"><div class="stat-number">${und ?? "—"}${und !== null ? "%" : ""}</div><div class="stat-label">Understanding</div></div>
          <div class="subject-mini-stat"><div class="stat-number">${disc ?? "—"}${disc !== null ? "%" : ""}</div><div class="stat-label">Discipline</div></div>
        </div>
        ${upcoming ? `<div class="subject-exam-next">Next exam: <strong>${esc(upcoming.name)}</strong> — ${fmtDate(upcoming.date)}</div>` : ""}
      </a>`;
  }).join("");

  return `
    <div class="section-head">
      <h1>STUDY</h1>
      <button class="btn btn-primary" data-action="open-add-subject">+ Add Subject</button>
    </div>
    ${subjects.length
      ? `<div class="grid grid-3">${cards}</div>`
      : emptyState("NO SUBJECTS YET", "Add your first subject to start tracking exams, understanding and discipline.", "open-add-subject", "+ Add Subject")}
  `;
}

/* ---------------------------------------------------------------------- */
/* STUDY — subject detail                                                  */
/* ---------------------------------------------------------------------- */

export function renderSubjectDetail(subject) {
  const avg = subjectExamAverage(subject);
  const daily = subjectExamAverageByType(subject, "daily");
  const monthly = subjectExamAverageByType(subject, "monthly");
  const yearly = subjectExamAverageByType(subject, "yearly");
  const und = subjectUnderstanding(subject);
  const disc = subjectDiscipline(subject.name);
  const breakdown = disciplineBreakdown(subject.name);

  const scores = subject.exams.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const chart = scores.length >= 2
    ? lineChartSVG(scores.map(examPercent), scores.map((e) => fmtDate(e.date)))
    : "";

  const examRows = scores.slice().reverse().map((e) => `
    <tr>
      <td>${esc(e.name)}${e.chapter ? ` <span class="muted">— ${esc(e.chapter)}</span>` : ""}</td>
      <td><span class="pill">${e.type}</span></td>
      <td>${e.score} / ${e.max}</td>
      <td><strong>${examPercent(e)}%</strong></td>
      <td class="muted">${fmtDate(e.date)}</td>
      <td><button class="btn-icon btn-sm" data-action="delete-exam" data-subject="${subject.id}" data-exam="${e.id}" title="Delete">✕</button></td>
    </tr>`).join("");

  const lessonRows = subject.lessons.slice().reverse().map((l) => `
    <div class="row-item lesson-row">
      <div style="flex:1">
        <div class="row-title">${esc(l.title)}</div>
        <div class="understanding-picker" style="margin-top:6px">
          ${["not", "partial", "understood"].map((k) => `
            <button class="pill ${UNDERSTANDING_CLASS[k]}" data-action="set-understanding" data-subject="${subject.id}" data-lesson="${l.id}" data-level="${k}"
              style="${l.understanding === k ? "outline:2px solid var(--white)" : ""}">${UNDERSTANDING_LABEL[k]}</button>
          `).join("")}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="open-explanation" data-subject="${subject.id}" data-lesson="${l.id}">View Explanation</button>
      <button class="btn-icon btn-sm" data-action="delete-lesson" data-subject="${subject.id}" data-lesson="${l.id}" title="Delete">✕</button>
    </div>`).join("");

  return `
    <div class="section-head">
      <div>
        <a href="#/study" class="pill" style="margin-bottom:10px;display:inline-flex">← Study</a>
        <h1>${esc(subject.name)}</h1>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" data-action="open-add-lesson" data-subject="${subject.id}">+ Add Lesson</button>
        <button class="btn btn-primary" data-action="open-add-exam" data-subject="${subject.id}">+ Add Exam</button>
        <button class="btn-icon" data-action="delete-subject" data-subject="${subject.id}" title="Delete subject">🗑</button>
      </div>
    </div>

    <div class="grid grid-4" style="margin-bottom:var(--sp-4)">
      <div class="card"><div class="stat-number">${avg ?? "—"}${avg !== null ? "%" : ""}</div><div class="stat-label">Overall Average</div></div>
      <div class="card"><div class="stat-number">${und ?? "—"}${und !== null ? "%" : ""}</div><div class="stat-label">Understanding</div></div>
      <div class="card">
        <div class="stat-number">${disc ?? "—"}${disc !== null ? "%" : ""}</div>
        <div class="stat-label">Discipline</div>
        <div class="muted" style="font-size:0.78rem;margin-top:6px">${breakdown.completed}/${breakdown.total} tasks done · ${breakdown.overdue} overdue</div>
      </div>
      <div class="card"><div class="stat-number">${subject.exams.length}</div><div class="stat-label">Total Exams</div></div>
    </div>

    <div class="grid grid-3" style="margin-bottom:var(--sp-4)">
      <div class="card"><div class="stat-number" style="font-size:1.8rem">${daily ?? "—"}${daily !== null ? "%" : ""}</div><div class="stat-label">Daily Average</div></div>
      <div class="card"><div class="stat-number" style="font-size:1.8rem">${monthly ?? "—"}${monthly !== null ? "%" : ""}</div><div class="stat-label">Monthly Average</div></div>
      <div class="card"><div class="stat-number" style="font-size:1.8rem">${yearly ?? "—"}${yearly !== null ? "%" : ""}</div><div class="stat-label">Yearly Average</div></div>
    </div>

    ${chart ? `<div class="card chart-card" style="margin-bottom:var(--sp-4)"><h3 style="margin-bottom:10px">Progress Over Time</h3>${chart}</div>` : ""}

    <div class="card" style="margin-bottom:var(--sp-4)">
      <h3 style="margin-bottom:10px">Exams</h3>
      ${scores.length ? `
        <table class="exam-table">
          <thead><tr><th>Exam</th><th>Type</th><th>Score</th><th>%</th><th>Date</th><th></th></tr></thead>
          <tbody>${examRows}</tbody>
        </table>` : `<p class="muted">No exams yet. Add one to start tracking your average.</p>`}
    </div>

    <div class="card">
      <h3 style="margin-bottom:10px">Lessons & Understanding</h3>
      ${subject.lessons.length ? lessonRows : `<p class="muted">No lessons yet. Add one to track what you understood.</p>`}
    </div>
  `;
}

/* ---------------------------------------------------------------------- */
/* GYM                                                                     */
/* ---------------------------------------------------------------------- */

export function renderGym() {
  const workouts = state.gym.workouts.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const workoutDays = new Set(workouts.map((w) => w.date.slice(0, 10))).size;
  const streak = gymCurrentStreak();

  const rows = workouts.map((w) => `
    <div class="card" style="margin-bottom:var(--sp-2)">
      <div class="section-head" style="margin-bottom:8px">
        <div>
          <span class="pill">${esc(w.category)}</span>
          <span class="muted" style="margin-left:8px">${fmtDate(w.date)}</span>
        </div>
        <button class="btn-icon btn-sm" data-action="delete-workout" data-workout="${w.id}" title="Delete">✕</button>
      </div>
      ${w.exercises.map((ex) => `
        <div class="workout-exercise-row" style="padding:6px 0;border-top:1px solid var(--white-12)">
          <div>${esc(ex.name)}</div>
          <div class="muted">${ex.sets} sets</div>
          <div class="muted">${ex.reps} reps</div>
          <div class="muted">${ex.weight ? ex.weight + " kg" : "—"}</div>
        </div>`).join("")}
    </div>`).join("");

  return `
    <div class="section-head">
      <h1>GYM</h1>
      <button class="btn btn-primary" data-action="open-add-workout">+ Log Workout</button>
    </div>

    <div class="grid grid-4" style="margin-bottom:var(--sp-4)">
      <div class="card"><div class="stat-number">${workoutDays}</div><div class="stat-label">Workout Days</div></div>
      <div class="card"><div class="stat-number">${workouts.length}</div><div class="stat-label">Total Workouts</div></div>
      <div class="card"><div class="stat-number">${streak}</div><div class="stat-label">Current Streak</div></div>
      <div class="card"><div class="stat-number">${state.gym.categories.length}</div><div class="stat-label">Categories</div></div>
    </div>

    ${workouts.length ? rows : emptyState("NO WORKOUTS YET", "Log your first workout to start building your training history.", "open-add-workout", "+ Log Workout")}
  `;
}

/* ---------------------------------------------------------------------- */
/* LEARNING                                                                */
/* ---------------------------------------------------------------------- */

export function renderLearning() {
  const totalHours = state.learning.sessions.reduce((s, x) => s + x.hours, 0);

  const paths = state.learning.paths.map((p) => {
    const done = p.items.filter((i) => i.done).length;
    const pct = p.items.length ? Math.round((done / p.items.length) * 100) : 0;
    return `
      <div class="card" style="margin-bottom:var(--sp-2)">
        <div class="section-head" style="margin-bottom:8px">
          <h3>${esc(p.name)}</h3>
          <span class="pill">${done}/${p.items.length}</span>
        </div>
        <div class="bar-track" style="margin-bottom:10px"><div class="bar-fill" style="width:${pct}%"></div></div>
        ${p.items.map((i) => `
          <div class="row-item roadmap-item ${i.done ? "done" : ""}">
            <button class="row-check ${i.done ? "done" : ""}" data-action="toggle-learning-item" data-path="${p.id}" data-item="${i.id}">${i.done ? "✓" : ""}</button>
            <div class="row-title">${esc(i.title)}</div>
          </div>`).join("")}
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="open-add-path-item" data-path="${p.id}">+ Add Item</button>
      </div>`;
  }).join("");

  const sessions = state.learning.sessions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map((s) => `
    <div class="row-item" style="align-items:flex-start">
      <div style="flex:1">
        <div class="row-title">${esc(s.topic)} <span class="muted">· ${s.hours}h · ${s.difficulty}</span></div>
        ${s.notes ? `<div class="muted" style="font-size:0.85rem;margin-top:4px">${esc(s.notes)}</div>` : ""}
        <div class="muted" style="font-size:0.78rem;margin-top:4px">${fmtDate(s.date)}</div>
      </div>
      <button class="btn-icon btn-sm" data-action="delete-learning-session" data-session="${s.id}">✕</button>
    </div>`).join("");

  const projects = state.learning.projects.map((p) => `
    <div class="card" style="margin-bottom:var(--sp-2)">
      <div class="section-head" style="margin-bottom:8px">
        <h3>${esc(p.name)}</h3>
        <select class="pill" data-action="update-project-status" data-project="${p.id}" style="background:var(--white-12);border:1px solid var(--white-20)">
          ${["planning", "building", "testing", "completed"].map((s) => `<option value="${s}" ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      ${p.whatBuilt ? `<p style="margin-bottom:6px"><strong>Built:</strong> ${esc(p.whatBuilt)}</p>` : ""}
      ${p.whatLearned ? `<p style="margin-bottom:6px"><strong>Learned:</strong> ${esc(p.whatLearned)}</p>` : ""}
      ${p.problems ? `<p style="margin-bottom:6px"><strong>Problems:</strong> ${esc(p.problems)}</p>` : ""}
      ${p.nextStep ? `<p><strong>Next step:</strong> ${esc(p.nextStep)}</p>` : ""}
    </div>`).join("");

  return `
    <div class="section-head">
      <h1>LEARNING</h1>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" data-action="open-add-path">+ Add Path</button>
        <button class="btn btn-ghost" data-action="open-add-project">+ Add Project</button>
        <button class="btn btn-primary" data-action="open-add-session">+ Log Session</button>
      </div>
    </div>

    <div class="grid grid-3" style="margin-bottom:var(--sp-4)">
      <div class="card"><div class="stat-number">${totalHours}h</div><div class="stat-label">Total Hours</div></div>
      <div class="card"><div class="stat-number">${state.learning.sessions.length}</div><div class="stat-label">Sessions Logged</div></div>
      <div class="card"><div class="stat-number">${state.learning.projects.length}</div><div class="stat-label">Projects</div></div>
    </div>

    <h2 style="margin-bottom:var(--sp-2)">Learning Paths</h2>
    ${state.learning.paths.length ? paths : emptyState("NO LEARNING PATHS YET", "Add a path like Python, Git, or CS50 to track your progress.", "open-add-path", "+ Add Path")}

    <h2 style="margin:var(--sp-5) 0 var(--sp-2)">Projects</h2>
    ${state.learning.projects.length ? projects : emptyState("NO PROJECTS YET", "Add a project to track what you're building and what you're learning.", "open-add-project", "+ Add Project")}

    <h2 style="margin:var(--sp-5) 0 var(--sp-2)">Learning Log</h2>
    ${state.learning.sessions.length ? `<div class="card">${sessions}</div>` : emptyState("NO SESSIONS LOGGED YET", "Log your first learning session to start tracking real progress.", "open-add-session", "+ Log Session")}
  `;
}

/* ---------------------------------------------------------------------- */
/* PLANNER                                                                 */
/* ---------------------------------------------------------------------- */

export function renderPlanner(weekOffset = 0) {
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasksForDate(today);
  const priorities = todayTasks.filter((t) => t.isPriority).slice(0, 3);
  const others = todayTasks.filter((t) => !t.isPriority);

  const slotHtml = (i) => {
    const t = priorities[i];
    if (!t) {
      return `<div class="priority-slot"><div class="priority-index">${i + 1}</div><button class="btn btn-ghost btn-sm" style="margin-top:8px;align-self:flex-start" data-action="open-add-task" data-priority="1">+ Add Priority</button></div>`;
    }
    return `
      <div class="priority-slot filled">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="priority-index">${i + 1}</div>
          <button class="row-check ${t.completed ? "done" : ""}" data-action="toggle-task" data-task="${t.id}">${t.completed ? "✓" : ""}</button>
        </div>
        <div class="row-title" style="${t.completed ? "text-decoration:line-through;opacity:.6" : ""}">${esc(t.title)}</div>
        <div class="muted" style="font-size:0.8rem">${esc(t.type)}</div>
      </div>`;
  };

  const otherRows = others.map((t) => `
    <div class="row-item ${t.completed ? "done" : ""}">
      <button class="row-check ${t.completed ? "done" : ""}" data-action="toggle-task" data-task="${t.id}">${t.completed ? "✓" : ""}</button>
      <div style="flex:1">
        <div class="row-title">${esc(t.title)}</div>
        <div class="muted" style="font-size:0.78rem">${esc(t.type)}</div>
      </div>
      <button class="btn-icon btn-sm" data-action="delete-task" data-task="${t.id}">✕</button>
    </div>`).join("");

  // Weekly view
  const base = startOfWeek();
  base.setDate(base.getDate() + weekOffset * 7);
  const days = daysOfWeek(base);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const weekHtml = days.map((d, i) => {
    const ds = d.toISOString().slice(0, 10);
    const dayTasks = tasksForDate(ds);
    const isToday = ds === today;
    return `
      <div class="week-day ${isToday ? "today" : ""}">
        <div class="week-day-head"><span>${dayNames[i]}</span><span class="muted">${d.getDate()}</span></div>
        ${dayTasks.map((t) => `<div class="week-task ${t.completed ? "done" : ""}">${esc(t.title)}</div>`).join("")}
        <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:6px" data-action="open-add-task" data-date="${ds}">+</button>
      </div>`;
  }).join("");

  return `
    <div class="section-head">
      <h1>PLANNER</h1>
      <button class="btn btn-primary" data-action="open-add-task" data-date="${today}">+ Add Task</button>
    </div>

    <h2 style="margin-bottom:4px">WHAT MATTERS TODAY?</h2>
    <p class="muted" style="margin-bottom:var(--sp-3)">Top 3 priorities — focus over quantity.</p>
    <div class="grid grid-3" style="margin-bottom:var(--sp-4)">
      ${slotHtml(0)}${slotHtml(1)}${slotHtml(2)}
    </div>

    ${others.length ? `<h3 style="margin-bottom:8px">Other tasks today</h3><div style="margin-bottom:var(--sp-5)">${otherRows}</div>` : ""}

    <div class="section-head">
      <h2>WEEKLY PLANNER</h2>
      <div style="display:flex;gap:8px">
        <button class="btn-icon" data-action="week-prev">←</button>
        <button class="btn-icon" data-action="week-next">→</button>
      </div>
    </div>
    <div class="week-grid">${weekHtml}</div>

    <div style="margin-top:var(--sp-5)">
      <a href="#/review" class="btn btn-ghost">View Weekly Review →</a>
    </div>
  `;
}

/* ---------------------------------------------------------------------- */
/* WEEKLY REVIEW                                                           */
/* ---------------------------------------------------------------------- */

export function renderWeeklyReview() {
  const r = weeklyReview();

  return `
    <div class="section-head"><h1>WEEKLY REVIEW</h1></div>

    <div class="grid grid-3" style="margin-bottom:var(--sp-4)">
      <div class="card"><div class="stat-number">${r.thisWeek.studySessions}</div><div class="stat-label">Study Sessions</div></div>
      <div class="card"><div class="stat-number">${r.thisWeek.gymSessions}</div><div class="stat-label">Gym Sessions</div></div>
      <div class="card"><div class="stat-number">${r.thisWeek.learningHours}h</div><div class="stat-label">Learning Hours</div></div>
      <div class="card"><div class="stat-number">${r.thisWeek.tasksCompleted}</div><div class="stat-label">Tasks Completed</div></div>
      <div class="card"><div class="stat-number">${r.thisWeek.discipline ?? "—"}${r.thisWeek.discipline !== null ? "%" : ""}</div><div class="stat-label">Discipline</div></div>
      <div class="card"><div class="stat-number">${r.thisWeek.understanding ?? "—"}${r.thisWeek.understanding !== null ? "%" : ""}</div><div class="stat-label">Understanding</div></div>
    </div>

    <div class="review-block card">
      <h2 style="margin-bottom:8px">WHAT WENT WELL?</h2>
      <ul class="review-list">${r.wentWell.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>

    <div class="review-block card">
      <h2 style="margin-bottom:8px">WHAT NEEDS WORK?</h2>
      <ul class="review-list">${r.needsWork.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>

    <div class="review-block card">
      <h2 style="margin-bottom:8px">NEXT WEEK</h2>
      <ul class="review-list">${r.nextWeek.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
  `;
}

/* ---------------------------------------------------------------------- */
/* INSIGHTS                                                                */
/* ---------------------------------------------------------------------- */

export function renderInsights(period = "week") {
  const now = new Date();
  let from, to, buckets, bucketLabels;

  if (period === "day") {
    from = to = now.toISOString().slice(0, 10);
    buckets = [from]; bucketLabels = ["Today"];
  } else if (period === "week") {
    const start = startOfWeek();
    buckets = daysOfWeek(start).map((d) => d.toISOString().slice(0, 10));
    bucketLabels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    from = buckets[0]; to = buckets[6];
  } else if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    from = start.toISOString().slice(0, 10); to = end.toISOString().slice(0, 10);
    buckets = []; bucketLabels = [];
    for (let d = 1; d <= end.getDate(); d += Math.ceil(end.getDate() / 8)) {
      buckets.push(new Date(now.getFullYear(), now.getMonth(), d).toISOString().slice(0, 10));
      bucketLabels.push(String(d));
    }
  } else {
    from = `${now.getFullYear()}-01-01`; to = `${now.getFullYear()}-12-31`;
    buckets = Array.from({ length: 12 }, (_, i) => `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}-01`);
    bucketLabels = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  }

  const learningHrs = learningHoursInRange(from, to);
  const gymCount = gymSessionsInRange(from, to).length;
  const tasksDone = tasksCompletedInRange(from, to);
  const examAvgAll = (() => {
    const all = state.subjects.flatMap((s) => s.exams);
    if (!all.length) return null;
    return Math.round(all.reduce((sum, e) => sum + examPercent(e), 0) / all.length);
  })();
  const discipline = overallDiscipline();
  const understanding = overallUnderstanding();

  // Study hours per subject bar chart (based on completed study-session tasks mentioning the subject)
  const subjectLabels = state.subjects.map((s) => s.name.slice(0, 8));
  const subjectVals = state.subjects.map((s) =>
    state.tasks.filter((t) => t.completed && t.title.toLowerCase().includes(s.name.toLowerCase())).length
  );

  return `
    <div class="section-head time-filter-row">
      <h1>INSIGHTS</h1>
      <div class="segmented" id="insights-period">
        ${["day","week","month","year"].map((p) => `<button type="button" data-action="set-insights-period" data-period="${p}" class="${p === period ? "active" : ""}">${p.toUpperCase()}</button>`).join("")}
      </div>
    </div>

    <div class="grid grid-4 insights-grid" style="margin-bottom:var(--sp-4)">
      <div class="card"><div class="stat-number">${gymCount}</div><div class="stat-label">Gym Sessions</div></div>
      <div class="card"><div class="stat-number">${learningHrs}h</div><div class="stat-label">Programming Hours</div></div>
      <div class="card"><div class="stat-number">${tasksDone}</div><div class="stat-label">Tasks Completed</div></div>
      <div class="card"><div class="stat-number">${examAvgAll ?? "—"}${examAvgAll !== null ? "%" : ""}</div><div class="stat-label">Exam Average</div></div>
      <div class="card"><div class="stat-number">${discipline ?? "—"}${discipline !== null ? "%" : ""}</div><div class="stat-label">Discipline</div></div>
      <div class="card"><div class="stat-number">${understanding ?? "—"}${understanding !== null ? "%" : ""}</div><div class="stat-label">Understanding</div></div>
    </div>

    ${subjectVals.some((v) => v > 0) ? `
      <div class="card chart-card" style="margin-bottom:var(--sp-4)">
        <h3 style="margin-bottom:10px">Completed Study Tasks by Subject</h3>
        ${barChartSVG(subjectVals, subjectLabels)}
      </div>` : emptyState("NOT ENOUGH DATA YET", "Complete some study tasks and log sessions to see charts here.", null, null)}
  `;
}

/* ---------------------------------------------------------------------- */
/* SHARED                                                                  */
/* ---------------------------------------------------------------------- */

export function emptyState(title, sub, action, actionLabel) {
  return `
    <div class="empty-state">
      <div class="h2">${title}</div>
      <p class="muted" style="margin:8px 0 var(--sp-3)">${sub}</p>
      ${action ? `<button class="btn btn-primary" data-action="${action}">${actionLabel}</button>` : ""}
    </div>`;
}
