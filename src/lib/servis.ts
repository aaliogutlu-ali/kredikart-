// Kayıt ekleme, değiştirme ve iptal işlemleri. Her yazma işlemi değişiklik kaydına düşer.
import { and, eq, sql } from "drizzle-orm";
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
import { bugun, ilkEkstreTarihi, taksitPlani, type Tarih } from "./hesap";
import { kartOzeti } from "./sorgu";

export type Oturum = { id: number; ad: string; rol: "yonetici" | "calisan" };

export class IsHatasi extends Error {}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function yoneticiGerekli(k: Oturum) {
  if (k.rol !== "yonetici") throw new IsHatasi("Bu işlem için yönetici yetkisi gerekir.");
}

async function kaydet(
  tx: Tx | Db,
  k: Oturum | null,
  tablo: string,
  kayitId: number,
  eylem: string,
  eski: unknown,
  yeni: unknown,
) {
  await tx.insert(degisiklikKaydi).values({
    kullaniciId: k?.id ?? null,
    tablo,
    kayitId,
    eylem,
    eski: eski ?? null,
    yeni: yeni ?? null,
  });
}

function tarihKontrol(t: string, alan = "Tarih"): Tarih {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new IsHatasi(`${alan} geçersiz.`);
  return t;
}

function pozitif(n: number | null | undefined, alan: string): number {
  if (n == null || !Number.isFinite(n) || n <= 0) throw new IsHatasi(`${alan} sıfırdan büyük olmalı.`);
  return n;
}

// ---------- Kullanıcılar ----------

export async function kullaniciEkle(
  db: Db,
  k: Oturum | null,
  g: { ad: string; eposta: string; sifreHash: string; rol: "yonetici" | "calisan" },
) {
  if (k) yoneticiGerekli(k);
  const eposta = g.eposta.trim().toLowerCase();
  if (!g.ad.trim() || !eposta) throw new IsHatasi("Ad ve e-posta zorunlu.");
  const var_ = await db.select({ id: kullanicilar.id }).from(kullanicilar).where(eq(kullanicilar.eposta, eposta));
  if (var_.length) throw new IsHatasi("Bu e-posta ile bir kullanıcı zaten var.");
  return db.transaction(async (tx) => {
    const [u] = await tx
      .insert(kullanicilar)
      .values({ ad: g.ad.trim(), eposta, sifreHash: g.sifreHash, rol: g.rol })
      .returning({ id: kullanicilar.id });
    await kaydet(tx, k, "kullanicilar", u.id, "ekle", null, { ad: g.ad, eposta, rol: g.rol });
    return u.id;
  });
}

export async function kullaniciGuncelle(
  db: Db,
  k: Oturum,
  id: number,
  g: { rol?: "yonetici" | "calisan"; aktif?: boolean; sifreHash?: string },
) {
  yoneticiGerekli(k);
  if (id === k.id && (g.aktif === false || g.rol === "calisan"))
    throw new IsHatasi("Kendi yönetici yetkinizi kaldıramaz veya hesabınızı kapatamazsınız.");
  return db.transaction(async (tx) => {
    const [eski] = await tx.select().from(kullanicilar).where(eq(kullanicilar.id, id));
    if (!eski) throw new IsHatasi("Kullanıcı bulunamadı.");
    await tx.update(kullanicilar).set(g).where(eq(kullanicilar.id, id));
    await kaydet(
      tx,
      k,
      "kullanicilar",
      id,
      "guncelle",
      { rol: eski.rol, aktif: eski.aktif },
      { rol: g.rol, aktif: g.aktif, sifre: g.sifreHash ? "değişti" : undefined },
    );
  });
}

// ---------- Kartlar ----------

export type KartGirdisi = {
  sahipTuru: "sahis" | "sirket";
  sahipAdi: string;
  banka: string;
  kartAdi: string;
  ilk4: string;
  son4: string;
  limit: number;
  kesimGunu: number;
  sonOdemeGunSayisi: number;
  asgariOran: string;
  acilisKullanilmis: number;
  aktif: boolean;
};

