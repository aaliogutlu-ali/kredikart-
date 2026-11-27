CREATE TYPE "public"."islem_turu" AS ENUM('cekim', 'iade');--> statement-breakpoint
CREATE TYPE "public"."odeme_turu" AS ENUM('serbest', 'ekstre', 'asgari');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('yonetici', 'calisan');--> statement-breakpoint
CREATE TYPE "public"."sahip_turu" AS ENUM('sahis', 'sirket');--> statement-breakpoint
CREATE TYPE "public"."tahsilat_yontemi" AS ENUM('nakit', 'havale', 'cek', 'diger');--> statement-breakpoint
CREATE TABLE "degisiklik_kaydi" (
	"id" serial PRIMARY KEY NOT NULL,
	"kullanici_id" integer,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"tablo" text NOT NULL,
	"kayit_id" integer NOT NULL,
	"eylem" text NOT NULL,
	"eski" jsonb,
	"yeni" jsonb
);
--> statement-breakpoint
CREATE TABLE "islem_kalemleri" (
	"id" serial PRIMARY KEY NOT NULL,
	"islem_id" integer NOT NULL,
	"police_id" integer,
	"musteri_id" integer NOT NULL,
	"tutar" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "islemler" (
	"id" serial PRIMARY KEY NOT NULL,
	"tarih" date NOT NULL,
	"kart_id" integer NOT NULL,
	"tur" "islem_turu" NOT NULL,
	"para_birimi" text DEFAULT 'TRY' NOT NULL,
	"doviz_tutar" bigint,
	"kur" numeric(12, 4),
	"tutar" bigint NOT NULL,
	"taksit_sayisi" integer DEFAULT 1 NOT NULL,
	"iade_edilen_islem_id" integer,
	"acilis" boolean DEFAULT false NOT NULL,
	"aciklama" text DEFAULT '' NOT NULL,
	"olusturan_id" integer NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"iptal" boolean DEFAULT false NOT NULL,
	"iptal_eden_id" integer,
	"iptal_zamani" timestamp with time zone,
	"iptal_nedeni" text
);
--> statement-breakpoint
CREATE TABLE "kart_odemeleri" (
	"id" serial PRIMARY KEY NOT NULL,
	"kart_id" integer NOT NULL,
	"tur" "odeme_turu" NOT NULL,
	"ekstre_tarihi" date,
	"tarih" date NOT NULL,
	"tutar" bigint NOT NULL,
	"aciklama" text DEFAULT '' NOT NULL,
	"olusturan_id" integer NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"iptal" boolean DEFAULT false NOT NULL,
	"iptal_eden_id" integer,
	"iptal_zamani" timestamp with time zone,
	"iptal_nedeni" text
);
--> statement-breakpoint
CREATE TABLE "kartlar" (
	"id" serial PRIMARY KEY NOT NULL,
	"sahip_turu" "sahip_turu" NOT NULL,
	"sahip_adi" text NOT NULL,
	"banka" text NOT NULL,
	"kart_adi" text DEFAULT '' NOT NULL,
	"ilk4" text NOT NULL,
	"son4" text NOT NULL,
	"limit_tutari" bigint NOT NULL,
	"kesim_gunu" integer NOT NULL,
	"son_odeme_gun_sayisi" integer DEFAULT 10 NOT NULL,
	"asgari_oran" numeric(5, 2) DEFAULT '20' NOT NULL,
	"acilis_kullanilmis" bigint DEFAULT 0 NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kullanicilar" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"eposta" text NOT NULL,
	"sifre_hash" text NOT NULL,
	"rol" "rol" DEFAULT 'calisan' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kullanicilar_eposta_unique" UNIQUE("eposta")
);
--> statement-breakpoint
CREATE TABLE "musteriler" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"tckn_vkn" text,
	"telefon" text DEFAULT '' NOT NULL,
	"eposta" text DEFAULT '' NOT NULL,
	"adres" text DEFAULT '' NOT NULL,
	"notlar" text DEFAULT '' NOT NULL,
	"acilis_bakiye" bigint DEFAULT 0 NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policeler" (
	"id" serial PRIMARY KEY NOT NULL,
	"police_no" text NOT NULL,
	"musteri_id" integer NOT NULL,
	"sigorta_sirketi" text DEFAULT '' NOT NULL,
	"brans" text DEFAULT '' NOT NULL,
	"baslangic" date,
	"bitis" date,
	"prim" bigint,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policeler_police_no_unique" UNIQUE("police_no")
);
--> statement-breakpoint
CREATE TABLE "tahsilatlar" (
	"id" serial PRIMARY KEY NOT NULL,
	"musteri_id" integer NOT NULL,
	"tarih" date NOT NULL,
	"tutar" bigint NOT NULL,
	"yontem" "tahsilat_yontemi" NOT NULL,
	"aciklama" text DEFAULT '' NOT NULL,
	"olusturan_id" integer NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"iptal" boolean DEFAULT false NOT NULL,
	"iptal_eden_id" integer,
	"iptal_zamani" timestamp with time zone,
	"iptal_nedeni" text
);
--> statement-breakpoint
CREATE TABLE "taksitler" (
	"id" serial PRIMARY KEY NOT NULL,
	"islem_id" integer NOT NULL,
	"kart_id" integer NOT NULL,
	"sira" integer NOT NULL,
	"toplam_sira" integer NOT NULL,
	"tutar" bigint NOT NULL,
	"ekstre_tarihi" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "islem_kalemleri" ADD CONSTRAINT "islem_kalemleri_islem_id_islemler_id_fk" FOREIGN KEY ("islem_id") REFERENCES "public"."islemler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "islem_kalemleri" ADD CONSTRAINT "islem_kalemleri_police_id_policeler_id_fk" FOREIGN KEY ("police_id") REFERENCES "public"."policeler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "islem_kalemleri" ADD CONSTRAINT "islem_kalemleri_musteri_id_musteriler_id_fk" FOREIGN KEY ("musteri_id") REFERENCES "public"."musteriler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "islemler" ADD CONSTRAINT "islemler_kart_id_kartlar_id_fk" FOREIGN KEY ("kart_id") REFERENCES "public"."kartlar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "islemler" ADD CONSTRAINT "islemler_olusturan_id_kullanicilar_id_fk" FOREIGN KEY ("olusturan_id") REFERENCES "public"."kullanicilar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kart_odemeleri" ADD CONSTRAINT "kart_odemeleri_kart_id_kartlar_id_fk" FOREIGN KEY ("kart_id") REFERENCES "public"."kartlar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kart_odemeleri" ADD CONSTRAINT "kart_odemeleri_olusturan_id_kullanicilar_id_fk" FOREIGN KEY ("olusturan_id") REFERENCES "public"."kullanicilar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policeler" ADD CONSTRAINT "policeler_musteri_id_musteriler_id_fk" FOREIGN KEY ("musteri_id") REFERENCES "public"."musteriler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahsilatlar" ADD CONSTRAINT "tahsilatlar_musteri_id_musteriler_id_fk" FOREIGN KEY ("musteri_id") REFERENCES "public"."musteriler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahsilatlar" ADD CONSTRAINT "tahsilatlar_olusturan_id_kullanicilar_id_fk" FOREIGN KEY ("olusturan_id") REFERENCES "public"."kullanicilar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taksitler" ADD CONSTRAINT "taksitler_islem_id_islemler_id_fk" FOREIGN KEY ("islem_id") REFERENCES "public"."islemler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taksitler" ADD CONSTRAINT "taksitler_kart_id_kartlar_id_fk" FOREIGN KEY ("kart_id") REFERENCES "public"."kartlar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kayit_zaman_idx" ON "degisiklik_kaydi" USING btree ("zaman");--> statement-breakpoint
CREATE INDEX "kalem_islem_idx" ON "islem_kalemleri" USING btree ("islem_id");--> statement-breakpoint
CREATE INDEX "kalem_musteri_idx" ON "islem_kalemleri" USING btree ("musteri_id");--> statement-breakpoint
CREATE INDEX "islemler_kart_idx" ON "islemler" USING btree ("kart_id");--> statement-breakpoint
CREATE INDEX "islemler_tarih_idx" ON "islemler" USING btree ("tarih");--> statement-breakpoint
CREATE INDEX "odeme_kart_idx" ON "kart_odemeleri" USING btree ("kart_id");--> statement-breakpoint
CREATE UNIQUE INDEX "musteriler_tckn_vkn_idx" ON "musteriler" USING btree ("tckn_vkn");--> statement-breakpoint
CREATE INDEX "musteriler_ad_idx" ON "musteriler" USING btree ("ad");--> statement-breakpoint
CREATE INDEX "policeler_musteri_idx" ON "policeler" USING btree ("musteri_id");--> statement-breakpoint
CREATE INDEX "tahsilat_musteri_idx" ON "tahsilatlar" USING btree ("musteri_id");--> statement-breakpoint
CREATE INDEX "taksit_kart_ekstre_idx" ON "taksitler" USING btree ("kart_id","ekstre_tarihi");--> statement-breakpoint
CREATE INDEX "taksit_islem_idx" ON "taksitler" USING btree ("islem_id");