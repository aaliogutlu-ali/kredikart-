import Link from "next/link";
import { Bildirim } from "@/components/Bildirim";
import { MusteriFormu } from "@/components/MusteriFormu";
import { Tutar } from "@/components/Tutar";
import { db } from "@/db";
import { calistir } from "@/lib/eylem";
import { musteriFormunuOku } from "@/lib/musteriForm";
import { kullaniciGerekli } from "@/lib/oturum";
import { musteriEkle } from "@/lib/servis";
import { musteriListesi } from "@/lib/sorgu";
import { tek, type SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

async function ekle(f: FormData) {
  "use server";
  const k = await kullaniciGerekli();
  await calistir(
    () => musteriEkle(db(), k, musteriFormunuOku(f)),
    "/musteriler",
    (id) => ({ yol: `/musteriler/${id}`, mesaj: "Müşteri eklendi. Şimdi poliçelerini ekleyebilirsiniz." }),
  );
}

export default async function Musteriler({ searchParams }: { searchParams: SP }) {
  const k = await kullaniciGerekli();
  const sp = await searchParams;
  const q = tek(sp.q);
  const liste = await musteriListesi(db(), q);
  const toplam = liste.reduce((s, m) => s + m.bakiye, 0);
  return (
    <>
      <h1>Müşteriler</h1>
      <Bildirim sp={sp} />
      <form className="kutu satir">
        <label style={{ flex: 1 }}>
          Ara (ad, TCKN/VKN veya poliçe no)
          <input name="q" defaultValue={q} />
        </label>
        <button type="submit" className="ikincil">
          Ara
        </button>
      </form>
      <details>
        <summary>+ Yeni müşteri</summary>
        <MusteriFormu eylem={ekle} yonetici={k.rol === "yonetici"} dugme="Müşteriyi kaydet" />
      </details>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>TCKN / VKN</th>
              <th>Telefon</th>
              <th className="sayi">Cari bakiye</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/musteriler/${m.id}`}>{m.ad}</Link>
                </td>
                <td>{m.tcknVkn}</td>
                <td>{m.telefon}</td>
                <td className="sayi">
                  <Tutar k={m.bakiye} isaretli />
                </td>
              </tr>
            ))}
            {!liste.length && (
              <tr>
                <td colSpan={4} className="soluk">
                  Müşteri bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
          {liste.length > 0 && (
            <tfoot>
              <tr>
                <th colSpan={3}>Listelenen müşterilerin toplam bakiyesi</th>
                <th className="sayi">
                  <Tutar k={toplam} isaretli />
                </th>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="soluk">Pozitif bakiye müşterinin size borcu, eksi bakiye fazla ödemesidir. En fazla 300 müşteri listelenir.</p>
    </>
  );
}
