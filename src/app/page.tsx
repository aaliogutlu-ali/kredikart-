import Link from "next/link";
import { Bildirim } from "@/components/Bildirim";
import { KartTablosu, sonOdemeDurumu } from "@/components/KartTablosu";
import { Tutar } from "@/components/Tutar";
import { db } from "@/db";
import { kullaniciGerekli } from "@/lib/oturum";
import { kartOzetleri } from "@/lib/sorgu";
import type { SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

export default async function Pano({ searchParams }: { searchParams: SP }) {
  const k = await kullaniciGerekli();
  const kartlar = (await kartOzetleri(db())).filter((x) => x.aktif);
  const toplam = (f: (x: (typeof kartlar)[number]) => number) => kartlar.reduce((s, x) => s + f(x), 0);
  const uyarilar = kartlar.filter((x) => sonOdemeDurumu(x) || x.kullanilabilir < x.limit * 0.1);
  return (
    <>
      <div className="satir" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Pano</h1>
        <Link className="buton" href="/islemler/yeni">
          + Yeni işlem
        </Link>
      </div>
      <Bildirim sp={await searchParams} />
      <div className="ozet">
        <div>
          Toplam limit
          <b>
            <Tutar k={toplam((x) => x.limit)} />
          </b>
        </div>
        <div>
          Toplam kullanılabilir
          <b>
            <Tutar k={toplam((x) => x.kullanilabilir)} isaretli />
          </b>
        </div>
        <div>
          Ödenmemiş ekstre borcu
          <b>
            <Tutar k={toplam((x) => x.sonEkstre.kalan)} />
          </b>
        </div>
        <div>
          Açık dönem toplamı
          <b>
            <Tutar k={toplam((x) => x.acikDonem.borc)} />
          </b>
        </div>
      </div>
      {uyarilar.length > 0 && (
        <div className="bildirim uyari">
          {uyarilar.map((x) => (
            <div key={x.id}>
              <Link href={`/kartlar/${x.id}`}>
                {x.banka} •{x.son4}
              </Link>
              : {sonOdemeDurumu(x)?.yazi ?? ""}
              {sonOdemeDurumu(x) && x.kullanilabilir < x.limit * 0.1 ? ", " : ""}
              {x.kullanilabilir < x.limit * 0.1 ? "kullanılabilir limit %10'un altında" : ""}
            </div>
          ))}
        </div>
      )}
      {kartlar.length ? (
        <KartTablosu kartlar={kartlar} />
      ) : (
        <div className="kutu">
          Henüz kart yok.{" "}
          {k.rol === "yonetici" ? <Link href="/kartlar/yeni">İlk kartı ekleyin.</Link> : "Yöneticinin kart eklemesi gerekiyor."}
        </div>
      )}
    </>
  );
}
