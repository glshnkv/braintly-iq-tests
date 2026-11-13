import type { ArchetypeId } from "./result-types";

/**
 * Starting rarity (% of test takers) used until enough real results accumulate.
 * Sums to 100. Replaced by observed shares once the sample is large enough.
 */
export const ARCHETYPE_PRIOR_PCT: Record<ArchetypeId, number> = {
  analyst: 14,
  strategist: 12,
  architect: 9,
  researcher: 11,
  engineer: 10,
  visionary: 7,
  archivist: 22,
  polymath: 15,
};
