export function asset(p: string) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/g, "/"); // ensure trailing slash
  const rel  = String(p).replace(/^\/+/g, "");                         // strip leading slashes
  return `${base}${rel}`.replace(/\/{2,}/g, "/");
}
