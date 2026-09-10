/* ==========================================================================
   THE LOG — MODALS
   One generic overlay element reused for every form (§47: "clean modern
   modals... simple and easy to use"). Each open* function fills it with
   a template and wires its own submit handler.
   ========================================================================== */

const overlay = document.getElementById("modal-overlay");
const modalBody = document.getElementById("modal-body");
let clearTimer = null;

export function closeModal() {
  overlay.classList.remove("open");
  overlay.removeAttribute("role");
  overlay.setAttribute("aria-hidden", "true");
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => { modalBody.innerHTML = ""; }, 200);
}

export function openModal(html, onMount) {
  clearTimeout(clearTimer);
  modalBody.innerHTML = html;
  overlay.classList.add("open");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-hidden", "false");
  if (onMount) onMount(modalBody);
  const first = modalBody.querySelector("input, textarea, select");
  if (first) setTimeout(() => first.focus(), 50);
}

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

function modalShell(title, bodyHtml, submitLabel = "Save") {
  return `
    <div class="modal-head">
      <h2>${title}</h2>
      <button class="btn-icon" data-close-modal>✕</button>
    </div>
    <form id="modal-form">
      ${bodyHtml}
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost btn-block" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary btn-block">${submitLabel}</button>
      </div>
    </form>`;
}

/* ---- Templates ---- */

export function tplAddSubject() {
  return modalShell("Add Subject", `
    <div class="field"><label>Subject name</label><input name="name" placeholder="e.g. Mathematics" required></div>
  `, "Add Subject");
}

