import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Bildirim } from "@/components/Bildirim";
import { KartFormu } from "@/components/KartFormu";
import { db } from "@/db";
import { kartlar } from "@/db/schema";
import { calistir } from "@/lib/eylem";
import { kartFormunuOku } from "@/lib/kartForm";
import { yoneticiGerekli } from "@/lib/oturum";
import { kartGuncelle } from "@/lib/servis";
import type { Params, SP } from "@/lib/tip";

export default async function KartDuzenle({ params, searchParams }: { params: Params<"id">; searchParams: SP }) {
  await yoneticiGerekli();
  const id = Number((await params).id);
  const [kart] = await db().select().from(kartlar).where(eq(kartlar.id, id));
  if (!kart) notFound();
  async function guncelle(f: FormData) {
    "use server";
    const k = await yoneticiGerekli();
    await calistir(
      () => kartGuncelle(db(), k, id, kartFormunuOku(f)),
      `/kartlar/${id}/duzenle`,
      () => ({ yol: `/kartlar/${id}`, mesaj: "Kart güncellendi." }),
    );
  }
  return (
    <>
      <h1>Kartı düzenle</h1>
      <Bildirim sp={await searchParams} />
      <KartFormu eylem={guncelle} kart={kart} dugme="Değişiklikleri kaydet" />
    </>
  );
}
