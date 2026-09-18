/* ==========================================================================
   THE LOG — STATE
   The single in-memory store + every "business logic" calculation.
   Pattern: mutate `state` directly inside these functions, then call
   persist() and notify() so storage and UI stay in sync. This is the
   same pattern React's useState follows under the hood — one source of
   truth, explicit updates, everything else re-reads from it.
   ========================================================================== */

import { loadState, saveState, saveNow, uid, setActiveUser, loadRemoteState } from "./THE LOG 7.js";

export const state = loadState();

export async function hydrateForUser(user) {
  setActiveUser(user);
  const remote = await loadRemoteState(user);
  const local = loadState();
  const localHasData = local.subjects.length || local.gym.workouts.length
    || local.learning.paths.length || local.learning.sessions.length
    || local.learning.projects.length || local.tasks.length;
  const remoteHasData = remote && (remote.subjects?.length || remote.gym?.workouts?.length
    || remote.learning?.paths?.length || remote.learning?.sessions?.length
    || remote.learning?.projects?.length || remote.tasks?.length);

  if (remoteHasData) {
    Object.assign(state, remote);
  } else if (localHasData) {
    Object.assign(state, local);
    await saveNowForUser();
  }
  notify();
}

export function clearUser() {
  setActiveUser(null);
}

export function saveNowForUser() {
  return saveNow(state);
}

const listeners = [];
export function subscribe(fn) { listeners.push(fn); }
function notify() { listeners.forEach((fn) => fn()); }
function persist() { saveState(state); notify(); }

/* ---------------------------------------------------------------------- */
/* SUBJECTS                                                                */
/* ---------------------------------------------------------------------- */

export function addSubject(name) {
  state.subjects.push({ id: uid(), name, lessons: [], exams: [] });
  persist();
}

export function updateSubject(id, patch) {
  const s = state.subjects.find((s) => s.id === id);
  if (s) Object.assign(s, patch);
  persist();
}

export function deleteSubject(id) {
  state.subjects = state.subjects.filter((s) => s.id !== id);
  persist();
}

export function getSubject(id) {
  return state.subjects.find((s) => s.id === id);
}

export function importState(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.subjects)
    || !snapshot.gym || !Array.isArray(snapshot.gym.workouts)
    || !snapshot.learning || !Array.isArray(snapshot.learning.paths)
    || !Array.isArray(snapshot.learning.sessions) || !Array.isArray(snapshot.learning.projects)
    || !Array.isArray(snapshot.tasks)) {
    return false;
  }

  Object.assign(state, snapshot, {
    gym: { ...state.gym, ...snapshot.gym },
    learning: { ...state.learning, ...snapshot.learning },
    meta: { ...state.meta, ...(snapshot.meta || {}) }
  });
  persist();
  return true;
}

export function addStudySession(subjectId, session) {
  const subject = getSubject(subjectId);
  if (!subject) return;
  if (!subject.studySessions) subject.studySessions = [];
  subject.studySessions.push({
    id: uid(),
    hours: Number(session.hours) || 0,
    date: session.date || new Date().toISOString().slice(0, 10),
    notes: session.notes || ""
  });
  persist();
}

export function deleteStudySession(subjectId, sessionId) {
  const subject = getSubject(subjectId);
  if (!subject?.studySessions) return;
  subject.studySessions = subject.studySessions.filter((session) => session.id !== sessionId);
  persist();
}

/* ---- Lessons ---- */

export function addLesson(subjectId, title) {
  const s = getSubject(subjectId);
  if (!s) return;
  s.lessons.push({
    id: uid(),
    title,
    understanding: "not", // "not" | "partial" | "understood"
    whatIUnderstood: "",
    whatIDidnt: "",
    toReview: "",
    notes: "",
    date: new Date().toISOString()
  });
  persist();
}

