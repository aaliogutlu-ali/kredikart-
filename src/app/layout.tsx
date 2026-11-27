import type { Metadata } from "next";
import Link from "next/link";
import { mevcutKullanici, oturumKapat } from "@/lib/oturum";
import { redirect } from "next/navigation";
import "./globals.css";

export const metadata: Metadata = { title: "Kredi Kartı Takip" };

async function cikis() {
  "use server";
  await oturumKapat();
  redirect("/giris");
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const k = await mevcutKullanici();
  return (
    <html lang="tr">
      <body>
        {k && (
          <header className="ust">
            <span className="logo">Kart Takip</span>
            <nav>
              <Link href="/">Pano</Link>
              <Link href="/islemler/yeni">Yeni işlem</Link>
              <Link href="/islemler">İşlemler</Link>
              <Link href="/kartlar">Kartlar</Link>
              <Link href="/musteriler">Müşteriler</Link>
              {k.rol === "yonetici" && (
                <>
                  <Link href="/acilis">Açılış bakiyeleri</Link>
                  <Link href="/kullanicilar">Kullanıcılar</Link>
                  <Link href="/kayitlar">Değişiklik kaydı</Link>
                </>
              )}
            </nav>
            <span className="kim">
              {k.ad} · {k.rol === "yonetici" ? "Yönetici" : "Çalışan"}
            </span>
            <form action={cikis}>
              <button className="ikincil" type="submit">
                Çıkış
              </button>
            </form>
          </header>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
