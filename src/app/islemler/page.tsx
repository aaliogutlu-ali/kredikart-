import Link from "next/link";
import { Bildirim } from "@/components/Bildirim";
import { IslemTablosu } from "@/components/IslemTablosu";
import { db } from "@/db";
import { kullaniciGerekli } from "@/lib/oturum";
import { islemListesi, kartEtiketi, kartOzetleri } from "@/lib/sorgu";
import { tek, type SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

export default async function Islemler({ searchParams }: { searchParams: SP }) {
  await kullaniciGerekli();
  const sp = await searchParams;
  const kartId = Number(tek(sp.kart)) || undefined;
  const baslangic = tek(sp.baslangic) || undefined;
  const bitis = tek(sp.bitis) || undefined;
  const [kartlar, liste] = await Promise.all([
    kartOzetleri(db()),
    islemListesi(db(), { kartId, baslangic, bitis, limit: 500 }),
  ]);
  return (
    <>
      <div className="satir" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>İşlemler</h1>
        <Link className="buton" href="/islemler/yeni">
          + Yeni işlem
        </Link>
      </div>
      <Bildirim sp={sp} />
      <form className="kutu satir">
        <label>
          Kart
          <select name="kart" defaultValue={kartId ?? ""}>
            <option value="">Tümü</option>
            {kartlar.map((k) => (
              <option key={k.id} value={k.id}>
                {kartEtiketi(k)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Başlangıç
          <input type="date" name="baslangic" defaultValue={baslangic} />
        </label>
        <label>
          Bitiş
          <input type="date" name="bitis" defaultValue={bitis} />
        </label>
        <button type="submit" className="ikincil">
          Filtrele
        </button>
      </form>
      <p className="soluk">En fazla 500 kayıt gösterilir; daha eskiler için tarih aralığı seçin.</p>
      <IslemTablosu islemler={liste} />
    </>
  );
}
