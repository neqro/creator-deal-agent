/** Input rules for a collaboration offer. Pure, so the API and tests share one definition. */
export interface OfferInput {
  brand: string;
  title: string;
  message: string;
  budgetUsd: number;
  contact?: string;
}

export const LIMITS = { brand: 80, title: 120, message: 2000, contact: 120, maxBudgetUsd: 1_000_000 } as const;

export type ParseResult = { ok: true; value: OfferInput } | { ok: false; error: string };

function str(v: unknown, field: string, max: number, required = true): string | Error | undefined {
  if (v === undefined || v === null || v === "") {
    return required ? new Error(`${field} is required`) : undefined;
  }
  if (typeof v !== "string") return new Error(`${field} must be a string`);
  const t = v.trim();
  if (required && !t) return new Error(`${field} is required`);
  if (t.length > max) return new Error(`${field} must be at most ${max} characters`);
  return t;
}

export function parseOffer(body: unknown): ParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  const brand = str(b.brand, "brand", LIMITS.brand);
  const title = str(b.title, "title", LIMITS.title);
  const message = str(b.message, "message", LIMITS.message);
  const contact = str(b.contact, "contact", LIMITS.contact, false);
  for (const v of [brand, title, message, contact]) if (v instanceof Error) return { ok: false, error: v.message };

  const budgetUsd = b.budgetUsd === undefined ? 0 : Number(b.budgetUsd);
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0 || budgetUsd > LIMITS.maxBudgetUsd) {
    return { ok: false, error: `budgetUsd must be a number between 0 and ${LIMITS.maxBudgetUsd}` };
  }
  return {
    ok: true,
    value: {
      brand: brand as string,
      title: title as string,
      message: message as string,
      budgetUsd: Math.round(budgetUsd * 100) / 100,
      ...(contact ? { contact: contact as string } : {}),
    },
  };
}
