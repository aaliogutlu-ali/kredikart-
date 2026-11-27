import { Bildirim } from "@/components/Bildirim";
import { db } from "@/db";
import { kullanicilar } from "@/db/schema";
import { calistir, metin } from "@/lib/eylem";
import { sifreHashle, yoneticiGerekli } from "@/lib/oturum";
import { kullaniciEkle, kullaniciGuncelle } from "@/lib/servis";
import type { SP } from "@/lib/tip";

export const dynamic = "force-dynamic";

async function ekle(f: FormData) {
  "use server";
  const k = await yoneticiGerekli();
  await calistir(
    async () =>
      kullaniciEkle(db(), k, {
        ad: metin(f, "ad"),
        eposta: metin(f, "eposta"),
        sifreHash: await sifreHashle(metin(f, "sifre")),
        rol: metin(f, "rol") === "yonetici" ? "yonetici" : "calisan",
      }),
    "/kullanicilar",
    () => ({ yol: "/kullanicilar", mesaj: "Kullanıcı eklendi." }),
  );
}

async function guncelle(id: number, f: FormData) {
  "use server";
  const k = await yoneticiGerekli();
  await calistir(
    async () => {
      const sifre = metin(f, "sifre");
      return kullaniciGuncelle(db(), k, id, {
        rol: metin(f, "rol") === "yonetici" ? "yonetici" : "calisan",
        aktif: metin(f, "aktif") === "1",
        sifreHash: sifre ? await sifreHashle(sifre) : undefined,
      });
    },
    "/kullanicilar",
    () => ({ yol: "/kullanicilar", mesaj: "Kullanıcı güncellendi." }),
  );
}

export default async function Kullanicilar({ searchParams }: { searchParams: SP }) {
  await yoneticiGerekli();
  const liste = await db().select().from(kullanicilar).orderBy(kullanicilar.ad);
  return (
    <>
      <h1>Kullanıcılar</h1>
      <Bildirim sp={await searchParams} />
      <div className="tablo-kap">
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>E-posta</th>
              <th>Rol / durum / yeni şifre</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((u) => (
              <tr key={u.id} className={u.aktif ? undefined : "iptal"}>
                <td>{u.ad}</td>
                <td>{u.eposta}</td>
                <td>
                  <form action={guncelle.bind(null, u.id)} className="satir">
                    <select name="rol" defaultValue={u.rol}>
                      <option value="calisan">Çalışan</option>
                      <option value="yonetici">Yönetici</option>
                    </select>
                    <select name="aktif" defaultValue={u.aktif ? "1" : "0"}>
                      <option value="1">Aktif</option>
                      <option value="0">Pasif</option>
                    </select>
                    <input name="sifre" type="password" placeholder="Yeni şifre (isteğe bağlı)" minLength={8} />
                    <button type="submit" className="ikincil">
                      Kaydet
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Yeni kullanıcı</h2>
      <form action={ekle} className="kutu">
        <div className="izgara">
          <label>
            Ad soyad
            <input name="ad" required />
          </label>
          <label>
            E-posta
            <input name="eposta" type="email" required />
          </label>
          <label>
            Şifre (en az 8 karakter)
            <input name="sifre" type="password" minLength={8} required />
          </label>
          <label>
            Rol
            <select name="rol" defaultValue="calisan">
              <option value="calisan">Çalışan</option>
              <option value="yonetici">Yönetici</option>
            </select>
          </label>
        </div>
        <p />
        <button type="submit">Kullanıcıyı ekle</button>
      </form>
    </>
  );
}
