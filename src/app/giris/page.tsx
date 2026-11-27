import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Bildirim } from "@/components/Bildirim";
import { db } from "@/db";
import { kullanicilar } from "@/db/schema";
import { metin } from "@/lib/eylem";
import { mevcutKullanici, oturumAc, sifreDogru } from "@/lib/oturum";
import type { SP } from "@/lib/tip";

async function girisYap(f: FormData) {
  "use server";
  const eposta = metin(f, "eposta").toLowerCase();
  const [u] = await db().select().from(kullanicilar).where(eq(kullanicilar.eposta, eposta));
  if (!u || !u.aktif || !(await sifreDogru(metin(f, "sifre"), u.sifreHash)))
    redirect("/giris?hata=" + encodeURIComponent("E-posta veya şifre hatalı."));
  await oturumAc(u.id);
  redirect("/");
}

export default async function Giris({ searchParams }: { searchParams: SP }) {
  if (await mevcutKullanici()) redirect("/");
  const [{ sayi }] = await db().select({ sayi: sql<number>`count(*)::int` }).from(kullanicilar);
  if (sayi === 0) redirect("/kurulum");
  return (
    <div className="giris">
      <h1>Kart Takip · Giriş</h1>
      <Bildirim sp={await searchParams} />
      <form action={girisYap} className="kutu" style={{ display: "grid", gap: 12 }}>
        <label>
          E-posta
          <input name="eposta" type="email" required autoFocus />
        </label>
        <label>
          Şifre
          <input name="sifre" type="password" required />
        </label>
        <button type="submit">Giriş yap</button>
      </form>
    </div>
  );
}