export function updateLesson(subjectId, lessonId, patch) {
  const s = getSubject(subjectId);
  const l = s?.lessons.find((l) => l.id === lessonId);
  if (l) Object.assign(l, patch);
  persist();
}

export function deleteLesson(subjectId, lessonId) {
  const s = getSubject(subjectId);
  if (!s) return;
  s.lessons = s.lessons.filter((l) => l.id !== lessonId);
  persist();
}

/* ---- Exams ---- */

export function addExam(subjectId, exam) {
  const s = getSubject(subjectId);
  if (!s) return;
  s.exams.push({
    id: uid(),
    name: exam.name,
    chapter: exam.chapter || "",
    type: exam.type,       // "daily" | "monthly" | "yearly"
    max: Number(exam.max),
    score: Number(exam.score),
    date: exam.date || new Date().toISOString()
  });
  persist();
}

export function updateExam(subjectId, examId, patch) {
  const subject = getSubject(subjectId);
  const exam = subject?.exams.find((item) => item.id === examId);
  if (!exam) return;
  Object.assign(exam, {
    name: patch.name,
    chapter: patch.chapter || "",
    type: patch.type,
    max: Number(patch.max),
    score: Number(patch.score),
    date: patch.date || exam.date
  });
  persist();
}

export function deleteExam(subjectId, examId) {
  const s = getSubject(subjectId);
  if (!s) return;
  s.exams = s.exams.filter((e) => e.id !== examId);
  persist();
}

/* ---------------------------------------------------------------------- */
/* GYM                                                                     */
/* ---------------------------------------------------------------------- */

export function addWorkout(category, date, exercises) {
  state.gym.workouts.push({
    id: uid(),
    category,
    date: date || new Date().toISOString(),
    exercises: exercises || [] // { name, sets, reps, weight, notes }
  });
  persist();
}

export function deleteWorkout(id) {
  state.gym.workouts = state.gym.workouts.filter((w) => w.id !== id);
  persist();
}

export function addGymCategory(name) {
  if (!state.gym.categories.includes(name)) state.gym.categories.push(name);
  persist();
}

/* ---------------------------------------------------------------------- */
/* LEARNING                                                                */
/* ---------------------------------------------------------------------- */

export function addLearningPath(name) {
  state.learning.paths.push({ id: uid(), name, items: [] });
  persist();
}

export function addLearningItem(pathId, title) {
  const p = state.learning.paths.find((p) => p.id === pathId);
  if (!p) return;
  p.items.push({ id: uid(), title, done: false });
  persist();
}

export function toggleLearningItem(pathId, itemId) {
  const p = state.learning.paths.find((p) => p.id === pathId);
  const item = p?.items.find((i) => i.id === itemId);
  if (item) item.done = !item.done;
  persist();
}

export function addLearningSession(session) {
  state.learning.sessions.push({
    id: uid(),
    topic: session.topic,
    hours: Number(session.hours) || 0,
    difficulty: session.difficulty || "medium",
    notes: session.notes || "",
    questions: session.questions || "",
    unclear: session.unclear || "",
    date: session.date || new Date().toISOString()
  });
  persist();
}

export function deleteLearningSession(id) {
  state.learning.sessions = state.learning.sessions.filter((s) => s.id !== id);
  persist();
}

export function addProject(project) {
  state.learning.projects.push({
    id: uid(),
    name: project.name,
    status: project.status || "planning", // planning | building | testing | completed
    whatBuilt: project.whatBuilt || "",
    whatLearned: project.whatLearned || "",
    problems: project.problems || "",
    nextStep: project.nextStep || ""
  });
  persist();
}

export function updateProject(id, patch) {
  const p = state.learning.projects.find((p) => p.id === id);
  if (p) Object.assign(p, patch);
  persist();
}

export function deleteProject(id) {
  state.learning.projects = state.learning.projects.filter((p) => p.id !== id);
  persist();
}

/* ---------------------------------------------------------------------- */
/* TASKS / PLANNER                                                        */
/* ---------------------------------------------------------------------- */

