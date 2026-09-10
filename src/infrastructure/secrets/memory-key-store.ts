let apiKey = '';

export const memoryKeyStore = {
  set(value: string) { apiKey = value; },
  get() { return apiKey; },
  clear() { apiKey = ''; },
};
