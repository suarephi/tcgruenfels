export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/book/:path*", "/api/bookings/:path*"],
};
