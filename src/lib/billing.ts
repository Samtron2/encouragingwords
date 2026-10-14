// Billing switch for the Stripe subscription framework.
// Edge functions (create-checkout, check-subscription, customer-portal,
// stripe-webhook) also check the BILLING_ENABLED secret on the server.
export const BILLING_ENABLED = true;

// Live Stripe price IDs (not secrets). Mirrors supabase/functions/_shared/billing-prices.ts.
export const PRICES = {
  MONTHLY: "price_1UQaXE3fJjU3X18zBQOh2e54", // $1.95 a month
  ANNUAL: "price_1UQaXI3fJjU3X18zEwmxKFeF", // $19.95 a year
  GIFT_YEAR: "price_1UQaXJ3fJjU3X18zTnEGUTim", // $19.95 one time
} as const;

export const FREE_WORDS_TOTAL = 5;
