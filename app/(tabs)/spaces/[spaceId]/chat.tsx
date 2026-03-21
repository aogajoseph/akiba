import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Message, SpaceMember } from '../../../../../shared/contracts';
import { getMembers, getMessages, sendMessage } from '../../../../services/spaceService';
import { ApiError, getAuthSession } from '../../../../utils/api';

type ChatMessage = Message & {
  senderName: string;
};

const DEFAULT_COMPOSER_HEIGHT = 74;
const EXTRA_SCROLL_PADDING = 16;

const formatMessageTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();
  const isCurrentYear = date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (isCurrentYear) {
    return date.toLocaleString([], {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
    });
  }

  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function SpaceChatScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);

  const insets = useSafeAreaInsets();

  const currentSession = getAuthSession();
  const currentUserId = currentSession?.user.id ?? null;
  const currentUserName = currentSession?.user.name ?? 'You';

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!spaceId) {
      setError('Missing space id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [messagesResponse, membersResponse] = await Promise.all([
        getMessages(spaceId),
        getMembers(spaceId),
      ]);

      const memberNames = new Map<string, string>(
        membersResponse.members.map((member: SpaceMember) => [member.userId, member.name]),
      );

      const nextMessages = [...messagesResponse.messages]
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        )
        .map((message) => ({
          ...message,
          senderName: memberNames.get(message.senderUserId) ?? 'Unknown member',
        }));

      setMessages(nextMessages);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load chat.');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useFocusEffect(
    useCallback(() => {
      void loadMessages();
    }, [loadMessages]),
  );

  useEffect(() => {
    if (!loading) {
      scrollToBottom(false);
    }
  }, [loading, messages, scrollToBottom]);

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);
  const composerBottom = keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0;
  const messagesBottomPadding = composerHeight + keyboardHeight + EXTRA_SCROLL_PADDING;

  const handleSend = async () => {
    const text = draft.trim();

    if (!spaceId || !text) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await sendMessage(spaceId, text);

      setMessages((current) => [
        ...current,
        {
          ...response.message,
          senderName:
            currentUserId !== null && response.message.senderUserId === currentUserId
              ? currentUserName
              : 'Unknown member',
        },
      ]);
      setDraft('');
      scrollToBottom();
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Space Chat</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.chatArea}>
        {loading ? <ActivityIndicator color="#0f766e" style={styles.loader} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScrollView}
          contentContainerStyle={[
            styles.messagesContainer,
            { paddingBottom: messagesBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToBottom(!loading)}>
          {!loading && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>Start the conversation</Text>
            </View>
          ) : null}

          {messages.map((message) => {
            const isCurrentUser = currentUserId === message.senderUserId;

            return (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  isCurrentUser ? styles.currentUserRow : styles.otherUserRow,
                ]}>
                <View
                  style={[
                    styles.messageBubble,
                    isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
                  ]}>
                  <Text style={styles.senderName}>{isCurrentUser ? 'You' : message.senderName}</Text>
                  <Text style={styles.messageText}>{message.text}</Text>
                  <Text style={styles.messageTime}>{formatMessageTime(message.createdAt)}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            if (nextHeight > 0 && nextHeight !== composerHeight) {
              setComposerHeight(nextHeight);
            }
          }}
          style={[styles.composer, { bottom: composerBottom }]}>
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder="Type a message"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            textAlignVertical="top"
            value={draft}
          />
          <Pressable
            accessibilityLabel="Send message"
            disabled={!canSend}
            onPress={() => {
              void handleSend();
            }}
            style={[styles.sendButton, !canSend ? styles.disabledButton : null]}>
            <Ionicons color="#ffffff" name="send" size={18} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#efeae2',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#fffdf9',
    borderBottomColor: '#e7dfd1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 40,
  },
  chatArea: {
    flex: 1,
    position: 'relative',
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    gap: 10,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 6,
  },
  messageRow: {
    flexDirection: 'row',
  },
  currentUserRow: {
    justifyContent: 'flex-end',
  },
  otherUserRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    gap: 6,
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  currentUserBubble: {
    backgroundColor: '#dcf8c6',
    borderTopRightRadius: 6,
  },
  otherUserBubble: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 6,
  },
  senderName: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  messageText: {
    color: '#132238',
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  messageTime: {
    alignSelf: 'flex-end',
    color: '#6b7280',
    fontSize: 11,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: '#fffdf9',
    borderTopColor: '#e7dfd1',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    left: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    position: 'absolute',
    right: 0,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d7dce2',
    borderRadius: 24,
    borderWidth: 1,
    color: '#132238',
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
