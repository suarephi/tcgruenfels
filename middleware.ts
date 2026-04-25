import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isChangePasswordPath = pathname.startsWith("/change-password");

  // Protected routes
  const protectedPaths = ["/book", "/admin"];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if ((isProtectedPath || isChangePasswordPath) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Force users flagged with must_change_password through /change-password
  // before they can use the rest of the app.
  const mustChangePassword =
    user?.user_metadata?.must_change_password === true;
  if (user && mustChangePassword && !isChangePasswordPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ["/login", "/register"];
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = mustChangePassword ? "/change-password" : "/book";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/book/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/change-password",
  ],
};
