/* ==========================================================================
   THE LOG — APP
   Ties everything together: a tiny hash router decides which render*
   function to call; one delegated click listener reads data-action off
   whatever was clicked and dispatches to a handler; every handler mutates
   state then calls render() again. This "one direction of data flow" is
   the same core idea behind frameworks like React — we're just doing the
   wiring by hand instead of a library doing it for us.
   ========================================================================== */

import * as S from "./THE LOG 8.js";
import * as R from "./THE LOG 10.js";
import * as M from "./THE LOG 11.js";
import { currentSession, signIn, signUp, signOut, resetPassword, supabase } from "./THE LOG 6.js";

const viewRoot = document.getElementById("view-root");
const body = document.body;
const introSplash = document.getElementById("intro-splash");
const introVideo = introSplash?.querySelector("video");
const skipIntro = document.getElementById("skip-intro");

let insightsPeriod = "week";
let plannerWeekOffset = 0;
let reminderTimer = null;
let installPrompt = null;
let session = null;
let authReady = false;
let authMode = "login";

function closeIntro() {
  if (!introSplash) return;
  introSplash.classList.add("is-hidden");
  introVideo?.pause();
  setTimeout(() => introSplash.remove(), 450);
}

skipIntro?.addEventListener("click", closeIntro);
introVideo?.addEventListener("ended", closeIntro);

/* ---------------------------------------------------------------------- */
/* ROUTER                                                                  */
/* ---------------------------------------------------------------------- */

const SECTIONS = ["menu", "study", "gym", "learning", "planner", "insights", "review"];

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [section, id] = raw.split("/");
  if (!SECTIONS.includes(section)) return { section: "menu", id: null };
  return { section, id: id || null };
}

function route() {
  if (!authReady || !session) {
    body.dataset.section = "menu";
    viewRoot.innerHTML = M.tplAuth(authMode);
    return;
  }
  const { section, id } = parseHash();
  body.dataset.section = section === "review" ? "planner" : section; // review shares planner's color identity family visually but keep as planner theme
  updateNav(section);

  let html = "";
  if (section === "menu") html = R.renderMenu();
  else if (section === "study") {
    if (id) {
      const subject = S.getSubject(id);
      html = subject ? R.renderSubjectDetail(subject) : R.renderStudyList();
    } else html = R.renderStudyList();
  } else if (section === "gym") html = R.renderGym();
  else if (section === "learning") html = R.renderLearning();
  else if (section === "planner") html = R.renderPlanner(plannerWeekOffset);
  else if (section === "insights") html = R.renderInsights(insightsPeriod);
  else if (section === "review") html = R.renderWeeklyReview();

  viewRoot.innerHTML = html;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function updateNav(section) {
  document.querySelectorAll("[data-nav-link]").forEach((el) => {
    el.classList.toggle("active", el.dataset.navLink === section || (section === "review" && el.dataset.navLink === "planner"));
  });
}

window.addEventListener("hashchange", route);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  document.getElementById("install-app")?.removeAttribute("hidden");
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  document.getElementById("install-app")?.setAttribute("hidden", "");
});

document.addEventListener("click", async (event) => {
  const authSwitch = event.target.closest("[data-auth-mode]");
  if (authSwitch) {
    authMode = authSwitch.dataset.authMode;
    route();
    return;
  }
  if (event.target.closest("#install-app") && installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    document.getElementById("install-app")?.setAttribute("hidden", "");
  }
});

/* ---------------------------------------------------------------------- */
/* TOAST                                                                   */
/* ---------------------------------------------------------------------- */

