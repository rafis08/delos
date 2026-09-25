import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DemoRepository } from '@/data/demoRepository';
import {
  BandCall,
  BandCallApplication,
  CollaborationItem,
  Conversation,
  DiscoveryPreferences,
  Message,
  LikeAllowance,
  MusicianProfile,
  SessionProposal,
  SubscriptionTier,
  UserSettings,
  ProductEventName,
  SupportTicket,
  SupportTicketCategory,
} from '@/types';

type Row = Record<string, unknown>;
const palette = ['#E96B16', '#C98A12', '#FF9F1C', '#9A5B13', '#F2B134', '#B94724'];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
const colorFor = (id: string) =>
  palette[id.split('').reduce((sum, x) => sum + x.charCodeAt(0), 0) % palette.length]!;
const profileSelect =
  '*, availability(*), influences(*), media_samples(*), profile_genres(genres(name)), profile_instruments(is_primary,instruments(name))';

const authStorage = {
  getItem: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === 'web'
      ? AsyncStorage.setItem(key, value)
      : SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
  removeItem: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

function mapProfile(row: Row): MusicianProfile {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  const id = String(row.user_id);
  const displayName = String(row.display_name || 'Musician');
  return {
    id,
    displayName,
    age: Number(row.age),
    location: String(row.general_location || ''),
    distanceKm: Number(row.distance_km || 0),
    bio: String(row.bio || ''),
    primaryInstrument: String(row.primary_instrument || ''),
    secondaryInstruments: unique(
      rows(row.profile_instruments)
        .filter((x) => !x.is_primary)
        .map((x) => String((x.instruments as Row | undefined)?.name)),
    ),
    desiredRoles: unique((row.desired_roles as string[]) || []),
    genres: unique(
      rows(row.profile_genres).map((x) => String((x.genres as Row | undefined)?.name)),
    ),
    influences: unique(rows(row.influences).map((x) => String(x.name))),
    skill: row.skill as MusicianProfile['skill'],
    yearsExperience: Number(row.years_experience || 0),
    commitment: row.commitment as MusicianProfile['commitment'],
    goals: (row.goals as MusicianProfile['goals']) || [],
    material: row.material as MusicianProfile['material'],
    availability: Object.values(
      rows(row.availability).reduce<Record<string, MusicianProfile['availability'][number]>>(
        (grouped, x) => {
          const day = days[Number(x.day_of_week)]!;
          const period = x.period as 'Morning' | 'Afternoon' | 'Evening';
          grouped[day] ||= { day, periods: [] };
          if (!grouped[day].periods.includes(period)) grouped[day].periods.push(period);
          return grouped;
        },
        {},
      ),
    ),
    rehearsalFrequency: String(row.rehearsal_frequency || 'Weekly'),
    travelRadiusKm: Number(row.travel_radius_km || 40),
    transportation: Boolean(row.transportation),
    performanceReadyGear: Boolean(row.performance_ready_gear),
    existingBand: row.existing_band ? String(row.existing_band) : undefined,
    links: (row.public_links as MusicianProfile['links']) || [],
    verifiedEmail: Boolean(row.verified_email),
    lastActive: 'Recently active',
    availableNow: Boolean(row.available_now),
    heroColor: colorFor(id),
    initials: initials(displayName),
    media: rows(row.media_samples).map((x) => ({
      id: String(x.id),
      type: x.media_type as 'image' | 'audio' | 'video',
      title: String(x.title),
      storagePath: String(x.storage_path),
    })),
  };
}

export interface DelosRepository {
  getProfile(userId: string): Promise<MusicianProfile | null>;
  saveProfile(profile: MusicianProfile): Promise<void>;
  listProfiles(userId: string): Promise<MusicianProfile[]>;
  like(targetId: string): Promise<{ matched: boolean; matchId?: string }>;
  pass(targetId: string): Promise<void>;
  listConversations(): Promise<Conversation[]>;
  listMessages(id: string): Promise<Message[]>;
  subscribeMessages(id: string, onMessage: (message: Message) => void): () => void;
  sendMessage(id: string, body: string): Promise<Message>;
  createProposal(input: Omit<SessionProposal, 'id' | 'status'>): Promise<SessionProposal>;
  block(targetId: string): Promise<void>;
  report(targetId: string, reason: string, details: string): Promise<void>;
  deleteAccount(): Promise<void>;
  exportAccountData(): Promise<Record<string, unknown>>;
  createSupportTicket(input: {
    category: SupportTicketCategory;
    subject: string;
    description: string;
    diagnostics?: Record<string, string>;
  }): Promise<SupportTicket>;
  listSupportTickets(): Promise<SupportTicket[]>;
  clearApproximateLocation(): Promise<void>;
  uploadMedia(profileId: string, uri: string, mimeType: string, title: string): Promise<void>;
  listNotifications(): Promise<import('@/types').NotificationItem[]>;
  markNotificationsRead(): Promise<void>;
  getDiscoveryPreferences(): Promise<DiscoveryPreferences>;
  saveDiscoveryPreferences(preferences: DiscoveryPreferences): Promise<void>;
  listProposals(conversationId: string): Promise<SessionProposal[]>;
  respondToProposal(id: string, status: 'accepted' | 'declined'): Promise<void>;
  markConversationRead(conversationId: string): Promise<void>;
  listBlocked(): Promise<MusicianProfile[]>;
  unblock(targetId: string): Promise<void>;
  getSubscriptionTier(): Promise<SubscriptionTier>;
  getLikeAllowance(): Promise<LikeAllowance>;
  listProfilesWhoLikedMe(): Promise<MusicianProfile[]>;
  rewindLastPass(): Promise<string | null>;
  activateProfileBoost(): Promise<string>;
  saveSettings(settings: UserSettings): Promise<void>;
  registerPushDevice(token: string, platform: 'ios' | 'android' | 'web'): Promise<void>;
  deleteMedia(mediaId: string, storagePath?: string): Promise<void>;
  saveProfileForLater(targetId: string): Promise<void>;
  listSavedProfiles(): Promise<MusicianProfile[]>;
  removeSavedProfile(targetId: string): Promise<void>;
  listBandCalls(): Promise<BandCall[]>;
  createBandCall(
    input: Omit<BandCall, 'id' | 'creatorId' | 'creatorName' | 'createdAt'>,
  ): Promise<void>;
  applyToBandCall(id: string, intro: string): Promise<void>;
  listBandCallApplications(id: string): Promise<BandCallApplication[]>;
  respondToBandCallApplication(id: string, status: 'invited' | 'declined'): Promise<string | null>;
  setSessionReady(id: string, ready: boolean): Promise<void>;
  confirmSessionOutcome(id: string, outcome: 'happened' | 'did_not_happen'): Promise<void>;
  trackEvent(
    name: ProductEventName,
    properties?: Record<string, string | number | boolean>,
  ): Promise<void>;
  listCollaborationItems(conversationId: string): Promise<CollaborationItem[]>;
  addCollaborationItem(
    conversationId: string,
    type: CollaborationItem['type'],
    text: string,
  ): Promise<CollaborationItem>;
  toggleCollaborationItem(id: string, completed: boolean): Promise<void>;
  deleteCollaborationItem(id: string): Promise<void>;
}

export class SupabaseRepository implements DelosRepository {
  constructor(private client: SupabaseClient) {}
  private async withMediaUrls(profile: MusicianProfile) {
    const media = await Promise.all(
      profile.media.map(async (item) => {
        if (!item.storagePath) return item;
        const { data } = await this.client.storage
          .from('profile-media')
          .createSignedUrl(item.storagePath, 3600);
        return { ...item, uri: data?.signedUrl };
      }),
    );
    return { ...profile, media };
  }
  async getProfile(userId: string) {
    const { data, error } = await this.client
      .from('musician_profiles')
      .select(profileSelect)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.withMediaUrls(mapProfile(data)) : null;
  }
  async saveProfile(p: MusicianProfile) {
    const payload = {
      user_id: p.id,
      display_name: p.displayName,
      age: p.age,
      general_location: p.location,
      bio: p.bio,
      primary_instrument: p.primaryInstrument,
      desired_roles: unique(p.desiredRoles),
      skill: p.skill,
      years_experience: p.yearsExperience,
      commitment: p.commitment,
      goals: p.goals,
      material: p.material,
      rehearsal_frequency: p.rehearsalFrequency,
      travel_radius_km: p.travelRadiusKm,
      transportation: p.transportation,
      performance_ready_gear: p.performanceReadyGear,
      existing_band: p.existingBand || null,
      public_links: p.links,
      available_now: p.availableNow,
      updated_at: new Date().toISOString(),
    };
    const { data: existing, error: lookupError } = await this.client
      .from('musician_profiles')
      .select('user_id')
      .eq('user_id', p.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    const { error } = existing
      ? await this.client.from('musician_profiles').update(payload).eq('user_id', p.id)
      : await this.client.from('musician_profiles').insert(payload);
    if (error) throw error;
    await Promise.all([
      this.client.from('availability').delete().eq('profile_id', p.id),
      this.client.from('influences').delete().eq('profile_id', p.id),
      this.client.from('profile_genres').delete().eq('profile_id', p.id),
      this.client.from('profile_instruments').delete().eq('profile_id', p.id),
    ]);
    const slots = p.availability.flatMap((a) =>
      a.periods.map((period) => ({
        profile_id: p.id,
        day_of_week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(a.day),
        period,
      })),
    );
    if (slots.length) {
      const { error: e } = await this.client.from('availability').insert(slots);
      if (e) throw e;
    }
    const influenceNames = unique(p.influences);
    if (influenceNames.length) {
      const { error: e } = await this.client
        .from('influences')
        .insert(influenceNames.map((name) => ({ profile_id: p.id, name })));
      if (e) throw e;
    }
    const { data: genreRows } = await this.client
      .from('genres')
      .select('id,name')
      .in('name', unique(p.genres));
    if (genreRows?.length) {
      const { error: e } = await this.client
        .from('profile_genres')
        .insert(genreRows.map((x) => ({ profile_id: p.id, genre_id: x.id })));
      if (e) throw e;
    }
    const names = unique([p.primaryInstrument, ...p.secondaryInstruments]);
    const { data: instrumentRows } = await this.client
      .from('instruments')
      .select('id,name')
      .in('name', names);
    if (instrumentRows?.length) {
      const { error: e } = await this.client.from('profile_instruments').insert(
        instrumentRows.map((x) => ({
          profile_id: p.id,
          instrument_id: x.id,
          is_primary: x.name === p.primaryInstrument,
        })),
      );
      if (e) throw e;
    }
    if (p.approximateCoordinates) {
      const { error: locationError } = await this.client
        .from('discovery_preferences')
        .update({
          approximate_latitude: Math.round(p.approximateCoordinates.latitude * 100) / 100,
          approximate_longitude: Math.round(p.approximateCoordinates.longitude * 100) / 100,
        })
        .eq('user_id', p.id);
      if (locationError) throw locationError;
    }
  }
  async listProfiles(userId: string) {
    const [profiles, likes, passes, blocks, distances] = await Promise.all([
      this.client
        .from('musician_profiles')
        .select(profileSelect)
        .neq('user_id', userId)
        .eq('discovery_visible', true),
      this.client.from('likes').select('target_id').eq('actor_id', userId),
      this.client.from('passes').select('target_id').eq('actor_id', userId),
      this.client.from('blocks').select('blocked_id').eq('blocker_id', userId),
      this.client.rpc('discovery_distances'),
    ]);
    if (profiles.error) throw profiles.error;
    if (likes.error) throw likes.error;
    if (passes.error) throw passes.error;
    if (blocks.error) throw blocks.error;
    if (distances.error) throw distances.error;
    const distanceById = new Map(
      (distances.data || []).map((item: { user_id: string; distance_km: number }) => [
        item.user_id,
        item.distance_km,
      ]),
    );
    const excluded = new Set(
      [...likes.data, ...passes.data]
        .map((item) => item.target_id)
        .concat(blocks.data.map((item) => item.blocked_id)),
    );
    return Promise.all(
      (profiles.data || [])
        .filter((item) => !excluded.has(item.user_id))
        .sort((a, b) => {
          const aBoosted =
            a.boosted_until && new Date(String(a.boosted_until)) > new Date() ? 1 : 0;
          const bBoosted =
            b.boosted_until && new Date(String(b.boosted_until)) > new Date() ? 1 : 0;
          return bBoosted - aBoosted;
        })
        .map((item) => ({ ...item, distance_km: distanceById.get(item.user_id) || 0 }))
        .map(mapProfile)
        .map((profile) => this.withMediaUrls(profile)),
    );
  }
  async like(targetId: string) {
    const { data, error } = await this.client.rpc('create_like_and_match', {
      target_user_id: targetId,
    });
    if (error) throw error;
    return { matched: Boolean(data), matchId: data ? String(data) : undefined };
  }
  async pass(targetId: string) {
    const { error } = await this.client.rpc('record_pass', { target_user_id: targetId });
    if (error) throw error;
  }
  async listConversations() {
    const { data, error } = await this.client.rpc('my_conversations');
    if (error) throw error;
    return rows(data).map((x) => ({
      id: String(x.id),
      profileId: String(x.profile_id),
      displayName: String(x.display_name),
      initials: initials(String(x.display_name)),
      heroColor: colorFor(String(x.profile_id)),
      lastMessage: String(x.last_message || 'You matched — say hello'),
      updatedAt: String(x.updated_at || ''),
      unread: Number(x.unread || 0),
    }));
  }
  async listMessages(id: string): Promise<Message[]> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).reverse().map((x: Row) => ({
      id: String(x.id),
      conversationId: String(x.conversation_id),
      senderId: String(x.sender_id),
      body: String(x.body),
      createdAt: new Date(String(x.created_at)).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      }),
      status: x.read_at ? 'read' : 'sent',
    }));
  }
  subscribeMessages(id: string, onMessage: (m: Message) => void) {
    const channel = this.client
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        ({ new: x }: { new: Row }) =>
          onMessage({
            id: String(x.id),
            conversationId: String(x.conversation_id),
            senderId: String(x.sender_id),
            body: String(x.body),
            createdAt: 'Now',
            status: 'sent',
          }),
      )
      .subscribe();
    return () => void this.client.removeChannel(channel);
  }
  async sendMessage(id: string, body: string): Promise<Message> {
    const { data, error } = await this.client.rpc('send_message_rate_limited', {
      target_conversation_id: id,
      message_body: body,
    });
    if (error) throw error;
    return {
      id: String(data.id),
      conversationId: String(data.conversation_id),
      senderId: String(data.sender_id),
      body: String(data.body),
      createdAt: 'Now',
      status: 'sent',
    };
  }
  async createProposal(input: Omit<SessionProposal, 'id' | 'status'>) {
    const { data, error } = await this.client.rpc('create_session_proposal', {
      target_conversation_id: input.conversationId,
      proposal_kind: input.kind,
      proposal_starts_at: new Date(`${input.date}T${input.time}`).toISOString(),
      proposal_location: input.location,
      proposal_songs: input.songs,
    });
    if (error) throw error;
    return { ...input, id: data.id, status: data.status };
  }
  async block(targetId: string) {
    const { error } = await this.client.from('blocks').insert({
      blocker_id: (await this.client.auth.getUser()).data.user?.id,
      blocked_id: targetId,
    });
    if (error) throw error;
  }
  async report(targetId: string, reason: string, details: string) {
    const { error } = await this.client.rpc('submit_report_rate_limited', {
      target_user_id: targetId,
      report_reason: reason,
      report_details: details,
    });
    if (error) throw error;
  }
  async deleteAccount() {
    const { error } = await this.client.functions.invoke('delete-account');
    if (error) throw error;
  }
  async exportAccountData() {
    const { data, error } = await this.client.functions.invoke('export-account-data');
    if (error) throw error;
    return data as Record<string, unknown>;
  }
  async createSupportTicket(input: {
    category: SupportTicketCategory;
    subject: string;
    description: string;
    diagnostics?: Record<string, string>;
  }): Promise<SupportTicket> {
    const { data, error } = await this.client.rpc('create_support_ticket', {
      ticket_category: input.category,
      ticket_subject: input.subject,
      ticket_description: input.description,
      ticket_diagnostics: input.diagnostics || {},
    });
    if (error) throw error;
    const item = data?.[0] || data;
    return {
      id: String(item.id),
      category: item.category,
      subject: String(item.subject),
      description: String(item.description),
      status: item.status,
      reference: String(item.reference),
      createdAt: String(item.created_at),
      updatedAt: String(item.updated_at),
    };
  }
  async listSupportTickets(): Promise<SupportTicket[]> {
    const { data, error } = await this.client
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((item: Row) => ({
      id: String(item.id),
      category: item.category as SupportTicketCategory,
      subject: String(item.subject),
      description: String(item.description),
      status: item.status as SupportTicket['status'],
      reference: String(item.reference),
      createdAt: String(item.created_at),
      updatedAt: String(item.updated_at),
    }));
  }
  async clearApproximateLocation() {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) throw new Error('Sign in to change location privacy.');
    const { error } = await this.client
      .from('discovery_preferences')
      .update({
        approximate_latitude: null,
        approximate_longitude: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    if (error) throw error;
  }
  async uploadMedia(profileId: string, uri: string, mimeType: string, title: string) {
    const response = await fetch(uri);
    const body = await response.arrayBuffer();
    const extension =
      (
        {
          'audio/mpeg': 'mp3',
          'audio/mp4': 'm4a',
          'audio/x-m4a': 'm4a',
          'audio/aac': 'aac',
          'audio/wav': 'wav',
          'audio/webm': 'webm',
          'audio/ogg': 'ogg',
          'video/quicktime': 'mov',
        } as Record<string, string>
      )[mimeType] ||
      mimeType.split('/')[1] ||
      'bin';
    const path = `${profileId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error: uploadError } = await this.client.storage
      .from('profile-media')
      .upload(path, body, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;
    const mediaType = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('audio/')
        ? 'audio'
        : 'video';
    const { data: inserted, error } = await this.client
      .from('media_samples')
      .insert({
        profile_id: profileId,
        media_type: mediaType,
        storage_path: path,
        title,
        mime_type: mimeType,
        size_bytes: body.byteLength,
      })
      .select('id')
      .single();
    if (error) {
      await this.client.storage.from('profile-media').remove([path]);
      throw error;
    }
    if (mediaType === 'image' && title === 'Profile photo') {
      const { data: previous } = await this.client
        .from('media_samples')
        .select('id,storage_path')
        .eq('profile_id', profileId)
        .eq('media_type', 'image')
        .eq('title', 'Profile photo')
        .neq('id', inserted.id);
      if (previous?.length) {
        const ids = previous.map((item: Row) => String(item.id));
        const paths = previous.map((item: Row) => String(item.storage_path)).filter(Boolean);
        const { error: deleteError } = await this.client
          .from('media_samples')
          .delete()
          .in('id', ids);
        if (!deleteError && paths.length)
          await this.client.storage.from('profile-media').remove(paths);
      }
    }
  }
  async listNotifications() {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((x: Row) => ({
      id: String(x.id),
      type: x.kind as 'match' | 'message' | 'session',
      title: String(x.title),
      body: String(x.body),
      time: new Date(String(x.created_at)).toLocaleDateString(),
      read: Boolean(x.read_at),
    }));
  }
  async markNotificationsRead() {
    const { data: user } = await this.client.auth.getUser();
    if (!user.user) return;
    const { error } = await this.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.user.id)
      .is('read_at', null);
    if (error) throw error;
  }
  async getDiscoveryPreferences(): Promise<DiscoveryPreferences> {
    const { data, error } = await this.client.from('discovery_preferences').select('*').single();
    if (error) throw error;
    return {
      maxDistanceKm: data.max_distance_km,
      ageMin: data.age_min,
      ageMax: data.age_max,
      instruments: data.instrument_names || [],
      genres: data.genre_names || [],
      goals: data.goals || [],
      commitment: data.commitments || [],
      availableNowOnly: Boolean(data.available_now_only),
      transportationRequired: Boolean(data.transportation_required),
      performanceReadyGearRequired: Boolean(data.performance_ready_gear_required),
    };
  }
  async saveDiscoveryPreferences(p: DiscoveryPreferences) {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) throw new Error('Sign in to save preferences.');
    const { error } = await this.client.from('discovery_preferences').upsert({
      user_id: user.id,
      max_distance_km: p.maxDistanceKm,
      age_min: p.ageMin,
      age_max: p.ageMax,
      instrument_names: p.instruments,
      genre_names: p.genres,
      goals: p.goals,
      commitments: p.commitment,
      available_now_only: Boolean(p.availableNowOnly),
      transportation_required: Boolean(p.transportationRequired),
      performance_ready_gear_required: Boolean(p.performanceReadyGearRequired),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
  async listProposals(conversationId: string): Promise<SessionProposal[]> {
    const { data, error } = await this.client.rpc('conversation_proposals', {
      target_conversation_id: conversationId,
    });
    if (error) throw error;
    return (data || []).map((item: Row) => {
      const start = new Date(String(item.starts_at));
      return {
        id: item.id,
        conversationId: item.conversation_id,
        kind: item.kind,
        date: start.toLocaleDateString(),
        time: start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        location: item.general_location,
        songs: item.songs,
        status: item.status,
        startsAt: String(item.starts_at),
        readyCount: Number(item.ready_count || 0),
        myReady: Boolean(item.my_ready),
        myOutcome: item.my_outcome || undefined,
      };
    });
  }
  async respondToProposal(id: string, status: 'accepted' | 'declined') {
    const { error } = await this.client.rpc('respond_to_proposal', {
      proposal_id: id,
      response: status,
    });
    if (error) throw error;
  }
  async markConversationRead(conversationId: string) {
    const { error } = await this.client.rpc('mark_conversation_read', {
      target_conversation_id: conversationId,
    });
    if (error) throw error;
  }
  async listBlocked() {
    const { data, error } = await this.client.rpc('my_blocked_profiles');
    if (error) throw error;
    return (data || []).map(mapProfile);
  }
  async unblock(targetId: string) {
    const { error } = await this.client.from('blocks').delete().eq('blocked_id', targetId);
    if (error) throw error;
  }
  async getSubscriptionTier(): Promise<SubscriptionTier> {
    const { data, error } = await this.client.from('subscription_status').select('tier').single();
    if (error) throw error;
    return data.tier;
  }
  async getLikeAllowance(): Promise<LikeAllowance> {
    const { data, error } = await this.client.rpc('my_like_allowance');
    if (error) throw error;
    const item = data?.[0] || data;
    return {
      tier: item.tier,
      used: Number(item.used_count || 0),
      limit: item.daily_limit == null ? null : Number(item.daily_limit),
      remaining: item.remaining_count == null ? null : Number(item.remaining_count),
    };
  }
  async listProfilesWhoLikedMe(): Promise<MusicianProfile[]> {
    const { data, error } = await this.client.rpc('profiles_who_liked_me');
    if (error) throw error;
    const profiles = await Promise.all(
      (data || []).map((item: Row) => this.getProfile(String(item.profile_id))),
    );
    return profiles.filter((profile): profile is MusicianProfile => Boolean(profile));
  }
  async rewindLastPass(): Promise<string | null> {
    const { data, error } = await this.client.rpc('rewind_last_pass');
    if (error) throw error;
    return data || null;
  }
  async activateProfileBoost(): Promise<string> {
    const { data, error } = await this.client.rpc('activate_profile_boost');
    if (error) throw error;
    return String(data);
  }
  async saveSettings(settings: UserSettings) {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) throw new Error('Sign in to save settings.');
    const [profile, prefs] = await Promise.all([
      this.client
        .from('musician_profiles')
        .update({
          discovery_visible: settings.discoveryVisible && !settings.incognito,
          available_now: settings.showAvailableNow,
        })
        .eq('user_id', user.id),
      this.client
        .from('discovery_preferences')
        .update({ notifications_muted: !settings.notifications })
        .eq('user_id', user.id),
    ]);
    if (profile.error) throw profile.error;
    if (prefs.error) throw prefs.error;
  }
  async registerPushDevice(token: string, platform: 'ios' | 'android' | 'web') {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) throw new Error('Sign in to enable notifications.');
    const { error } = await this.client.from('push_devices').upsert(
      {
        user_id: user.id,
        expo_push_token: token,
        platform,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' },
    );
    if (error) throw error;
  }
  async deleteMedia(mediaId: string, storagePath?: string) {
    if (storagePath) {
      const { error } = await this.client.storage.from('profile-media').remove([storagePath]);
      if (error) throw error;
    }
    const { error } = await this.client.from('media_samples').delete().eq('id', mediaId);
    if (error) throw error;
  }
  async saveProfileForLater(targetId: string) {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) throw new Error('Sign in to save musicians.');
    const { error } = await this.client
      .from('saved_profiles')
      .upsert({ user_id: user.id, saved_user_id: targetId });
    if (error) throw error;
  }
  async listSavedProfiles() {
    const { data, error } = await this.client.rpc('my_saved_profiles');
    if (error) throw error;
    return Promise.all(
      (data || []).map(mapProfile).map((profile: MusicianProfile) => this.withMediaUrls(profile)),
    );
  }
  async removeSavedProfile(targetId: string) {
    const { error } = await this.client
      .from('saved_profiles')
      .delete()
      .eq('saved_user_id', targetId);
    if (error) throw error;
  }
  async listBandCalls(): Promise<BandCall[]> {
    const { data, error } = await this.client.rpc('band_call_feed');
    if (error) throw error;
    return (data || []).map((item: Row) => ({
      id: String(item.id),
      creatorId: String(item.creator_id),
      creatorName: String(item.creator_name),
      title: String(item.title),
      description: String(item.description),
      location: String(item.general_location),
      genres: (item.genres as string[]) || [],
      rolesNeeded: (item.roles_needed as string[]) || [],
      commitment: item.commitment as BandCall['commitment'],
      rehearsalFrequency: String(item.rehearsal_frequency),
      createdAt: new Date(String(item.created_at)).toLocaleDateString(),
    }));
  }
  async createBandCall(input: Omit<BandCall, 'id' | 'creatorId' | 'creatorName' | 'createdAt'>) {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) throw new Error('Sign in to post a band call.');
    const { error } = await this.client.from('band_calls').insert({
      creator_id: user.id,
      title: input.title,
      description: input.description,
      general_location: input.location,
      genres: input.genres,
      roles_needed: input.rolesNeeded,
      commitment: input.commitment,
      rehearsal_frequency: input.rehearsalFrequency,
    });
    if (error) throw error;
  }
  async applyToBandCall(id: string, intro: string) {
    const { error } = await this.client.rpc('apply_to_band_call', {
      target_band_call_id: id,
      application_intro: intro,
    });
    if (error) throw error;
  }
  async listBandCallApplications(id: string): Promise<BandCallApplication[]> {
    const { data, error } = await this.client.rpc('band_call_applicants', {
      target_band_call_id: id,
    });
    if (error) throw error;
    return (data || []).map((item: Row) => ({
      id: String(item.id),
      bandCallId: String(item.band_call_id),
      applicantId: String(item.applicant_id),
      applicantName: String(item.applicant_name),
      primaryInstrument: String(item.primary_instrument),
      intro: String(item.intro),
      status: item.status as BandCallApplication['status'],
      createdAt: new Date(String(item.created_at)).toLocaleDateString(),
    }));
  }
  async respondToBandCallApplication(id: string, status: 'invited' | 'declined') {
    const { data, error } = await this.client.rpc('respond_to_band_call_application', {
      application_id: id,
      response: status,
    });
    if (error) throw error;
    return data ? String(data) : null;
  }
  async setSessionReady(id: string, ready: boolean) {
    const { error } = await this.client.rpc('set_session_ready', {
      target_proposal_id: id,
      is_ready: ready,
    });
    if (error) throw error;
  }
  async confirmSessionOutcome(id: string, outcome: 'happened' | 'did_not_happen') {
    const { error } = await this.client.rpc('confirm_session_outcome', {
      target_proposal_id: id,
      outcome_value: outcome,
    });
    if (error) throw error;
  }
  async trackEvent(
    name: ProductEventName,
    properties: Record<string, string | number | boolean> = {},
  ) {
    const { error } = await this.client.from('product_events').insert({
      event_name: name,
      properties,
    });
    if (error) throw error;
  }
  async listCollaborationItems(conversationId: string): Promise<CollaborationItem[]> {
    const { data, error } = await this.client
      .from('collaboration_items')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at');
    if (error) throw error;
    return (data || []).map((item: Row) => ({
      id: String(item.id),
      conversationId: String(item.conversation_id),
      type: item.item_type as CollaborationItem['type'],
      text: String(item.text),
      completed: Boolean(item.completed),
      createdBy: String(item.created_by),
      createdAt: new Date(String(item.created_at)).toLocaleDateString(),
    }));
  }
  async addCollaborationItem(
    conversationId: string,
    type: CollaborationItem['type'],
    text: string,
  ) {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) throw new Error('Sign in to update the Band Room.');
    const { data, error } = await this.client
      .from('collaboration_items')
      .insert({
        conversation_id: conversationId,
        item_type: type,
        text: text.trim(),
        created_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      conversationId: data.conversation_id,
      type: data.item_type,
      text: data.text,
      completed: data.completed,
      createdBy: data.created_by,
      createdAt: 'Now',
    };
  }
  async toggleCollaborationItem(id: string, completed: boolean) {
    const { error } = await this.client
      .from('collaboration_items')
      .update({ completed, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }
  async deleteCollaborationItem(id: string) {
    const { error } = await this.client.from('collaboration_items').delete().eq('id', id);
    if (error) throw error;
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase =
  url && anon
    ? createClient(url, anon, {
        auth: {
          storage: authStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      })
    : null;
const productionRepository = supabase ? new SupabaseRepository(supabase) : null;
const demoRepository = new DemoRepository();
export let repository: DelosRepository | null = productionRepository;
export function enableDemoRepository() {
  repository = demoRepository;
}
export function enableSupabaseRepository() {
  repository = productionRepository;
}