export function addTask(task) {
  state.tasks.push({
    id: uid(),
    title: task.title,
    type: task.type || "Other",
    date: task.date, // yyyy-mm-dd
    isPriority: !!task.isPriority,
    completed: false,
    notes: task.notes || ""
  });
  persist();
}

export function updateTask(id, patch) {
  const t = state.tasks.find((t) => t.id === id);
  if (t) Object.assign(t, patch);
  persist();
}

export function toggleTask(id) {
  const t = state.tasks.find((t) => t.id === id);
  if (t) t.completed = !t.completed;
  persist();
}

export function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  persist();
}

export function tasksForDate(dateStr) {
  return state.tasks.filter((t) => t.date === dateStr);
}

/* ---------------------------------------------------------------------- */
/* CALCULATIONS — every number shown in the UI is derived here from       */
/* real stored data. Nothing is invented (§23, §29, §30, §34, §42).       */
/* ---------------------------------------------------------------------- */

const UNDERSTANDING_VALUE = { not: 0, partial: 0.5, understood: 1 };

export function examPercent(exam) {
  if (!exam.max) return 0;
  return Math.round((exam.score / exam.max) * 100);
}

export function subjectExamAverage(subject) {
  if (!subject.exams.length) return null;
  const total = subject.exams.reduce((sum, e) => sum + examPercent(e), 0);
  return Math.round(total / subject.exams.length);
}

export function subjectExamAverageByType(subject, type) {
  const exams = subject.exams.filter((e) => e.type === type);
  if (!exams.length) return null;
  return Math.round(exams.reduce((s, e) => s + examPercent(e), 0) / exams.length);
}

export function subjectBestExam(subject) {
  if (!subject.exams.length) return null;
  return Math.max(...subject.exams.map(examPercent));
}

export function subjectLowestExam(subject) {
  if (!subject.exams.length) return null;
  return Math.min(...subject.exams.map(examPercent));
}

export function subjectUnderstanding(subject) {
  if (!subject.lessons.length) return null;
  const total = subject.lessons.reduce((s, l) => s + UNDERSTANDING_VALUE[l.understanding], 0);
  return Math.round((total / subject.lessons.length) * 100);
}

export function overallUnderstanding() {
  const allLessons = state.subjects.flatMap((s) => s.lessons);
  if (!allLessons.length) return null;
  const total = allLessons.reduce((s, l) => s + UNDERSTANDING_VALUE[l.understanding], 0);
  return Math.round((total / allLessons.length) * 100);
}

/** Discipline = task-completion behavior, not grades.
 *  For a subject: % of that subject's planned "Study Session" /
 *  "Homework" / "Exam Preparation" tasks that were completed, weighted
 *  slightly against tasks left overdue (past date, incomplete). */
