export interface BaseTimeslot {
  [key: string]: unknown
}

export type FlattenedShowtime<
  ParentContext extends Record<string, unknown>,
  T extends BaseTimeslot,
> = ParentContext & T

/**
 * Flattens a list of parent items (e.g. movie showings) into a flat array
 * by merging each parent's context with each of its timeslots.
 */
export function flattenShowtimes<
  ParentItem extends Record<string, unknown>,
  TimeslotItem extends BaseTimeslot,
  OutputContext extends Record<string, unknown>,
>(
  parentItems: ParentItem[] | undefined | null,
  getTimeslots: (parent: ParentItem) => TimeslotItem[] | undefined | null,
  getContext: (parent: ParentItem) => OutputContext,
): Array<FlattenedShowtime<OutputContext, TimeslotItem>> {
  if (!parentItems) return []
  const result: Array<FlattenedShowtime<OutputContext, TimeslotItem>> = []
  for (const parent of parentItems) {
    const context = getContext(parent)
    const timeslots = getTimeslots(parent)
    if (timeslots) {
      for (const timeslot of timeslots) {
        result.push({ ...context, ...timeslot })
      }
    }
  }
  return result
}
