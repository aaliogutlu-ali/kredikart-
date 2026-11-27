import Link from "next/link";
import { notFound } from "next/navigation";
import { Bildirim } from "@/components/Bildirim";
import { IptalFormu } from "@/components/IptalFormu";
import { Tutar } from "@/components/Tutar";
import { db } from "@/db";
import { calistir, metin } from "@/lib/eylem";
import { tarihYaz } from "@/lib/hesap";
import { kullaniciGerekli } from "@/lib/oturum";
import { tutarYaz } from "@/lib/para";
import { islemIptal } from "@/lib/servis";
import { islemDetayi, kartEtiketi } from "@/lib/sorgu";
import type { Params, SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

export default async function IslemDetay({ params, searchParams }: { params: Params<"id">; searchParams: SP }) {
  await kullaniciGerekli();
  const id = Number((await params).id);
  const x = await islemDetayi(db(), id);
  if (!x) notFound();

  async function iptalEt(f: FormData) {
    "use server";
    const k = await kullaniciGerekli();
    await calistir(
      () => islemIptal(db(), k, id, metin(f, "neden")),
      `/islemler/${id}`,
      () => ({ yol: `/islemler/${id}`, mesaj: "İşlem iptal edildi." }),
    );
  }

  const tur = x.tur === "iade" ? "İade" : x.acilis ? "Açılış kaydı (devam eden taksit)" : "Çekim";
  return (
    <>
      <h1>
        {tur} · {tarihYaz(x.tarih)}
        {x.iptal && <span className="rozet kotu"> İptal</span>}
      </h1>
      <Bildirim sp={await searchParams} />
      <div className="kutu">
        <div className="izgara">
          <div>
            <div className="soluk">Kart</div>
            <Link href={`/kartlar/${x.kart.id}`}>{kartEtiketi(x.kart)}</Link>
          </div>
          <div>
            <div className="soluk">Tutar</div>
            <b>
              <Tutar k={x.tutar} /> TL
            </b>
            {x.paraBirimi !== "TRY" && x.dovizTutar != null && (
              <div className="soluk">
                {tutarYaz(x.dovizTutar)} {x.paraBirimi} × {x.kur}
              </div>
            )}
          </div>
          <div>
            <div className="soluk">Taksit</div>
            {x.taksitSayisi > 1 ? `${x.taksitSayisi} taksit` : "Tek çekim"}
          </div>
          <div>
            <div className="soluk">Açıklama</div>
            {x.aciklama || "-"}
          </div>
        </div>
        {x.iptal && <p className="eksi">İptal nedeni: {x.iptalNedeni}</p>}
        {x.iadeEdilenIslemId && (
          <p>
            <Link href={`/islemler/${x.iadeEdilenIslemId}`}>Asıl çekime git</Link>
          </p>
        )}
      </div>

      {x.kalemler.length > 0 && (
        <>
          <h2>Poliçeler / müşteriler</h2>
          <div className="tablo-kap">
            <table>
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Poliçe no</th>
                  <th className="sayi">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {x.kalemler.map((k, i) => (
                  <tr key={i}>
                    <td>
                      <Link href={`/musteriler/${k.musteriId}`}>{k.musteri}</Link>
                    </td>
                    <td>{k.policeNo ?? "-"}</td>
                    <td className="sayi">
                      <Tutar k={k.tutar} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Ekstrelere dağılım</h2>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Taksit</th>
              <th>Ekstre (hesap kesim)</th>
              <th className="sayi">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {x.plan.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.sira}/{t.toplamSira}
                </td>
                <td>
                  <Link href={`/kartlar/${x.kartId}?ekstre=${t.ekstreTarihi}`}>{tarihYaz(t.ekstreTarihi)}</Link>
                </td>
                <td className="sayi">
                  <Tutar k={t.tutar} isaretli />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {x.tur === "cekim" && !x.acilis && (
        <>
          <h2>İadeler</h2>
          {x.iadeler.length > 0 && (
            <ul>
              {x.iadeler.map((i) => (
                <li key={i.id} className={i.iptal ? "soluk" : undefined}>
                  <Link href={`/islemler/${i.id}`}>{tarihYaz(i.tarih)}</Link> · <Tutar k={i.tutar} /> TL{i.iptal ? " (iptal)" : ""}
                </li>
              ))}
            </ul>
          )}
          {!x.iptal && (
            <Link className="buton ikincil" href={`/islemler/yeni?iade=${x.id}`}>
              İade gir
            </Link>
          )}
        </>
      )}

      {!x.iptal && (
        <>
          <h2>İptal</h2>
          <p className="soluk">
            İptal edilen kayıt silinmez; hesaplara katılmaz ve kim, ne zaman, neden iptal etti saklanır. Çalışanlar sadece
            kendi girdikleri kaydı aynı gün iptal edebilir.
          </p>
          <IptalFormu eylem={iptalEt} />
        </>
      )}
    </>
  );
}