function kartKontrol(g: KartGirdisi) {
  if (!g.sahipAdi.trim() || !g.banka.trim()) throw new IsHatasi("Kart sahibi ve banka zorunlu.");
  if (!/^\d{4}$/.test(g.ilk4) || !/^\d{4}$/.test(g.son4)) throw new IsHatasi("İlk 4 ve son 4 hane 4'er rakam olmalı.");
  pozitif(g.limit, "Limit");
  if (!(g.kesimGunu >= 1 && g.kesimGunu <= 31)) throw new IsHatasi("Hesap kesim günü 1-31 arası olmalı.");
  if (!(g.sonOdemeGunSayisi >= 0 && g.sonOdemeGunSayisi <= 40)) throw new IsHatasi("Son ödeme gün sayısı 0-40 arası olmalı.");
  const oran = Number(g.asgariOran);
  if (!(oran >= 0 && oran <= 100)) throw new IsHatasi("Asgari ödeme oranı 0-100 arası olmalı.");
  if (g.acilisKullanilmis < 0) throw new IsHatasi("Açılış kullanılmış limit eksi olamaz.");
}

export async function kartEkle(db: Db, k: Oturum, g: KartGirdisi) {
  yoneticiGerekli(k);
  kartKontrol(g);
  return db.transaction(async (tx) => {
    const [r] = await tx.insert(kartlar).values(g).returning({ id: kartlar.id });
    await kaydet(tx, k, "kartlar", r.id, "ekle", null, g);
    return r.id;
  });
}

export async function kartGuncelle(db: Db, k: Oturum, id: number, g: KartGirdisi) {
  yoneticiGerekli(k);
  kartKontrol(g);
  return db.transaction(async (tx) => {
    const [eski] = await tx.select().from(kartlar).where(eq(kartlar.id, id));
    if (!eski) throw new IsHatasi("Kart bulunamadı.");
    await tx.update(kartlar).set(g).where(eq(kartlar.id, id));
    await kaydet(tx, k, "kartlar", id, "guncelle", eski, g);
  });
}

// ---------- Müşteriler ve poliçeler ----------

export type MusteriGirdisi = {
  ad: string;
  tcknVkn: string;
  telefon: string;
  eposta: string;
  adres: string;
  notlar: string;
  acilisBakiye?: number;
};

function musteriTemizle(g: MusteriGirdisi) {
  if (!g.ad.trim()) throw new IsHatasi("Müşteri adı zorunlu.");
  const tckn = g.tcknVkn.replace(/\s/g, "");
  if (tckn && !/^\d{10,11}$/.test(tckn)) throw new IsHatasi("TCKN 11, VKN 10 rakam olmalı.");
  return { ...g, ad: g.ad.trim(), tcknVkn: tckn || null };
}

export async function musteriEkle(db: Db, k: Oturum, g: MusteriGirdisi) {
  const v = musteriTemizle(g);
  if (v.acilisBakiye && k.rol !== "yonetici") throw new IsHatasi("Açılış bakiyesini sadece yönetici girebilir.");
  if (v.tcknVkn) {
    const [var_] = await db.select({ id: musteriler.id }).from(musteriler).where(eq(musteriler.tcknVkn, v.tcknVkn));
    if (var_) throw new IsHatasi("Bu TCKN/VKN ile kayıtlı bir müşteri zaten var.");
  }
  return db.transaction(async (tx) => {
    const [r] = await tx.insert(musteriler).values(v).returning({ id: musteriler.id });
    await kaydet(tx, k, "musteriler", r.id, "ekle", null, v);
    return r.id;
  });
}

export async function musteriGuncelle(db: Db, k: Oturum, id: number, g: MusteriGirdisi) {
  const v = musteriTemizle(g);
  return db.transaction(async (tx) => {
    const [eski] = await tx.select().from(musteriler).where(eq(musteriler.id, id));
    if (!eski) throw new IsHatasi("Müşteri bulunamadı.");
    if (k.rol !== "yonetici") v.acilisBakiye = eski.acilisBakiye;
    if (v.tcknVkn) {
      const [var_] = await tx
        .select({ id: musteriler.id })
        .from(musteriler)
        .where(and(eq(musteriler.tcknVkn, v.tcknVkn), sql`${musteriler.id} <> ${id}`));
      if (var_) throw new IsHatasi("Bu TCKN/VKN ile kayıtlı başka bir müşteri var.");
    }
    await tx.update(musteriler).set(v).where(eq(musteriler.id, id));
    await kaydet(tx, k, "musteriler", id, "guncelle", eski, v);
  });
}

export type PoliceGirdisi = {
  policeNo: string;
  musteriId: number;
  sigortaSirketi: string;
  brans: string;
  baslangic: string | null;
  bitis: string | null;
  prim: number | null;
};

