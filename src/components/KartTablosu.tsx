import Link from "next/link";
import { Tutar } from "@/components/Tutar";
import { bugun, gunEkle, tarihYaz } from "@/lib/hesap";
import type { KartOzeti } from "@/lib/sorgu";

export function sonOdemeDurumu(k: KartOzeti) {
  const b = bugun();
  if (k.sonEkstre.kalan <= 0 || k.sonEkstre.borc <= 0) return null;
  if (k.sonEkstre.sonOdeme < b) return { sinif: "kotu", yazi: "Son ödeme geçti" };
  if (k.sonEkstre.sonOdeme <= gunEkle(b, 5)) return { sinif: "uyari", yazi: "Son ödeme yaklaşıyor" };
  return null;
}

export function KartTablosu({ kartlar }: { kartlar: KartOzeti[] }) {
  return (
    <div className="tablo-kap">
      <table>
        <thead>
          <tr>
            <th>Kart</th>
            <th className="sayi">Limit</th>
            <th className="sayi">Kullanılabilir</th>
            <th>Son ekstre</th>
            <th className="sayi">Ekstre borcu</th>
            <th className="sayi">Kalan</th>
            <th>Son ödeme</th>
            <th className="sayi">Açık dönem</th>
          </tr>
        </thead>
        <tbody>
          {kartlar.map((k) => {
            const oran = k.limit > 0 ? Math.max(0, Math.min(1, k.kullanilabilir / k.limit)) : 0;
            const durum = sonOdemeDurumu(k);
            return (
              <tr key={k.id} className={k.aktif ? undefined : "iptal"}>
                <td>
                  <Link href={`/kartlar/${k.id}`}>
                    {k.banka} {k.kartAdi} •{k.son4}
                  </Link>
                  <div className="soluk">
                    {k.sahipAdi} · {k.sahipTuru === "sirket" ? "Şirket" : "Şahıs"} · kesim {k.kesimGunu}
                  </div>
                </td>
                <td className="sayi">
                  <Tutar k={k.limit} />
                </td>
                <td className="sayi">
                  <Tutar k={k.kullanilabilir} isaretli />
                  <div className="cubuk">
                    <span className={oran < 0.1 ? "kotu" : oran < 0.25 ? "uyari" : ""} style={{ width: `${oran * 100}%` }} />
                  </div>
                  {k.artiBakiye > 0 && (
                    <div className="soluk">
                      artı bakiye <Tutar k={k.artiBakiye} />
                    </div>
                  )}
                </td>
                <td>{tarihYaz(k.sonEkstre.ekstreTarihi)}</td>
                <td className="sayi">
                  <Tutar k={k.sonEkstre.borc} />
                </td>
                <td className="sayi">
                  <Tutar k={k.sonEkstre.kalan} />
                </td>
                <td>
                  {k.sonEkstre.borc > 0 ? tarihYaz(k.sonEkstre.sonOdeme) : ""}
                  {durum && (
                    <div>
                      <span className={`rozet ${durum.sinif}`}>{durum.yazi}</span>
                    </div>
                  )}
                </td>
                <td className="sayi">
                  <Tutar k={k.acikDonem.borc} />
                  <div className="soluk">kesim {tarihYaz(k.acikDonem.ekstreTarihi)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
