import "server-only";
import { tcmbXmlOku, type KurSonucu } from "./tcmbXml";

/**
 * TCMB'nin günlük kur dosyasından efektif satış (BanknoteSelling) kurunu okur.
 * TCMB kurları her iş günü öğleden sonra yayımlar; dosya o an geçerli son kurları içerir.
 */
export async function tcmbEfektifSatis(doviz: string): Promise<KurSonucu> {
  if (!/^[A-Z]{3}$/.test(doviz)) return { hata: "Geçersiz döviz kodu" };
  try {
    const r = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", { next: { revalidate: 600 } });
    if (!r.ok) return { hata: `TCMB yanıt vermedi (${r.status})` };
    return tcmbXmlOku(await r.text(), doviz);
  } catch {
    return { hata: "TCMB'ye ulaşılamadı" };
  }
}
