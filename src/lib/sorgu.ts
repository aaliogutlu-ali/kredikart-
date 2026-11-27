// Okuma sorguları: limit, ekstre, cari bakiye ve listeler.
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import {
  degisiklikKaydi,
  islemKalemleri,
  islemler,
  kartlar,
  kartOdemeleri,
  kullanicilar,
  musteriler,
  policeler,
  tahsilatlar,
  taksitler,
} from "@/db/schema";
import { asgariTutar, bugun, ekstreKaydir, ilkEkstreTarihi, limitHesapla, sonOdemeTarihi, type Tarih } from "./hesap";

const n = (v: unknown) => Number(v ?? 0);

export type Kart = typeof kartlar.$inferSelect;

export function kartEtiketi(k: Pick<Kart, "banka" | "kartAdi" | "son4" | "sahipAdi">) {
  return `${k.banka}${k.kartAdi ? " " + k.kartAdi : ""} •${k.son4} (${k.sahipAdi})`;
}

/** Kart başına çekim, iade ve ödeme toplamları. */
async function kartToplamlari(db: Db, kartIdleri?: number[]) {
  const filtre = kartIdleri ? inArray(islemler.kartId, kartIdleri) : undefined;
  const islemT = await db
    .select({
      kartId: islemler.kartId,
      cekim: sql<string>`coalesce(sum(case when ${islemler.tur} = 'cekim' then ${islemler.tutar} end), 0)`,
      iade: sql<string>`coalesce(sum(case when ${islemler.tur} = 'iade' then ${islemler.tutar} end), 0)`,
    })
    .from(islemler)
    .where(and(eq(islemler.iptal, false), eq(islemler.acilis, false), filtre))
    .groupBy(islemler.kartId);
  const odemeT = await db
    .select({ kartId: kartOdemeleri.kartId, toplam: sql<string>`coalesce(sum(${kartOdemeleri.tutar}), 0)` })
    .from(kartOdemeleri)
    .where(and(eq(kartOdemeleri.iptal, false), kartIdleri ? inArray(kartOdemeleri.kartId, kartIdleri) : undefined))
    .groupBy(kartOdemeleri.kartId);
  const m = new Map<number, { cekim: number; iade: number; odeme: number }>();
  for (const r of islemT) m.set(r.kartId, { cekim: n(r.cekim), iade: n(r.iade), odeme: 0 });
  for (const r of odemeT) {
    const x = m.get(r.kartId) ?? { cekim: 0, iade: 0, odeme: 0 };
    x.odeme = n(r.toplam);
    m.set(r.kartId, x);
  }
  return m;
}

/** Bir kartın belirli ekstre tarihlerindeki borç ve bu döneme bağlı ödemeler. */
async function ekstreToplamlari(db: Db, kartId: number | null, tarihler?: Tarih[]) {
  const borc = await db
    .select({
      kartId: taksitler.kartId,
      ekstreTarihi: taksitler.ekstreTarihi,
      toplam: sql<string>`coalesce(sum(${taksitler.tutar}), 0)`,
    })
    .from(taksitler)
    .innerJoin(islemler, eq(islemler.id, taksitler.islemId))
    .where(
      and(
        eq(islemler.iptal, false),
        kartId != null ? eq(taksitler.kartId, kartId) : undefined,
        tarihler ? inArray(taksitler.ekstreTarihi, tarihler) : undefined,
      ),
    )
    .groupBy(taksitler.kartId, taksitler.ekstreTarihi);
  const odenen = await db
    .select({
      kartId: kartOdemeleri.kartId,
      ekstreTarihi: kartOdemeleri.ekstreTarihi,
      toplam: sql<string>`coalesce(sum(${kartOdemeleri.tutar}), 0)`,
    })
    .from(kartOdemeleri)
    .where(
      and(
        eq(kartOdemeleri.iptal, false),
        sql`${kartOdemeleri.ekstreTarihi} is not null`,
        kartId != null ? eq(kartOdemeleri.kartId, kartId) : undefined,
        tarihler ? inArray(kartOdemeleri.ekstreTarihi, tarihler) : undefined,
      ),
    )
    .groupBy(kartOdemeleri.kartId, kartOdemeleri.ekstreTarihi);
  const anahtar = (k: number, t: string | null) => `${k}|${t}`;
  const m = new Map<string, { borc: number; odenen: number }>();
  for (const r of borc) m.set(anahtar(r.kartId, r.ekstreTarihi), { borc: n(r.toplam), odenen: 0 });
  for (const r of odenen) {
    const k = anahtar(r.kartId, r.ekstreTarihi);
    const x = m.get(k) ?? { borc: 0, odenen: 0 };
    x.odenen = n(r.toplam);
    m.set(k, x);
  }
  return { al: (kart: number, t: string) => m.get(anahtar(kart, t)) ?? { borc: 0, odenen: 0 }, m };
}

