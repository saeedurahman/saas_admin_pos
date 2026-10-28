export type Errors<K extends string = string> = Partial<Record<K, string>>;

export const hasErrors = (e: object) => Object.keys(e).length > 0;

export function isPositiveNumber(v: string): boolean {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n > 0;
}

export function isPositiveInt(v: string): boolean {
  return /^\d+$/.test(v.trim()) && Number(v) > 0;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function isPhone(v: string): boolean {
  return /^\+?[0-9\s-]{7,16}$/.test(v.trim());
}

export function isTotp(v: string): boolean {
  return /^\d{6}$/.test(v.trim());
}
