import { db } from "@/db";
import { yoneticiGerekli } from "@/lib/oturum";
import { degisiklikListesi } from "@/lib/sorgu";

export const dynamic = "force-dynamic";

const TABLO: Record<string, string> = {
  kullanicilar: "Kullanıcı",
  kartlar: "Kart",
  musteriler: "Müşteri",
  policeler: "Poliçe",
  islemler: "İşlem",
  kart_odemeleri: "Kart ödemesi",
  tahsilatlar: "Tahsilat",
};
const EYLEM: Record<string, string> = { ekle: "Ekledi", guncelle: "Değiştirdi", iptal: "İptal etti" };

const zaman = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });

export default async function Kayitlar() {
  await yoneticiGerekli();
  const liste = await degisiklikListesi(db(), 500);
  return (
    <>
      <h1>Değişiklik kaydı</h1>
      <p className="soluk">Son 500 değişiklik. Bu kayıt kimse tarafından silinemez.</p>
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Kullanıcı</th>
              <th>Eylem</th>
              <th>Kayıt</th>
              <th>Ayrıntı</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((x) => (
              <tr key={x.id}>
                <td>{zaman.format(x.zaman)}</td>
                <td>{x.kullanici ?? "Sistem"}</td>
                <td>{EYLEM[x.eylem] ?? x.eylem}</td>
                <td>
                  {TABLO[x.tablo] ?? x.tablo} #{x.kayitId}
                </td>
                <td>
                  <details>
                    <summary>Göster</summary>
                    {x.eski != null && (
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>Eski: {JSON.stringify(x.eski, null, 1)}</pre>
                    )}
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>Yeni: {JSON.stringify(x.yeni, null, 1)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
