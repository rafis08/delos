import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { messageSchema } from '@/domain/validation';
import { colors, radius } from '@/theme';
import { Message, SessionProposal } from '@/types';
import { useApp } from '@/store/AppContext';
import { addProposalToCalendar } from '@/services/calendar';
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<SessionProposal[]>([]);
  const { userId } = useApp();
  const conversationRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!repository) {
      setMessages([]);
      setError('Supabase is not configured.');
      return;
    }
    Promise.all([repository.listMessages(id), repository.listProposals(id)])
      .then(([nextMessages, nextProposals]) => {
        setMessages(nextMessages);
        setProposals(nextProposals);
        void repository?.markConversationRead(id);
      })
      .catch(() => {
        setMessages([]);
        setError('Messages could not load.');
      });
    const unsubscribe = repository.subscribeMessages(id, (message) =>
      setMessages((current) =>
        current?.some((item) => item.id === message.id) ? current : [...(current || []), message],
      ),
    );
    return unsubscribe;
  }, [id]);
  const send = async () => {
    const v = messageSchema.safeParse(body);
    if (!v.success) {
      setError(v.error.issues[0]?.message || 'Check your message');
      return;
    }
    try {
      if (!repository) throw new Error('Supabase is not configured.');
      const m = await repository.sendMessage(id, body.trim());
      if ((messages?.length || 0) === 0)
        void repository
          .trackEvent('first_message_sent', { conversationId: id })
          .catch(() => undefined);
      setMessages((x) => [...(x || []), m]);
      setBody('');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.ink }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <Screen scroll={false} style={styles.screen}>
        <Header title="Conversation" eyebrow="MATCHED" />
        <ScrollView
          ref={conversationRef}
          style={styles.conversation}
          contentContainerStyle={styles.conversationContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => conversationRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.nextActions}>
            <Pressable onPress={() => router.push(`/proposal/${id}`)} style={styles.plan}>
              <Ionicons name="calendar" color={colors.accent} />
              <Text style={styles.planText}>Plan a session</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/room/${id}`)} style={styles.plan}>
              <Ionicons name="albums" color={colors.accent} />
              <Text style={styles.planText}>Band Room</Text>
            </Pressable>
          </View>
          {proposals.map((proposal) => (
            <View key={proposal.id} style={styles.proposal}>
              <Text style={styles.proposalTitle}>
                {proposal.kind} · {proposal.status.toUpperCase()}
              </Text>
              <Text style={styles.proposalText}>
                {proposal.date} at {proposal.time}
              </Text>
              <Text style={styles.proposalText}>{proposal.location}</Text>
              <Text style={styles.proposalText}>{proposal.songs.join(' · ')}</Text>
              {proposal.status === 'pending' && (
                <View style={styles.proposalActions}>
                  <Pressable
                    onPress={async () => {
                      await repository?.respondToProposal(proposal.id, 'declined');
                      setProposals((items) =>
                        items.map((item) =>
                          item.id === proposal.id ? { ...item, status: 'declined' } : item,
                        ),
                      );
                    }}
                  >
                    <Text style={styles.decline}>Decline</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      await repository?.respondToProposal(proposal.id, 'accepted');
                      void repository
                        ?.trackEvent('session_accepted', { proposalId: proposal.id })
                        .catch(() => undefined);
                      setProposals((items) =>
                        items.map((item) =>
                          item.id === proposal.id ? { ...item, status: 'accepted' } : item,
                        ),
                      );
                    }}
                  >
                    <Text style={styles.accept}>Accept</Text>
                  </Pressable>
                </View>
              )}
              {proposal.status === 'accepted' && (
                <View style={styles.acceptedArea}>
                  <View style={styles.readyRow}>
                    <Pressable
                      onPress={() =>
                        void addProposalToCalendar(proposal).catch((cause) =>
                          setError(
                            cause instanceof Error ? cause.message : 'Could not open calendar.',
                          ),
                        )
                      }
                    >
                      <Text style={styles.accept}>Add to calendar</Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        const ready = !proposal.myReady;
                        await repository?.setSessionReady(proposal.id, ready);
                        setProposals((items) =>
                          items.map((item) =>
                            item.id === proposal.id
                              ? {
                                  ...item,
                                  myReady: ready,
                                  readyCount: Math.max(
                                    0,
                                    (item.readyCount || 0) + (ready ? 1 : -1),
                                  ),
                                }
                              : item,
                          ),
                        );
                      }}
                      style={[styles.readyButton, proposal.myReady && styles.readyButtonActive]}
                    >
                      <Text style={styles.readyText}>
                        {proposal.myReady ? 'READY ✓' : "I'M READY"}
                      </Text>
                    </Pressable>
                    <Text style={styles.readyCount}>{proposal.readyCount || 0}/2 ready</Text>
                  </View>
                  {proposal.startsAt && new Date(proposal.startsAt) < new Date() && (
                    <View style={styles.outcome}>
                      <Text style={styles.outcomeTitle}>Did this session happen?</Text>
                      <Text style={styles.outcomeBody}>
                        Your private confirmation helps Delos measure real musical connections.
                      </Text>
                      {proposal.myOutcome ? (
                        <Text style={styles.outcomeSaved}>
                          {proposal.myOutcome === 'happened'
                            ? 'SESSION CONFIRMED ✓'
                            : 'RESPONSE SAVED'}
                        </Text>
                      ) : (
                        <View style={styles.proposalActions}>
                          <Pressable
                            onPress={() => void confirmOutcome(proposal, 'did_not_happen')}
                          >
                            <Text style={styles.decline}>Not this time</Text>
                          </Pressable>
                          <Pressable onPress={() => void confirmOutcome(proposal, 'happened')}>
                            <Text style={styles.accept}>Yes, we played</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
          {messages?.length === 0 && (
            <View style={styles.starters}>
              <Text style={styles.starterLabel}>START WITH SOMETHING REAL</Text>
              {[
                'What are you rehearsing right now?',
                'Which weeknight usually works for you?',
                'Want to trade three-song references?',
              ].map((prompt) => (
                <Pressable key={prompt} onPress={() => setBody(prompt)} style={styles.starter}>
                  <Text style={styles.starterText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {messages === null ? (
            <StateView loading title="Loading messages" body="Getting the conversation…" />
          ) : (
            <View style={styles.messages}>
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[styles.bubble, m.senderId === userId ? styles.mine : styles.theirs]}
                >
                  <Text
                    style={[styles.message, m.senderId === userId && { color: colors.accentInk }]}
                  >
                    {m.body}
                  </Text>
                  <Text style={[styles.time, m.senderId === userId && { color: '#5B3700' }]}>
                    {m.createdAt}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message"
            value={body}
            onChangeText={setBody}
            onSubmitEditing={send}
            placeholder="Message…"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={send}
            style={styles.send}
          >
            <Ionicons name="arrow-up" color={colors.accentInk} size={22} />
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );

  async function confirmOutcome(proposal: SessionProposal, outcome: 'happened' | 'did_not_happen') {
    try {
      await repository?.confirmSessionOutcome(proposal.id, outcome);
      setProposals((items) =>
        items.map((item) => (item.id === proposal.id ? { ...item, myOutcome: outcome } : item)),
      );
      if (outcome === 'happened')
        await repository?.trackEvent('session_confirmed', { proposalId: proposal.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your response.');
    }
  }
}
const styles = StyleSheet.create({
  screen: { paddingBottom: 10, gap: 12 },
  conversation: { flex: 1 },
  conversationContent: { flexGrow: 1, gap: 12, justifyContent: 'flex-end' },
  nextActions: { flexDirection: 'row', gap: 8 },
  plan: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  planText: { color: colors.accent, fontWeight: '800' },
  proposal: {
    backgroundColor: '#FFF6DC',
    borderColor: '#F2B134',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  starters: { gap: 7 },
  starterLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  starter: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  starterText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  proposalTitle: { color: colors.text, fontWeight: '900' },
  proposalText: { color: colors.muted, fontSize: 12 },
  proposalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 6 },
  decline: { color: colors.danger, fontWeight: '800' },
  accept: { color: '#7A4100', fontWeight: '900' },
  readyRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 7 },
  acceptedArea: { gap: 10 },
  outcome: { borderTopWidth: 1, borderTopColor: '#F2C35E', paddingTop: 10, gap: 5 },
  outcomeTitle: { color: colors.text, fontWeight: '900' },
  outcomeBody: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  outcomeSaved: { color: '#7A4100', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  readyButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#B86B00',
  },
  readyButtonActive: { backgroundColor: colors.accent },
  readyText: { color: '#6B3C00', fontWeight: '900', fontSize: 11 },
  readyCount: { color: colors.muted, fontWeight: '700', fontSize: 11 },
  messages: { gap: 10, justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', padding: 13, borderRadius: 18, gap: 5 },
  mine: { backgroundColor: colors.accent, alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  theirs: { backgroundColor: colors.raised, alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  message: { color: colors.text, fontSize: 16, lineHeight: 21 },
  time: { color: colors.muted, fontSize: 10, alignSelf: 'flex-end' },
  error: { color: colors.danger, fontSize: 12 },
  composer: { flexDirection: 'row', gap: 9 },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.panel,
    borderRadius: radius.pill,
    color: colors.text,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
