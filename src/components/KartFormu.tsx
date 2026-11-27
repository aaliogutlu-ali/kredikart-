import { tutarYaz } from "@/lib/para";
import type { Kart } from "@/lib/sorgu";

export function KartFormu({ eylem, kart, dugme }: { eylem: (f: FormData) => Promise<void>; kart?: Kart; dugme: string }) {
  return (
    <form action={eylem} className="kutu">
      <div className="izgara">
        <label>
          Kart sahibi türü
          <select name="sahipTuru" defaultValue={kart?.sahipTuru ?? "sirket"}>
            <option value="sirket">Şirket</option>
            <option value="sahis">Şahıs</option>
          </select>
        </label>
        <label>
          Kart sahibi adı / unvan
          <input name="sahipAdi" required defaultValue={kart?.sahipAdi} />
        </label>
        <label>
          Banka
          <input name="banka" required defaultValue={kart?.banka} />
        </label>
        <label>
          Kart adı (ör. Bonus)
          <input name="kartAdi" defaultValue={kart?.kartAdi} />
        </label>
        <label>
          İlk 4 hane
          <input name="ilk4" required pattern="\d{4}" maxLength={4} inputMode="numeric" defaultValue={kart?.ilk4} />
        </label>
        <label>
          Son 4 hane
          <input name="son4" required pattern="\d{4}" maxLength={4} inputMode="numeric" defaultValue={kart?.son4} />
        </label>
        <label>
          Toplam limit (TL)
          <input name="limit" required inputMode="decimal" defaultValue={kart ? tutarYaz(kart.limit) : ""} />
        </label>
        <label>
          Hesap kesim günü (1-31)
          <input name="kesimGunu" type="number" min={1} max={31} required defaultValue={kart?.kesimGunu} />
        </label>
        <label>
          Son ödeme: kesimden kaç gün sonra
          <input name="sonOdemeGunSayisi" type="number" min={0} max={40} required defaultValue={kart?.sonOdemeGunSayisi ?? 10} />
        </label>
        <label>
          Asgari ödeme oranı (%)
          <input name="asgariOran" inputMode="decimal" required defaultValue={kart?.asgariOran ?? "20"} />
        </label>
        <label>
          Açılış: geçiş günü kullanılmış limit (TL)
          <input name="acilisKullanilmis" inputMode="decimal" defaultValue={kart ? tutarYaz(kart.acilisKullanilmis) : "0"} />
        </label>
        <label>
          Durum
          <select name="aktif" defaultValue={kart?.aktif === false ? "0" : "1"}>
            <option value="1">Aktif</option>
            <option value="0">Pasif</option>
          </select>
        </label>
      </div>
      <p className="soluk">Tam kart numarası ve CVV saklanmaz; sadece ilk 4 ve son 4 hane tutulur.</p>
      <button type="submit">{dugme}</button>
    </form>
  );
}
