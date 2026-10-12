const key = "spoke-csrf";

const storage = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const readCsrfToken = () => {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

export const writeCsrfToken = (token: string | null) => {
  try {
    if (token) storage()?.setItem(key, token);
    else storage()?.removeItem(key);
  } catch {
    return;
  }
};
