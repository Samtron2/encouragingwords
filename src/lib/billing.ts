// Kill switch for the Stripe subscription framework.
//
// While `BILLING_ENABLED` is false, the entire billing surface is dormant:
// - No UI in the app calls checkout, the customer portal, or subscription sync.
// - The edge functions (create-checkout, check-subscription, customer-portal,
//   stripe-webhook) short-circuit and return `{ disabled: true }`.
//
// To activate billing later:
//   1. Add the Stripe secrets in Project Settings → Secrets:
//        - STRIPE_SECRET_KEY
//        - STRIPE_MONTHLY_PRICE_ID
//        - STRIPE_WEBHOOK_SECRET (for stripe-webhook)
//      and set the edge-function env var BILLING_ENABLED=true.
//   2. Flip this constant to `true` and wire the UI to the billing functions.
export const BILLING_ENABLED = false;
