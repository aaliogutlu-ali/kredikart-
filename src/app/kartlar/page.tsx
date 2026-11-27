import Link from "next/link";
import { Bildirim } from "@/components/Bildirim";
import { KartTablosu } from "@/components/KartTablosu";
import { db } from "@/db";
import { kullaniciGerekli } from "@/lib/oturum";
import { kartOzetleri } from "@/lib/sorgu";
import type { SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

export default async function Kartlar({ searchParams }: { searchParams: SP }) {
  const k = await kullaniciGerekli();
  const kartlar = await kartOzetleri(db());
  return (
    <>
      <div className="satir" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Kartlar</h1>
        {k.rol === "yonetici" && (
          <Link className="buton" href="/kartlar/yeni">
            + Kart ekle
          </Link>
        )}
      </div>
      <Bildirim sp={await searchParams} />
      {kartlar.length ? <KartTablosu kartlar={kartlar} /> : <div className="kutu">Henüz kart yok.</div>}
    </>
  );
}
