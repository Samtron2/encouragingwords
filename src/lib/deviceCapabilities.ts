export type SmsCapability = "full" | "partial" | "none";

export function getSmsCapability(): SmsCapability {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return "none";
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMacDesktop = /macintosh|mac os x/.test(ua) && !("ontouchend" in document);

  if (isIOS || isAndroid) return "full";
  if (isMacDesktop) return "partial";
  return "none";
}
