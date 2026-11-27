import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Tutarlar kuruş cinsinden tam sayıdır.
const kurus = (ad: string) => bigint(ad, { mode: "number" });

export const rolEnum = pgEnum("rol", ["yonetici", "calisan"]);
export const sahipTuruEnum = pgEnum("sahip_turu", ["sahis", "sirket"]);
export const islemTuruEnum = pgEnum("islem_turu", ["cekim", "iade"]);
export const odemeTuruEnum = pgEnum("odeme_turu", ["serbest", "ekstre", "asgari"]);
export const tahsilatYontemiEnum = pgEnum("tahsilat_yontemi", ["nakit", "havale", "cek", "diger"]);

const iptalAlanlari = {
  iptal: boolean("iptal").notNull().default(false),
  iptalEdenId: integer("iptal_eden_id"),
  iptalZamani: timestamp("iptal_zamani", { withTimezone: true }),
  iptalNedeni: text("iptal_nedeni"),
};

export const kullanicilar = pgTable("kullanicilar", {
  id: serial("id").primaryKey(),
  ad: text("ad").notNull(),
  eposta: text("eposta").notNull().unique(),
  sifreHash: text("sifre_hash").notNull(),
  rol: rolEnum("rol").notNull().default("calisan"),
  aktif: boolean("aktif").notNull().default(true),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

export const kartlar = pgTable("kartlar", {
  id: serial("id").primaryKey(),
  sahipTuru: sahipTuruEnum("sahip_turu").notNull(),
  sahipAdi: text("sahip_adi").notNull(),
  banka: text("banka").notNull(),
  kartAdi: text("kart_adi").notNull().default(""),
  ilk4: text("ilk4").notNull(),
  son4: text("son4").notNull(),
  limit: kurus("limit_tutari").notNull(),
  kesimGunu: integer("kesim_gunu").notNull(),
  sonOdemeGunSayisi: integer("son_odeme_gun_sayisi").notNull().default(10),
  asgariOran: numeric("asgari_oran", { precision: 5, scale: 2 }).notNull().default("20"),
  acilisKullanilmis: kurus("acilis_kullanilmis").notNull().default(0),
  aktif: boolean("aktif").notNull().default(true),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

export const musteriler = pgTable(
  "musteriler",
  {
    id: serial("id").primaryKey(),
    ad: text("ad").notNull(),
    tcknVkn: text("tckn_vkn"),
    telefon: text("telefon").notNull().default(""),
    eposta: text("eposta").notNull().default(""),
    adres: text("adres").notNull().default(""),
    notlar: text("notlar").notNull().default(""),
    acilisBakiye: kurus("acilis_bakiye").notNull().default(0),
    olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("musteriler_tckn_vkn_idx").on(t.tcknVkn), index("musteriler_ad_idx").on(t.ad)],
);

export const policeler = pgTable(
  "policeler",
  {
    id: serial("id").primaryKey(),
    policeNo: text("police_no").notNull().unique(),
    musteriId: integer("musteri_id")
      .notNull()
      .references(() => musteriler.id),
    sigortaSirketi: text("sigorta_sirketi").notNull().default(""),
    brans: text("brans").notNull().default(""),
    baslangic: date("baslangic", { mode: "string" }),
    bitis: date("bitis", { mode: "string" }),
    prim: kurus("prim"),
    olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("policeler_musteri_idx").on(t.musteriId)],
);

export const islemler = pgTable(
  "islemler",
  {
    id: serial("id").primaryKey(),
    tarih: date("tarih", { mode: "string" }).notNull(),
    kartId: integer("kart_id")
      .notNull()
      .references(() => kartlar.id),
    tur: islemTuruEnum("tur").notNull(),
    paraBirimi: text("para_birimi").notNull().default("TRY"),
    dovizTutar: kurus("doviz_tutar"),
    kur: numeric("kur", { precision: 12, scale: 4 }),
    tutar: kurus("tutar").notNull(),
    taksitSayisi: integer("taksit_sayisi").notNull().default(1),
    iadeEdilenIslemId: integer("iade_edilen_islem_id"),
    // Uygulamaya geçişte girilen devam eden taksit: limiti düşürmez, sadece ekstrelere yerleşir.
    acilis: boolean("acilis").notNull().default(false),
    aciklama: text("aciklama").notNull().default(""),
    olusturanId: integer("olusturan_id")
      .notNull()
      .references(() => kullanicilar.id),
    olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
    ...iptalAlanlari,
  },
  (t) => [index("islemler_kart_idx").on(t.kartId), index("islemler_tarih_idx").on(t.tarih)],
);

export const islemKalemleri = pgTable(
  "islem_kalemleri",
  {
    id: serial("id").primaryKey(),
    islemId: integer("islem_id")
      .notNull()
      .references(() => islemler.id),
    policeId: integer("police_id").references(() => policeler.id),
    musteriId: integer("musteri_id")
      .notNull()
      .references(() => musteriler.id),
    tutar: kurus("tutar").notNull(),
  },
  (t) => [index("kalem_islem_idx").on(t.islemId), index("kalem_musteri_idx").on(t.musteriId)],
);

export const taksitler = pgTable(
  "taksitler",
  {
    id: serial("id").primaryKey(),
    islemId: integer("islem_id")
      .notNull()
      .references(() => islemler.id),
    kartId: integer("kart_id")
      .notNull()
      .references(() => kartlar.id),
    sira: integer("sira").notNull(),
    toplamSira: integer("toplam_sira").notNull(),
    tutar: kurus("tutar").notNull(),
    ekstreTarihi: date("ekstre_tarihi", { mode: "string" }).notNull(),
  },
  (t) => [index("taksit_kart_ekstre_idx").on(t.kartId, t.ekstreTarihi), index("taksit_islem_idx").on(t.islemId)],
);

export const kartOdemeleri = pgTable(
  "kart_odemeleri",
  {
    id: serial("id").primaryKey(),
    kartId: integer("kart_id")
      .notNull()
      .references(() => kartlar.id),
    tur: odemeTuruEnum("tur").notNull(),
    ekstreTarihi: date("ekstre_tarihi", { mode: "string" }),
    tarih: date("tarih", { mode: "string" }).notNull(),
    tutar: kurus("tutar").notNull(),
    aciklama: text("aciklama").notNull().default(""),
    olusturanId: integer("olusturan_id")
      .notNull()
      .references(() => kullanicilar.id),
    olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
    ...iptalAlanlari,
  },
  (t) => [index("odeme_kart_idx").on(t.kartId)],
);

export const tahsilatlar = pgTable(
  "tahsilatlar",
  {
    id: serial("id").primaryKey(),
    musteriId: integer("musteri_id")
      .notNull()
      .references(() => musteriler.id),
    tarih: date("tarih", { mode: "string" }).notNull(),
    tutar: kurus("tutar").notNull(),
    yontem: tahsilatYontemiEnum("yontem").notNull(),
    aciklama: text("aciklama").notNull().default(""),
    olusturanId: integer("olusturan_id")
      .notNull()
      .references(() => kullanicilar.id),
    olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
    ...iptalAlanlari,
  },
  (t) => [index("tahsilat_musteri_idx").on(t.musteriId)],
);

export const degisiklikKaydi = pgTable(
  "degisiklik_kaydi",
  {
    id: serial("id").primaryKey(),
    kullaniciId: integer("kullanici_id"),
    zaman: timestamp("zaman", { withTimezone: true }).notNull().defaultNow(),
    tablo: text("tablo").notNull(),
    kayitId: integer("kayit_id").notNull(),
    eylem: text("eylem").notNull(),
    eski: jsonb("eski"),
    yeni: jsonb("yeni"),
  },
  (t) => [index("kayit_zaman_idx").on(t.zaman)],
);
