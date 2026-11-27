export function IptalFormu({ eylem }: { eylem: (f: FormData) => Promise<void> }) {
  return (
    <details>
      <summary>İptal et</summary>
      <form action={eylem} className="satir">
        <input name="neden" placeholder="İptal nedeni" required />
        <button className="tehlike" type="submit">
          İptal et
        </button>
      </form>
    </details>
  );
}
