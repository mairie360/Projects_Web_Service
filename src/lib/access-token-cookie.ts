import type { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "accessToken";

/** Efface le cookie de session partagé entre les fronts (posé par Login sur COOKIE_DOMAIN). */
export function clearAccessTokenCookie(response: NextResponse) {
  const cookieDomain = process.env.COOKIE_DOMAIN?.trim();

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  return response;
}
