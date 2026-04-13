import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./shared";

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  const serialized = from.headers.getSetCookie?.();
  if (serialized?.length) {
    for (const cookie of serialized) {
      to.headers.append("Set-Cookie", cookie);
    }
    return;
  }
  for (const { name, value } of from.cookies.getAll()) {
    to.cookies.set(name, value);
  }
}

/**
 * Build a redirect while preserving `Set-Cookie` from the response updated during
 * `supabase.auth.getUser()` (refreshed session must not be dropped).
 */
export function redirectPreservingRefreshedCookies(
  request: NextRequest,
  refreshedResponse: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirect = NextResponse.redirect(url);
  copyResponseCookies(refreshedResponse, redirect);
  return redirect;
}

/**
 * Supabase server client for root `proxy.ts`: reads request cookies and writes the
 * proxied `NextResponse` when the session is refreshed.
 */
export function createSupabaseProxySessionClient(request: NextRequest) {
  const env = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (responseHeaders) {
          for (const [key, value] of Object.entries(responseHeaders)) {
            response.headers.set(key, value);
          }
        }
      },
    },
  });

  return {
    supabase,
    getRefreshedResponse: () => response,
  };
}