export async function policeEkle(db: Db, k: Oturum, g: PoliceGirdisi) {
  const policeNo = g.policeNo.trim();
  if (!policeNo) throw new IsHatasi("Poliçe no zorunlu.");
  const [var_] = await db.select({ id: policeler.id }).from(policeler).where(eq(policeler.policeNo, policeNo));
  if (var_) throw new IsHatasi("Bu poliçe no zaten kayıtlı.");
  const v = { ...g, policeNo };
  return db.transaction(async (tx) => {
    const [r] = await tx.insert(policeler).values(v).returning({ id: policeler.id });
    await kaydet(tx, k, "policeler", r.id, "ekle", null, v);
    return r.id;
  });
}

// ---------- İşlemler ----------

export type KalemGirdisi = { policeNo?: string; musteriId?: number; tutar: number };

export type IslemGirdisi = {
  tarih: string;
  kartId: number;
  tur: "cekim" | "iade";
  paraBirimi: string;
  dovizTutar: number | null;
  kur: number | null;
  tutar: number;
  taksitSayisi: number;
  iadeEdilenIslemId?: number | null;
  aciklama: string;
  kalemler: KalemGirdisi[];
  /** Uygulamaya geçişte girilen devam eden taksit (sadece yönetici). */
  acilis?: boolean;
  /** Açılış taksitinde kalan ilk taksitin düşeceği ekstre tarihi. */
  ilkEkstre?: string;
};

/** Kalemlerdeki poliçe no / müşteri bilgisini çözer ve kurallara göre doğrular. */
async function kalemleriCoz(tx: Tx, k: Oturum, kalemler: KalemGirdisi[], toplam: number) {
  if (!kalemler.length) throw new IsHatasi("En az bir kalem (poliçe veya müşteri) girilmeli.");
  const sonuc: { policeId: number | null; musteriId: number; tutar: number }[] = [];
  for (const [i, kl] of kalemler.entries()) {
    pozitif(kl.tutar, `${i + 1}. kalemin tutarı`);
    const no = kl.policeNo?.trim();
    if (no) {
      const [p] = await tx.select().from(policeler).where(eq(policeler.policeNo, no));
      if (!p) throw new IsHatasi(`${no} numaralı poliçe bulunamadı. Önce poliçeyi müşteriye ekleyin.`);
      sonuc.push({ policeId: p.id, musteriId: p.musteriId, tutar: kl.tutar });
    } else {
      if (k.rol !== "yonetici") throw new IsHatasi(`${i + 1}. kalem için poliçe no zorunlu.`);
      if (!kl.musteriId) throw new IsHatasi(`${i + 1}. kalem için poliçe no veya müşteri seçilmeli.`);
      const [m] = await tx.select({ id: musteriler.id }).from(musteriler).where(eq(musteriler.id, kl.musteriId));
      if (!m) throw new IsHatasi(`${i + 1}. kalemdeki müşteri bulunamadı.`);
      sonuc.push({ policeId: null, musteriId: m.id, tutar: kl.tutar });
    }
  }
  const t = sonuc.reduce((s, x) => s + x.tutar, 0);
  if (t !== toplam) throw new IsHatasi("Kalemlerin toplamı işlem tutarına eşit olmalı.");
  return sonuc;
}

/** Bir tutarı mevcut kalemlere oranla dağıtır; kuruş farkı ilk kaleme eklenir. */
function oranlaDagit<T extends { tutar: number }>(kalemler: T[], tutar: number): (T & { pay: number })[] {
  const toplam = kalemler.reduce((s, x) => s + x.tutar, 0);
  const paylar = kalemler.map((x) => Math.floor((x.tutar * tutar) / toplam));
  paylar[0] += tutar - paylar.reduce((s, x) => s + x, 0);
  return kalemler.map((x, i) => ({ ...x, pay: paylar[i] }));
}

