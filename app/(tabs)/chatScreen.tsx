import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ComponentType, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getListingById } from '@/services/listings.service';
import ExploreCardUntyped from '../../src/components/ExploreCard';
import EventDetail from '../../src/components/details/EventDetail';
import OfferingDetail from '../../src/components/details/OfferingDetail';
import StayDetail from '../../src/components/details/StayDetail';
import { useAppData } from '@/store/AppDataContext';
import { useAppMode } from '@/store/AppModeContext';
import { useBottomNavScroll } from '@/store/BottomNavVisibilityContext';
import { GuideResult, guideService } from '@/services/guideService';
import { InteractionService } from '@/services/interactionService';
import { SearchListing } from '@/services/searchService';
import { extractIntent } from '@/features/chat/utils/guideNlp';

// ExploreCard is a plain .jsx component with no prop typings.
const ExploreCard = ExploreCardUntyped as ComponentType<{ item: any; onPress: () => void }>;

type Listing = SearchListing & { image_url?: string | null };

interface QuickPrompt {
  id: string;
  icon: string;
  label: string;
  prompt: string | null; // null => "surprise me": trending, skips keyword parsing
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { id: 'eat', icon: 'restaurant-outline', label: 'New places to eat near me', prompt: 'new places to eat near me' },
  { id: 'weekend', icon: 'sunny-outline', label: 'Weekend plans', prompt: 'weekend plans' },
  { id: 'tonight', icon: 'moon-outline', label: "Tonight's nightlife", prompt: 'nightlife tonight' },
  { id: 'nextweek', icon: 'calendar-outline', label: 'Something next week', prompt: 'events next week' },
  { id: 'stay', icon: 'bed-outline', label: 'Somewhere to stay', prompt: 'somewhere to stay' },
  { id: 'surprise', icon: 'sparkles-outline', label: 'Surprise me', prompt: null },
];

type ChatItem =
  | { id: string; role: 'guide'; kind: 'text'; text: string }
  | { id: string; role: 'user'; kind: 'text'; text: string }
  | { id: string; role: 'guide'; kind: 'loading' }
  | { id: string; role: 'guide'; kind: 'results'; headline: string; listings: Listing[] };

