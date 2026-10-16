/** U7, U9, U11 … by age, then named batches (Senior), with "Unassigned" last. */
export function byBatchOrder(a: { name: string }, b: { name: string }) {
  const rank = (name: string) => [/unassigned/i.test(name) ? 2 : /\d/.test(name) ? 0 : 1, Number(name.match(/\d+/)?.[0] ?? 0)] as const;
  const [ga, na] = rank(a.name);
  const [gb, nb] = rank(b.name);
  return ga - gb || na - nb || a.name.localeCompare(b.name);
}
