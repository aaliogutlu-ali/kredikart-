import "server-only";
import { redirect } from "next/navigation";
import { IsHatasi } from "./servis";
import { tutarOku } from "./para";

/** Formdan metin okur. */
export function metin(f: FormData, ad: string): string {
  const v = f.get(ad);
  return typeof v === "string" ? v.trim() : "";
}

export function tamSayi(f: FormData, ad: string): number {
  return Number.parseInt(metin(f, ad), 10);
}

/** Formdaki tutarı kuruş olarak okur; boşsa veya geçersizse hata verir. */
export function tutar(f: FormData, ad: string, alan: string, bosOlabilir = false): number {
  const s = metin(f, ad);
  if (!s && bosOlabilir) return 0;
  const k = tutarOku(s);
  if (k === null) throw new IsHatasi(`${alan} geçersiz: "${s}"`);
  return k;
}

function yolEkle(yol: string, anahtar: string, deger: string) {
  return `${yol}${yol.includes("?") ? "&" : "?"}${anahtar}=${encodeURIComponent(deger)}`;
}

/**
 * Bir form eylemini çalıştırır. İş kuralı hatasında hata mesajıyla geri döner,
 * başarıda verilen sayfaya mesajla yönlendirir.
 */
export async function calistir<T>(
  is: () => Promise<T>,
  hataYolu: string,
  basari: (sonuc: T) => { yol: string; mesaj?: string },
): Promise<never> {
  let hedef: string;
  try {
    const s = await is();
    const b = basari(s);
    hedef = b.mesaj ? yolEkle(b.yol, "mesaj", b.mesaj) : b.yol;
  } catch (e) {
    if (e instanceof IsHatasi || (e instanceof Error && e.message.startsWith("Şifre"))) {
      hedef = yolEkle(hataYolu, "hata", e.message);
    } else {
      throw e;
    }
  }
  redirect(hedef);
}
