import { Bildirim } from "@/components/Bildirim";
import { KartFormu } from "@/components/KartFormu";
import { db } from "@/db";
import { calistir } from "@/lib/eylem";
import { kartFormunuOku } from "@/lib/kartForm";
import { yoneticiGerekli } from "@/lib/oturum";
import { kartEkle } from "@/lib/servis";
import type { SP } from "@/lib/tip";

async function ekle(f: FormData) {
  "use server";
  const k = await yoneticiGerekli();
  await calistir(
    () => kartEkle(db(), k, kartFormunuOku(f)),
    "/kartlar/yeni",
    (id) => ({ yol: `/kartlar/${id}`, mesaj: "Kart eklendi." }),
  );
}

export default async function YeniKart({ searchParams }: { searchParams: SP }) {
  await yoneticiGerekli();
  return (
    <>
      <h1>Yeni kart</h1>
      <Bildirim sp={await searchParams} />
      <KartFormu eylem={ekle} dugme="Kartı kaydet" />
    </>
  );
}