export type EkstreBilgisi = {
  ekstreTarihi: Tarih;
  sonOdeme: Tarih;
  borc: number;
  odenen: number;
  kalan: number;
  asgari: number;
};

function ekstreBilgisi(kart: Kart, ekstreTarihi: Tarih, t: { borc: number; odenen: number }): EkstreBilgisi {
  return {
    ekstreTarihi,
    sonOdeme: sonOdemeTarihi(ekstreTarihi, kart.sonOdemeGunSayisi),
    borc: t.borc,
    odenen: t.odenen,
    kalan: Math.max(t.borc - t.odenen, 0),
    asgari: asgariTutar(t.borc, Number(kart.asgariOran)),
  };
}

export type KartOzeti = Kart & {
  kullanilan: number;
  kullanilabilir: number;
  artiBakiye: number;
  /** En son kesilmiş ekstre. */
  sonEkstre: EkstreBilgisi;
  /** Henüz kesilmemiş, şu an işleyen dönem. */
  acikDonem: EkstreBilgisi;
};

export async function kartOzetleri(db: Db, kartIdleri?: number[]): Promise<KartOzeti[]> {
  const liste = await db
    .select()
    .from(kartlar)
    .where(kartIdleri ? inArray(kartlar.id, kartIdleri) : undefined)
    .orderBy(desc(kartlar.aktif), kartlar.banka, kartlar.sahipAdi);
  if (!liste.length) return [];
  const toplam = await kartToplamlari(db, kartIdleri);
  const b = bugun();
  const tarihler = new Set<string>();
  const donemler = liste.map((k) => {
    const acik = ilkEkstreTarihi(b, k.kesimGunu);
    // Kesim günü bugünse bugünkü ekstre kesilmiş sayılır.
    const acikDonem = acik === b ? ekstreKaydir(acik, 1, k.kesimGunu) : acik;
    const son = ekstreKaydir(acikDonem, -1, k.kesimGunu);
    tarihler.add(acikDonem).add(son);
    return { acikDonem, son };
  });
  const e = await ekstreToplamlari(db, kartIdleri?.length === 1 ? kartIdleri[0] : null, [...tarihler]);
  return liste.map((k, i) => {
    const t = toplam.get(k.id) ?? { cekim: 0, iade: 0, odeme: 0 };
    const l = limitHesapla({
      limit: k.limit,
      acilisKullanilmis: k.acilisKullanilmis,
      cekimler: t.cekim,
      iadeler: t.iade,
      odemeler: t.odeme,
    });
    return {
      ...k,
      ...l,
      sonEkstre: ekstreBilgisi(k, donemler[i].son, e.al(k.id, donemler[i].son)),
      acikDonem: ekstreBilgisi(k, donemler[i].acikDonem, e.al(k.id, donemler[i].acikDonem)),
    };
  });
}

export async function kartOzeti(db: Db, id: number): Promise<KartOzeti | undefined> {
  return (await kartOzetleri(db, [id]))[0];
}

/** Kartın tüm ekstreleri, yeniden eskiye. */
export async function kartEkstreleri(db: Db, kart: Kart): Promise<EkstreBilgisi[]> {
  const e = await ekstreToplamlari(db, kart.id);
  const tarihler = [...new Set([...e.m.keys()].map((k) => k.split("|")[1]))].filter((t) => t !== "null");
  return tarihler.sort().reverse().map((t) => ekstreBilgisi(kart, t, e.al(kart.id, t)));
}