export async function islemEkle(db: Db, k: Oturum, g: IslemGirdisi): Promise<{ id: number; uyari?: string }> {
  tarihKontrol(g.tarih);
  pozitif(g.tutar, "Tutar");
  if (g.acilis) {
    yoneticiGerekli(k);
    if (g.tur !== "cekim") throw new IsHatasi("Açılış kaydı sadece çekim olabilir.");
    tarihKontrol(g.ilkEkstre ?? "", "İlk ekstre tarihi");
  }
  if (!Number.isInteger(g.taksitSayisi) || g.taksitSayisi < 1 || g.taksitSayisi > 36)
    throw new IsHatasi("Taksit sayısı 1-36 arası olmalı.");
  if (g.paraBirimi !== "TRY") {
    pozitif(g.dovizTutar, "Döviz tutarı");
    pozitif(g.kur, "Kur");
  }

  const id = await db.transaction(async (tx) => {
    const [kart] = await tx.select().from(kartlar).where(eq(kartlar.id, g.kartId));
    if (!kart) throw new IsHatasi("Kart bulunamadı.");
    if (!kart.aktif) throw new IsHatasi("Bu kart pasif, işlem girilemez.");

    let kalemler: { policeId: number | null; musteriId: number; tutar: number }[] = [];
    let plan;
    if (g.tur === "iade") {
      if (!g.iadeEdilenIslemId) throw new IsHatasi("İade için asıl çekim seçilmeli.");
      const [asil] = await tx.select().from(islemler).where(eq(islemler.id, g.iadeEdilenIslemId));
      if (!asil || asil.tur !== "cekim" || asil.iptal || asil.acilis) throw new IsHatasi("İade edilecek çekim bulunamadı.");
      if (asil.kartId !== g.kartId) throw new IsHatasi("İade, çekimin yapıldığı karta girilmeli.");
      const [{ onceki }] = await tx
        .select({ onceki: sql<string>`coalesce(sum(${islemler.tutar}), 0)` })
        .from(islemler)
        .where(and(eq(islemler.iadeEdilenIslemId, asil.id), eq(islemler.iptal, false)));
      if (Number(onceki) + g.tutar > asil.tutar)
        throw new IsHatasi("İade toplamı asıl çekim tutarını aşamaz.");
      const asilKalemler = await tx.select().from(islemKalemleri).where(eq(islemKalemleri.islemId, asil.id));
      kalemler = oranlaDagit(asilKalemler, g.tutar)
        .filter((x) => x.pay > 0)
        .map((x) => ({ policeId: x.policeId, musteriId: x.musteriId, tutar: x.pay }));
      // İade, girildiği tarihin ekstresinde tek satır eksi tutar olarak görünür.
      plan = taksitPlani(-g.tutar, 1, g.tarih, kart.kesimGunu);
    } else if (g.acilis) {
      plan = taksitPlani(g.tutar, g.taksitSayisi, g.tarih, kart.kesimGunu, g.ilkEkstre);
    } else {
      kalemler = await kalemleriCoz(tx, k, g.kalemler, g.tutar);
      plan = taksitPlani(g.tutar, g.taksitSayisi, g.tarih, kart.kesimGunu);
    }

    const [r] = await tx
      .insert(islemler)
      .values({
        tarih: g.tarih,
        kartId: g.kartId,
        tur: g.tur,
        paraBirimi: g.paraBirimi,
        dovizTutar: g.paraBirimi === "TRY" ? null : g.dovizTutar,
        kur: g.paraBirimi === "TRY" || g.kur == null ? null : String(g.kur),
        tutar: g.tutar,
        taksitSayisi: g.tur === "iade" ? 1 : g.taksitSayisi,
        iadeEdilenIslemId: g.tur === "iade" ? g.iadeEdilenIslemId : null,
        acilis: !!g.acilis,
        aciklama: g.aciklama.trim(),
        olusturanId: k.id,
      })
      .returning({ id: islemler.id });
    if (kalemler.length) await tx.insert(islemKalemleri).values(kalemler.map((x) => ({ ...x, islemId: r.id })));
    await tx.insert(taksitler).values(
      plan.map((t) => ({
        islemId: r.id,
        kartId: g.kartId,
        sira: t.sira,
        toplamSira: plan.length,
        tutar: t.tutar,
        ekstreTarihi: t.ekstreTarihi,
      })),
    );
    await kaydet(tx, k, "islemler", r.id, "ekle", null, { ...g, kalemler });
    return r.id;
  });

  if (g.tur === "cekim" && !g.acilis) {
    const ozet = await kartOzeti(db, g.kartId);
    if (ozet && ozet.kullanilabilir < 0)
      return { id, uyari: "Dikkat: bu işlemle kartın kullanılabilir limiti eksiye düştü." };
  }
  return { id };
}

/** Kaydı iptal etmeye yetkisi var mı? Yönetici her kaydı, çalışan kendi girdiğini aynı gün iptal edebilir. */
function iptalYetkisi(k: Oturum, kayit: { olusturanId: number; olusturma: Date }) {
  if (k.rol === "yonetici") return;
  const ayniGun =
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(kayit.olusturma) === bugun();
  if (kayit.olusturanId !== k.id || !ayniGun)
    throw new IsHatasi("Sadece kendi girdiğiniz kaydı aynı gün içinde iptal edebilirsiniz.");
}

function iptalDegerleri(k: Oturum, neden: string) {
  if (!neden.trim()) throw new IsHatasi("İptal nedeni yazılmalı.");
  return { iptal: true, iptalEdenId: k.id, iptalZamani: new Date(), iptalNedeni: neden.trim() };
}

