export function canReadConversation(userId: string, participants: [string, string]) {
  return participants.includes(userId);
}
export function canMutateProfile(userId: string, profileId: string) {
  return userId === profileId;
}
export function canSendMessage(userId: string, participants: [string, string], blocked: boolean) {
  return !blocked && participants.includes(userId);
}
