export type Skill = 'Developing' | 'Intermediate' | 'Advanced' | 'Professional';
export type Commitment = 'Casual' | 'Consistent' | 'Serious' | 'Professional';
export type Goal = 'Casual jams' | 'Form a band' | 'Join a band' | 'Session work' | 'Paid gigs';
export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type Availability = { day: Day; periods: ('Morning' | 'Afternoon' | 'Evening')[] };
export type MediaSample = {
  id: string;
  type: 'audio' | 'video' | 'image';
  title: string;
  uri?: string;
  duration?: string;
  color?: string;
  storagePath?: string;
};
export type MusicianProfile = {
  id: string;
  displayName: string;
  age: number;
  location: string;
  approximateCoordinates?: { latitude: number; longitude: number };
  distanceKm: number;
  bio: string;
  primaryInstrument: string;
  secondaryInstruments: string[];
  desiredRoles: string[];
  genres: string[];
  influences: string[];
  skill: Skill;
  yearsExperience: number;
  commitment: Commitment;
  goals: Goal[];
  material: 'Originals' | 'Covers' | 'Both';
  availability: Availability[];
  rehearsalFrequency: string;
  travelRadiusKm: number;
  transportation: boolean;
  performanceReadyGear: boolean;
  existingBand?: string;
  links: { label: string; url: string }[];
  verifiedEmail: boolean;
  lastActive: string;
  availableNow: boolean;
  heroColor: string;
  initials: string;
  media: MediaSample[];
};
export type DiscoveryPreferences = {
  maxDistanceKm: number;
  ageMin: number;
  ageMax: number;
  instruments: string[];
  genres: string[];
  goals: Goal[];
  commitment: Commitment[];
  availableNowOnly?: boolean;
  transportationRequired?: boolean;
  performanceReadyGearRequired?: boolean;
};
export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  status: 'sent' | 'read';
};
export type Conversation = {
  id: string;
  profileId: string;
  displayName?: string;
  initials?: string;
  heroColor?: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
};
export type SessionProposal = {
  id: string;
  conversationId: string;
  kind: 'Rehearsal' | 'Audition';
  date: string;
  time: string;
  location: string;
  songs: string[];
  status: 'pending' | 'accepted' | 'declined';
  startsAt?: string;
  readyCount?: number;
  myReady?: boolean;
  myOutcome?: 'happened' | 'did_not_happen';
};
export type ProductEventName =
  | 'discovery_viewed'
  | 'connection_sent'
  | 'match_created'
  | 'first_message_sent'
  | 'session_proposed'
  | 'session_accepted'
  | 'session_confirmed'
  | 'premium_viewed'
  | 'checkout_started';
export type NotificationItem = {
  id: string;
  type: 'match' | 'message' | 'session';
  title: string;
  body: string;
  time: string;
  read: boolean;
};
export type UserSettings = {
  notifications: boolean;
  discoveryVisible: boolean;
  showAvailableNow: boolean;
  incognito: boolean;
};
export type SupportTicketCategory = 'Account' | 'Safety' | 'Billing' | 'Technical' | 'Feedback';
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved';
export type SupportTicket = {
  id: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  reference: string;
  createdAt: string;
  updatedAt: string;
};
export type SubscriptionTier = 'free' | 'amplified';
export type LikeAllowance = {
  tier: SubscriptionTier;
  used: number;
  limit: number | null;
  remaining: number | null;
};
export type BandCall = {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  location: string;
  genres: string[];
  rolesNeeded: string[];
  commitment: Commitment;
  rehearsalFrequency: string;
  createdAt: string;
};
export type CollaborationItem = {
  id: string;
  conversationId: string;
  type: 'song' | 'task' | 'note';
  text: string;
  completed: boolean;
  createdBy: string;
  createdAt: string;
};
export type BandCallApplication = {
  id: string;
  bandCallId: string;
  applicantId: string;
  applicantName: string;
  primaryInstrument: string;
  intro: string;
  status: 'pending' | 'invited' | 'declined';
  createdAt: string;
};
