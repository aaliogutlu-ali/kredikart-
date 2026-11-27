import { NextResponse, type NextRequest } from "next/server";

const ACIK = ["/giris", "/kurulum"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (ACIK.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.get("oturum")) return NextResponse.redirect(new URL("/giris", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