/** Bir ekstreye düşen taksit satırları. */
export async function ekstreDetayi(db: Db, kartId: number, ekstreTarihi: Tarih) {
  return db
    .select({
      islemId: islemler.id,
      tarih: islemler.tarih,
      tur: islemler.tur,
      acilis: islemler.acilis,
      aciklama: islemler.aciklama,
      sira: taksitler.sira,
      toplamSira: taksitler.toplamSira,
      tutar: taksitler.tutar,
      musteriler: sql<string>`(select string_agg(distinct m.ad, ', ') from ${islemKalemleri} k join ${musteriler} m on m.id = k.musteri_id where k.islem_id = ${islemler.id})`,
    })
    .from(taksitler)
    .innerJoin(islemler, eq(islemler.id, taksitler.islemId))
    .where(and(eq(taksitler.kartId, kartId), eq(taksitler.ekstreTarihi, ekstreTarihi), eq(islemler.iptal, false)))
    .orderBy(islemler.tarih, islemler.id);
}

export async function kartOdemeListesi(db: Db, kartId: number) {
  return db
    .select({
      id: kartOdemeleri.id,
      tur: kartOdemeleri.tur,
      ekstreTarihi: kartOdemeleri.ekstreTarihi,
      tarih: kartOdemeleri.tarih,
      tutar: kartOdemeleri.tutar,
      aciklama: kartOdemeleri.aciklama,
      iptal: kartOdemeleri.iptal,
      iptalNedeni: kartOdemeleri.iptalNedeni,
      olusturanId: kartOdemeleri.olusturanId,
      olusturma: kartOdemeleri.olusturma,
      giren: kullanicilar.ad,
    })
    .from(kartOdemeleri)
    .innerJoin(kullanicilar, eq(kullanicilar.id, kartOdemeleri.olusturanId))
    .where(eq(kartOdemeleri.kartId, kartId))
    .orderBy(desc(kartOdemeleri.tarih), desc(kartOdemeleri.id))
    .limit(200);
}

export type IslemFiltre = { kartId?: number; musteriId?: number; baslangic?: string; bitis?: string; limit?: number };

export async function islemListesi(db: Db, f: IslemFiltre = {}) {
  const musteriKosul = f.musteriId
    ? sql`exists (select 1 from ${islemKalemleri} k where k.islem_id = ${islemler.id} and k.musteri_id = ${f.musteriId})`
    : undefined;
  return db
    .select({
      id: islemler.id,
      tarih: islemler.tarih,
      tur: islemler.tur,
      tutar: islemler.tutar,
      paraBirimi: islemler.paraBirimi,
      dovizTutar: islemler.dovizTutar,
      kur: islemler.kur,
      taksitSayisi: islemler.taksitSayisi,
      acilis: islemler.acilis,
      aciklama: islemler.aciklama,
      iptal: islemler.iptal,
      iptalNedeni: islemler.iptalNedeni,
      iadeEdilenIslemId: islemler.iadeEdilenIslemId,
      olusturanId: islemler.olusturanId,
      olusturma: islemler.olusturma,
      kartId: kartlar.id,
      banka: kartlar.banka,
      kartAdi: kartlar.kartAdi,
      son4: kartlar.son4,
      sahipAdi: kartlar.sahipAdi,
      giren: kullanicilar.ad,
      kalemOzeti: sql<string>`(select string_agg(m.ad || coalesce(' / ' || p.police_no, ''), ', ') from ${islemKalemleri} k join ${musteriler} m on m.id = k.musteri_id left join ${policeler} p on p.id = k.police_id where k.islem_id = ${islemler.id})`,
    })
    .from(islemler)
    .innerJoin(kartlar, eq(kartlar.id, islemler.kartId))
    .innerJoin(kullanicilar, eq(kullanicilar.id, islemler.olusturanId))
    .where(
      and(
        f.kartId ? eq(islemler.kartId, f.kartId) : undefined,
        musteriKosul,
        f.baslangic ? sql`${islemler.tarih} >= ${f.baslangic}` : undefined,
        f.bitis ? sql`${islemler.tarih} <= ${f.bitis}` : undefined,
      ),
    )
    .orderBy(desc(islemler.tarih), desc(islemler.id))
    .limit(f.limit ?? 300);
}

