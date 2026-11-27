import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { mevcutKullanici } from "@/lib/oturum";
import { musteriListesi, policeAra } from "@/lib/sorgu";

/** İşlem formundaki poliçe ve müşteri önerileri. */
export async function GET(req: NextRequest) {
  if (!(await mevcutKullanici())) return NextResponse.json({ hata: "Oturum yok" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const tur = req.nextUrl.searchParams.get("tur");
  if (q.length < 2) return NextResponse.json([]);
  if (tur === "musteri") {
    const r = await musteriListesi(db(), q, 20);
    return NextResponse.json(r.map((m) => ({ id: m.id, ad: m.ad })));
  }
  return NextResponse.json(await policeAra(db(), q));
}
