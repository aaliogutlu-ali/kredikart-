"use client";
import { useEffect, useMemo, useState } from "react";
import { dovizdenTL, kurOku, tutarOku, tutarYaz } from "@/lib/para";

type KartSecenek = { id: number; etiket: string; kullanilabilir: number };
type Kalem = { policeNo: string; musteri: string; tutar: string };
type Oneri = { policeNo?: string; musteri?: string; brans?: string; id?: number; ad?: string };

const DOVIZLER = ["TRY", "USD", "EUR", "GBP", "CHF"];

function useOneriler(q: string, tur: "police" | "musteri") {
  const [liste, setListe] = useState<Oneri[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/ara?tur=${tur}&q=${encodeURIComponent(q.trim())}`);
      if (r.ok) setListe(await r.json());
    }, 250);
    return () => clearTimeout(t);
  }, [q, tur]);
  return liste;
}

function KalemSatiri({
  i,
  kalem,
  degistir,
  sil,
  yonetici,
}: {
  i: number;
  kalem: Kalem;
  degistir: (k: Kalem) => void;
  sil?: () => void;
  yonetici: boolean;
}) {
  const policeOneri = useOneriler(kalem.policeNo, "police");
  const musteriOneri = useOneriler(kalem.musteri, "musteri");
  return (
    <div className="satir" style={{ marginBottom: 8 }}>
      <label style={{ flex: 2 }}>
        Poliçe no{yonetici ? " (yönetici için isteğe bağlı)" : ""}
        <input
          name="kalemPolice"
          list={`police-${i}`}
          value={kalem.policeNo}
          required={!yonetici}
          onChange={(e) => degistir({ ...kalem, policeNo: e.target.value })}
        />
        <datalist id={`police-${i}`}>
          {policeOneri.map((p) => (
            <option key={p.policeNo} value={p.policeNo}>
              {p.musteri} {p.brans ? `· ${p.brans}` : ""}
            </option>
          ))}
        </datalist>
      </label>
      {yonetici && (
        <label style={{ flex: 2 }}>
          veya müşteri (poliçesiz)
          <input
            name="kalemMusteri"
            list={`musteri-${i}`}
            value={kalem.musteri}
            placeholder="Ad yazıp seçin"
            readOnly={!!kalem.policeNo}
            onChange={(e) => degistir({ ...kalem, musteri: e.target.value })}
          />
          <datalist id={`musteri-${i}`}>
            {musteriOneri.map((m) => (
              <option key={m.id} value={`${m.id} - ${m.ad}`} />
            ))}
          </datalist>
        </label>
      )}
      {!yonetici && <input type="hidden" name="kalemMusteri" value="" />}
      <label style={{ flex: 1 }}>
        Tutar (TL)
        <input
          name="kalemTutar"
          inputMode="decimal"
          required
          value={kalem.tutar}
          onChange={(e) => degistir({ ...kalem, tutar: e.target.value })}
        />
      </label>
      {sil && (
        <button type="button" className="tehlike" onClick={sil}>
          Sil
        </button>
      )}
    </div>
  );
}

export function IslemFormu({
  eylem,
  kartlar,
  bugun,
  yonetici,
}: {
  eylem: (f: FormData) => Promise<void>;
  kartlar: KartSecenek[];
  bugun: string;
  yonetici: boolean;
}) {
  const [kartId, setKartId] = useState(kartlar[0]?.id ?? 0);
  const [doviz, setDoviz] = useState("TRY");
  const [dovizTutar, setDovizTutar] = useState("");
  const [kur, setKur] = useState("");
  const [kurBilgi, setKurBilgi] = useState("");
  const [tlTutar, setTlTutar] = useState("");
  const [kalemler, setKalemler] = useState<Kalem[]>([{ policeNo: "", musteri: "", tutar: "" }]);

  async function kurGetir(d: string) {
    setKurBilgi("TCMB kuru alınıyor…");
    try {
      const r = await fetch(`/api/kur?doviz=${d}`);
      const j = await r.json();
      if (j.kur) {
        setKur(String(j.kur).replace(".", ","));
        setKurBilgi(`TCMB efektif satış, ${j.tarih}. Gerekirse düzeltebilirsiniz.`);
      } else setKurBilgi(j.hata ?? "Kur alınamadı, elle girin.");
    } catch {
      setKurBilgi("Kur alınamadı, elle girin.");
    }
  }

  // Döviz işlemde TL tutar = döviz tutarı × kur.
  const hesaplananTL = useMemo(() => {
    if (doviz === "TRY") return tutarOku(tlTutar);
    const d = tutarOku(dovizTutar);
    const k = kurOku(kur);
    return d != null && k != null ? dovizdenTL(d, k) : null;
  }, [doviz, dovizTutar, kur, tlTutar]);

  // Tek kalem varsa tutarı otomatik doldur.
  useEffect(() => {
    if (kalemler.length === 1 && hesaplananTL != null)
      setKalemler((k) => [{ ...k[0], tutar: tutarYaz(hesaplananTL) }]);
  }, [hesaplananTL, kalemler.length]);

  const kalemToplam = kalemler.reduce((s, k) => s + (tutarOku(k.tutar) ?? 0), 0);
  const fark = (hesaplananTL ?? 0) - kalemToplam;
  const kart = kartlar.find((k) => k.id === kartId);

  return (
    <form action={eylem} className="kutu">
      <div className="izgara">
        <label style={{ gridColumn: "span 2" }}>
          Kart
          <select name="kartId" value={kartId} onChange={(e) => setKartId(Number(e.target.value))}>
            {kartlar.map((k) => (
              <option key={k.id} value={k.id}>
                {k.etiket} · kullanılabilir {tutarYaz(k.kullanilabilir)}
              </option>
            ))}
          </select>
        </label>
        <label>
          İşlem tarihi
          <input name="tarih" type="date" required defaultValue={bugun} />
        </label>
        <label>
          Taksit sayısı
          <input name="taksitSayisi" type="number" min={1} max={36} defaultValue={1} required />
        </label>
        <label>
          Para birimi
          <select
            name="paraBirimi"
            value={doviz}
            onChange={(e) => {
              setDoviz(e.target.value);
              if (e.target.value !== "TRY") kurGetir(e.target.value);
            }}
          >
            {DOVIZLER.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        {doviz === "TRY" ? (
          <label>
            Tutar (TL)
            <input name="tutar" inputMode="decimal" required value={tlTutar} onChange={(e) => setTlTutar(e.target.value)} />
          </label>
        ) : (
          <>
            <label>
              Döviz tutarı ({doviz})
              <input name="dovizTutar" inputMode="decimal" required value={dovizTutar} onChange={(e) => setDovizTutar(e.target.value)} />
            </label>
            <label>
              Kur
              <input name="kur" inputMode="decimal" required value={kur} onChange={(e) => setKur(e.target.value)} />
            </label>
            <label>
              TL karşılığı
              <input readOnly value={hesaplananTL != null ? tutarYaz(hesaplananTL) : ""} />
            </label>
          </>
        )}
      </div>
      {doviz !== "TRY" && (
        <p className="soluk">
          {kurBilgi}{" "}
          <button type="button" className="ikincil" onClick={() => kurGetir(doviz)}>
            TCMB kurunu yeniden getir
          </button>
        </p>
      )}
      {kart && hesaplananTL != null && hesaplananTL > kart.kullanilabilir && (
        <div className="bildirim uyari">Bu tutar kartın kullanılabilir limitini aşıyor.</div>
      )}

      <h2>Poliçeler</h2>
      <p className="soluk">Bir çekim birden fazla poliçeye bölünebilir. Kalemlerin toplamı işlem tutarına eşit olmalı.</p>
      {kalemler.map((k, i) => (
        <KalemSatiri
          key={i}
          i={i}
          kalem={k}
          yonetici={yonetici}
          degistir={(yeni) => setKalemler((l) => l.map((x, j) => (j === i ? yeni : x)))}
          sil={kalemler.length > 1 ? () => setKalemler((l) => l.filter((_, j) => j !== i)) : undefined}
        />
      ))}
      <div className="satir" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="ikincil"
          onClick={() => setKalemler((l) => [...l, { policeNo: "", musteri: "", tutar: fark > 0 ? tutarYaz(fark) : "" }])}
        >
          + Poliçe ekle
        </button>
        {kalemler.length > 1 && (
          <span className={fark === 0 ? "soluk" : "eksi"}>
            Kalemler toplamı {tutarYaz(kalemToplam)} · fark {tutarYaz(fark)}
          </span>
        )}
      </div>
      <label>
        Açıklama
        <input name="aciklama" />
      </label>
      <p />
      <button type="submit">İşlemi kaydet</button>
    </form>
  );
}
