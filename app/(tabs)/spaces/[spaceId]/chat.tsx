import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Message, SpaceMember } from '../../../../../shared/contracts';
import { getMembers, getMessages, sendMessage } from '../../../../services/spaceService';
import { ApiError, getAuthSession } from '../../../../utils/api';

type ChatMessage = Message & {
  senderName: string;
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
};

export default function SpaceChatScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentUserId = getAuthSession()?.user.id ?? null;

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

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);

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
              ? getAuthSession()?.user.name ?? 'You'
              : 'Unknown member',
        },
      ]);
      setDraft('');
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Space Chat</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? <ActivityIndicator color="#0f766e" style={styles.loader} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <ScrollView contentContainerStyle={styles.messagesContainer} style={styles.messagesScrollView}>
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
                  <Text style={styles.messageTime}>{formatTimestamp(message.createdAt)}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            onChangeText={setDraft}
            placeholder="Type a message"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={draft}
          />
          <Pressable
            disabled={!canSend}
            onPress={() => {
              void handleSend();
            }}
            style={[styles.sendButton, !canSend ? styles.disabledButton : null]}>
            <Text style={styles.sendButtonText}>{sending ? 'Sending...' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#efeae2',
  },
  keyboardArea: {
    flex: 1,
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
    gap: 12,
    padding: 16,
    paddingBottom: 24,
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
    padding: 14,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d7dce2',
    borderRadius: 24,
    borderWidth: 1,
    color: '#132238',
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 88,
    paddingHorizontal: 16,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
