// Live Stripe price IDs (not secrets). Mirrored in src/lib/billing.ts.
export const PRICES = {
  MONTHLY: "price_1UQaXE3fJjU3X18zBQOh2e54", // $1.95 a month
  ANNUAL: "price_1UQaXI3fJjU3X18zEwmxKFeF", // $19.95 a year
  GIFT_YEAR: "price_1UQaXJ3fJjU3X18zTnEGUTim", // $19.95 one time
} as const;
