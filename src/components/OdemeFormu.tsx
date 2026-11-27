"use client";
import { useState } from "react";
import { tarihYaz } from "@/lib/hesap";
import { tutarYaz } from "@/lib/para";

type Ekstre = { ekstreTarihi: string; kalan: number; asgari: number; borc: number };

export function OdemeFormu({
  eylem,
  ekstreler,
  bugun,
}: {
  eylem: (f: FormData) => Promise<void>;
  ekstreler: Ekstre[];
  bugun: string;
}) {
  const varsayilan = ekstreler.find((e) => e.kalan > 0) ?? ekstreler[0];
  const [tur, setTur] = useState<"serbest" | "ekstre" | "asgari">("serbest");
  const [ekstre, setEkstre] = useState(varsayilan?.ekstreTarihi ?? "");
  const [tutar, setTutar] = useState("");

  function oner(t: typeof tur, e: string) {
    const x = ekstreler.find((y) => y.ekstreTarihi === e);
    if (!x || t === "serbest") return;
    setTutar(tutarYaz(t === "ekstre" ? x.kalan : x.asgari));
  }

  return (
    <form action={eylem} className="kutu">
      <div className="izgara">
        <label>
          Ödeme türü
          <select
            name="tur"
            value={tur}
            onChange={(e) => {
              const t = e.target.value as typeof tur;
              setTur(t);
              oner(t, ekstre);
            }}
          >
            <option value="serbest">Serbest tutar</option>
            <option value="ekstre">Ekstre borcunun tamamı</option>
            <option value="asgari">Asgari ödeme</option>
          </select>
        </label>
        {tur !== "serbest" && (
          <label>
            Ekstre dönemi
            <select
              name="ekstreTarihi"
              value={ekstre}
              onChange={(e) => {
                setEkstre(e.target.value);
                oner(tur, e.target.value);
              }}
            >
              {ekstreler.map((e) => (
                <option key={e.ekstreTarihi} value={e.ekstreTarihi}>
                  {tarihYaz(e.ekstreTarihi)} · borç {tutarYaz(e.borc)} · kalan {tutarYaz(e.kalan)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Ödeme tarihi
          <input name="tarih" type="date" required defaultValue={bugun} />
        </label>
        <label>
          Tutar (TL)
          <input name="tutar" required inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} />
        </label>
        <label>
          Açıklama
          <input name="aciklama" />
        </label>
      </div>
      <p className="soluk">Ödenen tutar kartın kullanılabilir limitine geri eklenir.</p>
      <button type="submit">Ödemeyi kaydet</button>
    </form>
  );
}
