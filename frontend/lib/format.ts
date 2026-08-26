export function sanitizeAmountInput(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  return digitsOnly.replace(/^0+(?=\d)/, "");
}
