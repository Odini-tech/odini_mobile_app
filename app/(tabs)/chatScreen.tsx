import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppMode } from '../../src/context/AppModeContext';
import { useBottomNavVisibility } from '../../src/context/BottomNavVisibilityContext';

type Sender = 'user' | 'bot';

interface Message {
  id: string;
  text: string;
  sender: Sender;
  ts: Date;
}

const WELCOME: Message = {
  id: 'welcome',
  sender: 'bot',
  ts: new Date(),
  text:
    "Hi there! 👋 I'm your Odini assistant.\n\nI can help you find stays, events, and offerings, answer booking questions, and guide you around the app. What can I help you with?",
};

const SUGGESTIONS = [
  'Find a stay',
  'Upcoming events',
  'How do I book?',
  'Change currency',
];

function getBotResponse(raw: string): string {
  const t = raw.toLowerCase();

  if (/\b(hi|hello|hey|howdy|good\s*(morning|evening|afternoon))\b/.test(t))
    return "Hey! 😊 Great to hear from you. What can I help you with today?";

  if (/\b(stay|hotel|room|accommodat|overnight|check.in|check.out)\b/.test(t))
    return "We have a great selection of stays! 🏨\n\nOpen the Home screen and filter by 'Stays' to browse. You can filter by location, dates, and number of guests.";

  if (/\b(event|concert|festival|workshop|conference|sport|show|ticket)\b/.test(t))
    return "Odini is packed with events! 🎉\n\nHead to the Home screen and filter by 'Events'. You'll find concerts, workshops, conferences, sports events, and more.";

  if (/\b(offer|service|spa|salon|treat|massage|beauty)\b/.test(t))
    return "Our offerings cover everything from spa treatments to professional services. 💆\n\nFilter by 'Offerings' on the Home screen to explore what's available near you.";

  if (/\b(book|reserv|reserve|how.*(book|reserv))\b/.test(t))
    return "Booking is easy! Here's how:\n\n1. Find a listing you like\n2. Tap 'Book Now'\n3. Fill in your details & dates\n4. Confirm — you'll get a booking reference instantly ✅";

  if (/\b(cancel|refund|cancellat)\b/.test(t))
    return "To cancel a booking, go to your bookings and tap 'Cancel'. ⚠️\n\nRefund policies are set by each host — always check the listing details before booking.";

  if (/\b(price|cost|fee|how much|cheap|expensive|afford|budget)\b/.test(t))
    return "Prices are set by each host and vary by listing. 💰\n\nYou can display prices in your preferred currency — go to Profile → Preferences → Currency to change it.";

  if (/\b(currency|zmw|usd|dollar|pound|euro|kwacha|rand|kes|ngn)\b/.test(t))
    return "You can switch your display currency in Profile → Preferences → Currency. 💱\n\nWe support ZMW, USD, GBP, EUR, ZAR, KES, NGN, CAD, AUD, and CNY!";

  if (/\b(location|where|lusaka|zambia|africa|city|near|area)\b/.test(t))
    return "Use the Search tab 🔍 to find listings in a specific area. Just type a city or location and we'll show you what's nearby.";

  if (/\b(host|list|creat|publish|add listing|become a host)\b/.test(t))
    return "Want to list your property or service? 🏡\n\nContact the Odini team to get set up as a host. Once approved, you can list stays, events, and offerings.";

  if (/\b(profile|account|setting|password|detail|personal info)\b/.test(t))
    return "You can manage everything in the Profile tab 👤:\n\n• Edit personal details (name, phone, location)\n• Toggle dark/light theme\n• Change display currency\n• Sign out";

  if (/\b(theme|dark|light|mode|appear)\b/.test(t))
    return "You can switch between light and dark mode in Profile → Preferences → Theme. 🌙\n\nIt's saved automatically so it persists across sessions.";

  if (/\b(search|find|discover|explore|browse)\b/.test(t))
    return "Use the Search tab to discover listings! 🔍\n\nFilter by type (stays, events, offerings), location, and price to find exactly what you're looking for.";

  if (/\b(help|support|problem|issue|assist|what can)\b/.test(t))
    return "Here's what I can help with:\n\n🏨 Finding stays, events & offerings\n📅 Making & managing bookings\n💱 Pricing & currency settings\n👤 Profile & account settings\n🔍 Navigating the app\n\nJust ask!";

  if (/\b(thank|thanks|great|awesome|perfect|good job|cheers)\b/.test(t))
    return "You're welcome! 😊 Feel free to ask anything else.";

  if (/\b(bye|goodbye|see you|later|cya)\b/.test(t))
    return "Goodbye! 👋 Come back anytime. Happy exploring on Odini!";

  return "Hmm, I'm not sure about that specifically, but I can help with stays, events, bookings, pricing, and navigating the app. Try asking something along those lines!";
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { theme } = useAppMode();
  const { setBottomNavVisible } = useBottomNavVisibility();
  const styles = getStyles(theme);

  // Hide the bottom nav while on chat — the input bar replaces it
  useEffect(() => {
    setBottomNavVisible(false);
    return () => setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, botTyping, scrollToBottom]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        text: trimmed,
        sender: 'user',
        ts: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setBotTyping(true);

      setTimeout(() => {
        const botMsg: Message = {
          id: `b-${Date.now()}`,
          text: getBotResponse(trimmed),
          sender: 'bot',
          ts: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setBotTyping(false);
      }, 700 + Math.random() * 400);
    },
    []
  );

  const isOnlyWelcome = messages.length === 1;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.botAvatar}>
          <Ionicons name="chatbubbles" size={22} color={theme.colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Odini Assistant</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.row,
              msg.sender === 'user' ? styles.rowUser : styles.rowBot,
            ]}
          >
            {msg.sender === 'bot' && (
              <View style={styles.miniAvatar}>
                <Ionicons name="chatbubbles" size={12} color={theme.colors.white} />
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot,
              ]}
            >
              <Text
                style={
                  msg.sender === 'user' ? styles.textUser : styles.textBot
                }
              >
                {msg.text}
              </Text>
              <Text
                style={[
                  styles.ts,
                  msg.sender === 'user' ? styles.tsUser : styles.tsBot,
                ]}
              >
                {fmtTime(msg.ts)}
              </Text>
            </View>
          </View>
        ))}

        {/* Typing indicator */}
        {botTyping && (
          <View style={[styles.row, styles.rowBot]}>
            <View style={styles.miniAvatar}>
              <Ionicons name="chatbubbles" size={12} color={theme.colors.white} />
            </View>
            <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
              <TypingDots color={theme.colors.textMuted} />
            </View>
          </View>
        )}

        {/* Suggested quick replies */}
        {isOnlyWelcome && !botTyping && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => sendMessage(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Input bar ── */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask me anything..."
          placeholderTextColor={theme.colors.textSubtle}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={() => sendMessage(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || botTyping}
        >
          <Ionicons
            name="send"
            size={18}
            color={input.trim() ? theme.colors.white : theme.colors.textSubtle}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Three animated dots typing indicator
function TypingDots({ color }: { color: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);
  const dots = '.'.repeat(frame);
  return (
    <Text style={{ fontSize: 20, color, letterSpacing: 2, height: 24 }}>{dots}</Text>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 14,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    botAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    onlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.success,
    },
    onlineText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: '500',
    },

    // Messages area
    messages: {
      flex: 1,
    },
    messagesContent: {
      paddingVertical: 16,
      paddingHorizontal: 14,
    },

    row: {
      flexDirection: 'row',
      marginBottom: 10,
      alignItems: 'flex-end',
    },
    rowUser: {
      justifyContent: 'flex-end',
    },
    rowBot: {
      justifyContent: 'flex-start',
    },

    miniAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      flexShrink: 0,
    },

    bubble: {
      maxWidth: '76%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleUser: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    bubbleBot: {
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    typingBubble: {
      paddingVertical: 12,
      minWidth: 60,
      alignItems: 'center',
    },

    textUser: {
      fontSize: 15,
      color: theme.colors.white,
      lineHeight: 22,
    },
    textBot: {
      fontSize: 15,
      color: theme.colors.text,
      lineHeight: 22,
    },

    ts: { fontSize: 11, marginTop: 4 },
    tsUser: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
    tsBot: { color: theme.colors.textSubtle },

    // Suggested replies
    suggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
      marginLeft: 36,
    },
    suggestionChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryTint,
    },
    suggestionText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '500',
    },

    // Input bar
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 15,
      color: theme.colors.text,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnOff: {
      backgroundColor: theme.colors.surfaceStrong,
    },
  });
