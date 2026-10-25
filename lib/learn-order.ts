// The order new words are handed out in Learn, with linked words ("a" and
// "an" — see WordLink in prisma/schema.prisma) kept close together:
//
// - a word linked to one the learner has already learnt comes first — so
//   it turns up in the batch straight after its partner, if not the same one
// - a word picked at random can bring one of its linked words into the
//   same batch
// - but a batch is never all linked words while there's anything else to
//   learn: at least one unrelated word goes in between
//
// Everything else stays random. Returns every candidate, the batch's
// worth first; the caller applies the learner's allowance and takes the
// first `setSize`.

export type LearnCandidate = { id: string; linkedIds: string[] };

export function orderLearnCandidates<T extends LearnCandidate>(
  candidates: T[],
  learntIds: ReadonlySet<string>,
  setSize: number,
  shuffle: <U>(items: U[]) => U[],
): T[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  // Linked to another word still to learn (one in a deck that isn't
  // switched on doesn't count).
  const hasLinks = (candidate: T) => candidate.linkedIds.some((id) => byId.has(id));
  // Waiting on a partner the learner has already met.
  const isPending = (candidate: T) => candidate.linkedIds.some((id) => learntIds.has(id));

  const pending = shuffle(candidates.filter(isPending));
  const rest = shuffle(candidates.filter((candidate) => !isPending(candidate)));
  const unrelated = rest.filter((candidate) => !hasLinks(candidate));
  // Room left for linked words once one unrelated word is kept back.
  const maxLinked = unrelated.length > 0 ? Math.max(setSize - 1, 1) : setSize;

  const linked: T[] = [];
  const plain: T[] = [];
  const chosen = new Set<string>();
  const size = () => linked.length + plain.length;
  const add = (candidate: T, list: T[]) => {
    list.push(candidate);
    chosen.add(candidate.id);
  };

  for (const candidate of pending) {
    if (linked.length >= maxLinked) break;
    add(candidate, linked);
  }

  for (const candidate of rest) {
    if (size() >= setSize) break;
    if (chosen.has(candidate.id)) continue;

    const partner = candidate.linkedIds
      .map((id) => byId.get(id))
      .find((other): other is T => Boolean(other) && !chosen.has(other!.id));

    if (partner && linked.length + 2 <= maxLinked && size() + 2 <= setSize) {
      add(candidate, linked);
      add(partner, linked);
    } else if (hasLinks(candidate) && linked.length >= maxLinked && unrelated.some((u) => !chosen.has(u.id))) {
      // No room for its partner beside it, and an unrelated word is still
      // to come — leave this one for a later batch.
      continue;
    } else {
      add(candidate, plain);
    }
  }

  // Linked words at either end, the others between them, so a pair is
  // never back to back when there's something to put in the middle.
  const [first, ...others] = linked;
  const batch = first ? [first, ...plain, ...others] : plain;
  const leftover = candidates.filter((candidate) => !chosen.has(candidate.id));
  return [...batch, ...pending.filter((c) => !chosen.has(c.id)), ...shuffle(leftover.filter((c) => !isPending(c)))];
}
