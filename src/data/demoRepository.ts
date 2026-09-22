import {
  demoConversations,
  demoMessages,
  demoNotifications,
  demoProfiles,
  demoUser,
} from '@/data/demoData';
import {
  BandCall,
  BandCallApplication,
  CollaborationItem,
  Conversation,
  DiscoveryPreferences,
  Message,
  MusicianProfile,
  NotificationItem,
  SessionProposal,
  SupportTicket,
  SupportTicketCategory,
} from '@/types';

export class DemoRepository {
  private supportTickets: SupportTicket[] = [];
  private profile = demoUser;
  private passed = new Set<string>();
  private liked = new Set<string>();
  private blocked = new Set<string>();
  private saved = new Set<string>(['demo-3', 'demo-7']);
  private bandCalls: BandCall[] = [
    {
      id: 'call-1',
      creatorId: 'demo-1',
      creatorName: 'Maya Chen',
      title: 'Drummer building a loud art-rock trio',
      description:
        'Looking for bass and guitar players who love tight arrangements, strange textures, and serious weekly rehearsals.',
      location: 'Detroit, MI',
      genres: ['Alternative Rock', 'Indie'],
      rolesNeeded: ['Guitar', 'Bass'],
      commitment: 'Serious',
      rehearsalFrequency: 'Weekly',
      createdAt: 'Today',
    },
    {
      id: 'call-2',
      creatorId: 'demo-9',
      creatorName: 'Andre Lewis',
      title: 'Neo-soul live band for paid dates',
      description:
        'Putting together a polished six-piece for regional paid shows. Strong pocket, preparation, and reliable gear required.',
      location: 'Ferndale, MI',
      genres: ['Neo-soul', 'R&B'],
      rolesNeeded: ['Keys', 'Guitar', 'Vocals'],
      commitment: 'Professional',
      rehearsalFrequency: 'Twice weekly',
      createdAt: 'Yesterday',
    },
    {
      id: 'call-3',
      creatorId: 'demo-6',
      creatorName: 'Iris Okafor',
      title: 'Electronic duo seeks live vocalist',
      description:
        'Original dance-forward set with hardware synths and live drums. Seeking a vocalist comfortable writing melodies.',
      location: 'Hamtramck, MI',
      genres: ['Electronic', 'Pop'],
      rolesNeeded: ['Vocals'],
      commitment: 'Consistent',
      rehearsalFrequency: 'Weekly',
      createdAt: '2 days ago',
    },
  ];
  private applications: BandCallApplication[] = [
    {
      id: 'application-1',
      bandCallId: 'call-1',
      applicantId: 'demo-3',
      applicantName: 'Nia Brooks',
      primaryInstrument: 'Vocals',
      intro:
        'I love the references and can commit to weekly rehearsals. I have live experience and a full vocal rig.',
      status: 'pending',
      createdAt: 'Today',
    },
  ];
  private collaborationItems: CollaborationItem[] = [
    {
      id: 'room-song-1',
      conversationId: 'demo-chat-1',
      type: 'song',
      text: 'Reptilia',
      completed: false,
      createdBy: 'demo-1',
      createdAt: 'Today',
    },
    {
      id: 'room-task-1',
      conversationId: 'demo-chat-1',
      type: 'task',
      text: 'Book Tuesday rehearsal room',
      completed: true,
      createdBy: 'me',
      createdAt: 'Today',
    },
    {
      id: 'room-note-1',
      conversationId: 'demo-chat-1',
      type: 'note',
      text: 'Try the bridge half-time before the final chorus.',
      completed: false,
      createdBy: 'demo-1',
      createdAt: 'Today',
    },
  ];
  private conversations: Conversation[] = [...demoConversations];
  private messages: Record<string, Message[]> = Object.fromEntries(
    Object.entries(demoMessages).map(([id, items]) => [id, [...items]]),
  );
  private notifications: NotificationItem[] = [...demoNotifications];
  private proposals: SessionProposal[] = [
    {
      id: 'demo-proposal-1',
      conversationId: 'demo-chat-1',
      kind: 'Rehearsal',
      date: '2026-09-15',
      time: '19:00',
      location: 'Midtown rehearsal studio',
      songs: ['Obstacle 1', 'Reptilia', 'New original'],
      status: 'pending',
    },
  ];
  private listeners = new Map<string, Set<(message: Message) => void>>();
  private preferences: DiscoveryPreferences = {
    maxDistanceKm: 80,
    ageMin: 18,
    ageMax: 50,
    instruments: [],
    genres: [],
    goals: [],
    commitment: [],
  };
  async getProfile(id: string) {
    return id === 'me' ? this.profile : demoProfiles.find((p) => p.id === id) || null;
  }
  async saveProfile(profile: MusicianProfile) {
    this.profile = { ...profile, id: 'me' };
  }
  async listProfiles() {
    return demoProfiles.filter(
      (p) => !this.passed.has(p.id) && !this.liked.has(p.id) && !this.blocked.has(p.id),
    );
  }
  async like(targetId: string) {
    this.liked.add(targetId);
    const target = demoProfiles.find((p) => p.id === targetId);
    const matched = Number(targetId.replace('demo-', '')) % 3 === 1;
    if (matched && target) {
      const id = `demo-match-${targetId}`;
      if (!this.conversations.some((item) => item.id === id))
        this.conversations.unshift({
          id,
          profileId: target.id,
          displayName: target.displayName,
          initials: target.initials,
          heroColor: target.heroColor,
          lastMessage: 'You matched — say hello',
          updatedAt: 'Now',
          unread: 0,
        });
      this.notifications.unshift({
        id: `notice-${Date.now()}`,
        type: 'match',
        title: `You matched with ${target.displayName}`,
        body: 'Start a conversation and make some noise.',
        time: 'Now',
        read: false,
      });
      return { matched: true, matchId: id };
    }
    return { matched: false };
  }
  async pass(targetId: string) {
    this.passed.add(targetId);
  }
  async listConversations() {
    return [...this.conversations];
  }
  async listMessages(id: string) {
    return [...(this.messages[id] || [])];
  }
  subscribeMessages(id: string, onMessage: (message: Message) => void) {
    const set = this.listeners.get(id) || new Set();
    set.add(onMessage);
    this.listeners.set(id, set);
    return () => set.delete(onMessage);
  }
  async sendMessage(id: string, body: string) {
    const message: Message = {
      id: `demo-message-${Date.now()}`,
      conversationId: id,
      senderId: 'me',
      body,
      createdAt: 'Now',
      status: 'sent',
    };
    this.messages[id] = [...(this.messages[id] || []), message];
    return message;
  }
  async createProposal(input: Omit<SessionProposal, 'id' | 'status'>) {
    const result: SessionProposal = {
      ...input,
      id: `demo-proposal-${Date.now()}`,
      status: 'pending',
    };
    this.proposals.unshift(result);
    this.notifications.unshift({
      id: `proposal-notice-${Date.now()}`,
      type: 'session',
      title: `${input.kind} proposed`,
      body: `${input.date} at ${input.time}`,
      time: 'Now',
      read: false,
    });
    return result;
  }
  async block(targetId: string) {
    this.blocked.add(targetId);
    this.conversations = this.conversations.filter((item) => item.profileId !== targetId);
  }
  async report() {}
  async deleteAccount() {}
  async exportAccountData(): Promise<Record<string, unknown>> {
    return { exportedAt: new Date().toISOString(), profile: this.profile, note: 'Demo data export' };
  }
  async createSupportTicket(input: {
    category: SupportTicketCategory;
    subject: string;
    description: string;
    diagnostics?: Record<string, string>;
  }): Promise<SupportTicket> {
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: `demo-ticket-${Date.now()}`, category: input.category, subject: input.subject,
      description: input.description, status: 'open', reference: `DEMO-${Date.now().toString().slice(-6)}`,
      createdAt: now, updatedAt: now,
    };
    this.supportTickets.unshift(ticket);
    return ticket;
  }
  async listSupportTickets() { return this.supportTickets; }
  async clearApproximateLocation() { this.profile = { ...this.profile, approximateCoordinates: undefined }; }
  async uploadMedia(_profileId: string, uri: string, mimeType: string, title: string) {
    const type = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('audio/')
        ? 'audio'
        : 'video';
    this.profile = {
      ...this.profile,
      media: [...this.profile.media, { id: `demo-media-${Date.now()}`, type, title, uri }],
    };
  }
  async listNotifications() {
    return [...this.notifications];
  }
  async markNotificationsRead() {
    this.notifications = this.notifications.map((item) => ({ ...item, read: true }));
  }
  async getDiscoveryPreferences() {
    return { ...this.preferences };
  }
  async saveDiscoveryPreferences(preferences: DiscoveryPreferences) {
    this.preferences = { ...preferences };
  }
  async listProposals(conversationId: string) {
    return this.proposals.filter((item) => item.conversationId === conversationId);
  }
  async respondToProposal(id: string, status: 'accepted' | 'declined') {
    this.proposals = this.proposals.map((item) => (item.id === id ? { ...item, status } : item));
  }
  async markConversationRead() {}
  async listBlocked() {
    return demoProfiles.filter((profile) => this.blocked.has(profile.id));
  }
  async unblock(targetId: string) {
    this.blocked.delete(targetId);
  }
  async getSubscriptionTier() {
    return 'free' as const;
  }
  async getLikeAllowance() {
    return { tier: 'free' as const, used: 4, limit: 15, remaining: 11 };
  }
  async listProfilesWhoLikedMe() {
    return demoProfiles.slice(2, 6);
  }
  async rewindLastPass() {
    return null;
  }
  async activateProfileBoost() {
    return new Date(Date.now() + 86_400_000).toISOString();
  }
  async saveSettings() {}
  async registerPushDevice() {}
  async deleteMedia(mediaId: string) {
    this.profile = {
      ...this.profile,
      media: this.profile.media.filter((item) => item.id !== mediaId),
    };
  }
  async saveProfileForLater(targetId: string) {
    this.saved.add(targetId);
  }
  async listSavedProfiles() {
    return demoProfiles.filter((profile) => this.saved.has(profile.id));
  }
  async removeSavedProfile(targetId: string) {
    this.saved.delete(targetId);
  }
  async listBandCalls() {
    return [...this.bandCalls];
  }
  async createBandCall(input: Omit<BandCall, 'id' | 'creatorId' | 'creatorName' | 'createdAt'>) {
    this.bandCalls.unshift({
      ...input,
      id: `demo-call-${Date.now()}`,
      creatorId: 'me',
      creatorName: this.profile.displayName,
      createdAt: 'Now',
    });
  }
  async applyToBandCall(id: string, intro: string) {
    this.applications.unshift({
      id: `application-${Date.now()}`,
      bandCallId: id,
      applicantId: 'me',
      applicantName: this.profile.displayName,
      primaryInstrument: this.profile.primaryInstrument,
      intro,
      status: 'pending',
      createdAt: 'Now',
    });
  }
  async listBandCallApplications(id: string) {
    return this.applications.filter((item) => item.bandCallId === id);
  }
  async respondToBandCallApplication(id: string, status: 'invited' | 'declined') {
    this.applications = this.applications.map((item) =>
      item.id === id ? { ...item, status } : item,
    );
    return status === 'invited' ? 'demo-chat-application' : null;
  }
  async setSessionReady(id: string, ready: boolean) {
    this.proposals = this.proposals.map((item) =>
      item.id === id
        ? { ...item, myReady: ready, readyCount: ready ? Math.max(1, item.readyCount || 0) : 0 }
        : item,
    );
  }
  async confirmSessionOutcome(id: string, outcome: 'happened' | 'did_not_happen') {
    this.proposals = this.proposals.map((item) =>
      item.id === id ? { ...item, myOutcome: outcome } : item,
    );
  }
  async trackEvent() {}
  async listCollaborationItems(conversationId: string) {
    return this.collaborationItems.filter((item) => item.conversationId === conversationId);
  }
  async addCollaborationItem(
    conversationId: string,
    type: CollaborationItem['type'],
    text: string,
  ) {
    const item: CollaborationItem = {
      id: `room-${Date.now()}`,
      conversationId,
      type,
      text,
      completed: false,
      createdBy: 'me',
      createdAt: 'Now',
    };
    this.collaborationItems.push(item);
    return item;
  }
  async toggleCollaborationItem(id: string, completed: boolean) {
    this.collaborationItems = this.collaborationItems.map((item) =>
      item.id === id ? { ...item, completed } : item,
    );
  }
  async deleteCollaborationItem(id: string) {
    this.collaborationItems = this.collaborationItems.filter((item) => item.id !== id);
  }
}
