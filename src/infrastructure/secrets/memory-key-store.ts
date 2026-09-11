const sessionKey = "ideascope.provider.api-key";
let apiKey = readSessionKey();

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

export const memoryKeyStore = {
  set(value: string) {
    apiKey = value;
    writeSessionKey(value);
  },
  get() {
    return apiKey || readSessionKey();
  },
  clear() {
    apiKey = "";
    writeSessionKey("");
  },
};
