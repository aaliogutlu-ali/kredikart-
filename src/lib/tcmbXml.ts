export type KurSonucu = { kur: number; tarih: string } | { hata: string };

/** TCMB today.xml içinden bir dövizin efektif satış (BanknoteSelling) kurunu okur. */
export function tcmbXmlOku(xml: string, doviz: string): KurSonucu {
  const tarih = /Tarih="([^"]+)"/.exec(xml)?.[1] ?? "";
  const blok = new RegExp(`<Currency[^>]*Kod="${doviz}"[^>]*>([\\s\\S]*?)</Currency>`).exec(xml)?.[1];
  if (!blok) return { hata: `${doviz} TCMB listesinde yok` };
  const birim = Number(/<Unit>(\d+)<\/Unit>/.exec(blok)?.[1] ?? "1");
  const deger = /<BanknoteSelling>([\d.]+)<\/BanknoteSelling>/.exec(blok)?.[1];
  if (!deger) return { hata: `${doviz} için efektif satış kuru yayımlanmamış` };
  return { kur: Math.round((Number(deger) / birim) * 10000) / 10000, tarih };
}
