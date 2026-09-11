const sessionKey = "ideascope.provider.api-key";
let apiKey = readSessionKey();
const scopedKeys = new Map<string, string>();

function readSessionKey() {
  if (typeof sessionStorage === "undefined") return "";
  try {
    return sessionStorage.getItem(sessionKey) ?? "";
  } catch {
    return "";
  }
}

function writeSessionKey(value: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (value) sessionStorage.setItem(sessionKey, value);
    else sessionStorage.removeItem(sessionKey);
  } catch {
    /* Memory fallback remains available. */
  }
}

function scopedSessionKey(profileId: string) { return `${sessionKey}.${profileId}`; }

function readScopedKey(profileId: string) {
  if (scopedKeys.has(profileId)) return scopedKeys.get(profileId) ?? "";
  if (typeof sessionStorage === "undefined") return "";
  try { return sessionStorage.getItem(scopedSessionKey(profileId)) ?? ""; } catch { return ""; }
}

export const memoryKeyStore = {
  set(value: string, profileId?: string) {
    if (profileId) {
      if (value) scopedKeys.set(profileId, value); else scopedKeys.delete(profileId);
      try { if (value) sessionStorage.setItem(scopedSessionKey(profileId), value); else sessionStorage.removeItem(scopedSessionKey(profileId)); } catch { /* Memory fallback remains available. */ }
      return;
    }
    apiKey = value;
    writeSessionKey(value);
  },
  get(profileId?: string) {
    if (profileId) return readScopedKey(profileId);
    return apiKey || readSessionKey();
  },
  activate(profileId: string) {
    const value = readScopedKey(profileId);
    apiKey = value;
    writeSessionKey(value);
  },
  remove(profileId: string) {
    scopedKeys.delete(profileId);
    try { sessionStorage.removeItem(scopedSessionKey(profileId)); } catch { /* Memory fallback remains available. */ }
  },
  clear() {
    apiKey = "";
    scopedKeys.clear();
    if (typeof sessionStorage !== "undefined") {
      try {
        for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
          const key = sessionStorage.key(index);
          if (key?.startsWith(`${sessionKey}.`)) sessionStorage.removeItem(key);
        }
      } catch { /* Memory fallback remains available. */ }
    }
    writeSessionKey("");
  },
};
