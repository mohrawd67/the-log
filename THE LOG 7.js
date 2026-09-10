/* ==========================================================================
   THE LOG — STORAGE
   Everything here talks to localStorage. Nothing else in the app should
   call localStorage directly — that keeps a single seam if you ever need
   to swap storage later (e.g. a backend), per requirement §44.
   ========================================================================== */

const STORAGE_KEY = "thelog_state_v1";
let activeUser = null;

export function setActiveUser(user) {
  activeUser = user || null;
}

/** Returns the default empty state shape. Every array starts empty —
 *  the app must never ship with fake/hard-coded personal data (§43, §34). */
export function defaultState() {
  return {
    subjects: [],      // { id, name, color, lessons: [], exams: [] }
    gym: {
      categories: ["Chest", "Back", "Legs", "Shoulders", "Arms", "Full Body"],
      workouts: []      // { id, category, date, durationMin, exercises: [] }
    },
    learning: {
      paths: [],        // { id, name, items: [{id,title,done}] }
      sessions: [],      // { id, topic, hours, difficulty, notes, questions, unclear, date }
      projects: []       // { id, name, status, whatBuilt, whatLearned, problems, nextStep }
    },
    tasks: [],           // { id, title, type, date, isPriority, completed, notes }
    meta: {
      createdAt: new Date().toISOString()
    }
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields introduced later don't break old saves
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      gym: { ...base.gym, ...(parsed.gym || {}) },
      learning: { ...base.learning, ...(parsed.learning || {}) },
      meta: { ...base.meta, ...(parsed.meta || {}) }
    };
  } catch (err) {
    console.error("THE LOG: failed to load state, starting fresh.", err);
    return defaultState();
  }
}

let saveTimer = null;
export function saveState(state) {
  // Debounce writes slightly so rapid actions (typing, dragging) don't
  // thrash localStorage — keeps the app fast per §54.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      if (activeUser) {
        import("./THE LOG 6.js").then(({ supabase }) => supabase.from("log_data").upsert({
          user_id: activeUser.id,
          state,
          updated_at: new Date().toISOString()
        })).catch((err) => console.error("THE LOG: failed to sync state.", err));
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (err) {
      console.error("THE LOG: failed to save state.", err);
    }
  }, 120);
}

export async function loadRemoteState(user) {
  const { supabase } = await import("./THE LOG 6.js");
  const { data, error } = await supabase.from("log_data").select("state").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return data?.state || null;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
