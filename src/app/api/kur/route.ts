import { NextResponse, type NextRequest } from "next/server";
import { mevcutKullanici } from "@/lib/oturum";
import { tcmbEfektifSatis } from "@/lib/tcmb";

export async function GET(req: NextRequest) {
  if (!(await mevcutKullanici())) return NextResponse.json({ hata: "Oturum yok" }, { status: 401 });
  const doviz = (req.nextUrl.searchParams.get("doviz") ?? "").toUpperCase();
  return NextResponse.json(await tcmbEfektifSatis(doviz));
}
