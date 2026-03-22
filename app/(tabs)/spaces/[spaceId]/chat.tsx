import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Message, MessageStatus, SpaceMember } from '../../../../../shared/contracts';
import {
  deleteMessage,
  getMembers,
  getMessages,
  getSpace,
  leaveSpace,
  sendMessage,
} from '../../../../services/spaceService';
import { ApiError, getAuthSession } from '../../../../utils/api';

type ChatMessage = Message & {
  senderName: string;
};

const DEFAULT_COMPOSER_HEIGHT = 74;
const EXTRA_SCROLL_PADDING = 16;
const ACTION_TRAY_HEIGHT = 220;

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

const getTemporaryMessageStatus = (
  message: Message,
  currentUserId: string | null,
): MessageStatus => {
  if (message.senderUserId === currentUserId) {
    return 'delivered';
  }

  return 'read';
};

export default function SpaceChatScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const actionTrayTranslateY = useRef(new Animated.Value(ACTION_TRAY_HEIGHT)).current;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);
  const [spaceName, setSpaceName] = useState('Space Chat');
  const [spaceCreatorUserId, setSpaceCreatorUserId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [actionTrayVisible, setActionTrayVisible] = useState(false);

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

  const openActionTray = (message: ChatMessage) => {
    setSelectedMessage(message);
    setActionTrayVisible(true);
    Animated.timing(actionTrayTranslateY, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const closeActionTray = useCallback(() => {
    Animated.timing(actionTrayTranslateY, {
      toValue: ACTION_TRAY_HEIGHT,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setActionTrayVisible(false);
        setSelectedMessage(null);
      }
    });
  }, [actionTrayTranslateY]);

  const loadMessages = useCallback(async () => {
    if (!spaceId) {
      setError('Missing space id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [spaceResponse, messagesResponse, membersResponse] = await Promise.all([
        getSpace(spaceId),
        getMessages(spaceId),
        getMembers(spaceId),
      ]);

      const space = spaceResponse.space ?? spaceResponse.group;
      const nextMembers = membersResponse.members;

      setSpaceName(space?.name ?? 'Space Chat');
      setSpaceCreatorUserId(space?.createdByUserId ?? null);
      setMembers(nextMembers);

      const memberNames = new Map<string, string>(
        nextMembers.map((member: SpaceMember) => [member.userId, member.name]),
      );

      const nextMessages = [...messagesResponse.messages]
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        )
        .map((message) => ({
          ...message,
          status: getTemporaryMessageStatus(message, currentUserId),
          senderName: memberNames.get(message.senderUserId) ?? 'Unknown member',
        }));

      setMessages(nextMessages);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load chat.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, spaceId]);

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
  const isCreator = currentUserId !== null && currentUserId === spaceCreatorUserId;
  const currentMembership = members.find((member) => member.userId === currentUserId) ?? null;
  const canDeleteSelectedMessage =
    selectedMessage !== null && selectedMessage.senderUserId === currentUserId;

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const handleViewMembers = () => {
    if (!spaceId) {
      return;
    }

    closeMenu();
    router.push(`/(tabs)/spaces/${spaceId}/members`);
  };

  const handleSpaceInfo = () => {
    if (!spaceId) {
      return;
    }

    closeMenu();
    router.push(`/(tabs)/spaces/${spaceId}`);
  };

  const handleLeaveGroup = async () => {
    if (!spaceId || !currentMembership) {
      return;
    }

    closeMenu();

    try {
      await leaveSpace(spaceId, currentMembership.id);
      router.replace('/(tabs)/spaces');
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to leave this space.');
    }
  };

  const handleCopyMessage = async () => {
    if (!selectedMessage) {
      return;
    }

    try {
      await Clipboard.setStringAsync(selectedMessage.text);
    } catch {
      setError('Unable to copy this message.');
    } finally {
      closeActionTray();
    }
  };

  const handleForwardMessage = () => {
    closeActionTray();
    Alert.alert('Forward', 'Forward coming soon');
  };

  const performDeleteMessage = async () => {
    if (!spaceId || !selectedMessage || !canDeleteSelectedMessage) {
      return;
    }

    try {
      await deleteMessage(spaceId, selectedMessage.id);
      setMessages((prev) => prev.filter((message) => message.id !== selectedMessage.id));
      closeActionTray();
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to delete this message.');
      closeActionTray();
    }
  };

  const confirmDeleteMessage = () => {
    if (!canDeleteSelectedMessage) {
      return;
    }

    Alert.alert(
      'Delete message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void performDeleteMessage();
          },
        },
      ],
    );
  };

  const handleDeleteMessage = () => {
    confirmDeleteMessage();
  };

  const renderStatusIcon = (status: MessageStatus) => {
    if (status === 'sent') {
      return <Ionicons color="#6b7280" name="checkmark" size={14} style={styles.statusIcon} />;
    }

    if (status === 'read') {
      return (
        <Ionicons color="#16a34a" name="checkmark-done" size={16} style={styles.statusIcon} />
      );
    }

    return <Ionicons color="#6b7280" name="checkmark-done" size={16} style={styles.statusIcon} />;
  };

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
          status: 'sent',
          senderName: currentUserName,
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
      <View style={styles.screen}>
        <View
          style={styles.header}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.headerIconButton}>
            <Ionicons color="#132238" name="arrow-back" size={22} />
          </Pressable>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {spaceName}
          </Text>
          <Pressable
            accessibilityLabel="More options"
            hitSlop={10}
            onPress={() => setMenuVisible(true)}
            style={styles.headerIconButton}>
            <Ionicons color="#132238" name="ellipsis-vertical" size={20} />
          </Pressable>
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
                  <Pressable
                    onLongPress={() => openActionTray(message)}
                    style={[
                      styles.messageBubble,
                      isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
                    ]}>
                    <Text style={styles.senderName}>{isCurrentUser ? 'You' : message.senderName}</Text>
                    <Text style={styles.messageText}>{message.text}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.messageTime}>{formatMessageTime(message.createdAt)}</Text>
                      <View style={styles.statusContainer}>{renderStatusIcon(message.status)}</View>
                    </View>
                  </Pressable>
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
            <View style={styles.inputShell}>
              <Pressable accessibilityLabel="Attach" hitSlop={8} style={styles.attachButton}>
                <Ionicons color="#6b7280" name="attach" size={20} />
              </Pressable>
              <TextInput
                multiline
                onChangeText={setDraft}
                placeholder="Type a message"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                textAlignVertical="top"
                value={draft}
              />
            </View>
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

        {menuVisible ? (
          <View style={styles.menuOverlay}>
            <Pressable onPress={closeMenu} style={styles.menuBackdrop} />
            <View style={[styles.menuTray, { top: headerHeight - 12 }]}>
              <Pressable onPress={handleViewMembers} style={styles.menuItem}>
                <Text style={styles.menuItemText}>View Members</Text>
              </Pressable>
              <Pressable onPress={handleSpaceInfo} style={styles.menuItem}>
                <Text style={styles.menuItemText}>Space Info</Text>
              </Pressable>
              {!isCreator && currentMembership ? (
                <Pressable onPress={() => { void handleLeaveGroup(); }} style={styles.menuItem}>
                  <Text style={[styles.menuItemText, styles.destructiveMenuItemText]}>
                    Leave Group
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {actionTrayVisible ? (
          <View style={styles.actionTrayOverlay}>
            <Pressable onPress={closeActionTray} style={styles.actionTrayBackdrop} />
            <Animated.View
              style={[
                styles.actionTray,
                { transform: [{ translateY: actionTrayTranslateY }] },
              ]}>
              <Pressable onPress={() => { void handleCopyMessage(); }} style={styles.actionRow}>
                <Text style={styles.actionRowText}>Copy</Text>
              </Pressable>
              <Pressable onPress={handleForwardMessage} style={styles.actionRow}>
                <Text style={styles.actionRowText}>Forward</Text>
              </Pressable>
              {canDeleteSelectedMessage ? (
                <Pressable onPress={handleDeleteMessage} style={styles.actionRow}>
                  <Text style={[styles.actionRowText, styles.destructiveMenuItemText]}>Delete</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#efeae2',
  },
  screen: {
    flex: 1,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#fffdf9',
    borderBottomColor: '#e7dfd1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerIconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTitle: {
    color: '#132238',
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  messageTime: {
    color: '#6b7280',
    fontSize: 11,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginLeft: 2,
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
  inputShell: {
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderColor: '#d7dce2',
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 8,
  },
  attachButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 24,
  },
  input: {
    color: '#132238',
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 30,
    paddingVertical: 4,
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
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menuTray: {
    right: 24,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    elevation: 8,
    minWidth: 170,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    color: '#132238',
    fontSize: 15,
    fontWeight: '600',
  },
  destructiveMenuItemText: {
    color: '#b42318',
  },
  actionTrayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 60,
  },
  actionTrayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  actionTray: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  actionRow: {
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  actionRowText: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '600',
  },
});
