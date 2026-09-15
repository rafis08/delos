export type Like = { actorId: string; targetId: string };
export function createMutualMatch(likes: Like[], actorId: string, targetId: string) {
  if (actorId === targetId) throw new Error('Cannot like yourself');
  const exists = likes.some((x) => x.actorId === targetId && x.targetId === actorId);
  return exists ? [actorId, targetId].sort().join(':') : null;
}
