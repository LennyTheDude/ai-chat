/**
 * Next.js Server Components cannot call `cookies().set`. Supabase refresh still invokes
 * `setAll`; swallow that failure — root `proxy.ts` refreshes the session and sends Set-Cookie.
 */
export function createServerComponentSafeSetAll(
  setCookie: (name: string, value: string, options: object) => void,
) {
  return (cookiesToSet: { name: string; value: string; options: object }[]) => {
    try {
      for (const { name, value, options } of cookiesToSet) {
        setCookie(name, value, options);
      }
    } catch {
      /* see module docstring */
    }
  };
}
