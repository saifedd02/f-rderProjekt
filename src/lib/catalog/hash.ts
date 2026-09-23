/**
 * Content fingerprint for change detection.
 *
 * Deliberately dependency-free and synchronous: it runs 2,500+ times per ingest
 * and must work in any runtime. It is not a security primitive — it only has to
 * answer "did this record change since yesterday", where the comparison is
 * always within one program's own history.
 */

/** FNV-1a with a configurable offset basis, as an unsigned 32-bit value. */
function fnv1a(value: string, offset: number): number {
  let hash = offset;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    // hash *= 16777619, kept in 32-bit range without BigInt.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * A 64-bit fingerprint as 16 hex characters.
 *
 * Two independent FNV-1a passes with different offset bases are concatenated —
 * a single 32-bit hash would be uncomfortably collision-prone for text this long.
 */
export function contentFingerprint(value: string): string {
  const low = fnv1a(value, 0x811c9dc5);
  const high = fnv1a(value, 0x9dc5811c);
  return high.toString(16).padStart(8, "0") + low.toString(16).padStart(8, "0");
}
