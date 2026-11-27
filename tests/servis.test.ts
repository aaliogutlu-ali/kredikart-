import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { bugun, gunEkle } from "@/lib/hesap";
import {
  islemEkle,
  islemIptal,
  kartEkle,
  kullaniciEkle,
  musteriEkle,
  odemeEkle,
  policeEkle,
  tahsilatEkle,
  type Oturum,
} from "@/lib/servis";
import { degisiklikListesi, ekstreDetayi, islemDetayi, islemListesi, kartEkstreleri, kartOzeti, kartOzetleri, musteriBakiyesi, musteriEkstresi, musteriListesi } from "@/lib/sorgu";

let db: Db;
let yon: Oturum;
let cal: Oturum;
let kartId: number;
let ali: number;
let ayse: number;

const kart = {
  sahipTuru: "sirket" as const,
  sahipAdi: "Örnek Sigorta Ltd.",
  banka: "X Bankası",
  kartAdi: "Bonus",
  ilk4: "5400",
  son4: "1234",
  limit: 10_000_000,
  kesimGunu: 15,
  sonOdemeGunSayisi: 10,
  asgariOran: "20",
  acilisKullanilmis: 0,
  aktif: true,
};

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: "./drizzle" });
  const yId = await kullaniciEkle(db, null, { ad: "Yönetici", eposta: "y@ornek.com", sifreHash: "x", rol: "yonetici" });
  yon = { id: yId, ad: "Yönetici", rol: "yonetici" };
  const cId = await kullaniciEkle(db, yon, { ad: "Çalışan", eposta: "c@ornek.com", sifreHash: "x", rol: "calisan" });
  cal = { id: cId, ad: "Çalışan", rol: "calisan" };
  kartId = await kartEkle(db, yon, kart);
  const bos = { tcknVkn: "", telefon: "", eposta: "", adres: "", notlar: "" };
  ali = await musteriEkle(db, cal, { ...bos, ad: "Ali Veli" });
  ayse = await musteriEkle(db, cal, { ...bos, ad: "Ayşe Veli" });
  const p = { sigortaSirketi: "A Sigorta", brans: "Kasko", baslangic: null, bitis: null, prim: null };
  await policeEkle(db, cal, { ...p, policeNo: "K-1", musteriId: ali });
  await policeEkle(db, cal, { ...p, policeNo: "T-2", musteriId: ayse });
});

const temel = { kartId: 0, paraBirimi: "TRY", dovizTutar: null, kur: null, aciklama: "" };

