/** Normalize FastAPI / Axios error payloads into a safe React string. */
export function apiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  const e = error as {
    message?: string;
    response?: { data?: { detail?: unknown; message?: unknown } };
  };
  const detail = e?.response?.data?.detail ?? e?.response?.data?.message;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const msg = (item as { msg?: string }).msg;
          const loc = (item as { loc?: unknown[] }).loc;
          const where = Array.isArray(loc) ? loc.filter((x) => x !== 'body').join('.') : '';
          if (msg && where) return `${where}: ${msg}`;
          if (msg) return msg;
        }
        return null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join('; ');
  }
  if (detail && typeof detail === 'object') {
    try {
      return JSON.stringify(detail);
    } catch {
      /* ignore */
    }
  }
  if (typeof e?.message === 'string' && e.message.trim()) return e.message;
  return fallback;
}
