/* ==========================================================================
   THE LOG — STORAGE
   Everything here talks to localStorage. Nothing else in the app should
   call localStorage directly — that keeps a single seam if you ever need
   to swap storage later (e.g. a backend), per requirement §44.
   ========================================================================== */

const STORAGE_KEY = "thelog_state_v1";
import { supabase } from "./THE LOG 6.js";
let activeUser = null;

function storageKey(userId = null) {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

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

export function loadState(userId = null) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
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

let remoteSave = Promise.resolve();

export function saveNow(state) {
  const snapshot = JSON.parse(JSON.stringify(state));
  snapshot.meta = { ...(snapshot.meta || {}), lastSavedAt: new Date().toISOString() };
  const user = activeUser;
  try {
    localStorage.setItem(storageKey(user?.id), JSON.stringify(snapshot));
  } catch (error) {
    console.warn("THE LOG: local recovery copy could not be written.", error);
  }
  if (!user) {
    return Promise.resolve();
  }
  remoteSave = remoteSave.catch(() => {}).then(async () => {
    const { data, error } = await supabase.from("log_data").upsert({
      user_id: user.id,
      state: snapshot,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" }).select("user_id, state, updated_at").single();
    if (error) throw error;
    if (!data || data.user_id !== user.id) throw new Error("Supabase did not confirm this user's save.");
    window.dispatchEvent(new CustomEvent("thelog-save-status", { detail: { ok: true } }));
  }).catch((error) => {
    window.dispatchEvent(new CustomEvent("thelog-save-status", { detail: { ok: false, error } }));
    throw error;
  });
  return remoteSave;
}

export function saveState(state) {
  saveNow(state).catch((error) => console.error("THE LOG: failed to sync state.", error));
}

export async function loadRemoteState(user) {
  const { data, error } = await supabase.from("log_data").select("state").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return { exists: Boolean(data), state: data?.state || null };
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