export function subjectDiscipline(subjectName) {
  const related = state.tasks.filter(
    (t) => t.title.toLowerCase().includes(subjectName.toLowerCase())
  );
  if (!related.length) return null;
  const completed = related.filter((t) => t.completed).length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = related.filter((t) => !t.completed && t.date < today).length;
  const raw = (completed / related.length) * 100 - overdue * 4;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function overallDiscipline() {
  if (!state.tasks.length) return null;
  const completed = state.tasks.filter((t) => t.completed).length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = state.tasks.filter((t) => !t.completed && t.date < today).length;
  const raw = (completed / state.tasks.length) * 100 - overdue * 2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function disciplineBreakdown(subjectName) {
  const related = state.tasks.filter(
    (t) => t.title.toLowerCase().includes(subjectName.toLowerCase())
  );
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: related.length,
    completed: related.filter((t) => t.completed).length,
    overdue: related.filter((t) => !t.completed && t.date < today).length,
    upcoming: related.filter((t) => !t.completed && t.date >= today).length
  };
}

/* ---- Date helpers ---- */

function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysOfWeek(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function inRange(dateStr, from, to) {
  return dateStr >= from && dateStr <= to;
}

/* ---- Weekly / period stats ---- */

export function studyHoursInRange(fromStr, toStr) {
  return state.subjects
    .flatMap((subject) => subject.studySessions || [])
    .filter((session) => inRange(session.date.slice(0, 10), fromStr, toStr))
    .reduce((sum, session) => sum + session.hours, 0);
}

export function subjectStudyHours(subject) {
  return (subject.studySessions || []).reduce((sum, session) => sum + session.hours, 0);
}

export function learningHoursInRange(fromStr, toStr) {
  return state.learning.sessions
    .filter((s) => inRange(s.date.slice(0, 10), fromStr, toStr))
    .reduce((sum, s) => sum + s.hours, 0);
}

export function studyHoursByPeriod() {
  const now = new Date();
  const today = toDateStr(now);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const end = `${now.getFullYear()}-12-31`;
  return {
    day: studyHoursInRange(today, today),
    week: studyHoursInRange(toDateStr(weekStart), today),
    month: studyHoursInRange(toDateStr(monthStart), today),
    year: studyHoursInRange(toDateStr(yearStart), end)
  };
}

export function gymSessionsInRange(fromStr, toStr) {
  return state.gym.workouts.filter((w) => inRange(w.date.slice(0, 10), fromStr, toStr));
}

export function tasksCompletedInRange(fromStr, toStr) {
  return state.tasks.filter((t) => t.completed && inRange(t.date, fromStr, toStr)).length;
}

export function gymCurrentStreak() {
  const dates = new Set(state.gym.workouts.map((w) => w.date.slice(0, 10)));
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const ds = toDateStr(cursor);
    if (dates.has(ds)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && ds === toDateStr(new Date())) {
      // today has no workout yet — check yesterday to keep the streak alive
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
}

/** Weekly overview for the Main Menu "THIS WEEK" panel (§42). */
export function thisWeekSummary() {
  const start = startOfWeek();
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const fromStr = toDateStr(start), toStr = toDateStr(end);

  const learningHours = learningHoursInRange(fromStr, toStr);
  const gymSessions = gymSessionsInRange(fromStr, toStr).length;
  const tasksCompleted = tasksCompletedInRange(fromStr, toStr);
  const discipline = overallDiscipline();
  const understanding = overallUnderstanding();

  const studySessions = state.tasks.filter(
    (t) => t.type === "Study Session" && t.completed && inRange(t.date, fromStr, toStr)
  ).length;
  const studyHours = studyHoursInRange(fromStr, toStr);

  return { studySessions, studyHours, gymSessions, learningHours, tasksCompleted, discipline, understanding };
}

/** Strongest / weakest area + main focus for the Main Menu, based on
 *  real subject averages — never guessed (§42). */
export function strongestWeakestFocus() {
  const scored = state.subjects
    .map((s) => ({ name: s.name, avg: subjectExamAverage(s), und: subjectUnderstanding(s) }))
    .filter((s) => s.avg !== null || s.und !== null);

  if (!scored.length) return { strongest: null, weakest: null, focus: null };

  const rank = (s) => ((s.avg ?? 50) + (s.und ?? 50)) / 2;
  const sorted = [...scored].sort((a, b) => rank(b) - rank(a));
  return {
    strongest: sorted[0]?.name || null,
    weakest: sorted[sorted.length - 1]?.name || null,
    focus: sorted[sorted.length - 1]?.name || null
  };
}

/* ---- Weekly Review (§27–31) ---- */

export function weeklyReview(weekStart = startOfWeek()) {
  const thisStart = new Date(weekStart);
  const thisEnd = new Date(thisStart); thisEnd.setDate(thisEnd.getDate() + 6);
  const prevStart = new Date(thisStart); prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(thisStart); prevEnd.setDate(prevEnd.getDate() - 1);

  const tF = toDateStr(thisStart), tT = toDateStr(thisEnd);
  const pF = toDateStr(prevStart), pT = toDateStr(prevEnd);

  const thisWeek = {
    studySessions: state.tasks.filter((t) => t.type === "Study Session" && t.completed && inRange(t.date, tF, tT)).length,
    gymSessions: gymSessionsInRange(tF, tT).length,
    learningHours: learningHoursInRange(tF, tT),
    tasksCompleted: tasksCompletedInRange(tF, tT),
    discipline: overallDiscipline(),
    understanding: overallUnderstanding()
  };

  const prevWeek = {
    studySessions: state.tasks.filter((t) => t.type === "Study Session" && t.completed && inRange(t.date, pF, pT)).length,
    gymSessions: gymSessionsInRange(pF, pT).length,
    learningHours: learningHoursInRange(pF, pT),
    tasksCompleted: tasksCompletedInRange(pF, pT)
  };

  // "What went well" — built only from real deltas/data, never invented text.
  const wentWell = [];
  const needsWork = [];

  if (thisWeek.tasksCompleted > prevWeek.tasksCompleted && prevWeek.tasksCompleted > 0) {
    wentWell.push(`You completed ${thisWeek.tasksCompleted} tasks this week, up from ${prevWeek.tasksCompleted} last week.`);
  } else if (thisWeek.tasksCompleted > 0) {
    wentWell.push(`You completed ${thisWeek.tasksCompleted} tasks this week.`);
  }

  if (thisWeek.gymSessions >= prevWeek.gymSessions && thisWeek.gymSessions > 0) {
    wentWell.push(`You trained ${thisWeek.gymSessions} time${thisWeek.gymSessions === 1 ? "" : "s"} this week.`);
  }

  const scored = state.subjects
    .map((s) => ({ name: s.name, und: subjectUnderstanding(s) }))
    .filter((s) => s.und !== null);
  if (scored.length) {
    const best = [...scored].sort((a, b) => b.und - a.und)[0];
    const worst = [...scored].sort((a, b) => a.und - b.und)[0];
    if (best) wentWell.push(`${best.name} has your strongest understanding at ${best.und}%.`);
    if (worst && worst.name !== best.name) needsWork.push(`${worst.name} had the lowest understanding score at ${worst.und}%.`);
  }

  if (thisWeek.learningHours < prevWeek.learningHours && prevWeek.learningHours > 0) {
    needsWork.push(`Programming/learning hours dropped from ${prevWeek.learningHours}h to ${thisWeek.learningHours}h.`);
  }

  const overdueTasks = state.tasks.filter((t) => !t.completed && t.date < toDateStr(new Date()));
  if (overdueTasks.length) {
    needsWork.push(`${overdueTasks.length} task${overdueTasks.length === 1 ? " is" : "s are"} overdue and unfinished.`);
  }

  if (!wentWell.length) wentWell.push("Not enough data yet this week — log a few sessions to see insight here.");
  if (!needsWork.length) needsWork.push("Nothing concerning yet — keep the current pace.");

  // "Next week" suggestions — grounded in the same weak points above.
  const nextWeek = [];
  if (worstNeedsFocus(scored)) nextWeek.push(`Focus more on ${worstNeedsFocus(scored)}.`);
  if (overdueTasks.length) nextWeek.push("Review and clear overdue tasks before adding new ones.");
  if (thisWeek.gymSessions === 0) nextWeek.push("Get back into the gym — no sessions logged this week.");
  if (!nextWeek.length) nextWeek.push("Maintain your current consistency across all areas.");

  return { thisWeek, prevWeek, wentWell, needsWork, nextWeek };
}

function worstNeedsFocus(scored) {
  if (!scored.length) return null;
  const worst = [...scored].sort((a, b) => a.und - b.und)[0];
  return worst && worst.und < 70 ? worst.name : null;
}