export async function islemDetayi(db: Db, id: number) {
  const [x] = await db.select().from(islemler).where(eq(islemler.id, id));
  if (!x) return undefined;
  const kalemler = await db
    .select({
      musteriId: islemKalemleri.musteriId,
      musteri: musteriler.ad,
      policeNo: policeler.policeNo,
      tutar: islemKalemleri.tutar,
    })
    .from(islemKalemleri)
    .innerJoin(musteriler, eq(musteriler.id, islemKalemleri.musteriId))
    .leftJoin(policeler, eq(policeler.id, islemKalemleri.policeId))
    .where(eq(islemKalemleri.islemId, id));
  const plan = await db.select().from(taksitler).where(eq(taksitler.islemId, id)).orderBy(taksitler.sira);
  const [kart] = await db.select().from(kartlar).where(eq(kartlar.id, x.kartId));
  const iadeler = await db
    .select()
    .from(islemler)
    .where(eq(islemler.iadeEdilenIslemId, id))
    .orderBy(islemler.tarih);
  return { ...x, kalemler, plan, kart, iadeler };
}

/** Cari bakiye ifadesi: açılış + çekim kalemleri − iade kalemleri − tahsilatlar. */
const M_ID = sql.raw(`"musteriler"."id"`);
const bakiyeIfadesi = sql<string>`"musteriler"."acilis_bakiye"
  + coalesce((select sum(case when i.tur = 'cekim' then k.tutar else -k.tutar end) from ${islemKalemleri} k join ${islemler} i on i.id = k.islem_id where k.musteri_id = ${M_ID} and not i.iptal), 0)
  - coalesce((select sum(t.tutar) from ${tahsilatlar} t where t.musteri_id = ${M_ID} and not t.iptal), 0)`;

export async function musteriListesi(db: Db, arama = "", limit = 300) {
  const a = arama.trim();
  return db
    .select({
      id: musteriler.id,
      ad: musteriler.ad,
      tcknVkn: musteriler.tcknVkn,
      telefon: musteriler.telefon,
      bakiye: bakiyeIfadesi,
    })
    .from(musteriler)
    .where(
      a
        ? or(
            ilike(musteriler.ad, `%${a}%`),
            ilike(musteriler.tcknVkn, `%${a}%`),
            sql`exists (select 1 from ${policeler} p where p.musteri_id = ${M_ID} and p.police_no ilike ${"%" + a + "%"})`,
          )
        : undefined,
    )
    .orderBy(musteriler.ad)
    .limit(limit)
    .then((r) => r.map((x) => ({ ...x, bakiye: n(x.bakiye) })));
}

export async function musteriBakiyesi(db: Db, id: number) {
  const [r] = await db.select({ bakiye: bakiyeIfadesi }).from(musteriler).where(eq(musteriler.id, id));
  return r ? n(r.bakiye) : 0;
}

export type CariSatir = {
  tarih: Tarih | null;
  aciklama: string;
  borc: number;
  alacak: number;
  bakiye: number;
  tur: "acilis" | "islem" | "tahsilat";
  kayitId: number | null;
  iptal: boolean;
  olusturanId: number | null;
  olusturma: Date | null;
};

