import Link from "next/link";
import { notFound } from "next/navigation";
import { Bildirim } from "@/components/Bildirim";
import { IptalFormu } from "@/components/IptalFormu";
import { IslemTablosu } from "@/components/IslemTablosu";
import { OdemeFormu } from "@/components/OdemeFormu";
import { Tutar } from "@/components/Tutar";
import { db } from "@/db";
import { calistir, metin, tutar } from "@/lib/eylem";
import { bugun, tarihYaz } from "@/lib/hesap";
import { kullaniciGerekli } from "@/lib/oturum";
import { odemeEkle, odemeIptal } from "@/lib/servis";
import { ekstreDetayi, islemListesi, kartEkstreleri, kartOdemeListesi, kartOzeti } from "@/lib/sorgu";
import { tek, type Params, type SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

const ODEME_TURU = { serbest: "Serbest", ekstre: "Ekstre tamamı", asgari: "Asgari" } as const;

export default async function KartDetay({ params, searchParams }: { params: Params<"id">; searchParams: SP }) {
  const k = await kullaniciGerekli();
  const id = Number((await params).id);
  const sp = await searchParams;
  const kart = await kartOzeti(db(), id);
  if (!kart) notFound();
  const ekstreler = await kartEkstreleri(db(), kart);
  const seciliEkstre =
    tek(sp.ekstre) || (kart.sonEkstre.borc !== 0 ? kart.sonEkstre.ekstreTarihi : kart.acikDonem.ekstreTarihi);
  const detay = await ekstreDetayi(db(), id, seciliEkstre);
  const odemeler = await kartOdemeListesi(db(), id);
  const islemler = await islemListesi(db(), { kartId: id, limit: 50 });

  async function odemeKaydet(f: FormData) {
    "use server";
    const u = await kullaniciGerekli();
    await calistir(
      () =>
        odemeEkle(db(), u, {
          kartId: id,
          tur: metin(f, "tur") as "serbest" | "ekstre" | "asgari",
          ekstreTarihi: metin(f, "ekstreTarihi") || null,
          tarih: metin(f, "tarih"),
          tutar: tutar(f, "tutar", "Tutar"),
          aciklama: metin(f, "aciklama"),
        }),
      `/kartlar/${id}`,
      () => ({ yol: `/kartlar/${id}`, mesaj: "Ödeme kaydedildi, limit güncellendi." }),
    );
  }

  async function odemeIptalEt(odemeId: number, f: FormData) {
    "use server";
    const u = await kullaniciGerekli();
    await calistir(
      () => odemeIptal(db(), u, odemeId, metin(f, "neden")),
      `/kartlar/${id}`,
      () => ({ yol: `/kartlar/${id}`, mesaj: "Ödeme iptal edildi." }),
    );
  }

  // Ödeme formunda gösterilecek ekstreler: son kesilen ve öncesi + açık dönem.
  const odemeEkstreleri = ekstreler
    .filter((e) => e.ekstreTarihi <= kart.acikDonem.ekstreTarihi)
    .slice(0, 12)
    .map((e) => ({ ekstreTarihi: e.ekstreTarihi, kalan: e.kalan, asgari: e.asgari, borc: e.borc }));

  return (
    <>
      <div className="satir" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>
          {kart.banka} {kart.kartAdi} {kart.ilk4} •••• •••• {kart.son4}
        </h1>
        {k.rol === "yonetici" && (
          <Link className="buton ikincil" href={`/kartlar/${id}/duzenle`}>
            Düzenle
          </Link>
        )}
      </div>
      <p className="soluk">
        {kart.sahipAdi} · {kart.sahipTuru === "sirket" ? "Şirket kartı" : "Şahıs kartı"} · hesap kesim ayın {kart.kesimGunu}
        &apos;i · son ödeme kesimden {kart.sonOdemeGunSayisi} gün sonra · asgari %{Number(kart.asgariOran).toLocaleString("tr-TR")}
        {!kart.aktif && <span className="rozet kotu"> Pasif</span>}
      </p>
      <Bildirim sp={sp} />
      <div className="ozet">
        <div>
          Limit
          <b>
            <Tutar k={kart.limit} />
          </b>
        </div>
        <div>
          Kullanılabilir
          <b>
            <Tutar k={kart.kullanilabilir} isaretli />
          </b>
        </div>
        <div>
          Kullanılan
          <b>
            <Tutar k={kart.kullanilan} />
          </b>
        </div>
        <div>
          Son ekstre ({tarihYaz(kart.sonEkstre.ekstreTarihi)}) kalan
          <b>
            <Tutar k={kart.sonEkstre.kalan} />
          </b>
          <span className="soluk">son ödeme {tarihYaz(kart.sonEkstre.sonOdeme)}</span>
        </div>
        <div>
          Açık dönem ({tarihYaz(kart.acikDonem.ekstreTarihi)})
          <b>
            <Tutar k={kart.acikDonem.borc} />
          </b>
        </div>
      </div>

      <h2>Ödeme gir</h2>
      <OdemeFormu eylem={odemeKaydet} ekstreler={odemeEkstreleri} bugun={bugun()} />

      <h2>Ekstreler</h2>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Hesap kesim</th>
              <th>Son ödeme</th>
              <th className="sayi">Dönem borcu</th>
              <th className="sayi">Asgari</th>
              <th className="sayi">Bu döneme ödenen</th>
              <th className="sayi">Kalan</th>
            </tr>
          </thead>
          <tbody>
            {ekstreler.map((e) => (
              <tr key={e.ekstreTarihi} className={e.ekstreTarihi === seciliEkstre ? "secili" : undefined}>
                <td>
                  <Link href={`/kartlar/${id}?ekstre=${e.ekstreTarihi}`}>{tarihYaz(e.ekstreTarihi)}</Link>
                  {e.ekstreTarihi > kart.acikDonem.ekstreTarihi && <span className="soluk"> (gelecek)</span>}
                  {e.ekstreTarihi === kart.acikDonem.ekstreTarihi && <span className="soluk"> (açık dönem)</span>}
                </td>
                <td>{tarihYaz(e.sonOdeme)}</td>
                <td className="sayi">
                  <Tutar k={e.borc} isaretli />
                </td>
                <td className="sayi">
                  <Tutar k={e.asgari} />
                </td>
                <td className="sayi">
                  <Tutar k={e.odenen} />
                </td>
                <td className="sayi">
                  <Tutar k={e.kalan} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{tarihYaz(seciliEkstre)} ekstresindeki kalemler</h2>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>İşlem tarihi</th>
              <th>Müşteri</th>
              <th>Açıklama</th>
              <th>Taksit</th>
              <th className="sayi">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {detay.map((d) => (
              <tr key={`${d.islemId}-${d.sira}`}>
                <td>
                  <Link href={`/islemler/${d.islemId}`}>{tarihYaz(d.tarih)}</Link>
                </td>
                <td>{d.musteriler}</td>
                <td>
                  {d.tur === "iade" ? "İade" : d.acilis ? "Açılış (devam eden taksit)" : "Çekim"}
                  {d.aciklama ? ` · ${d.aciklama}` : ""}
                </td>
                <td>
                  {d.sira}/{d.toplamSira}
                </td>
                <td className="sayi">
                  <Tutar k={d.tutar} isaretli />
                </td>
              </tr>
            ))}
            {!detay.length && (
              <tr>
                <td colSpan={5} className="soluk">
                  Bu ekstrede kalem yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Kart ödemeleri</h2>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tür</th>
              <th>Ekstre</th>
              <th className="sayi">Tutar</th>
              <th>Açıklama</th>
              <th>Giren</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {odemeler.map((o) => (
              <tr key={o.id} className={o.iptal ? "iptal" : undefined}>
                <td>{tarihYaz(o.tarih)}</td>
                <td>{ODEME_TURU[o.tur]}</td>
                <td>{tarihYaz(o.ekstreTarihi)}</td>
                <td className="sayi">
                  <Tutar k={o.tutar} />
                </td>
                <td>
                  {o.aciklama}
                  {o.iptal && <div>İptal: {o.iptalNedeni}</div>}
                </td>
                <td>{o.giren}</td>
                <td>{!o.iptal && <IptalFormu eylem={odemeIptalEt.bind(null, o.id)} />}</td>
              </tr>
            ))}
            {!odemeler.length && (
              <tr>
                <td colSpan={7} className="soluk">
                  Henüz ödeme yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Son işlemler</h2>
      <IslemTablosu islemler={islemler} />
    </>
  );
}
