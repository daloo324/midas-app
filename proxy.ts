import { NextResponse, type NextRequest } from "next/server";
import { CLIENT_LOGIN, STAFF_LOGIN, signInNeededFor } from "@/lib/auth/routes";
import { DEMO_COOKIE, isDemoMode } from "@/lib/demo/mode";
import { updateSession } from "@/lib/supabase/proxy";

// Convenience only: sends signed-out visitors to the right sign-in page.
// Each area's layout checks the role, and RLS is the real security.
export async function proxy(request: NextRequest) {
  const { response, userId } = isDemoMode()
    ? { response: NextResponse.next({ request }), userId: request.cookies.get(DEMO_COOKIE)?.value ?? null }
    : await updateSession(request);
  const path = request.nextUrl.pathname;
  const needed = signInNeededFor(path);

  if (needed && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = needed === "client" ? CLIENT_LOGIN : STAFF_LOGIN;
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll())
      redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
