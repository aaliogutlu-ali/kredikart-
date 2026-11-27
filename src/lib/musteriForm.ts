import "server-only";
import { metin, tutar } from "./eylem";
import type { MusteriGirdisi } from "./servis";

export function musteriFormunuOku(f: FormData): MusteriGirdisi {
  return {
    ad: metin(f, "ad"),
    tcknVkn: metin(f, "tcknVkn"),
    telefon: metin(f, "telefon"),
    eposta: metin(f, "eposta"),
    adres: metin(f, "adres"),
    notlar: metin(f, "notlar"),
    acilisBakiye: f.has("acilisBakiye") ? tutar(f, "acilisBakiye", "Açılış bakiyesi", true) : 0,
  };
}
