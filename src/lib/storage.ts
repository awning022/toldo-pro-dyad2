import type { AppState } from "./types";

export const APP_STORAGE_KEY = "toldo-pro-app-state-v1";
export const AI_STORAGE_KEY = "toldo-pro-ai-log-v1";

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function nowISO() {
  return new Date().toISOString();
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadAppState(fallback: AppState): AppState {
  return loadJson(APP_STORAGE_KEY, fallback);
}

export function saveAppState(state: AppState) {
  saveJson(APP_STORAGE_KEY, state);
}
