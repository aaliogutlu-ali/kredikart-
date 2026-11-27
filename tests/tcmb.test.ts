import { expect, it } from "vitest";
import { tcmbXmlOku } from "@/lib/tcmbXml";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="27.11.2026" Date="11/27/2026" Bulten_No="2026/225">
<Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"><Unit>1</Unit><Isim>ABD DOLARI</Isim>
<ForexBuying>42.1000</ForexBuying><ForexSelling>42.1800</ForexSelling><BanknoteBuying>42.0700</BanknoteBuying><BanknoteSelling>42.2433</BanknoteSelling></Currency>
<Currency CrossOrder="1" Kod="JPY" CurrencyCode="JPY"><Unit>100</Unit><Isim>JAPON YENI</Isim>
<ForexBuying>27.10</ForexBuying><BanknoteSelling>27.4500</BanknoteSelling></Currency>
<Currency CrossOrder="2" Kod="XDR" CurrencyCode="XDR"><Unit>1</Unit><ForexBuying>57.1</ForexBuying><BanknoteSelling></BanknoteSelling></Currency>
</Tarih_Date>`;

it("TCMB efektif satış kurunu okur", () => {
  expect(tcmbXmlOku(xml, "USD")).toEqual({ kur: 42.2433, tarih: "27.11.2026" });
  expect(tcmbXmlOku(xml, "JPY")).toEqual({ kur: 0.2745, tarih: "27.11.2026" });
  expect(tcmbXmlOku(xml, "XDR")).toHaveProperty("hata");
  expect(tcmbXmlOku(xml, "EUR")).toHaveProperty("hata");
});
