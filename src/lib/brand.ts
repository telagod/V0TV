export const BRAND_NAME = 'V0TV';
export const BRAND_SLUG = 'v0tv';
export const BRAND_REPO = 'https://github.com/telagod/V0TV';
export const BRAND_CONTACT = 'Link Me TG：@v0tv';
export const LEGACY_BRAND_SLUGS = ['katelyatv', 'moontv'];

export const buildKey = (suffix: string) => `${BRAND_SLUG}_${suffix}`;
export const buildLegacyKeys = (suffix: string) =>
  LEGACY_BRAND_SLUGS.map((prefix) => `${prefix}_${suffix}`);