function toast(msg) {
  const host = document.getElementById("toast-host");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function exportData() {
  const blob = new Blob([JSON.stringify(S.state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `the-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Backup downloaded");
}

function importData(file) {
  if (!file) return;
  file.text().then((text) => {
    let snapshot;
    try {
      snapshot = JSON.parse(text);
    } catch {
      toast("That file is not valid JSON");
      return;
    }
    if (!S.importState(snapshot)) {
      toast("That file is not a THE LOG backup");
      return;
    }
    route();
    toast("Backup restored");
  }).catch(() => toast("Could not read that file"));
}

function enableReminders() {
  if (!("Notification" in window)) {
    toast("Notifications are not supported here");
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission !== "granted") {
      toast("Notification permission was not granted");
      return;
    }
    if (reminderTimer) clearInterval(reminderTimer);
    const sendReminder = () => {
      const today = new Date().toISOString().slice(0, 10);
      const pending = S.tasksForDate(today).filter((task) => !task.completed);
      if (pending.length) {
        new Notification("THE LOG", { body: `${pending.length} task${pending.length === 1 ? "" : "s"} still open today.` });
      }
    };
    sendReminder();
    reminderTimer = setInterval(sendReminder, 30 * 60 * 1000);
    toast("Reminders enabled while THE LOG is open");
  }).catch(() => toast("Notifications need browser permission to work"));
}

/* ---------------------------------------------------------------------- */
/* MODAL OPENERS                                                           */
/* ---------------------------------------------------------------------- */

function handleAddSubject() {
  M.openModal(M.tplAddSubject(), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim();
      if (!name) return;
      S.addSubject(name);
      M.closeModal();
      route();
      toast("Subject added");
    });
  });
}

function handleAddLesson(subjectId) {
  M.openModal(M.tplAddLesson(), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = new FormData(e.target).get("title").trim();
      if (!title) return;
      S.addLesson(subjectId, title);
      M.closeModal();
      route();
      toast("Lesson added");
    });
  });
}

function handleAddStudySession(subjectId) {
  M.openModal(M.tplAddStudySession(), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.addStudySession(subjectId, {
        hours: fd.get("hours"),
        date: fd.get("date"),
        notes: fd.get("notes").trim()
      });
      M.closeModal();
      route();
      toast("Study session logged");
    });
  });
}

function handleEditSubject(subjectId) {
  const subject = S.getSubject(subjectId);
  if (!subject) return;
  M.openModal(M.tplEditSubject(subject), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim();
      if (!name) return;
      S.updateSubject(subjectId, { name });
      M.closeModal();
      route();
      toast("Subject updated");
    });
  });
}

function handleAddExam(subjectId) {
  M.openModal(M.tplAddExam(), (root) => {
    M.wireExamTypeMax(root);
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.addExam(subjectId, {
        name: fd.get("name").trim(),
        chapter: fd.get("chapter").trim(),
        type: fd.get("type"),
        max: fd.get("max"),
        score: fd.get("score"),
        date: fd.get("date")
      });
      M.closeModal();
      route();
      toast("Exam added");
    });
  });
}

function handleEditExam(subjectId, examId) {
  const subject = S.getSubject(subjectId);
  const exam = subject?.exams.find((item) => item.id === examId);
  if (!exam) return;
  M.openModal(M.tplEditExam(exam), (root) => {
    M.wireExamTypeMax(root);
    root.querySelector('#exam-max-select').value = String(exam.max);
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.updateExam(subjectId, examId, {
        name: fd.get("name").trim(),
        chapter: fd.get("chapter").trim(),
        type: fd.get("type"),
        max: fd.get("max"),
        score: fd.get("score"),
        date: fd.get("date")
      });
      M.closeModal();
      route();
      toast("Exam updated");
    });
  });
}

function handleExplanation(subjectId, lessonId) {
  const subject = S.getSubject(subjectId);
  const lesson = subject?.lessons.find((l) => l.id === lessonId);
  if (!lesson) return;
  M.openModal(M.tplExplanation(lesson), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.updateLesson(subjectId, lessonId, {
        whatIUnderstood: fd.get("whatIUnderstood"),
        whatIDidnt: fd.get("whatIDidnt"),
        toReview: fd.get("toReview"),
        notes: fd.get("notes")
      });
      M.closeModal();
      toast("Notes saved");
    });
  });
}

function handleAddWorkout() {
  let rowCount = 0;
  M.openModal(M.tplAddWorkout(S.state.gym.categories), (root) => {
    const rowsHost = root.querySelector("#exercise-rows");
    function addRow() {
      const div = document.createElement("div");
      div.innerHTML = M.exerciseRowHtml(rowCount++);
      rowsHost.appendChild(div.firstElementChild);
    }
    addRow();
    root.querySelector("#add-exercise-row").addEventListener("click", addRow);

    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const exercises = [];
      for (let i = 0; i < rowCount; i++) {
        const name = fd.get(`ex-name-${i}`);
        if (!name || !name.trim()) continue;
        exercises.push({
          name: name.trim(),
          sets: Number(fd.get(`ex-sets-${i}`)) || 0,
          reps: Number(fd.get(`ex-reps-${i}`)) || 0,
          weight: Number(fd.get(`ex-weight-${i}`)) || 0,
          notes: fd.get(`ex-notes-${i}`)?.trim() || ""
        });
      }
      S.addWorkout(fd.get("category"), fd.get("date"), exercises);
      M.closeModal();
      route();
      toast("Workout logged");
    });
  });
}

function handleAddPath() {
  M.openModal(M.tplAddPath(), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim();
      if (!name) return;
      S.addLearningPath(name);
      M.closeModal();
      route();
      toast("Path added");
    });
  });
}

function handleAddPathItem(pathId) {
  M.openModal(M.tplAddPathItem(), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = new FormData(e.target).get("title").trim();
      if (!title) return;
      S.addLearningItem(pathId, title);
      M.closeModal();
      route();
    });
  });
}

function handleAddProject() {
  M.openModal(M.tplAddProject(), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.addProject({
        name: fd.get("name").trim(),
        status: fd.get("status"),
        whatBuilt: fd.get("whatBuilt"),
        whatLearned: fd.get("whatLearned"),
        problems: fd.get("problems"),
        nextStep: fd.get("nextStep")
      });
      M.closeModal();
      route();
      toast("Project added");
    });
  });
}

function handleAddSession() {
  M.openModal(M.tplAddSession(), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.addLearningSession({
        topic: fd.get("topic").trim(),
        hours: fd.get("hours"),
        difficulty: fd.get("difficulty"),
        notes: fd.get("notes"),
        questions: fd.get("questions"),
        unclear: fd.get("unclear")
      });
      M.closeModal();
      route();
      toast("Session logged");
    });
  });
}

function handleAddTask(date, priority) {
  const d = date || new Date().toISOString().slice(0, 10);
  M.openModal(M.tplAddTask(d, priority === "1"), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.addTask({
        title: fd.get("title").trim(),
        type: fd.get("type"),
        date: fd.get("date"),
        isPriority: fd.get("isPriority") === "on",
        notes: fd.get("notes")?.trim() || ""
      });
      M.closeModal();
      route();
      toast("Task added");
    });
  });
}

function handleEditTask(taskId) {
  const task = S.state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  M.openModal(M.tplEditTask(task), (root) => {
    root.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.updateTask(taskId, {
        title: fd.get("title").trim(),
        type: fd.get("type"),
        date: fd.get("date"),
        notes: fd.get("notes").trim(),
        isPriority: fd.get("isPriority") === "on"
      });
      M.closeModal();
      route();
      toast("Task updated");
    });
  });
}

/* ---------------------------------------------------------------------- */
/* GLOBAL EVENT DELEGATION                                                 */
/* ---------------------------------------------------------------------- */

document.addEventListener("click", (e) => {
  const closeBtn = e.target.closest("[data-close-modal]");
  if (closeBtn) { M.closeModal(); return; }

  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case "sign-out": signOut().catch(() => toast("Could not log out")); break;
    case "export-data": exportData(); break;
    case "import-data": document.getElementById("import-file")?.click(); break;
    case "enable-reminders": enableReminders(); break;
    case "open-add-subject": handleAddSubject(); break;
    case "delete-subject":
      if (confirm("Delete this subject and all its exams and lessons?")) {
        S.deleteSubject(el.dataset.subject);
        location.hash = "#/study";
      }
      break;
    case "open-add-lesson": handleAddLesson(el.dataset.subject); break;
    case "open-add-study-session": handleAddStudySession(el.dataset.subject); break;
    case "delete-study-session": S.deleteStudySession(el.dataset.subject, el.dataset.session); route(); break;
    case "open-edit-subject": handleEditSubject(el.dataset.subject); break;
    case "open-add-exam": handleAddExam(el.dataset.subject); break;
    case "open-edit-exam": handleEditExam(el.dataset.subject, el.dataset.exam); break;
    case "delete-exam": S.deleteExam(el.dataset.subject, el.dataset.exam); route(); break;
    case "delete-lesson": S.deleteLesson(el.dataset.subject, el.dataset.lesson); route(); break;
    case "set-understanding":
      S.updateLesson(el.dataset.subject, el.dataset.lesson, { understanding: el.dataset.level });
      route();
      break;
    case "open-explanation": handleExplanation(el.dataset.subject, el.dataset.lesson); break;

    case "open-add-workout": handleAddWorkout(); break;
    case "delete-workout": S.deleteWorkout(el.dataset.workout); route(); break;

    case "open-add-path": handleAddPath(); break;
    case "open-add-path-item": handleAddPathItem(el.dataset.path); break;
    case "toggle-learning-item": S.toggleLearningItem(el.dataset.path, el.dataset.item); route(); break;
    case "open-add-project": handleAddProject(); break;
    case "open-add-session": handleAddSession(); break;
    case "delete-learning-session": S.deleteLearningSession(el.dataset.session); route(); break;

    case "open-add-task": handleAddTask(el.dataset.date, el.dataset.priority); break;
    case "open-edit-task": handleEditTask(el.dataset.task); break;
    case "toggle-task": S.toggleTask(el.dataset.task); route(); break;
    case "delete-task": S.deleteTask(el.dataset.task); route(); break;
    case "week-prev": plannerWeekOffset--; route(); break;
    case "week-next": plannerWeekOffset++; route(); break;

    case "set-insights-period": insightsPeriod = el.dataset.period; route(); break;
  }
});

document.addEventListener("change", (e) => {
  if (e.target.matches("[data-toggle-password]")) {
    const password = e.target.closest(".field")?.querySelector("input[name='password']");
    if (password) password.type = e.target.checked ? "text" : "password";
    return;
  }
  if (e.target.id === "import-file") {
    importData(e.target.files?.[0]);
    e.target.value = "";
    return;
  }
  const el = e.target.closest("[data-action='update-project-status']");
  if (el) {
    S.updateProject(el.dataset.project, { status: el.value });
    toast("Project status updated");
  }
});

document.addEventListener("submit", async (e) => {
  if (e.target.id !== "auth-form") return;
  e.preventDefault();
  const form = new FormData(e.target);
  const button = e.target.querySelector("button[type='submit']");
  const error = document.getElementById("auth-error");
  button.disabled = true;
  error.hidden = true;
  try {
    const result = authMode === "signup"
      ? await signUp(form.get("email"), form.get("password"), form.get("name"))
      : authMode === "reset"
        ? await resetPassword(form.get("email"))
        : await signIn(form.get("email"), form.get("password"));
    if (result.error) throw result.error;
    if (authMode === "signup" && !result.data.session) {
      error.textContent = "Account created. Check your email to confirm it, then log in.";
      error.hidden = false;
    } else if (authMode === "reset") {
      error.textContent = "Password reset link sent. Check your email.";
      error.hidden = false;
    }
  } catch (err) {
    error.textContent = err.message || "Authentication failed. Please try again.";
    error.hidden = false;
  } finally {
    button.disabled = false;
  }
});

/* ---------------------------------------------------------------------- */
/* INIT                                                                     */
/* ---------------------------------------------------------------------- */

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("THE LOG: offline app shell unavailable.", error);
  });
}

async function boot() {
  try {
    session = await currentSession();
    if (session) await S.hydrateForUser(session.user);
    authReady = true;
    route();
    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      session = nextSession;
      if (session) await S.hydrateForUser(session.user);
      else S.clearUser();
      route();
    });
  } catch (error) {
    authReady = true;
    viewRoot.innerHTML = `<div class="empty-state"><div class="h2">Account service unavailable</div><p class="muted">${error.message || "Check your connection and try again."}</p></div>`;
  }
}

if (!location.hash) location.hash = "#/menu";
boot();