export default function ChatScreen() {
  const router = useRouter();
  const { theme } = useAppMode();
  const insets = useSafeAreaInsets();
  const bottomNavScroll = useBottomNavScroll();
  const { userName, userId } = useAppData();
  const styles = getStyles(theme, insets);

  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [detailsType, setDetailsType] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChatItem>>(null);
  const detailRequestRef = useRef<string | null>(null);
  const idRef = useRef(0);
  const nextId = () => `guide-${Date.now()}-${idRef.current++}`;

  useEffect(() => {
    setMessages([
      { id: nextId(), role: 'guide', kind: 'text', text: `Hey ${userName || 'there'}, what's the vibe today?` },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages]);

  const appendMessages = (items: ChatItem[]) => setMessages((prev) => [...prev, ...items]);

  const runGuideTask = async (task: () => Promise<GuideResult>) => {
    const loadingId = nextId();
    appendMessages([{ id: loadingId, role: 'guide', kind: 'loading' }]);
    try {
      const result = await task();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== loadingId),
        result.listings.length > 0
          ? { id: nextId(), role: 'guide', kind: 'results', headline: result.headline, listings: result.listings }
          : { id: nextId(), role: 'guide', kind: 'text', text: "I couldn't find a match for that yet — try another vibe below." },
      ]);
    } catch (err) {
      console.error('Guide task failed', err);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== loadingId),
        { id: nextId(), role: 'guide', kind: 'text', text: 'Something went wrong finding results — please try again.' },
      ]);
    }
  };

  const handleSend = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInputText('');
    appendMessages([{ id: nextId(), role: 'user', kind: 'text', text: trimmed }]);
    const intent = extractIntent(trimmed);
    runGuideTask(() => guideService.getRecommendations(intent)).finally(() => setSending(false));
  };

  const handlePromptPress = (prompt: QuickPrompt) => {
    if (sending) return;
    setSending(true);
    appendMessages([{ id: nextId(), role: 'user', kind: 'text', text: prompt.label }]);
    const resultPromise =
      prompt.prompt === null ? guideService.getTrending() : guideService.getRecommendations(extractIntent(prompt.prompt));
    runGuideTask(() => resultPromise).finally(() => setSending(false));
  };

  const handleCardPress = async (listing: Listing) => {
    detailRequestRef.current = listing.id;
    setDetailsType(listing.listing_type);
    setSelectedListing(listing);
    if (userId) InteractionService.trackClick(userId, listing.id).catch(() => {});
    try {
      const detailed = await getListingById(listing.id);
      if (detailRequestRef.current !== listing.id) return;
      if (detailed) setSelectedListing(detailed);
    } catch (err) {
      console.error('Guide: failed to load listing details', err);
    }
  };

  const handleCloseDetails = () => {
    detailRequestRef.current = null;
    setSelectedListing(null);
    setDetailsType(null);
  };

  const handleHostPress = (hostId: string) => {
    router.push(`/host/${hostId}` as any);
  };

  const renderItem = ({ item }: { item: ChatItem }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userBubbleText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    switch (item.kind) {
      case 'text':
        return (
          <View style={styles.guideRow}>
            <View style={styles.guideBubble}>
              <Text style={styles.guideBubbleText}>{item.text}</Text>
            </View>
          </View>
        );
      case 'loading':
        return (
          <View style={styles.guideRow}>
            <View style={[styles.guideBubble, styles.typingBubble]}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, { opacity: 0.6 }]} />
              <View style={[styles.typingDot, { opacity: 0.3 }]} />
            </View>
          </View>
        );
      case 'results':
        return (
          <View style={styles.resultsBlock}>
            <View style={styles.guideRow}>
              <View style={styles.guideBubble}>
                <Text style={styles.guideBubbleText}>{item.headline}</Text>
              </View>
            </View>
            <FlatList
              data={item.listings}
              keyExtractor={(l) => l.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              renderItem={({ item: listing }) => (
                <View style={styles.carouselCard}>
                  <ExploreCard item={listing} onPress={() => handleCardPress(listing)} />
                </View>
              )}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Guide</Text>
          <Text style={styles.headerSubtitle}>Your personal travel advisor</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        {...bottomNavScroll}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.suggestionsBar}
        contentContainerStyle={styles.suggestionsContent}
        keyboardShouldPersistTaps="handled"
      >
        {QUICK_PROMPTS.map((p) => (
          <TouchableOpacity key={p.id} style={styles.chip} onPress={() => handlePromptPress(p)} activeOpacity={0.8}>
            <Ionicons name={p.icon as any} size={14} color={theme.colors.primary} />
            <Text style={styles.chipText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about food, weekend plans, next month's events..."
          placeholderTextColor={theme.colors.textSubtle}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend(inputText)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => handleSend(inputText)}
          disabled={!inputText.trim() || sending}
        >
          <Ionicons name="send" size={18} color={theme.colors.buttonText} />
        </TouchableOpacity>
      </View>

      {selectedListing && detailsType === 'stay' && (
        <StayDetail listing={selectedListing} onClose={handleCloseDetails} onHostPress={handleHostPress} />
      )}
      {selectedListing && detailsType === 'event' && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetails} onHostPress={handleHostPress} />
      )}
      {selectedListing && detailsType === 'offering' && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetails} onHostPress={handleHostPress} />
      )}
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme: any, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: insets.top + 12,
      paddingBottom: 14,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.primaryTint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 1,
    },
    listContent: {
      paddingHorizontal: 14,
      paddingVertical: 16,
    },
    guideRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    guideBubble: {
      maxWidth: '85%',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 10,
    },
    guideBubbleText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    userRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    userBubble: {
      maxWidth: '85%',
      backgroundColor: theme.colors.primaryTint,
      borderRadius: 16,
      borderBottomRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 10,
    },
    userBubbleText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
      lineHeight: 20,
    },
    typingBubble: {
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
      paddingVertical: 14,
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.textMuted,
    },
    resultsBlock: {
      marginBottom: 10,
    },
    carouselContent: {
      gap: 10,
      paddingRight: 14,
      paddingBottom: 4,
    },
    carouselCard: {
      width: 150,
    },
    suggestionsBar: {
      flexGrow: 0,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    suggestionsContent: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 20,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,
      backgroundColor: theme.colors.surface,
    },
    input: {
      flex: 1,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontSize: 14,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.buttonBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.5,
    },
  });
