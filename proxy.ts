import {
  createSupabaseProxySessionClient,
  redirectPreservingRefreshedCookies,
} from "@/lib/supabase/proxySession";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { supabase, getRefreshedResponse } = createSupabaseProxySessionClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const refreshed = getRefreshedResponse();

  if (path === "/") {
    return redirectPreservingRefreshedCookies(request, refreshed, user ? "/chat" : "/auth");
  }

  if (!user && path !== "/auth") {
    return redirectPreservingRefreshedCookies(request, refreshed, "/auth");
  }

  if (user && path === "/auth") {
    return redirectPreservingRefreshedCookies(request, refreshed, "/chat");
  }

  return refreshed;
}

export const config = {
  // Include `/api` so fetches refresh the session cookie; exclude static assets only.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
