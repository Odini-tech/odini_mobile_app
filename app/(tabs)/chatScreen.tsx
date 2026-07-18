import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppMode } from '../../src/context/AppModeContext';
import { listingService, type Listing } from '../../src/services/listingService';
import { InteractionService } from '../../src/services/interactionService';
import { RecommendationService, type AskListingCard } from '../../src/services/recommendationService';
import { safetyService, type SafetyNote } from '../../src/services/safetyService';
import { supabase } from '../../lib/supabase';

const SUGGESTED_PROMPTS = [
  'Best budget safari near Livingstone',
  "What's a good rainy-day plan in Lusaka?",
  'Somewhere quiet to stay near Victoria Falls',
];

export default function ChatScreen() {
  const { theme } = useAppMode();
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AskListingCard[]>([]);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [selected, setSelected] = useState<AskListingCard | null>(null);
  const hasSearched = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  const runSearch = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    hasSearched.current = true;
    setLoading(true);
    setLastQuery(trimmed);
    setResults([]);

    try {
      const listings = await RecommendationService.getAskOdini(trimmed);
      setResults(listings);
    } finally {
      setLoading(false);
    }
  };

  const openListing = async (card: AskListingCard) => {
    setSelected(card);
    // Best-effort — never blocks the UI, never throws.
    RecommendationService.recordInteraction(card.id, 'view').catch(() => undefined);
    if (userId) {
      InteractionService.trackView(userId, card.id).catch(() => undefined);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {!hasSearched.current && results.length === 0 && !loading && (
        <View style={styles.introWrap}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryTint }]}>
            <Ionicons name="sparkles-outline" size={36} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Ask Odini</Text>
          <Text style={[styles.body, { color: theme.colors.textMuted }]}>
            Ask about places, safaris, or things to do in Lusaka and Livingstone.
          </Text>
          <View style={styles.suggestionsWrap}>
            {SUGGESTED_PROMPTS.map(prompt => (
              <Pressable
                key={prompt}
                onPress={() => {
                  setQuery(prompt);
                  runSearch(prompt);
                }}
                style={[styles.suggestionPill, { backgroundColor: theme.colors.primaryTint, borderColor: theme.colors.border }]}
              >
                <Text style={[styles.suggestionText, { color: theme.colors.primary }]}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Thinking it through…</Text>
        </View>
      )}

      {!loading && lastQuery && (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.resultsList}
          ListHeaderComponent={
            <Text style={[styles.resultsHeader, { color: theme.colors.textMuted }]}>
              {results.length > 0
                ? `Odini's picks for "${lastQuery}"`
                : `No matches yet for "${lastQuery}" — try rephrasing, or ask about Lusaka or Livingstone specifically.`}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openListing(item)}
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {typeof item.score === 'number' && (
                  <View style={[styles.scoreBadge, { backgroundColor: theme.colors.primaryTint }]}>
                    <Text style={[styles.scoreText, { color: theme.colors.primary }]}>
                      {Math.round(item.score * 100)}% match
                    </Text>
                  </View>
                )}
              </View>
              {!!item.explanation && (
                <Text style={[styles.cardExplanation, { color: theme.colors.textMuted }]} numberOfLines={2}>
                  {item.explanation}
                </Text>
              )}
              {item.price != null && (
                <Text style={[styles.cardPrice, { color: theme.colors.text }]}>K{item.price.toLocaleString()}</Text>
              )}
            </Pressable>
          )}
        />
      )}

      <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(query)}
          placeholder="Ask Odini anything about Zambia…"
          placeholderTextColor={theme.colors.textSubtle}
          style={[styles.input, { color: theme.colors.text }]}
          returnKeyType="search"
        />
        <Pressable
          onPress={() => runSearch(query)}
          disabled={loading || !query.trim()}
          style={[styles.sendButton, { backgroundColor: theme.colors.primary, opacity: loading || !query.trim() ? 0.5 : 1 }]}
        >
          <Ionicons name="arrow-up" size={18} color={theme.colors.white} />
        </Pressable>
      </View>

      <ListingDetailModal card={selected} onClose={() => setSelected(null)} theme={theme} />
    </KeyboardAvoidingView>
  );
}

function ListingDetailModal({
  card,
  onClose,
  theme,
}: {
  card: AskListingCard | null;
  onClose: () => void;
  theme: any;
}) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [safetyNote, setSafetyNote] = useState<SafetyNote | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!card) {
      setListing(null);
      setSafetyNote(null);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);

    (async () => {
      const city = card.location?.city || '';
      const activityTag = (card.tags && card.tags[0]) || (card.categories && card.categories[0]) || 'general';

      const [listingDetail, note] = await Promise.all([
        listingService.fetchListingById(card.id),
        city ? safetyService.getSafetyNote(city, activityTag) : Promise.resolve(null),
      ]);

      if (!cancelled) {
        setListing(listingDetail);
        setSafetyNote(note);
        setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [card]);

  const severityColor = (severity?: string) => {
    if (severity === 'warning') return theme.colors.danger;
    if (severity === 'caution') return theme.colors.primary;
    return theme.colors.success;
  };

  return (
    <Modal visible={!!card} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.background }]}>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </Pressable>

          {loadingDetail && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          )}

          {!loadingDetail && listing && (
            <View style={styles.detailSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>STAY</Text>
              <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{listing.title}</Text>
              {!!listing.description && (
                <Text style={[styles.detailBody, { color: theme.colors.textMuted }]}>{listing.description}</Text>
              )}
              {listing.price != null && (
                <Text style={[styles.detailPrice, { color: theme.colors.text }]}>K{listing.price}</Text>
              )}
            </View>
          )}

          {!loadingDetail && (
            <View
              style={[
                styles.detailSection,
                styles.safetyBox,
                { borderColor: severityColor(safetyNote?.severity), backgroundColor: theme.colors.surfaceAlt },
              ]}
            >
              <View style={styles.safetyHeaderRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color={severityColor(safetyNote?.severity)} />
                <Text style={[styles.sectionLabel, { color: severityColor(safetyNote?.severity) }]}>
                  SAFETY NOTE
                </Text>
              </View>
              <Text style={[styles.detailBody, { color: theme.colors.text }]}>
                {safetyNote?.noteText ||
                  'No specific safety note curated for this area yet — use general travel caution.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  introWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  body: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 2, paddingHorizontal: 12 },
  suggestionsWrap: { marginTop: 16, gap: 8, width: '100%' },
  suggestionPill: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  suggestionText: { fontSize: 14, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13 },
  resultsList: { padding: 16, gap: 12, flexGrow: 1 },
  resultsHeader: { fontSize: 13, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, gap: 6 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  scoreText: { fontSize: 11, fontWeight: '700' },
  cardExplanation: { fontSize: 13, lineHeight: 18 },
  cardPrice: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, padding: 10, gap: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 8, paddingHorizontal: 12 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', gap: 16 },
  modalClose: { alignSelf: 'flex-end', padding: 4 },
  detailSection: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  detailTitle: { fontSize: 20, fontWeight: '800' },
  detailBody: { fontSize: 14, lineHeight: 20 },
  detailPrice: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  safetyBox: { borderWidth: 1.5, borderRadius: 16, padding: 14 },
  safetyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
