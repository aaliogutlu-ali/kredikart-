export function Bildirim({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const hata = typeof sp.hata === "string" ? sp.hata : undefined;
  const mesaj = typeof sp.mesaj === "string" ? sp.mesaj : undefined;
  const uyari = typeof sp.uyari === "string" ? sp.uyari : undefined;
  return (
    <>
      {hata && <div className="bildirim hata">{hata}</div>}
      {uyari && <div className="bildirim uyari">{uyari}</div>}
      {mesaj && <div className="bildirim mesaj">{mesaj}</div>}
    </>
  );
}