/** Müşteri cari ekstresi: tarih sırasıyla, yürüyen bakiye ile. İptal edilenler bakiyeye katılmaz. */
export async function musteriEkstresi(db: Db, musteriId: number): Promise<CariSatir[]> {
  const [m] = await db.select().from(musteriler).where(eq(musteriler.id, musteriId));
  if (!m) return [];
  const kalemler = await db
    .select({
      islemId: islemler.id,
      tarih: islemler.tarih,
      tur: islemler.tur,
      tutar: islemKalemleri.tutar,
      taksitSayisi: islemler.taksitSayisi,
      paraBirimi: islemler.paraBirimi,
      aciklama: islemler.aciklama,
      iptal: islemler.iptal,
      olusturanId: islemler.olusturanId,
      olusturma: islemler.olusturma,
      policeNo: policeler.policeNo,
      banka: kartlar.banka,
      son4: kartlar.son4,
    })
    .from(islemKalemleri)
    .innerJoin(islemler, eq(islemler.id, islemKalemleri.islemId))
    .innerJoin(kartlar, eq(kartlar.id, islemler.kartId))
    .leftJoin(policeler, eq(policeler.id, islemKalemleri.policeId))
    .where(eq(islemKalemleri.musteriId, musteriId));
  const tah = await db.select().from(tahsilatlar).where(eq(tahsilatlar.musteriId, musteriId));
  const yontem = { nakit: "Nakit", havale: "Havale/EFT", cek: "Çek", diger: "Diğer" } as const;
  const satirlar: Omit<CariSatir, "bakiye">[] = [
    ...kalemler.map((k) => ({
      tarih: k.tarih,
      aciklama: `${k.tur === "cekim" ? "Kartla çekim" : "İade"}${k.policeNo ? " · Poliçe " + k.policeNo : ""} · ${k.banka} •${k.son4}${
        k.taksitSayisi > 1 ? ` · ${k.taksitSayisi} taksit` : ""
      }${k.aciklama ? " · " + k.aciklama : ""}`,
      borc: k.tur === "cekim" ? k.tutar : 0,
      alacak: k.tur === "iade" ? k.tutar : 0,
      tur: "islem" as const,
      kayitId: k.islemId,
      iptal: k.iptal,
      olusturanId: k.olusturanId,
      olusturma: k.olusturma,
    })),
    ...tah.map((t) => ({
      tarih: t.tarih,
      aciklama: `Tahsilat · ${yontem[t.yontem]}${t.aciklama ? " · " + t.aciklama : ""}`,
      borc: 0,
      alacak: t.tutar,
      tur: "tahsilat" as const,
      kayitId: t.id,
      iptal: t.iptal,
      olusturanId: t.olusturanId,
      olusturma: t.olusturma,
    })),
  ].sort((a, b) => (a.tarih! < b.tarih! ? -1 : a.tarih! > b.tarih! ? 1 : a.olusturma!.getTime() - b.olusturma!.getTime()));
  let bakiye = m.acilisBakiye;
  const sonuc: CariSatir[] = [];
  if (m.acilisBakiye)
    sonuc.push({
      tarih: null,
      aciklama: "Açılış bakiyesi",
      borc: Math.max(m.acilisBakiye, 0),
      alacak: Math.max(-m.acilisBakiye, 0),
      bakiye,
      tur: "acilis",
      kayitId: null,
      iptal: false,
      olusturanId: null,
      olusturma: null,
    });
  for (const s of satirlar) {
    if (!s.iptal) bakiye += s.borc - s.alacak;
    sonuc.push({ ...s, bakiye });
  }
  return sonuc;
}

export async function musteriPoliceleri(db: Db, musteriId: number) {
  return db.select().from(policeler).where(eq(policeler.musteriId, musteriId)).orderBy(desc(policeler.id));
}

export async function policeAra(db: Db, q: string, limit = 20) {
  return db
    .select({ policeNo: policeler.policeNo, musteri: musteriler.ad, brans: policeler.brans })
    .from(policeler)
    .innerJoin(musteriler, eq(musteriler.id, policeler.musteriId))
    .where(or(ilike(policeler.policeNo, `%${q}%`), ilike(musteriler.ad, `%${q}%`)))
    .limit(limit);
}

export async function degisiklikListesi(db: Db, limit = 300) {
  return db
    .select({
      id: degisiklikKaydi.id,
      zaman: degisiklikKaydi.zaman,
      tablo: degisiklikKaydi.tablo,
      kayitId: degisiklikKaydi.kayitId,
      eylem: degisiklikKaydi.eylem,
      eski: degisiklikKaydi.eski,
      yeni: degisiklikKaydi.yeni,
      kullanici: kullanicilar.ad,
    })
    .from(degisiklikKaydi)
    .leftJoin(kullanicilar, eq(kullanicilar.id, degisiklikKaydi.kullaniciId))
    .orderBy(desc(degisiklikKaydi.id))
    .limit(limit);
}
