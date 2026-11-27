import { describe, expect, it } from "vitest";
import {
  asgariTutar,
  ekstreKaydir,
  ilkEkstreTarihi,
  kesimTarihi,
  limitHesapla,
  sonOdemeTarihi,
  taksitPlani,
} from "@/lib/hesap";
import { dovizdenTL, kurOku, tutarOku, tutarYaz } from "@/lib/para";

describe("ekstre tarihleri", () => {
  it("kesim gününe eşit veya önceki işlem bu ayın ekstresine düşer", () => {
    expect(ilkEkstreTarihi("2026-11-15", 15)).toBe("2026-11-15");
    expect(ilkEkstreTarihi("2026-11-01", 15)).toBe("2026-11-15");
  });
  it("kesim gününden sonraki işlem gelecek ayın ekstresine düşer", () => {
    expect(ilkEkstreTarihi("2026-11-20", 15)).toBe("2026-12-15");
    expect(ilkEkstreTarihi("2026-12-20", 15)).toBe("2027-01-15");
  });
  it("ayda olmayan kesim günü ayın son günü sayılır", () => {
    expect(kesimTarihi(2026, 2, 31)).toBe("2026-02-28");
    expect(kesimTarihi(2028, 2, 30)).toBe("2028-02-29");
    expect(ekstreKaydir("2026-02-28", 1, 31)).toBe("2026-03-31");
  });
  it("son ödeme tarihi kesimden gün sayısı kadar sonradır", () => {
    expect(sonOdemeTarihi("2026-12-15", 10)).toBe("2026-12-25");
    expect(sonOdemeTarihi("2026-12-28", 10)).toBe("2027-01-07");
  });
});

describe("taksit planı", () => {
  it("dokümandaki örnek: 12.000 TL 3 taksit, 20 Kasım, kesim 15", () => {
    expect(taksitPlani(1_200_000, 3, "2026-11-20", 15)).toEqual([
      { sira: 1, tutar: 400_000, ekstreTarihi: "2026-12-15" },
      { sira: 2, tutar: 400_000, ekstreTarihi: "2027-01-15" },
      { sira: 3, tutar: 400_000, ekstreTarihi: "2027-02-15" },
    ]);
  });
  it("kuruş farkı ilk taksite eklenir", () => {
    const p = taksitPlani(10_000, 3, "2026-01-01", 10);
    expect(p.map((t) => t.tutar)).toEqual([3334, 3333, 3333]);
    expect(p.reduce((s, t) => s + t.tutar, 0)).toBe(10_000);
  });
  it("verilen ilk ekstreden başlar", () => {
    const p = taksitPlani(20_000, 2, "2026-01-01", 10, "2026-12-10");
    expect(p.map((t) => t.ekstreTarihi)).toEqual(["2026-12-10", "2027-01-10"]);
  });
});

describe("limit", () => {
  it("dokümandaki örnek senaryo", () => {
    const base = { limit: 10_000_000, acilisKullanilmis: 0, iadeler: 0 };
    expect(limitHesapla({ ...base, cekimler: 1_200_000, odemeler: 0 }).kullanilabilir).toBe(8_800_000);
    expect(limitHesapla({ ...base, cekimler: 1_200_000, odemeler: 400_000 }).kullanilabilir).toBe(9_200_000);
  });
  it("fazla ödeme limiti aşmaz, artı bakiye olur", () => {
    const r = limitHesapla({ limit: 100_000, acilisKullanilmis: 0, cekimler: 10_000, iadeler: 0, odemeler: 15_000 });
    expect(r).toEqual({ kullanilan: 0, kullanilabilir: 100_000, artiBakiye: 5_000 });
  });
  it("açılış kullanılmış limit ve iade hesaba katılır", () => {
    const r = limitHesapla({ limit: 100_000, acilisKullanilmis: 30_000, cekimler: 20_000, iadeler: 5_000, odemeler: 0 });
    expect(r.kullanilabilir).toBe(55_000);
  });
  it("asgari ödeme yukarı yuvarlanır", () => {
    expect(asgariTutar(400_001, 20)).toBe(80_001);
    expect(asgariTutar(0, 20)).toBe(0);
  });
});

describe("para", () => {
  it("Türkçe tutar girdilerini okur", () => {
    expect(tutarOku("12.345,67")).toBe(1_234_567);
    expect(tutarOku("12345,6")).toBe(1_234_560);
    expect(tutarOku("12345.67")).toBe(1_234_567);
    expect(tutarOku("12.345")).toBe(1_234_500);
    expect(tutarOku("1.234.567")).toBe(123_456_700);
    expect(tutarOku("abc")).toBeNull();
    expect(tutarOku("1,234")).toBeNull();
  });
  it("tutar yazar", () => {
    expect(tutarYaz(1_234_567)).toBe("12.345,67");
  });
  it("döviz çevirir", () => {
    expect(kurOku("42,1234")).toBe(42.1234);
    expect(dovizdenTL(10_000, 42.1234)).toBe(421_234);
  });
});
