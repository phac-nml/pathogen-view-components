const DURATION_STORAGE_KEY = "pathogen.toast.durationMs";
const QUEUED_DURATION_PREFERENCE_ATTRIBUTE = "data-pathogen--toast-duration-preference-value";

const parseDurationPreference = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value === "forever") return 0;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.trunc(parsed);
};

const readDurationPreferenceFromStorage = (storageKey = DURATION_STORAGE_KEY) => {
  try {
    const raw = window.localStorage?.getItem(storageKey);
    return parseDurationPreference(raw);
  } catch {
    return null;
  }
};

const resolveDurationPreference = ({ explicitPreference = null, storageKey = DURATION_STORAGE_KEY } = {}) => {
  const parsedExplicit = parseDurationPreference(explicitPreference);
  if (parsedExplicit !== null) return parsedExplicit;

  return readDurationPreferenceFromStorage(storageKey);
};

export {
  DURATION_STORAGE_KEY,
  QUEUED_DURATION_PREFERENCE_ATTRIBUTE,
  parseDurationPreference,
  readDurationPreferenceFromStorage,
  resolveDurationPreference,
};
