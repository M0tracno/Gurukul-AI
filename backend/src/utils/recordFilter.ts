/**
 * Active-record listing filter utility.
 *
 * Expresses the single rule that governs whether an authoritative record
 * (`Student`/`Faculty`) may appear in an "active members" listing for a given
 * dashboard endpoint:
 *
 *   A record is listable IFF `active === true` AND every additional listing
 *   predicate for that endpoint holds.
 *
 * This rule is applied uniformly by every listing so that "appearing in an
 * active-member listing requires both `active` being true and satisfying any
 * other applicable criteria" (Req 3.5).
 *
 * Crucially, this helper governs LISTINGS ONLY. Reference resolution (resolving
 * the owning `Student`/`Faculty` behind a historical `Enrollment`/`Mark`/
 * `Attendance`) MUST NOT filter on `active`: a reference pointing at an inactive
 * record still resolves and returns that record's data (Req 3.4). Reference
 * resolution therefore uses `findById`-style lookups with no `active`
 * constraint and does not call this function.
 *
 * @see Requirements 3.4, 3.5
 */

/**
 * Decide whether a record appears in an active-member listing.
 *
 * Returns `true` if and only if the record's `active` flag is strictly `true`
 * and every supplied predicate returns `true` for the record. An empty
 * predicate array means the only requirement is `active === true`.
 *
 * @typeParam T - The record shape (augmented with an optional `active` flag).
 * @param record - The candidate record. A missing or non-`true` `active`
 *   value (including `false`, `undefined`, or any non-boolean) excludes it.
 * @param predicates - Additional endpoint-specific listing criteria; all must
 *   hold for the record to be listable.
 * @returns `true` when the record is listable, otherwise `false`.
 */
export function isListable<T>(
  record: T & { active?: boolean },
  predicates: Array<(r: T) => boolean>
): boolean {
  if (record.active !== true) {
    return false;
  }

  return predicates.every((predicate) => predicate(record));
}
