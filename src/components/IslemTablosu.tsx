import Link from "next/link";
import { Tutar } from "@/components/Tutar";
import { tarihYaz } from "@/lib/hesap";
import { tutarYaz } from "@/lib/para";
import type { islemListesi } from "@/lib/sorgu";

type Satir = Awaited<ReturnType<typeof islemListesi>>[number];

export function IslemTablosu({ islemler }: { islemler: Satir[] }) {
  return (
    <div className="tablo-kap">
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Kart</th>
            <th>Tür</th>
            <th>Müşteri / poliçe</th>
            <th className="sayi">Tutar (TL)</th>
            <th>Taksit</th>
            <th>Giren</th>
          </tr>
        </thead>
        <tbody>
          {islemler.map((x) => (
            <tr key={x.id} className={x.iptal ? "iptal" : undefined}>
              <td>
                <Link href={`/islemler/${x.id}`}>{tarihYaz(x.tarih)}</Link>
              </td>
              <td>
                {x.banka} •{x.son4}
                <div className="soluk">{x.sahipAdi}</div>
              </td>
              <td>
                {x.tur === "iade" ? <span className="rozet iyi">İade</span> : x.acilis ? <span className="rozet">Açılış</span> : "Çekim"}
                {x.iptal && <div className="rozet kotu">İptal</div>}
              </td>
              <td>
                {x.kalemOzeti}
                {x.aciklama && <div className="soluk">{x.aciklama}</div>}
              </td>
              <td className="sayi">
                <Tutar k={x.tur === "iade" ? -x.tutar : x.tutar} isaretli />
                {x.paraBirimi !== "TRY" && x.dovizTutar != null && (
                  <div className="soluk">
                    {tutarYaz(x.dovizTutar)} {x.paraBirimi} × {x.kur}
                  </div>
                )}
              </td>
              <td>{x.taksitSayisi > 1 ? `${x.taksitSayisi} taksit` : "Tek çekim"}</td>
              <td>{x.giren}</td>
            </tr>
          ))}
          {!islemler.length && (
            <tr>
              <td colSpan={7} className="soluk">
                Kayıt yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
