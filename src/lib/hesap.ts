// Ekstre dönemi, taksit ve limit hesapları. Saf fonksiyonlar: veritabanına dokunmaz.

/** "YYYY-MM-DD" biçiminde tarih. */
export type Tarih = string;

function ikiHane(n: number): string {
  return String(n).padStart(2, "0");
}

function aySonGunu(yil: number, ay: number): number {
  return new Date(Date.UTC(yil, ay, 0)).getUTCDate();
}

function parcala(t: Tarih): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) throw new Error(`Geçersiz tarih: ${t}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Verilen ayın hesap kesim tarihi. O ayda olmayan gün (ör. 31) ayın son günü sayılır. */
export function kesimTarihi(yil: number, ay: number, kesimGunu: number): Tarih {
  while (ay > 12) {
    ay -= 12;
    yil += 1;
  }
  const gun = Math.min(kesimGunu, aySonGunu(yil, ay));
  return `${yil}-${ikiHane(ay)}-${ikiHane(gun)}`;
}

/** İşlemin düştüğü ilk ekstrenin kesim tarihi: kesim gününe eşit/önceyse bu ay, sonrasıysa gelecek ay. */
export function ilkEkstreTarihi(islemTarihi: Tarih, kesimGunu: number): Tarih {
  const [y, a] = parcala(islemTarihi);
  const buAy = kesimTarihi(y, a, kesimGunu);
  return islemTarihi <= buAy ? buAy : kesimTarihi(y, a + 1, kesimGunu);
}

/** Bir ekstre tarihinden n ay sonraki ekstre tarihi. */
export function ekstreKaydir(ekstreTarihi: Tarih, n: number, kesimGunu: number): Tarih {
  const [y, a] = parcala(ekstreTarihi);
  return kesimTarihi(y, a + n, kesimGunu);
}

export function gunEkle(t: Tarih, gun: number): Tarih {
  const [y, a, g] = parcala(t);
  const d = new Date(Date.UTC(y, a - 1, g + gun));
  return `${d.getUTCFullYear()}-${ikiHane(d.getUTCMonth() + 1)}-${ikiHane(d.getUTCDate())}`;
}

export function sonOdemeTarihi(ekstreTarihi: Tarih, sonOdemeGunSayisi: number): Tarih {
  return gunEkle(ekstreTarihi, sonOdemeGunSayisi);
}

export type TaksitSatiri = { sira: number; tutar: number; ekstreTarihi: Tarih };

/**
 * Tutarı taksitlere böler. Kuruş farkı ilk taksite eklenir.
 * ilkEkstre verilirse ilk taksit o ekstreye, yoksa işlem tarihine göre bulunan ekstreye düşer.
 */
export function taksitPlani(
  tutar: number,
  taksitSayisi: number,
  islemTarihi: Tarih,
  kesimGunu: number,
  ilkEkstre?: Tarih,
): TaksitSatiri[] {
  if (!Number.isInteger(taksitSayisi) || taksitSayisi < 1) throw new Error("Taksit sayısı en az 1 olmalı");
  const ilk = ilkEkstre ?? ilkEkstreTarihi(islemTarihi, kesimGunu);
  const isaret = tutar < 0 ? -1 : 1;
  const mutlak = Math.abs(tutar);
  const taban = Math.floor(mutlak / taksitSayisi);
  const fark = mutlak - taban * taksitSayisi;
  return Array.from({ length: taksitSayisi }, (_, i) => ({
    sira: i + 1,
    tutar: isaret * (i === 0 ? taban + fark : taban),
    ekstreTarihi: ekstreKaydir(ilk, i, kesimGunu),
  }));
}

export type LimitGirdisi = {
  limit: number;
  acilisKullanilmis: number;
  cekimler: number;
  iadeler: number;
  odemeler: number;
};

/**
 * Kullanılabilir limit = limit − (açılış kullanılmış + çekimler − iadeler − ödemeler).
 * Fazla ödeme limiti aşmaz, "artı bakiye" olarak ayrıca döner.
 */
export function limitHesapla(g: LimitGirdisi) {
  const borc = g.acilisKullanilmis + g.cekimler - g.iadeler - g.odemeler;
  const kullanilan = Math.max(borc, 0);
  return {
    kullanilan,
    kullanilabilir: g.limit - kullanilan,
    artiBakiye: Math.max(-borc, 0),
  };
}

/** Asgari ödeme önerisi: dönem borcu × oran (%), kuruş yukarı yuvarlanır. */
export function asgariTutar(donemBorcu: number, oranYuzde: number): number {
  if (donemBorcu <= 0) return 0;
  return Math.ceil((donemBorcu * oranYuzde) / 100);
}

/** Bugünün tarihi (Türkiye saatiyle). */
export function bugun(): Tarih {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

export function tarihYaz(t: Tarih | null | undefined): string {
  if (!t) return "";
  const [y, a, g] = parcala(t);
  return `${ikiHane(g)}.${ikiHane(a)}.${y}`;
}
