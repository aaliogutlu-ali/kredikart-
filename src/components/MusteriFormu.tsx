import { tutarYaz } from "@/lib/para";

type M = { ad: string; tcknVkn: string | null; telefon: string; eposta: string; adres: string; notlar: string; acilisBakiye: number };

export function MusteriFormu({
  eylem,
  m,
  yonetici,
  dugme,
}: {
  eylem: (f: FormData) => Promise<void>;
  m?: M;
  yonetici: boolean;
  dugme: string;
}) {
  return (
    <form action={eylem} className="kutu">
      <div className="izgara">
        <label>
          Ad soyad / unvan
          <input name="ad" required defaultValue={m?.ad} />
        </label>
        <label>
          TCKN / VKN
          <input name="tcknVkn" inputMode="numeric" defaultValue={m?.tcknVkn ?? ""} />
        </label>
        <label>
          Telefon
          <input name="telefon" defaultValue={m?.telefon} />
        </label>
        <label>
          E-posta
          <input name="eposta" type="email" defaultValue={m?.eposta} />
        </label>
        <label>
          Adres
          <input name="adres" defaultValue={m?.adres} />
        </label>
        <label>
          Not
          <input name="notlar" defaultValue={m?.notlar} />
        </label>
        {yonetici && (
          <label>
            Açılış bakiyesi (TL, müşterinin borcu)
            <input name="acilisBakiye" inputMode="decimal" defaultValue={m ? tutarYaz(m.acilisBakiye) : "0"} />
          </label>
        )}
      </div>
      <p />
      <button type="submit">{dugme}</button>
    </form>
  );
}
