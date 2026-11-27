export type SP = Promise<Record<string, string | string[] | undefined>>;
export type Params<T extends string> = Promise<Record<T, string>>;

export function tek(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}
