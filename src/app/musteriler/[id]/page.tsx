import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bildirim } from "@/components/Bildirim";
import { IptalFormu } from "@/components/IptalFormu";
import { MusteriFormu } from "@/components/MusteriFormu";
import { Tutar } from "@/components/Tutar";
import { db } from "@/db";
import { musteriler } from "@/db/schema";
import { calistir, metin, tutar } from "@/lib/eylem";
import { bugun, tarihYaz } from "@/lib/hesap";
import { musteriFormunuOku } from "@/lib/musteriForm";
import { kullaniciGerekli } from "@/lib/oturum";
import { tutarYaz } from "@/lib/para";
import { musteriGuncelle, policeEkle, tahsilatEkle, tahsilatIptal } from "@/lib/servis";
import { musteriEkstresi, musteriPoliceleri } from "@/lib/sorgu";
import type { Params, SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

export default async function MusteriDetay({ params, searchParams }: { params: Params<"id">; searchParams: SP }) {
  const k = await kullaniciGerekli();
  const id = Number((await params).id);
  const [m] = await db().select().from(musteriler).where(eq(musteriler.id, id));
  if (!m) notFound();
  const [ekstre, policeler] = await Promise.all([musteriEkstresi(db(), id), musteriPoliceleri(db(), id)]);
  const bakiye = ekstre.at(-1)?.bakiye ?? m.acilisBakiye;
  const yol = `/musteriler/${id}`;

  async function guncelle(f: FormData) {
    "use server";
    const u = await kullaniciGerekli();
    await calistir(() => musteriGuncelle(db(), u, id, musteriFormunuOku(f)), yol, () => ({ yol, mesaj: "Bilgiler güncellendi." }));
  }
  async function policeKaydet(f: FormData) {
    "use server";
    const u = await kullaniciGerekli();
    await calistir(
      () =>
        policeEkle(db(), u, {
          policeNo: metin(f, "policeNo"),
          musteriId: id,
          sigortaSirketi: metin(f, "sigortaSirketi"),
          brans: metin(f, "brans"),
          baslangic: metin(f, "baslangic") || null,
          bitis: metin(f, "bitis") || null,
          prim: metin(f, "prim") ? tutar(f, "prim", "Prim") : null,
        }),
      yol,
      () => ({ yol, mesaj: "Poliçe eklendi." }),
    );
  }
  async function tahsilatKaydet(f: FormData) {
    "use server";
    const u = await kullaniciGerekli();
    await calistir(
      () =>
        tahsilatEkle(db(), u, {
          musteriId: id,
          tarih: metin(f, "tarih"),
          tutar: tutar(f, "tutar", "Tutar"),
          yontem: metin(f, "yontem") as "nakit" | "havale" | "cek" | "diger",
          aciklama: metin(f, "aciklama"),
        }),
      yol,
      () => ({ yol, mesaj: "Tahsilat kaydedildi." }),
    );
  }
  async function tahsilatIptalEt(tId: number, f: FormData) {
    "use server";
    const u = await kullaniciGerekli();
    await calistir(() => tahsilatIptal(db(), u, tId, metin(f, "neden")), yol, () => ({ yol, mesaj: "Tahsilat iptal edildi." }));
  }

  return (
    <>
      <h1>{m.ad}</h1>
      <p className="soluk">
        {m.tcknVkn ? `TCKN/VKN ${m.tcknVkn} · ` : ""}
        {m.telefon} {m.eposta}
      </p>
      <Bildirim sp={await searchParams} />
      <div className="ozet">
        <div>
          Cari bakiye
          <b>
            <Tutar k={bakiye} isaretli /> TL
          </b>
          <span className="soluk">{bakiye > 0 ? "müşteri size borçlu" : bakiye < 0 ? "fazla ödeme" : "borç yok"}</span>
        </div>
      </div>

      <h2>Tahsilat gir</h2>
      <form action={tahsilatKaydet} className="kutu">
        <div className="izgara">
          <label>
            Tarih
            <input name="tarih" type="date" required defaultValue={bugun()} />
          </label>
          <label>
            Tutar (TL)
            <input name="tutar" inputMode="decimal" required defaultValue={bakiye > 0 ? tutarYaz(bakiye) : ""} />
          </label>
          <label>
            Yöntem
            <select name="yontem" defaultValue="havale">
              <option value="havale">Havale/EFT</option>
              <option value="nakit">Nakit</option>
              <option value="cek">Çek</option>
              <option value="diger">Diğer</option>
            </select>
          </label>
          <label>
            Açıklama
            <input name="aciklama" />
          </label>
        </div>
        <p />
        <button type="submit">Tahsilatı kaydet</button>
      </form>

      <h2>Cari ekstre</h2>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Açıklama</th>
              <th className="sayi">Borç</th>
              <th className="sayi">Alacak</th>
              <th className="sayi">Bakiye</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ekstre.map((s, i) => (
              <tr key={i} className={s.iptal ? "iptal" : undefined}>
                <td>{s.tarih ? tarihYaz(s.tarih) : ""}</td>
                <td>
                  {s.tur === "islem" ? <Link href={`/islemler/${s.kayitId}`}>{s.aciklama}</Link> : s.aciklama}
                </td>
                <td className="sayi">{s.borc ? <Tutar k={s.borc} /> : ""}</td>
                <td className="sayi">{s.alacak ? <Tutar k={s.alacak} /> : ""}</td>
                <td className="sayi">
                  <Tutar k={s.bakiye} isaretli />
                </td>
                <td>
                  {s.tur === "tahsilat" && !s.iptal && s.kayitId && (
                    <IptalFormu eylem={tahsilatIptalEt.bind(null, s.kayitId)} />
                  )}
                </td>
              </tr>
            ))}
            {!ekstre.length && (
              <tr>
                <td colSpan={6} className="soluk">
                  Henüz hareket yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Poliçeler</h2>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Poliçe no</th>
              <th>Sigorta şirketi</th>
              <th>Branş</th>
              <th>Başlangıç</th>
              <th>Bitiş</th>
              <th className="sayi">Prim</th>
            </tr>
          </thead>
          <tbody>
            {policeler.map((p) => (
              <tr key={p.id}>
                <td>{p.policeNo}</td>
                <td>{p.sigortaSirketi}</td>
                <td>{p.brans}</td>
                <td>{tarihYaz(p.baslangic)}</td>
                <td>{tarihYaz(p.bitis)}</td>
                <td className="sayi">{p.prim != null ? <Tutar k={p.prim} /> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details style={{ marginTop: 12 }}>
        <summary>+ Poliçe ekle</summary>
        <form action={policeKaydet} className="kutu">
          <div className="izgara">
            <label>
              Poliçe no
              <input name="policeNo" required />
            </label>
            <label>
              Sigorta şirketi
              <input name="sigortaSirketi" />
            </label>
            <label>
              Branş
              <input name="brans" placeholder="Trafik, Kasko, DASK…" />
            </label>
            <label>
              Başlangıç
              <input name="baslangic" type="date" />
            </label>
            <label>
              Bitiş
              <input name="bitis" type="date" />
            </label>
            <label>
              Prim (TL)
              <input name="prim" inputMode="decimal" />
            </label>
          </div>
          <p />
          <button type="submit">Poliçeyi kaydet</button>
        </form>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary>Müşteri bilgilerini düzenle</summary>
        <MusteriFormu eylem={guncelle} m={m} yonetici={k.rol === "yonetici"} dugme="Değişiklikleri kaydet" />
      </details>
    </>
  );
}
