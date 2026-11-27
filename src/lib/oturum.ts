import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kullanicilar } from "@/db/schema";
import type { Oturum } from "./servis";

export const CEREZ = "oturum";
const SURE_SN = 60 * 60 * 12; // 12 saat

function anahtar() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET en az 32 karakter olmalı");
  return new TextEncoder().encode(s);
}

export async function sifreHashle(sifre: string) {
  if (sifre.length < 8) throw new Error("Şifre en az 8 karakter olmalı.");
  return bcrypt.hash(sifre, 10);
}

export async function sifreDogru(sifre: string, hash: string) {
  return bcrypt.compare(sifre, hash);
}

export async function oturumAc(kullaniciId: number) {
  const token = await new SignJWT({ sub: String(kullaniciId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SURE_SN}s`)
    .sign(anahtar());
  (await cookies()).set(CEREZ, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SURE_SN,
  });
}

export async function oturumKapat() {
  (await cookies()).delete(CEREZ);
}

/** Oturumdaki aktif kullanıcı; yoksa null. Her istekte veritabanından rol ve aktiflik kontrol edilir. */
export async function mevcutKullanici(): Promise<Oturum | null> {
  const token = (await cookies()).get(CEREZ)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, anahtar());
    const [u] = await db()
      .select({ id: kullanicilar.id, ad: kullanicilar.ad, rol: kullanicilar.rol, aktif: kullanicilar.aktif })
      .from(kullanicilar)
      .where(eq(kullanicilar.id, Number(payload.sub)));
    if (!u || !u.aktif) return null;
    return { id: u.id, ad: u.ad, rol: u.rol };
  } catch {
    return null;
  }
}

export async function kullaniciGerekli(): Promise<Oturum> {
  const k = await mevcutKullanici();
  if (!k) redirect("/giris");
  return k;
}

export async function yoneticiGerekli(): Promise<Oturum> {
  const k = await kullaniciGerekli();
  if (k.rol !== "yonetici") redirect("/?hata=" + encodeURIComponent("Bu sayfa için yönetici yetkisi gerekir."));
  return k;
}
