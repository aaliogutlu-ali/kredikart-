import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Bildirim } from "@/components/Bildirim";
import { db } from "@/db";
import { kullanicilar } from "@/db/schema";
import { calistir, metin } from "@/lib/eylem";
import { oturumAc, sifreHashle } from "@/lib/oturum";
import { kullaniciEkle } from "@/lib/servis";
import type { SP } from "@/lib/tip";

async function kullaniciVarMi() {
  const [{ sayi }] = await db().select({ sayi: sql<number>`count(*)::int` }).from(kullanicilar);
  return sayi > 0;
}

async function kur(f: FormData) {
  "use server";
  if (await kullaniciVarMi()) redirect("/giris");
  await calistir(
    async () => {
      const id = await kullaniciEkle(db(), null, {
        ad: metin(f, "ad"),
        eposta: metin(f, "eposta"),
        sifreHash: await sifreHashle(metin(f, "sifre")),
        rol: "yonetici",
      });
      await oturumAc(id);
    },
    "/kurulum",
    () => ({ yol: "/", mesaj: "Hoş geldiniz. Önce kartlarınızı ekleyin." }),
  );
}

export default async function Kurulum({ searchParams }: { searchParams: SP }) {
  if (await kullaniciVarMi()) redirect("/giris");
  return (
    <div className="giris">
      <h1>İlk kurulum</h1>
      <p className="soluk">Henüz kullanıcı yok. Yönetici hesabınızı oluşturun.</p>
      <Bildirim sp={await searchParams} />
      <form action={kur} className="kutu" style={{ display: "grid", gap: 12 }}>
        <label>
          Ad soyad
          <input name="ad" required autoFocus />
        </label>
        <label>
          E-posta
          <input name="eposta" type="email" required />
        </label>
        <label>
          Şifre (en az 8 karakter)
          <input name="sifre" type="password" minLength={8} required />
        </label>
        <button type="submit">Yönetici hesabını oluştur</button>
      </form>
    </div>
  );
}
