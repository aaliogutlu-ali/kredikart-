// Tüm tutarlar veritabanında ve hesaplarda tam sayı kuruş olarak tutulur.

const tlBicim = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Kuruşu "12.345,67" biçiminde yazar. */
export function tutarYaz(kurus: number): string {
  return tlBicim.format(kurus / 100);
}

/** Kuruşu "12.345,67 TL" biçiminde yazar. */
export function tlYaz(kurus: number): string {
  return `${tutarYaz(kurus)} TL`;
}

/**
 * Kullanıcının yazdığı sayıyı ondalık sayı metnine çevirir.
 * "12.345,67" -> "12345.67", "12345,67" -> "12345.67", "12345.67" -> "12345.67",
 * "12.345" -> "12345" (Türkçe binlik ayırıcı).
 */
export function sayiNormallestir(girdi: string): string | null {
  let s = girdi.trim().replace(/\s/g, "").replace(/TL$/i, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const noktalar = s.split(".").length - 1;
    if (noktalar > 1 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return s;
}

/** "12.345,67" gibi bir girdiyi kuruşa çevirir. Geçersizse null döner. */
export function tutarOku(girdi: string): number | null {
  const s = sayiNormallestir(girdi);
  if (s === null) return null;
  const [tam, ondalik = ""] = s.replace("-", "").split(".");
  if (ondalik.length > 2) return null;
  const kurus = Number(tam) * 100 + Number(ondalik.padEnd(2, "0"));
  if (!Number.isSafeInteger(kurus)) return null;
  return s.startsWith("-") ? -kurus : kurus;
}

/** Kur girdisini (en çok 4 ondalık) sayıya çevirir. */
export function kurOku(girdi: string): number | null {
  const s = sayiNormallestir(girdi);
  if (s === null) return null;
  const n = Number(s);
  if (!(n > 0)) return null;
  return Math.round(n * 10000) / 10000;
}

/** Döviz tutarını (kuruş/cent cinsinden) kurla TL kuruşa çevirir. */
export function dovizdenTL(dovizKurus: number, kur: number): number {
  return Math.round((dovizKurus * Math.round(kur * 10000)) / 10000);
}
