const prefix = "ideascope.source.credential.";
const credentials = new Map<string, string>();

function read(slot: string) {
  if (typeof sessionStorage === "undefined") return "";
  try {
    return sessionStorage.getItem(`${prefix}${slot}`) ?? "";
  } catch {
    return "";
  }
}

export const sourceCredentialStore = {
  set(slot: string, value: string) {
    const clean = value.trim();
    if (clean) credentials.set(slot, clean);
    else credentials.delete(slot);
    if (typeof sessionStorage === "undefined") return;
    try {
      if (clean) sessionStorage.setItem(`${prefix}${slot}`, clean);
      else sessionStorage.removeItem(`${prefix}${slot}`);
    } catch {
      // Memory-only fallback remains available.
    }
  },
  get(slot: string) {
    return (credentials.get(slot) ?? read(slot)) || null;
  },
  clear(slot?: string) {
    if (slot) {
      credentials.delete(slot);
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(`${prefix}${slot}`);
      return;
    }
    credentials.clear();
    if (typeof sessionStorage === "undefined") return;
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  },
};
