import Link from "next/link";
import { Bildirim } from "@/components/Bildirim";
import { IslemTablosu } from "@/components/IslemTablosu";
import { Tutar } from "@/components/Tutar";
import { db } from "@/db";
import { calistir, metin, tamSayi, tutar } from "@/lib/eylem";
import { ilkEkstreTarihi, bugun } from "@/lib/hesap";
import { yoneticiGerekli } from "@/lib/oturum";
import { islemEkle } from "@/lib/servis";
import { islemListesi, kartEtiketi, kartOzetleri } from "@/lib/sorgu";
import type { SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

async function taksitEkle(f: FormData) {
  "use server";
  const k = await yoneticiGerekli();
  await calistir(
    async () => {
      const aylik = tutar(f, "aylik", "Aylık taksit tutarı");
      const kalan = tamSayi(f, "kalan");
      return islemEkle(db(), k, {
        tarih: bugun(),
        kartId: tamSayi(f, "kartId"),
        tur: "cekim",
        paraBirimi: "TRY",
        dovizTutar: null,
        kur: null,
        tutar: aylik * kalan,
        taksitSayisi: kalan,
        acilis: true,
        ilkEkstre: metin(f, "ilkEkstre"),
        aciklama: metin(f, "aciklama"),
        kalemler: [],
      });
    },
    "/acilis",
    () => ({ yol: "/acilis", mesaj: "Devam eden taksit eklendi." }),
  );
}

export default async function Acilis({ searchParams }: { searchParams: SP }) {
  await yoneticiGerekli();
  const kartlar = await kartOzetleri(db());
  const acilisKayitlari = (await islemListesi(db(), { limit: 1000 })).filter((x) => x.acilis);
  return (
    <>
      <h1>Açılış bakiyeleri</h1>
      <Bildirim sp={await searchParams} />
      <div className="kutu">
        <p>Uygulamaya geçerken mevcut durumu üç adımda girin:</p>
        <ol>
          <li>
            <b>Kartların kullanılmış limiti:</b> her kartın düzenleme sayfasındaki &quot;Açılış: geçiş günü kullanılmış
            limit&quot; alanına bankada görünen kullanılmış tutarı yazın. Kullanılabilir limit buna göre hesaplanır.
          </li>
          <li>
            <b>Devam eden taksitler:</b> aşağıdaki formdan girin. Bunlar zaten kullanılmış limitin içinde olduğu için limiti
            ikinci kez düşürmez; sadece gelecek ekstrelere yerleşir.
          </li>
          <li>
            <b>Müşteri açılış bakiyeleri:</b> her müşterinin sayfasında &quot;Müşteri bilgilerini düzenle&quot; altındaki
            açılış bakiyesi alanına geçiş günündeki borcunu yazın.
          </li>
        </ol>
      </div>

      <h2>Kartların açılış durumu</h2>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Kart</th>
              <th className="sayi">Açılış kullanılmış limit</th>
              <th className="sayi">Şu an kullanılabilir</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {kartlar.map((x) => (
              <tr key={x.id}>
                <td>{kartEtiketi(x)}</td>
                <td className="sayi">
                  <Tutar k={x.acilisKullanilmis} />
                </td>
                <td className="sayi">
                  <Tutar k={x.kullanilabilir} isaretli />
                </td>
                <td>
                  <Link href={`/kartlar/${x.id}/duzenle`}>Düzenle</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Devam eden taksit ekle</h2>
      {kartlar.length ? (
        <form action={taksitEkle} className="kutu">
          <div className="izgara">
            <label style={{ gridColumn: "span 2" }}>
              Kart
              <select name="kartId">
                {kartlar.map((x) => (
                  <option key={x.id} value={x.id}>
                    {kartEtiketi(x)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Aylık taksit tutarı (TL)
              <input name="aylik" inputMode="decimal" required />
            </label>
            <label>
              Kalan taksit sayısı
              <input name="kalan" type="number" min={1} max={36} required />
            </label>
            <label>
              Kalan ilk taksitin düşeceği ekstre
              <input name="ilkEkstre" type="date" required defaultValue={kartlar[0] ? ilkEkstreTarihi(bugun(), kartlar[0].kesimGunu) : ""} />
            </label>
            <label>
              Açıklama (müşteri / poliçe)
              <input name="aciklama" />
            </label>
          </div>
          <p className="soluk">Ekstre tarihi kartın hesap kesim günü olmalı (ör. kesim 15 ise 15.12.2026).</p>
          <button type="submit">Ekle</button>
        </form>
      ) : (
        <div className="kutu">Önce kart ekleyin.</div>
      )}

      <h2>Girilen açılış taksitleri</h2>
      <IslemTablosu islemler={acilisKayitlari} />
    </>
  );
}
