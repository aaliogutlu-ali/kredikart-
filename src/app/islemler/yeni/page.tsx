import Link from "next/link";
import { Bildirim } from "@/components/Bildirim";
import { IslemFormu } from "@/components/IslemFormu";
import { Tutar } from "@/components/Tutar";
import { db } from "@/db";
import { calistir, metin, tamSayi, tutar } from "@/lib/eylem";
import { bugun, tarihYaz } from "@/lib/hesap";
import { kullaniciGerekli } from "@/lib/oturum";
import { dovizdenTL, kurOku, tutarOku } from "@/lib/para";
import { IsHatasi, islemEkle, type KalemGirdisi } from "@/lib/servis";
import { islemDetayi, kartEtiketi, kartOzetleri } from "@/lib/sorgu";
import { tek, type SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

function kalemleriOku(f: FormData): KalemGirdisi[] {
  const pol = f.getAll("kalemPolice").map(String);
  const mus = f.getAll("kalemMusteri").map(String);
  const tut = f.getAll("kalemTutar").map(String);
  return tut.map((t, i) => {
    const k = tutarOku(t);
    if (k === null) throw new IsHatasi(`${i + 1}. kalemin tutarı geçersiz.`);
    const mId = Number.parseInt((mus[i] ?? "").split(" - ")[0], 10);
    return { policeNo: pol[i]?.trim() || undefined, musteriId: Number.isFinite(mId) ? mId : undefined, tutar: k };
  });
}

async function cekimKaydet(f: FormData) {
  "use server";
  const k = await kullaniciGerekli();
  await calistir(
    async () => {
      const paraBirimi = metin(f, "paraBirimi") || "TRY";
      let tl: number;
      let dovizTutar: number | null = null;
      let kur: number | null = null;
      if (paraBirimi === "TRY") {
        tl = tutar(f, "tutar", "Tutar");
      } else {
        dovizTutar = tutar(f, "dovizTutar", "Döviz tutarı");
        kur = kurOku(metin(f, "kur"));
        if (kur === null) throw new IsHatasi("Kur geçersiz.");
        tl = dovizdenTL(dovizTutar, kur);
      }
      return islemEkle(db(), k, {
        tarih: metin(f, "tarih"),
        kartId: tamSayi(f, "kartId"),
        tur: "cekim",
        paraBirimi,
        dovizTutar,
        kur,
        tutar: tl,
        taksitSayisi: tamSayi(f, "taksitSayisi"),
        aciklama: metin(f, "aciklama"),
        kalemler: kalemleriOku(f),
      });
    },
    "/islemler/yeni",
    (r) => ({
      yol: `/islemler/${r.id}${r.uyari ? "?uyari=" + encodeURIComponent(r.uyari) : ""}`,
      mesaj: "İşlem kaydedildi.",
    }),
  );
}

async function iadeKaydet(asilId: number, f: FormData) {
  "use server";
  const k = await kullaniciGerekli();
  const asil = await islemDetayi(db(), asilId);
  await calistir(
    async () => {
      if (!asil) throw new IsHatasi("Asıl çekim bulunamadı.");
      return islemEkle(db(), k, {
        tarih: metin(f, "tarih"),
        kartId: asil.kartId,
        tur: "iade",
        paraBirimi: "TRY",
        dovizTutar: null,
        kur: null,
        tutar: tutar(f, "tutar", "Tutar"),
        taksitSayisi: 1,
        iadeEdilenIslemId: asilId,
        aciklama: metin(f, "aciklama"),
        kalemler: [],
      });
    },
    `/islemler/yeni?iade=${asilId}`,
    (r) => ({ yol: `/islemler/${r.id}`, mesaj: "İade kaydedildi." }),
  );
}

export default async function YeniIslem({ searchParams }: { searchParams: SP }) {
  const k = await kullaniciGerekli();
  const sp = await searchParams;
  const iadeId = Number(tek(sp.iade));

  if (iadeId) {
    const asil = await islemDetayi(db(), iadeId);
    if (!asil || asil.tur !== "cekim" || asil.iptal) return <div className="kutu">İade edilecek çekim bulunamadı.</div>;
    const iadeEdilen = asil.iadeler.filter((x) => !x.iptal).reduce((s, x) => s + x.tutar, 0);
    return (
      <>
        <h1>İade gir</h1>
        <Bildirim sp={sp} />
        <div className="kutu">
          <Link href={`/islemler/${asil.id}`}>{tarihYaz(asil.tarih)} tarihli çekim</Link> · {kartEtiketi(asil.kart)} · tutar{" "}
          <Tutar k={asil.tutar} /> · daha önce iade edilen <Tutar k={iadeEdilen} />
          <div className="soluk">
            İade tutarı kartın limitini hemen açar, müşterilerin carisinden poliçe paylarına göre düşer ve iade tarihinin
            ekstresinde eksi olarak görünür.
          </div>
        </div>
        <form action={iadeKaydet.bind(null, asil.id)} className="kutu">
          <div className="izgara">
            <label>
              İade tarihi
              <input name="tarih" type="date" required defaultValue={bugun()} />
            </label>
            <label>
              İade tutarı (TL)
              <input name="tutar" inputMode="decimal" required />
            </label>
            <label>
              Açıklama
              <input name="aciklama" />
            </label>
          </div>
          <p />
          <button type="submit">İadeyi kaydet</button>
        </form>
      </>
    );
  }

  const kartlar = (await kartOzetleri(db())).filter((x) => x.aktif);
  return (
    <>
      <h1>Yeni işlem (karttan çekim)</h1>
      <Bildirim sp={sp} />
      {kartlar.length ? (
        <IslemFormu
          eylem={cekimKaydet}
          bugun={bugun()}
          yonetici={k.rol === "yonetici"}
          kartlar={kartlar.map((x) => ({ id: x.id, etiket: kartEtiketi(x), kullanilabilir: x.kullanilabilir }))}
        />
      ) : (
        <div className="kutu">Önce bir kart eklenmeli.</div>
      )}
      <p className="soluk">İade girmek için ilgili çekimin sayfasını açıp &quot;İade gir&quot;e basın.</p>
    </>
  );
}
