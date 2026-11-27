import { tutarYaz } from "@/lib/para";

export function Tutar({ k, isaretli }: { k: number; isaretli?: boolean }) {
  return <span className={isaretli && k < 0 ? "eksi" : undefined}>{tutarYaz(k)}</span>;
}
