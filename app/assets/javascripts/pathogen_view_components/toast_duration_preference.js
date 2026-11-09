const DURATION_STORAGE_KEY = "pathogen.toast.durationMs";
const QUEUED_DURATION_PREFERENCE_ATTRIBUTE = "data-pathogen--toast-duration-preference-value";
// Only failed writes live here. Successful writes continue to use browser storage,
// including preferences changed in another tab.
const sessionPreferences = new Map();

const parseDurationPreference = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value === "forever") return 0;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.trunc(parsed);
};

const readStoredDurationPreference = (storageKey = DURATION_STORAGE_KEY) => {
  if (sessionPreferences.has(storageKey)) return sessionPreferences.get(storageKey);

  try {
    return window.localStorage?.getItem(storageKey) ?? null;
  } catch {
    return null;
  }
};

const writeDurationPreference = (value, storageKey = DURATION_STORAGE_KEY) => {
  const stored = value === "" ? null : value;
  try {
    const storage = window.localStorage;
    if (!storage) throw new Error("Browser storage unavailable");
    if (stored === null) storage.removeItem(storageKey);
    else storage.setItem(storageKey, stored);
    sessionPreferences.delete(storageKey);
  } catch {
    sessionPreferences.set(storageKey, stored);
  }
};

const readDurationPreferenceFromStorage = (storageKey = DURATION_STORAGE_KEY) =>
  parseDurationPreference(readStoredDurationPreference(storageKey));

const resolveDurationPreference = ({ explicitPreference = null, storageKey = DURATION_STORAGE_KEY } = {}) => {
  const parsedExplicit = parseDurationPreference(explicitPreference);
  if (parsedExplicit !== null) return parsedExplicit;

  return readDurationPreferenceFromStorage(storageKey);
};

export {
  DURATION_STORAGE_KEY,
  QUEUED_DURATION_PREFERENCE_ATTRIBUTE,
  parseDurationPreference,
  readStoredDurationPreference,
  readDurationPreferenceFromStorage,
  writeDurationPreference,
  resolveDurationPreference,
};