export async function islemIptal(db: Db, k: Oturum, id: number, neden: string) {
  const v = iptalDegerleri(k, neden);
  return db.transaction(async (tx) => {
    const [x] = await tx.select().from(islemler).where(eq(islemler.id, id));
    if (!x || x.iptal) throw new IsHatasi("İşlem bulunamadı veya zaten iptal.");
    iptalYetkisi(k, x);
    if (x.tur === "cekim") {
      const iadeler = await tx
        .select({ id: islemler.id })
        .from(islemler)
        .where(and(eq(islemler.iadeEdilenIslemId, id), eq(islemler.iptal, false)));
      if (iadeler.length) throw new IsHatasi("Bu çekime bağlı iadeler var; önce onları iptal edin.");
    }
    await tx.update(islemler).set(v).where(eq(islemler.id, id));
    await kaydet(tx, k, "islemler", id, "iptal", { iptal: false }, { iptal: true, neden: v.iptalNedeni });
  });
}

// ---------- Kart ödemeleri ----------

export type OdemeGirdisi = {
  kartId: number;
  tur: "serbest" | "ekstre" | "asgari";
  ekstreTarihi: string | null;
  tarih: string;
  tutar: number;
  aciklama: string;
};

export async function odemeEkle(db: Db, k: Oturum, g: OdemeGirdisi) {
  tarihKontrol(g.tarih);
  pozitif(g.tutar, "Tutar");
  if (g.tur !== "serbest") tarihKontrol(g.ekstreTarihi ?? "", "Ekstre dönemi");
  const v = { ...g, ekstreTarihi: g.tur === "serbest" ? null : g.ekstreTarihi, aciklama: g.aciklama.trim(), olusturanId: k.id };
  return db.transaction(async (tx) => {
    const [kart] = await tx.select({ id: kartlar.id }).from(kartlar).where(eq(kartlar.id, g.kartId));
    if (!kart) throw new IsHatasi("Kart bulunamadı.");
    const [r] = await tx.insert(kartOdemeleri).values(v).returning({ id: kartOdemeleri.id });
    await kaydet(tx, k, "kart_odemeleri", r.id, "ekle", null, v);
    return r.id;
  });
}

export async function odemeIptal(db: Db, k: Oturum, id: number, neden: string) {
  const v = iptalDegerleri(k, neden);
  return db.transaction(async (tx) => {
    const [x] = await tx.select().from(kartOdemeleri).where(eq(kartOdemeleri.id, id));
    if (!x || x.iptal) throw new IsHatasi("Ödeme bulunamadı veya zaten iptal.");
    iptalYetkisi(k, x);
    await tx.update(kartOdemeleri).set(v).where(eq(kartOdemeleri.id, id));
    await kaydet(tx, k, "kart_odemeleri", id, "iptal", { iptal: false }, { iptal: true, neden: v.iptalNedeni });
  });
}

// ---------- Müşteri tahsilatları ----------

export type TahsilatGirdisi = {
  musteriId: number;
  tarih: string;
  tutar: number;
  yontem: "nakit" | "havale" | "cek" | "diger";
  aciklama: string;
};

export async function tahsilatEkle(db: Db, k: Oturum, g: TahsilatGirdisi) {
  tarihKontrol(g.tarih);
  pozitif(g.tutar, "Tutar");
  const v = { ...g, aciklama: g.aciklama.trim(), olusturanId: k.id };
  return db.transaction(async (tx) => {
    const [m] = await tx.select({ id: musteriler.id }).from(musteriler).where(eq(musteriler.id, g.musteriId));
    if (!m) throw new IsHatasi("Müşteri bulunamadı.");
    const [r] = await tx.insert(tahsilatlar).values(v).returning({ id: tahsilatlar.id });
    await kaydet(tx, k, "tahsilatlar", r.id, "ekle", null, v);
    return r.id;
  });
}

export async function tahsilatIptal(db: Db, k: Oturum, id: number, neden: string) {
  const v = iptalDegerleri(k, neden);
  return db.transaction(async (tx) => {
    const [x] = await tx.select().from(tahsilatlar).where(eq(tahsilatlar.id, id));
    if (!x || x.iptal) throw new IsHatasi("Tahsilat bulunamadı veya zaten iptal.");
    iptalYetkisi(k, x);
    await tx.update(tahsilatlar).set(v).where(eq(tahsilatlar.id, id));
    await kaydet(tx, k, "tahsilatlar", id, "iptal", { iptal: false }, { iptal: true, neden: v.iptalNedeni });
  });
}
