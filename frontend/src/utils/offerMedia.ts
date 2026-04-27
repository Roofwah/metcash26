/**
 * Resolve offer images from API fields only (no OFFER-id-based paths).
 * Filenames from offer-content.json are served as /products/{basename}.
 */

/** Primary card/matrix title — merged from offer-content.json: `modalTitle`, then `h1`. */
export function offerCardEditorialHeading(offer: { modalTitle?: string; h1?: string }): string {
  const t = (offer.modalTitle || '').trim();
  if (t) return t;
  return (offer.h1 || '').trim();
}

/** Subheading under product image — `h2` only (editorial). */
export function offerCardEditorialSubline(offer: { h2?: string }): string {
  return (offer.h2 || '').trim();
}

export function resolvePublicProductPath(v: string | null | undefined): string | null {
  const s = (v || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return s;
  const base = s.replace(/\\/g, '/').split('/').pop() || '';
  if (!base || base === '.' || base === '..' || base.includes('..')) return null;
  return `/products/${base}`;
}

export function urlOrFileUrl(url?: string, file?: string | null): string | null {
  const u = (url || '').trim();
  if (u) return u;
  return resolvePublicProductPath(file ?? undefined);
}

/** Same file or same basename (e.g. frag.png vs frag.jpg) — avoid two slots for one asset. */
export function sameProductImageAsset(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const base = (s: string) => {
    const leaf = s.replace(/\\/g, '/').split('/').pop() || s;
    const dot = leaf.lastIndexOf('.');
    return (dot > 0 ? leaf.slice(0, dot) : leaf).toLowerCase();
  };
  return base(a) === base(b);
}

/** Card product slot: productImage → hero → logo. */
export function offerCardProductImageUrl(offer: {
  productImageUrl?: string;
  heroUrl?: string;
  logoUrl?: string;
  productImage?: string | null;
  hero?: string | null;
  logo?: string | null;
}): string | null {
  const u1 = urlOrFileUrl(offer.productImageUrl, offer.productImage ?? null);
  const u2 = urlOrFileUrl(offer.heroUrl, offer.hero ?? null);
  const u3 = urlOrFileUrl(offer.logoUrl, offer.logo ?? null);
  return u1 || u2 || u3;
}

/** Optional promo image for card toggle button. */
export function offerCardPromoImageUrl(offer: {
  promoImageUrl?: string;
  promoImage?: string | null;
}): string | null {
  return urlOrFileUrl(offer.promoImageUrl, offer.promoImage ?? null);
}

export function offerCardLogoUrl(
  offer: { logoUrl?: string; logo?: string | null },
  brandFallback: string,
): string {
  return urlOrFileUrl(offer.logoUrl, offer.logo ?? null) || brandFallback;
}

/** Detail page / gallery: unique ordered URLs from editorial fields. */
export function offerEditorialImageGalleryUrls(offer: {
  productImageUrl?: string;
  heroUrl?: string;
  logoUrl?: string;
  productImage?: string | null;
  hero?: string | null;
  logo?: string | null;
}): string[] {
  const urls = [
    urlOrFileUrl(offer.productImageUrl, offer.productImage ?? null),
    urlOrFileUrl(offer.heroUrl, offer.hero ?? null),
    urlOrFileUrl(offer.logoUrl, offer.logo ?? null),
  ].filter(Boolean) as string[];
  const out: string[] = [];
  for (const u of urls) {
    if (out.some((x) => sameProductImageAsset(x, u))) continue;
    out.push(u);
  }
  return out;
}

/** MSO matrix column: brand logo + primary product/hero thumb from API only. */
export function offerMatrixColumnMedia(offer: {
  logoUrl?: string;
  heroUrl?: string;
  productImageUrl?: string;
  productImage?: string | null;
  hero?: string | null;
  logo?: string | null;
}): { logo: string | null; thumb: string | null } {
  const logo = urlOrFileUrl(offer.logoUrl, offer.logo ?? null);
  const u1 = urlOrFileUrl(offer.productImageUrl, offer.productImage ?? null);
  const u2 = urlOrFileUrl(offer.heroUrl, offer.hero ?? null);
  const thumb = u1 || u2;
  return { logo, thumb };
}
