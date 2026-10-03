/**
 * crossBranchText — Returns the correct display string for the cross-branch indicator.
 * Handles zero, singular, and plural cases with correct grammar.
 * Returns null when there are no other branches (don't render the indicator).
 */

export function crossBranchText(
  reviewedByBranches: string[],
  currentBranch: string | undefined
): string | null {
  // Count unique branches excluding the advisor's own
  const otherBranches = [...new Set(reviewedByBranches)].filter(
    (b) => b !== currentBranch
  );
  const count = otherBranches.length;

  if (count === 0) return null;

  if (count === 1) {
    return `1 advisor from 1 other branch has already reviewed this event (${otherBranches[0]})`;
  }

  return `${count} advisors from ${count} other branches have already reviewed this event (${otherBranches.join(', ')})`;
}