describe("işlem ve limit", () => {
  it("çalışan kart ekleyemez", async () => {
    await expect(kartEkle(db, cal, kart)).rejects.toThrow("yönetici");
  });

  it("çalışan poliçesiz kalem giremez, yönetici girebilir", async () => {
    const g = { ...temel, kartId, tarih: bugun(), tur: "cekim" as const, tutar: 10_000, taksitSayisi: 1 };
    await expect(islemEkle(db, cal, { ...g, kalemler: [{ musteriId: ali, tutar: 10_000 }] })).rejects.toThrow("poliçe no zorunlu");
    const r = await islemEkle(db, yon, { ...g, kalemler: [{ musteriId: ali, tutar: 10_000 }] });
    await islemIptal(db, yon, r.id, "deneme");
  });

  it("kalem toplamı tutara eşit olmalı", async () => {
    const g = { ...temel, kartId, tarih: bugun(), tur: "cekim" as const, tutar: 10_000, taksitSayisi: 1 };
    await expect(islemEkle(db, cal, { ...g, kalemler: [{ policeNo: "K-1", tutar: 9_000 }] })).rejects.toThrow("toplamı");
  });

  it("çok poliçeli taksitli çekim limiti ve iki müşterinin carisini değiştirir", async () => {
    const r = await islemEkle(db, cal, {
      ...temel,
      kartId,
      tarih: "2026-11-20",
      tur: "cekim",
      tutar: 1_200_000,
      taksitSayisi: 3,
      kalemler: [
        { policeNo: "K-1", tutar: 800_000 },
        { policeNo: "T-2", tutar: 400_000 },
      ],
    });
    expect(r.uyari).toBeUndefined();
    expect((await kartOzeti(db, kartId))!.kullanilabilir).toBe(8_800_000);
    expect(await musteriBakiyesi(db, ali)).toBe(800_000);
    expect(await musteriBakiyesi(db, ayse)).toBe(400_000);
  });

  it("tahsilat cariyi düşürür, limiti değiştirmez", async () => {
    await tahsilatEkle(db, cal, { musteriId: ali, tarih: "2026-12-01", tutar: 500_000, yontem: "havale", aciklama: "" });
    expect(await musteriBakiyesi(db, ali)).toBe(300_000);
    expect((await kartOzeti(db, kartId))!.kullanilabilir).toBe(8_800_000);
    const ekstre = await musteriEkstresi(db, ali);
    expect(ekstre.at(-1)!.bakiye).toBe(300_000);
  });

  it("kart ödemesi limiti geri açar ve ekstreye bağlanır", async () => {
    await odemeEkle(db, cal, { kartId, tur: "ekstre", ekstreTarihi: "2026-12-15", tarih: "2026-12-24", tutar: 400_000, aciklama: "" });
    expect((await kartOzeti(db, kartId))!.kullanilabilir).toBe(9_200_000);
    const [k] = await db.select().from(schema.kartlar);
    const e = await kartEkstreleri(db, k);
    const aralik = e.find((x) => x.ekstreTarihi === "2026-12-15")!;
    expect(aralik).toMatchObject({ borc: 400_000, odenen: 400_000, kalan: 0, asgari: 80_000, sonOdeme: "2026-12-25" });
    expect(e.map((x) => x.ekstreTarihi)).toEqual(["2027-02-15", "2027-01-15", "2026-12-15"]);
  });

  it("iade limiti açar, cariden oranla düşer, ekstrede eksi görünür", async () => {
    const cekim = (await db.select().from(schema.islemler)).find((x) => x.tutar === 1_200_000)!;
    await islemEkle(db, cal, {
      ...temel,
      kartId,
      tarih: "2026-12-05",
      tur: "iade",
      tutar: 300_000,
      taksitSayisi: 1,
      iadeEdilenIslemId: cekim.id,
      kalemler: [],
    });
    expect((await kartOzeti(db, kartId))!.kullanilabilir).toBe(9_500_000);
    expect(await musteriBakiyesi(db, ali)).toBe(100_000);
    expect(await musteriBakiyesi(db, ayse)).toBe(300_000);
    await expect(
      islemEkle(db, cal, { ...temel, kartId, tarih: "2026-12-06", tur: "iade", tutar: 1_000_000, taksitSayisi: 1, iadeEdilenIslemId: cekim.id, kalemler: [] }),
    ).rejects.toThrow("aşamaz");
  });

  it("açılış taksiti limiti düşürmez, ekstreye yerleşir; çalışan giremez", async () => {
    const g = { ...temel, kartId, tarih: "2026-10-01", tur: "cekim" as const, tutar: 300_000, taksitSayisi: 3, acilis: true, ilkEkstre: "2027-01-15", kalemler: [] };
    await expect(islemEkle(db, cal, g)).rejects.toThrow("yönetici");
    const once = (await kartOzeti(db, kartId))!.kullanilabilir;
    await islemEkle(db, yon, g);
    expect((await kartOzeti(db, kartId))!.kullanilabilir).toBe(once);
    const [k] = await db.select().from(schema.kartlar);
    const ocak = (await kartEkstreleri(db, k)).find((x) => x.ekstreTarihi === "2027-01-15")!;
    expect(ocak.borc).toBe(500_000);
  });

  it("çalışan başkasının kaydını iptal edemez; iptal edilen kayıt hesaba katılmaz", async () => {
    const r = await islemEkle(db, yon, { ...temel, kartId, tarih: bugun(), tur: "cekim", tutar: 50_000, taksitSayisi: 1, kalemler: [{ policeNo: "K-1", tutar: 50_000 }] });
    await expect(islemIptal(db, cal, r.id, "yanlış")).rejects.toThrow("kendi");
    const once = await musteriBakiyesi(db, ali);
    await islemIptal(db, yon, r.id, "yanlış");
    expect(await musteriBakiyesi(db, ali)).toBe(once - 50_000);
  });

  it("limit aşılınca uyarı döner", async () => {
    const r = await islemEkle(db, yon, { ...temel, kartId, tarih: gunEkle(bugun(), 0), tur: "cekim", tutar: 20_000_000, taksitSayisi: 1, kalemler: [{ policeNo: "K-1", tutar: 20_000_000 }] });
    expect(r.uyari).toContain("eksiye");
    await islemIptal(db, yon, r.id, "deneme");
  });

  it("liste sorguları çalışır", async () => {
    const liste = await islemListesi(db, { musteriId: ali });
    expect(liste.length).toBeGreaterThan(0);
    expect(liste.find((x) => x.tutar === 1_200_000)!.kalemOzeti).toContain("K-1");
    expect((await musteriListesi(db, "K-1")).map((x) => x.ad)).toEqual(["Ali Veli"]);
    expect((await ekstreDetayi(db, kartId, "2026-12-15")).length).toBeGreaterThan(0);
    expect((await islemDetayi(db, liste[0].id))!.kalemler.length).toBeGreaterThan(0);
    expect((await kartOzetleri(db)).length).toBe(1);
    expect((await degisiklikListesi(db)).length).toBeGreaterThan(5);
  });
});
