const win = (typeof window !== "undefined" ? window : {}) as Window;

function wrapper(storage: Storage) {
  const isSupported = (() => {
    try {
      const key = "__test_key_what_you_do_not_use__";
      storage.setItem(key, "");
      storage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  })();

  if (isSupported) {
    return {
      get(key: string) {
        const item = storage.getItem(key);
        return item ? JSON.parse(item) : null;
      },
      set(key: string, value: any) {
        storage.setItem(key, JSON.stringify(value));
      },
    };
  }

  const inmemory: { [k: string]: any } = {};
  return {
    get(key: string) {
      return inmemory[key] ?? null;
    },
    set(key: string, value: any) {
      inmemory[key] = value;
    },
  };
}

export const Storage = {
  session: wrapper(win.sessionStorage),
};
