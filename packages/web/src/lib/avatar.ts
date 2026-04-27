/**
 * Avatar URL resolution.
 *
 * Convention (per CLAUDE.md):
 *   /images/{normalized-first-name}.webp
 *
 * Normalization: lowercase → strip accents → keep alphanumeric only.
 *   "Sáenz"   → "saenz"
 *   "Diego M" → "diegom"
 *   "Manuela" → "manuela"
 *
 * If the player has no matching file (e.g. no avatar generated yet, or the
 * phantom), `getAvatarUrl` returns null and the UI should fall back to a
 * neutral silhouette / monogram.
 */

/** Set of normalized names for which we have an avatar file in `public/images/`. */
const AVAILABLE_AVATARS = new Set<string>([
    // Piratas (red)
    'manuela',
    'pocho',
    'mon',
    'camacho',
    'fercho',
    'diegom',
    'matiz',
    'jaramillo',
    // Fantasmas (blue)
    'philipp',
    'rocha',
    'saenz',
    'burrowes',
    'berries',
    'zuluaga',
    'forero',
    'fantasma',  // ghost crest reused as phantom avatar
]);

export const normalizeName = (name: string): string =>
    name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]+/g, '')  // strip combining diacritics (old TS target compat)
        .replace(/[^a-z0-9]/g, '');

/** Resolve a player's avatar URL. Returns null if no avatar is available. */
export const getAvatarUrl = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const slug = normalizeName(name);
    if (!AVAILABLE_AVATARS.has(slug)) return null;
    return `/images/${slug}.webp`;
};

/** First letter monogram for fallback when no avatar exists. */
export const monogram = (name: string | null | undefined): string =>
    name?.trim()[0]?.toUpperCase() ?? '?';
