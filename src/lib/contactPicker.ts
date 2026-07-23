export interface PickedContact {
  name?: string;
  email?: string;
  phone?: string;
}

export function isContactPickerSupported(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  return "contacts" in navigator && "ContactsManager" in window;
}

export async function pickContact(): Promise<PickedContact | null> {
  if (!isContactPickerSupported()) {
    throw new Error("Contact picker isn't available on this browser.");
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (navigator as any).contacts.select(
      ["name", "email", "tel"],
      { multiple: false },
    );
    if (!results || results.length === 0) return null;
    const c = results[0];
    const name = c.name?.[0]?.trim() || undefined;
    const email = c.email?.[0]?.trim() || undefined;
    const phone = c.tel?.[0]?.trim() || undefined;
    return { name, email, phone };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    // User dismiss/cancel varies by browser — treat AbortError as cancel.
    if (err instanceof Error && (err.name === "AbortError" || /cancel/i.test(msg))) {
      return null;
    }
    throw new Error("Couldn't open your contacts.");
  }
}
