import "server-only";
import { metin, tamSayi, tutar } from "./eylem";
import { sayiNormallestir } from "./para";
import type { KartGirdisi } from "./servis";

export function kartFormunuOku(f: FormData): KartGirdisi {
  return {
    sahipTuru: metin(f, "sahipTuru") === "sahis" ? "sahis" : "sirket",
    sahipAdi: metin(f, "sahipAdi"),
    banka: metin(f, "banka"),
    kartAdi: metin(f, "kartAdi"),
    ilk4: metin(f, "ilk4"),
    son4: metin(f, "son4"),
    limit: tutar(f, "limit", "Limit"),
    kesimGunu: tamSayi(f, "kesimGunu"),
    sonOdemeGunSayisi: tamSayi(f, "sonOdemeGunSayisi"),
    asgariOran: sayiNormallestir(metin(f, "asgariOran")) ?? "x",
    acilisKullanilmis: tutar(f, "acilisKullanilmis", "Açılış kullanılmış limit", true),
    aktif: metin(f, "aktif") !== "0",
  };
}