export function tplAuth(mode = "login") {
  const signup = mode === "signup";
  const reset = mode === "reset";
  return `
    <section class="auth-screen">
      <div class="auth-mark"><span class="dot" aria-hidden="true"></span>THE LOG</div>
      <h1>${signup ? "Create your account" : reset ? "Reset your password" : "Welcome back"}</h1>
      <p class="muted">${signup ? "Keep your personal progress connected everywhere." : reset ? "Enter your email and we will send a reset link." : "Sign in to continue to your personal log."}</p>
      <form id="auth-form" class="auth-form">
        ${signup ? `<div class="field"><label for="auth-name">Your name</label><input id="auth-name" name="name" autocomplete="name" required></div>` : ""}
        <div class="field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="email" required></div>
        ${reset ? "" : `<div class="field"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" minlength="6" autocomplete="${signup ? "new-password" : "current-password"}" required><label class="password-toggle"><input type="checkbox" data-toggle-password> Show password</label></div>`}
        <button class="btn btn-primary btn-block" type="submit">${signup ? "Create account" : reset ? "Send reset link" : "Log in"}</button>
      </form>
      ${signup ? `<button class="auth-switch" type="button" data-auth-mode="login">Already have an account? Log in</button>` : `<button class="auth-switch" type="button" data-auth-mode="signup">New here? Create an account</button>${reset ? "" : `<button class="auth-switch" type="button" data-auth-mode="reset">Forgot your password?</button>`}`}
      <div class="auth-error" id="auth-error" role="alert" hidden></div>
    </section>`;
}

export function tplEditSubject(subject) {
  return modalShell("Edit Subject", `
    <div class="field"><label>Subject name</label><input name="name" value="${escHtml(subject.name)}" required></div>
  `, "Save Subject");
}

export function tplAddLesson() {
  return modalShell("Add Lesson", `
    <div class="field"><label>Lesson title</label><input name="title" placeholder="e.g. Chapter 3 — Derivatives" required></div>
  `, "Add Lesson");
}

export function tplAddStudySession() {
  return modalShell("Log Study Session", `
    <div class="field"><label>Hours studied</label><input name="hours" type="number" min="0.25" step="0.25" required></div>
    <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></div>
    <div class="field"><label>Notes</label><textarea name="notes" placeholder="What did you work on?"></textarea></div>
  `, "Log Session");
}

export function tplAddExam() {
  return modalShell("Add Exam", `
    <div class="field"><label>Exam name</label><input name="name" placeholder="e.g. Chapter 3 Test" required></div>
    <div class="field"><label>Chapter / topic</label><input name="chapter" placeholder="Optional"></div>
    <div class="field-row">
      <div class="field">
        <label>Type</label>
        <select name="type">
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div class="field">
        <label>Maximum score</label>
        <select name="max" id="exam-max-select">
          <option value="10">10</option>
          <option value="20">20</option>
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>My score</label><input name="score" type="number" min="0" step="0.5" required></div>
      <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
  `, "Add Exam");
}

export function tplEditExam(exam) {
  const typeOptions = [
    ["daily", "Daily"],
    ["monthly", "Monthly"],
    ["yearly", "Yearly"]
  ].map(([value, label]) => `<option value="${value}"${exam.type === value ? " selected" : ""}>${label}</option>`).join("");
  return modalShell("Edit Exam", `
    <div class="field"><label>Exam name</label><input name="name" value="${escHtml(exam.name)}" required></div>
    <div class="field"><label>Chapter / topic</label><input name="chapter" value="${escHtml(exam.chapter)}"></div>
    <div class="field-row">
      <div class="field"><label>Type</label><select name="type">${typeOptions}</select></div>
      <div class="field"><label>Maximum score</label><select name="max" id="exam-max-select"></select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>My score</label><input name="score" type="number" min="0" step="0.5" value="${exam.score}" required></div>
      <div class="field"><label>Date</label><input name="date" type="date" value="${exam.date.slice(0, 10)}"></div>
    </div>
  `, "Save Exam");
}

export function wireExamTypeMax(root) {
  const typeSel = root.querySelector('select[name="type"]');
  const maxSel = root.querySelector("#exam-max-select");
  const options = { daily: ["10", "20"], monthly: ["20", "40"], yearly: ["40", "80"] };
  function refresh() {
    maxSel.innerHTML = options[typeSel.value].map((v) => `<option value="${v}">${v}</option>`).join("");
  }
  typeSel.addEventListener("change", refresh);
  refresh();
}

export function tplExplanation(lesson) {
  return `
    <div class="modal-head">
      <h2>${escHtml(lesson.title)}</h2>
      <button class="btn-icon" data-close-modal>✕</button>
    </div>
    <form id="modal-form">
      <div class="field"><label>What I understood</label><textarea name="whatIUnderstood">${escHtml(lesson.whatIUnderstood)}</textarea></div>
      <div class="field"><label>What I didn't understand</label><textarea name="whatIDidnt">${escHtml(lesson.whatIDidnt)}</textarea></div>
      <div class="field"><label>What I need to review</label><textarea name="toReview">${escHtml(lesson.toReview)}</textarea></div>
      <div class="field"><label>My notes</label><textarea name="notes">${escHtml(lesson.notes)}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost btn-block" data-close-modal>Close</button>
        <button type="submit" class="btn btn-primary btn-block">Save Notes</button>
      </div>
    </form>`;
}

export function tplAddWorkout(categories) {
  return `
    <div class="modal-head"><h2>Log Workout</h2><button class="btn-icon" data-close-modal>✕</button></div>
    <form id="modal-form">
      <div class="field-row">
        <div class="field">
          <label>Category</label>
          <select name="category">${categories.map((c) => `<option value="${c}">${c}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div id="exercise-rows"></div>
      <button type="button" class="btn btn-ghost btn-sm" id="add-exercise-row">+ Add Exercise</button>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost btn-block" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary btn-block">Save Workout</button>
      </div>
    </form>`;
}

export function exerciseRowHtml(i) {
  return `
    <div class="field-row exercise-row" data-row="${i}" style="align-items:end;flex-wrap:wrap">
      <div class="field"><label>Exercise</label><input name="ex-name-${i}" placeholder="e.g. Bench Press" required></div>
      <div class="field"><label>Sets</label><input name="ex-sets-${i}" type="number" min="0"></div>
      <div class="field"><label>Reps</label><input name="ex-reps-${i}" type="number" min="0"></div>
      <div class="field"><label>Weight (kg)</label><input name="ex-weight-${i}" type="number" min="0" step="0.5"></div>
      <div class="field" style="flex-basis:100%"><label>Notes</label><input name="ex-notes-${i}" placeholder="Optional form or progress note"></div>
    </div>`;
}

export function tplAddPath() {
  return modalShell("Add Learning Path", `
    <div class="field"><label>Path name</label><input name="name" placeholder="e.g. Python" required></div>
  `, "Add Path");
}

export function tplAddPathItem() {
  return modalShell("Add Item", `
    <div class="field"><label>Item</label><input name="title" placeholder="e.g. Loops & Functions" required></div>
  `, "Add Item");
}

export function tplAddProject() {
  return modalShell("Add Project", `
    <div class="field"><label>Project name</label><input name="name" placeholder="e.g. THE LOG" required></div>
    <div class="field"><label>Status</label>
      <select name="status">
        <option value="planning">Planning</option>
        <option value="building">Building</option>
        <option value="testing">Testing</option>
        <option value="completed">Completed</option>
      </select>
    </div>
    <div class="field"><label>What I built</label><textarea name="whatBuilt"></textarea></div>
    <div class="field"><label>What I learned</label><textarea name="whatLearned"></textarea></div>
    <div class="field"><label>Problems</label><textarea name="problems"></textarea></div>
    <div class="field"><label>Next step</label><textarea name="nextStep"></textarea></div>
  `, "Add Project");
}

export function tplAddSession() {
  return modalShell("Log Learning Session", `
    <div class="field"><label>Topic</label><input name="topic" placeholder="e.g. Python — Loops" required></div>
    <div class="field-row">
      <div class="field"><label>Hours</label><input name="hours" type="number" min="0" step="0.25" required></div>
      <div class="field"><label>Difficulty</label>
        <select name="difficulty"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select>
      </div>
    </div>
    <div class="field"><label>What I learned</label><textarea name="notes"></textarea></div>
    <div class="field"><label>Questions</label><textarea name="questions"></textarea></div>
    <div class="field"><label>What I still don't understand</label><textarea name="unclear"></textarea></div>
  `, "Log Session");
}

export function tplAddTask(defaultDate, defaultPriority) {
  return modalShell("Add Task", `
    <div class="field"><label>Task</label><input name="title" placeholder="e.g. Study Mathematics — Chapter 3" required></div>
    <div class="field-row">
      <div class="field"><label>Type</label>
        <select name="type">
          <option>Study Session</option><option>Homework</option><option>Exam Preparation</option>
          <option>Gym</option><option>Programming</option><option>Reading</option><option>Other</option>
        </select>
      </div>
      <div class="field"><label>Date</label><input name="date" type="date" value="${defaultDate}"></div>
    </div>
    <div class="field"><label>Notes</label><textarea name="notes" placeholder="Optional context or next step"></textarea></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;margin-bottom:12px">
      <input type="checkbox" name="isPriority" ${defaultPriority ? "checked" : ""}> Mark as a Top 3 priority for that day
    </label>
  `, "Add Task");
}

export function tplEditTask(task) {
  const types = ["Study Session", "Homework", "Exam Preparation", "Gym", "Programming", "Reading", "Other"]
    .map((type) => `<option${task.type === type ? " selected" : ""}>${type}</option>`).join("");
  return modalShell("Edit Task", `
    <div class="field"><label>Task</label><input name="title" value="${escHtml(task.title)}" required></div>
    <div class="field-row">
      <div class="field"><label>Type</label><select name="type">${types}</select></div>
      <div class="field"><label>Date</label><input name="date" type="date" value="${task.date}" required></div>
    </div>
    <div class="field"><label>Notes</label><textarea name="notes" placeholder="Optional context or next step">${escHtml(task.notes)}</textarea></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;margin-bottom:12px">
      <input type="checkbox" name="isPriority" ${task.isPriority ? "checked" : ""}> Mark as a Top 3 priority for that day
    </label>
  `, "Save Task");
}

function escHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
