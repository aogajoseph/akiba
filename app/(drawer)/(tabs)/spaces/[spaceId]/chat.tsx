import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  type ListRenderItemInfo,
  Image as NativeImage,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ApiResponse,
  Message,
  MessageMedia,
  MessageStatus,
  SpaceMember,
  TypingUser,
  type GetSpaceNotificationPreferenceResponseDto,
  type UpdateSpaceNotificationPreferenceResponseDto,
} from '../../../../../../shared/contracts';
import {
  deleteMessage,
  getTypingUsers,
  getMembers,
  getMessages,
  markMessagesRead,
  getSpace,
  leaveSpace,
  sendMessage,
  startTyping,
  stopTyping,
  toggleReaction,
  uploadMediaMessage,
  type MediaUploadAttachment,
} from '../../../../../services/spaceService';
import AkibaLink from '../../../../../components/AkibaLink';
import FullScreenImageViewer from '../../../../../components/FullScreenImageViewer';
import { uploadImageToCloudinary } from '../../../../../src/services/cloudinary';
import { api, ApiError, getAuthSession } from '../../../../../utils/api';

type ChatMessage = Message & {
  senderName: string;
};

type ReplyPreview = {
  senderName: string;
  text: string;
};

type MediaViewer = {
  type: 'image' | 'video';
  url: string;
};

type PresenceUpdatePayload = {
  onlineCount: number;
  spaceId: string;
};

type MessageCreatedEvent = {
  message: Message;
  spaceId: string;
};

type MessageDeletedEvent = {
  messageId: string;
  spaceId: string;
};

type ReactionUpdatedEvent = {
  message: Message;
  spaceId: string;
};

type TypingEventPayload = {
  spaceId: string;
  users: TypingUser[];
};

type ComposerMediaAttachment = MediaUploadAttachment & {
  height?: number;
  width?: number;
};

type ChatListItem =
  | {
      id: string;
      kind: 'message';
      message: ChatMessage;
      replyPreview: ReplyPreview | null;
      status: MessageStatus;
    }
  | {
      id: string;
      kind: 'divider';
    };

const DEFAULT_COMPOSER_HEIGHT = 74;
const EXTRA_SCROLL_PADDING = 16;
const ACTION_TRAY_HEIGHT = 220;
const MAX_SWIPE_DISTANCE = 88;
const REPLY_SWIPE_THRESHOLD = 72;
const TYPING_STOP_DELAY_MS = 900;
const TYPING_POLL_INTERVAL_MS = 2500;
const TYPING_INDICATOR_RESERVE = 28;
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;
const VIDEO_PLACEHOLDER_ASPECT_RATIO = 16 / 9;
const MESSAGE_HIGHLIGHT_DURATION_MS = 1200;
const COPY_TOAST_DURATION_MS = 1500;
const MESSAGE_POLL_INTERVAL_MS = 7500;
const REACTION_OPTIONS = ['👍', '❤️', '😂', '😮', '😢'] as const;

const getReplySnippet = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 90) {
    return normalized;
  }

  return `${normalized.slice(0, 87).trimEnd()}...`;
};

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

const renderStatusIcon = (status: MessageStatus) => {
  if (status === 'sent') {
    return <Ionicons color="#6b7280" name="checkmark" size={14} style={styles.statusIcon} />;
  }

  if (status === 'read') {
    return <Ionicons color="#16a34a" name="checkmark-done" size={16} style={styles.statusIcon} />;
  }

  return <Ionicons color="#6b7280" name="checkmark-done" size={16} style={styles.statusIcon} />;
};

const getComposerAttachmentType = (
  asset: ImagePicker.ImagePickerAsset,
): ComposerMediaAttachment['type'] | null => {
  if (asset.type === 'image' || asset.type === 'video') {
    return asset.type;
  }

  if (asset.mimeType?.startsWith('image/')) {
    return 'image';
  }

  if (asset.mimeType?.startsWith('video/')) {
    return 'video';
  }

  return null;
};

const renderMessageText = (text: string) => {
  const parts = text.split(/(akiba:\/\/spaces\/[^\s]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('akiba://spaces/')) {
      return <AkibaLink key={`${part}-${index}`} url={part} />;
    }

    return (
      <Text key={`${part}-${index}`} style={styles.messageText}>
        {part}
      </Text>
    );
  });
};

function MessageMediaCard({
  media,
  onPress,
  onSave,
}: {
  media: MessageMedia;
  onPress: (media: MessageMedia) => void;
  onSave: (url: string) => Promise<void>;
}) {
  const [aspectRatio, setAspectRatio] = useState(
    media.type === 'image' ? 1 : VIDEO_PLACEHOLDER_ASPECT_RATIO,
  );

  useEffect(() => {
    if (media.type !== 'image') {
      return;
    }

    NativeImage.getSize(
      media.url,
      (width, height) => {
        if (width > 0 && height > 0) {
          setAspectRatio(width / height);
        }
      },
      () => {
        setAspectRatio(1);
      },
    );
  }, [media.type, media.url]);

  return (
    <View style={styles.mediaContainer}>
      <View style={styles.mediaOverlay}>
        <Pressable
          onPress={() => {
            void onSave(media.url);
          }}
          style={styles.mediaIconButton}>
          <Ionicons color="#ffffff" name="download" size={18} />
        </Pressable>
      </View>
      <Pressable onPress={() => onPress(media)} style={styles.mediaAttachmentPressable}>
        <View style={styles.mediaWrapper}>
          {media.type === 'image' ? (
            <ExpoImage
              contentFit="cover"
              source={{ uri: media.url }}
              style={[
                styles.messageMediaImage,
                { aspectRatio },
              ]}
            />
          ) : (
            <View style={styles.messageVideoCard}>
              <Ionicons color="#ffffff" name="play-circle" size={42} />
              <Text style={styles.messageVideoLabel}>Video</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

type SwipeableMessageBubbleProps = {
  currentUserId: string | null;
  displayStatus: MessageStatus;
  isHighlighted: boolean;
  isCurrentUser: boolean;
  message: ChatMessage;
  onLongPress: (message: ChatMessage) => void;
  onOpenMedia: (media: MessageMedia) => void;
  onReplyPress: (message: ChatMessage) => void;
  onSaveMedia: (url: string) => Promise<void>;
  onReply: (message: ChatMessage) => void;
  replyPreview: ReplyPreview | null;
};

const SwipeableMessageBubble = memo(function SwipeableMessageBubble({
  currentUserId,
  displayStatus,
  isHighlighted,
  isCurrentUser,
  message,
  onLongPress,
  onOpenMedia,
  onReplyPress,
  onSaveMedia,
  onReply,
  replyPreview,
}: SwipeableMessageBubbleProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const messageMedia = message.media?.[0] ?? null;

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 22,
    }).start();
  }, [translateX]);

  const triggerReply = useCallback(() => {
    onReply(message);
    resetPosition();
  }, [message, onReply, resetPosition]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dx > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderMove: (_event, gestureState) => {
          translateX.setValue(Math.min(Math.max(0, gestureState.dx), MAX_SWIPE_DISTANCE));
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx >= REPLY_SWIPE_THRESHOLD) {
            triggerReply();
            return;
          }

          resetPosition();
        },
        onPanResponderTerminate: resetPosition,
      }),
    [resetPosition, translateX, triggerReply],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{ transform: [{ translateX }] }}>
      <Pressable
        onLongPress={() => onLongPress(message)}
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isHighlighted ? styles.highlightedMessageBubble : null,
        ]}>
        {replyPreview ? (
          <Pressable
            onPress={() => onReplyPress(message)}
            style={[
              styles.inlineReplyContainer,
              isCurrentUser ? styles.inlineReplyCurrentUser : styles.inlineReplyOtherUser,
            ]}>
            <Text numberOfLines={1} style={styles.inlineReplySender}>
              {replyPreview.senderName}
            </Text>
            <Text numberOfLines={2} style={styles.inlineReplyText}>
              {replyPreview.text}
            </Text>
          </Pressable>
        ) : null}
        {messageMedia ? (
          <MessageMediaCard
            media={messageMedia}
            onPress={onOpenMedia}
            onSave={onSaveMedia}
          />
        ) : null}
        <Text style={styles.senderName}>{isCurrentUser ? 'You' : message.senderName}</Text>
        {message.text ? (
          <View style={styles.messageTextWrapper}>
            {renderMessageText(message.text)}
          </View>
        ) : null}
        {message.reactions.length > 0 ? (
          <View style={styles.reactionsContainer}>
            {message.reactions.map((reaction) => {
              const reacted =
                currentUserId !== null && reaction.userIds.includes(currentUserId);

              return (
                <View
                  key={reaction.emoji}
                  style={[styles.reactionChip, reacted ? styles.reactionChipActive : null]}>
                  <Text style={styles.reactionText}>
                    {reaction.emoji} {reaction.userIds.length}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.messageTime}>{formatMessageTime(message.createdAt)}</Text>
          <View style={styles.statusContainer}>{renderStatusIcon(displayStatus)}</View>
        </View>
      </Pressable>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.displayStatus === nextProps.displayStatus &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.isCurrentUser === nextProps.isCurrentUser &&
    prevProps.message === nextProps.message &&
    prevProps.onLongPress === nextProps.onLongPress &&
    prevProps.onOpenMedia === nextProps.onOpenMedia &&
    prevProps.onReplyPress === nextProps.onReplyPress &&
    prevProps.onSaveMedia === nextProps.onSaveMedia &&
    prevProps.onReply === nextProps.onReply &&
    prevProps.replyPreview?.senderName === nextProps.replyPreview?.senderName &&
    prevProps.replyPreview?.text === nextProps.replyPreview?.text
  );
});

export default function SpaceChatScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const messagesListRef = useRef<FlatList<ChatListItem> | null>(null);
  const actionTrayTranslateY = useRef(new Animated.Value(ACTION_TRAY_HEIGHT)).current;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [nextMessagesCursor, setNextMessagesCursor] = useState<string | null>(null);
  const [newMessagesDividerMessageId, setNewMessagesDividerMessageId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);
  const [spaceName, setSpaceName] = useState('Space Chat');
  const [spaceImageUrl, setSpaceImageUrl] = useState<string | null>(null);
  const [spaceCreatorUserId, setSpaceCreatorUserId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const [notificationsPreferenceLoading, setNotificationsPreferenceLoading] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [actionTrayVisible, setActionTrayVisible] = useState(false);
  const [replyTargetMessage, setReplyTargetMessage] = useState<ChatMessage | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<ComposerMediaAttachment | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [mediaViewer, setMediaViewer] = useState<MediaViewer | null>(null);
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const isTypingRef = useRef(false);
  const copyToastOpacity = useRef(new Animated.Value(0)).current;
  const copyToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceSocketRef = useRef<Socket | null>(null);
  const isNearBottomRef = useRef(true);

  const insets = useSafeAreaInsets();

  const currentSession = getAuthSession();
  const currentUserId = currentSession?.user.id ?? null;
  const currentUserName = currentSession?.user.name ?? 'You';
  const previousMessageSignatureRef = useRef('');
  const membersRef = useRef<SpaceMember[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const lastMessageTimestampRef = useRef<string | null>(null);
  const lastMarkedReadAtRef = useRef<string | null>(null);
  const hasUserInteractedWithLatestRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);
  const previousLatestMessageIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      messagesListRef.current?.scrollToOffset({ animated, offset: 0 });
    });
  }, []);

  const mergeMessages = useCallback(
    (current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
      const messagesById = new Map<string, ChatMessage>();
  
      for (const message of current) {
        messagesById.set(message.id, message);
      }
  
      for (const message of incoming) {
        const existing = messagesById.get(message.id);
  
        if (!existing) {
          messagesById.set(message.id, {
            ...message,
            media: message.media ?? [],
            reactions: message.reactions ?? [],
            status: message.status ?? 'sent',
          });
          continue;
        }
  
        const existingTime = new Date(existing.createdAt).getTime();
        const incomingTime = new Date(message.createdAt).getTime();
  
        if (incomingTime >= existingTime) {
          messagesById.set(message.id, {
            ...existing,
            ...message,
            media: message.media ?? existing.media ?? [],
            reactions: message.reactions ?? existing.reactions ?? [],
            status: message.status ?? existing.status ?? 'sent',
          });
        }
      }
  
      return Array.from(messagesById.values()).sort((a, b) => {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  
        if (diff !== 0) return diff;
  
        return a.id.localeCompare(b.id);
      });
    },
    []
  );

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    messagesRef.current = messages;
    lastMessageTimestampRef.current = messages[messages.length - 1]?.createdAt ?? null;
  }, [messages]);

  useEffect(() => {
    setLastReadAt(null);
    lastMarkedReadAtRef.current = null;
    hasUserInteractedWithLatestRef.current = false;
    isNearBottomRef.current = true;
    setNewMessagesDividerMessageId(null);
  }, [spaceId]);

  useEffect(() => {
    let isActive = true;

    if (!spaceId) {
      setMuted(false);
      setNotificationsPreferenceLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadNotificationPreference = async () => {
      setNotificationsPreferenceLoading(true);

      try {
        const response = await api.get<ApiResponse<GetSpaceNotificationPreferenceResponseDto>>(
          `/spaces/${spaceId}/notification-preference`,
        );

        if (!isActive) {
          return;
        }

        setMuted(Boolean(response.data?.data?.muted));
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        const apiError = caughtError as ApiError;
        console.warn('Failed to load notification preference', apiError.error ?? caughtError);
        setMuted(false);
      } finally {
        if (isActive) {
          setNotificationsPreferenceLoading(false);
        }
      }
    };

    void loadNotificationPreference();

    return () => {
      isActive = false;
    };
  }, [spaceId]);

  useEffect(() => {
    if (!lastReadAt) {
      setNewMessagesDividerMessageId(null);
      return;
    }

    const dividerStillValid =
      newMessagesDividerMessageId &&
      messages.some((message) => message.id === newMessagesDividerMessageId) &&
      messages.some(
        (message) =>
          message.id === newMessagesDividerMessageId &&
          new Date(message.createdAt).getTime() > new Date(lastReadAt).getTime(),
      );

    if (dividerStillValid) {
      return;
    }

    const firstUnreadMessage = messages.find(
      (message) => new Date(message.createdAt).getTime() > new Date(lastReadAt).getTime(),
    );

    setNewMessagesDividerMessageId(firstUnreadMessage?.id ?? null);
  }, [lastReadAt, messages, newMessagesDividerMessageId]);

  const getDisplayMessageStatus = useCallback((message: ChatMessage): MessageStatus => {
    if (!lastReadAt) {
      return message.status ?? 'sent';
    }

    return new Date(message.createdAt).getTime() <= new Date(lastReadAt).getTime()
      ? 'read'
      : (message.status ?? 'sent');
  }, [lastReadAt]);

  const markVisibleMessagesRead = useCallback(async (candidateTimestamp?: string) => {
    if (!spaceId) {
      return;
    }

    const latestVisibleTimestamp =
      candidateTimestamp ?? messagesRef.current[messagesRef.current.length - 1]?.createdAt;

    if (!latestVisibleTimestamp) {
      return;
    }

    if (
      lastMarkedReadAtRef.current &&
      new Date(latestVisibleTimestamp).getTime() <= new Date(lastMarkedReadAtRef.current).getTime()
    ) {
      return;
    }

    try {
      const response = await markMessagesRead(spaceId, latestVisibleTimestamp);
      lastMarkedReadAtRef.current = response.lastReadAt;
      setLastReadAt(response.lastReadAt);
    } catch {
      // Keep this quiet; later fetches will reconcile read state.
    }
  }, [spaceId]);

  const highlightMessage = useCallback((messageId: string) => {
    setHighlightedMessageId(messageId);

    if (highlightedMessageTimeoutRef.current) {
      clearTimeout(highlightedMessageTimeoutRef.current);
    }

    highlightedMessageTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
      highlightedMessageTimeoutRef.current = null;
    }, MESSAGE_HIGHLIGHT_DURATION_MS);
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

  useEffect(() => {
    return () => {
      if (highlightedMessageTimeoutRef.current) {
        clearTimeout(highlightedMessageTimeoutRef.current);
      }

      if (copyToastTimeoutRef.current) {
        clearTimeout(copyToastTimeoutRef.current);
      }
    };
  }, []);

  const showCopyConfirmation = useCallback(() => {
    if (copyToastTimeoutRef.current) {
      clearTimeout(copyToastTimeoutRef.current);
      copyToastTimeoutRef.current = null;
    }

    copyToastOpacity.stopAnimation();
    copyToastOpacity.setValue(0);
    setShowCopyToast(true);

    Animated.timing(copyToastOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    copyToastTimeoutRef.current = setTimeout(() => {
      Animated.timing(copyToastOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowCopyToast(false);
        }
      });

      copyToastTimeoutRef.current = null;
    }, COPY_TOAST_DURATION_MS);
  }, [copyToastOpacity]);

  const clearTypingStopTimeout = useCallback(() => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
  }, []);

  const notifyStartTyping = useCallback(async () => {
    if (!spaceId || isTypingRef.current) {
      return;
    }

    isTypingRef.current = true;

    try {
      await startTyping(spaceId);
    } catch {
      isTypingRef.current = false;
    }
  }, [spaceId]);

  const notifyStopTyping = useCallback(async () => {
    clearTypingStopTimeout();

    if (!spaceId || !isTypingRef.current) {
      return;
    }

    isTypingRef.current = false;

    try {
      await stopTyping(spaceId);
    } catch {
      // Keep this quiet for the MVP; polling will reconcile the UI state.
    }
  }, [clearTypingStopTimeout, spaceId]);

  const scheduleTypingStop = useCallback(() => {
    clearTypingStopTimeout();
    typingStopTimeoutRef.current = setTimeout(() => {
      void notifyStopTyping();
    }, TYPING_STOP_DELAY_MS);
  }, [clearTypingStopTimeout, notifyStopTyping]);

  const loadTypingUsers = useCallback(async () => {
    if (!spaceId) {
      setTypingUsers([]);
      return;
    }

    try {
      const response = await getTypingUsers(spaceId);
      setTypingUsers(
        response.users.filter((user) => user.userId !== currentUserId),
      );
    } catch {
      // Ignore transient polling errors.
    }
  }, [currentUserId, spaceId]);

  useFocusEffect(
    useCallback(() => {
      if (!spaceId) {
        setTypingUsers([]);
        return undefined;
      }

      void loadTypingUsers();

      const interval = setInterval(() => {
        void loadTypingUsers();
      }, TYPING_POLL_INTERVAL_MS);

      return () => {
        clearInterval(interval);
        setTypingUsers([]);
        clearTypingStopTimeout();
        void notifyStopTyping();
      };
    }, [clearTypingStopTimeout, loadTypingUsers, notifyStopTyping, spaceId]),
  );

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

  const loadMessages = useCallback(async (options?: {
    cursor?: string;
    limit?: number;
    merge?: boolean;
    silent?: boolean;
    since?: string;
  }) => {
    if (!spaceId) {
      setError('Missing space id.');
      setLoading(false);
      return;
    }

    const isLoadingOlderPage = Boolean(options?.cursor);

    if (isLoadingOlderPage) {
      setLoadingOlderMessages(true);
    } else if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const [spaceResponse, messagesResponse, membersResponse] = await Promise.all([
        getSpace(spaceId),
        getMessages(spaceId, {
          cursor: options?.cursor,
          limit: options?.limit,
          since: options?.since,
        }),
        getMembers(spaceId),
      ]);

      const space = spaceResponse.space ?? spaceResponse.group;
      const nextMembers = membersResponse.members;

      setSpaceName(space?.name ?? 'Space Chat');
      setSpaceImageUrl(space?.imageUrl ?? null);
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
          media: message.media ?? [],
          reactions: message.reactions ?? [],
          status: message.status ?? 'sent',
          senderName: memberNames.get(message.senderUserId) ?? 'Unknown member',
        }));

      const resolvedMessages = options?.merge
        ? mergeMessages(messagesRef.current, nextMessages)
        : nextMessages;

      if (messagesResponse.lastReadAt) {
        lastMarkedReadAtRef.current = messagesResponse.lastReadAt;
        setLastReadAt(messagesResponse.lastReadAt);
      }

      if (!options?.since) {
        setNextMessagesCursor(messagesResponse.nextCursor ?? null);
      }

      const nextMessageSignature = JSON.stringify(
        resolvedMessages.map((message) => ({
          createdAt: message.createdAt,
          id: message.id,
          reactions: message.reactions,
          replyToMessageId: message.replyToMessageId,
          status: message.status,
          text: message.text,
        })),
      );

      if (nextMessageSignature !== previousMessageSignatureRef.current) {
        previousMessageSignatureRef.current = nextMessageSignature;
        messagesRef.current = resolvedMessages;
        setMessages(resolvedMessages);
      }
    } catch (caughtError) {
      if (!options?.silent) {
        const apiError = caughtError as ApiError;
        setError(apiError.error ?? 'Unable to load chat.');
      }
    } finally {
      if (isLoadingOlderPage) {
        setLoadingOlderMessages(false);
      } else if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [mergeMessages, spaceId]);

  const loadOlderMessages = useCallback(async () => {
    if (!nextMessagesCursor || loading || loadingOlderMessages) {
      return;
    }

    await loadMessages({
      cursor: nextMessagesCursor,
      limit: 20,
      merge: true,
      silent: true,
    });
  }, [loadMessages, loading, loadingOlderMessages, nextMessagesCursor]);

  useEffect(() => {
    const socketBaseUrl = api.defaults.baseURL;

    if (!spaceId || !currentUserId || !socketBaseUrl) {
      setOnlineCount(0);
      hasConnectedOnceRef.current = false;
      return undefined;
    }

    const socket = io(socketBaseUrl);
    const handleConnect = () => {
      socket.emit('join_space', {
        spaceId,
        token: currentSession?.accessToken,
        userId: currentUserId,
      });

      if (hasConnectedOnceRef.current) {
        void loadMessages({
          merge: true,
          silent: true,
          since: lastMessageTimestampRef.current ?? undefined,
        });
      } else {
        hasConnectedOnceRef.current = true;
      }
    };
    const handlePresenceUpdate = (payload: PresenceUpdatePayload) => {
      if (payload.spaceId === spaceId) {
        setOnlineCount(payload.onlineCount);
      }
    };
    const resolveSenderName = (senderUserId: string) => {
      if (senderUserId === currentUserId) {
        return currentUserName;
      }

      return membersRef.current.find((member) => member.userId === senderUserId)?.name ?? 'Unknown member';
    };
    const toRealtimeMessage = (message: Message): ChatMessage => ({
      ...message,
      media: message.media ?? [],
      reactions: message.reactions ?? [],
      status: message.status ?? 'sent',
      senderName: resolveSenderName(message.senderUserId),
    });
    const handleMessageCreated = (payload: MessageCreatedEvent) => {
      if (payload.spaceId !== spaceId) {
        return;
      }

      setMessages((current) => mergeMessages(current, [toRealtimeMessage(payload.message)]));
    };
    const handleMessageDeleted = (payload: MessageDeletedEvent) => {
      if (payload.spaceId !== spaceId) {
        return;
      }

      setMessages((current) => current.filter((message) => message.id !== payload.messageId));
      setSelectedMessage((current) =>
        current?.id === payload.messageId ? null : current,
      );
      setReplyTargetMessage((current) =>
        current?.id === payload.messageId ? null : current,
      );
    };
    const handleReactionUpdated = (payload: ReactionUpdatedEvent) => {
      if (payload.spaceId !== spaceId) {
        return;
      }

      const nextMessage = toRealtimeMessage(payload.message);

      setMessages((current) => mergeMessages(current, [nextMessage]));

      setSelectedMessage((current) =>
        current?.id === nextMessage.id
          ? {
              ...current,
              ...nextMessage,
            }
          : current,
      );
    };
    const handleTypingUpdate = (payload: TypingEventPayload) => {
      if (payload.spaceId !== spaceId) {
        return;
      }

      setTypingUsers(payload.users.filter((user) => user.userId !== currentUserId));
    };

    presenceSocketRef.current = socket;
    socket.on('connect', handleConnect);
    socket.on('presence_update', handlePresenceUpdate);
    socket.on('message_created', handleMessageCreated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('typing', handleTypingUpdate);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('presence_update', handlePresenceUpdate);
      socket.off('message_created', handleMessageCreated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('typing', handleTypingUpdate);
      socket.disconnect();
      presenceSocketRef.current = null;
      hasConnectedOnceRef.current = false;
      setOnlineCount(0);
    };
  }, [currentUserId, currentUserName, loadMessages, mergeMessages, spaceId]);

  useFocusEffect(
    useCallback(() => {
      void loadMessages({ limit: 20 });

      const interval = setInterval(() => {
        void loadMessages({
          merge: true,
          silent: true,
          since: lastMessageTimestampRef.current ?? undefined,
        });
      }, MESSAGE_POLL_INTERVAL_MS);

      return () => {
        clearInterval(interval);
      };
    }, [loadMessages]),
  );

  useEffect(() => {
    const latestMessageId = messages[messages.length - 1]?.id ?? null;
    const didLatestMessageChange =
      latestMessageId !== null && previousLatestMessageIdRef.current !== latestMessageId;

    previousLatestMessageIdRef.current = latestMessageId;

    if (!didLatestMessageChange || loadingOlderMessages) {
      return;
    }

    if (isNearBottomRef.current) {
      scrollToBottom(false);
    }
  }, [loadingOlderMessages, messages, scrollToBottom]);

  const canSend = useMemo(
    () => (draft.trim().length > 0 || selectedAttachment !== null) && !sending,
    [draft, selectedAttachment, sending],
  );
  const messageLookup = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );
  const composerBottom = keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0;
  const messagesBottomPadding =
    composerHeight + keyboardHeight + EXTRA_SCROLL_PADDING + TYPING_INDICATOR_RESERVE;
  const isCreator = currentUserId !== null && currentUserId === spaceCreatorUserId;
  const currentMembership = members.find((member) => member.userId === currentUserId) ?? null;
  const canDeleteSelectedMessage =
    selectedMessage !== null && selectedMessage.senderUserId === currentUserId;

  const getReplyPreview = useCallback(
    (message: ChatMessage | null): ReplyPreview | null => {
      if (!message?.replyToMessageId) {
        return null;
      }

      const repliedToMessage = messageLookup.get(message.replyToMessageId);

      if (!repliedToMessage) {
        return {
          senderName: 'Original message',
          text: 'Message unavailable',
        };
      }

      return {
        senderName:
          repliedToMessage.senderUserId === currentUserId ? 'You' : repliedToMessage.senderName,
        text: getReplySnippet(repliedToMessage.text),
      };
    },
    [currentUserId, messageLookup],
  );

  const replyPreviewByMessageId = useMemo(() => {
    const previews = new Map<string, ReplyPreview | null>();

    for (const message of messages) {
      previews.set(message.id, getReplyPreview(message));
    }

    return previews;
  }, [getReplyPreview, messages]);

  const chatListItems = useMemo<ChatListItem[]>(() => {
    const items: ChatListItem[] = [];

    for (const message of messages) {
      if (newMessagesDividerMessageId === message.id) {
        items.push({
          id: `divider:${message.id}`,
          kind: 'divider',
        });
      }

      items.push({
        id: message.id,
        kind: 'message',
        message,
        replyPreview: replyPreviewByMessageId.get(message.id) ?? null,
        status: getDisplayMessageStatus(message),
      });
    }

    return items;
  }, [getDisplayMessageStatus, messages, newMessagesDividerMessageId, replyPreviewByMessageId]);

  const messageIndexById = useMemo(() => {
    const nextIndex = new Map<string, number>();

    chatListItems.forEach((item, index) => {
      if (item.kind === 'message') {
        nextIndex.set(item.message.id, index);
      }
    });

    return nextIndex;
  }, [chatListItems]);

  const handleReplyPress = useCallback(
    (message: ChatMessage) => {
      if (!message.replyToMessageId) {
        return;
      }

      const targetIndex = messageIndexById.get(message.replyToMessageId);

      if (targetIndex === undefined) {
        return;
      }

      highlightMessage(message.replyToMessageId);

      messagesListRef.current?.scrollToIndex({
        animated: true,
        index: targetIndex,
        viewPosition: 0.5,
      });
    },
    [highlightMessage, messageIndexById],
  );

  const syncMessageUpdate = useCallback(
    (updatedMessage: Message) => {
      const nextMessage: ChatMessage = {
        ...updatedMessage,
        media: updatedMessage.media ?? [],
        reactions: updatedMessage.reactions ?? [],
        status: updatedMessage.status ?? 'sent',
        senderName:
          updatedMessage.senderUserId === currentUserId
            ? currentUserName
            : membersRef.current.find((member) => member.userId === updatedMessage.senderUserId)?.name ??
              'Unknown member',
      };

      setMessages((current) =>
        current.map((message) =>
          message.id === nextMessage.id
            ? {
                ...message,
                ...nextMessage,
              }
            : message,
        ),
      );

      setSelectedMessage((current) =>
        current && current.id === nextMessage.id
          ? {
              ...current,
              ...nextMessage,
            }
          : current,
      );
    },
    [currentUserId, currentUserName],
  );

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const handleToggleNotificationsMuted = useCallback(async () => {
    if (!spaceId || notificationsPreferenceLoading) {
      return;
    }

    const previousValue = muted;
    const nextValue = !previousValue;
    console.log('TOGGLE', { previous: previousValue, next: nextValue });

    setMuted(nextValue);
    setNotificationsPreferenceLoading(true);

    try {
      const response = await api.patch<ApiResponse<UpdateSpaceNotificationPreferenceResponseDto>>(
        `/spaces/${spaceId}/notification-preference`,
        { muted: nextValue },
      );

      setMuted(Boolean(response.data?.data?.muted));
    } catch (caughtError) {
      setMuted(previousValue);
      const apiError = caughtError as ApiError;
      console.warn('Failed to update notification preference', apiError.error ?? caughtError);
    } finally {
      setNotificationsPreferenceLoading(false);
    }
  }, [muted, notificationsPreferenceLoading, spaceId]);

  const handleLeaveGroup = async () => {
    if (!spaceId || !currentMembership) {
      return;
    }

    closeMenu();

    try {
      await leaveSpace(spaceId, currentMembership.id);
      router.replace('/spaces');
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
      closeActionTray();
      showCopyConfirmation();
    } catch {
      setError('Unable to copy this message.');
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
      if (replyTargetMessage?.id === selectedMessage.id) {
        setReplyTargetMessage(null);
      }
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

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyTargetMessage(message);
  }, []);

  const clearReply = useCallback(() => {
    setReplyTargetMessage(null);
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setSelectedAttachment(null);
  }, []);

  const handlePickAttachment = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to attach media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    const attachmentType = getComposerAttachmentType(asset);

    if (!attachmentType) {
      setError('Only image and video attachments are supported.');
      return;
    }

    if ((asset.fileSize ?? 0) > MAX_ATTACHMENT_SIZE_BYTES) {
      setError('Attachment is too large. Maximum size is 25MB.');
      return;
    }

    const fallbackExtension = attachmentType === 'image' ? 'jpg' : 'mp4';
    const fileName =
      asset.fileName ??
      `attachment-${Date.now()}.${fallbackExtension}`;
    const mimeType =
      asset.mimeType ??
      (attachmentType === 'image' ? 'image/jpeg' : 'video/mp4');

    setSelectedAttachment({
      fileName,
      fileSize: asset.fileSize,
      height: asset.height,
      mimeType,
      type: attachmentType,
      uri: asset.uri,
      width: asset.width,
    });
    setError(null);
  }, []);

  const handleOpenMedia = useCallback(async (media: MessageMedia) => {
    if (media.type === 'image') {
      setMediaViewer({
        type: media.type,
        url: media.url,
      });
      return;
    }

    await WebBrowser.openBrowserAsync(media.url);
  }, []);

  const saveMediaToDevice = useCallback(async (url: string) => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);

      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow media access to save attachments.');
        return;
      }

      const downloadsDirectory = new Directory(Paths.cache, 'akiba-media');
      downloadsDirectory.create({ idempotent: true, intermediates: true });
      const downloadedFile = await File.downloadFileAsync(url, downloadsDirectory, {
        idempotent: true,
      });

      await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
      Alert.alert('Saved', 'Media has been saved to your device.');
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to save this media.');
    }
  }, []);

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!spaceId) {
        return;
      }

      try {
        const response = await toggleReaction(spaceId, messageId, emoji);
        syncMessageUpdate(response.message);
        closeActionTray();
      } catch (caughtError) {
        const apiError = caughtError as ApiError;
        setError(apiError.error ?? 'Unable to react to this message.');
        closeActionTray();
      }
    },
    [closeActionTray, spaceId, syncMessageUpdate],
  );

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value);

      if (!spaceId) {
        return;
      }

      if (value.trim().length === 0) {
        void notifyStopTyping();
        return;
      }

      if (!isTypingRef.current) {
        void notifyStartTyping();
      }

      scheduleTypingStop();
    },
    [notifyStartTyping, notifyStopTyping, scheduleTypingStop, spaceId],
  );

  const handleSend = async () => {
    const text = draft.trim();

    if (!spaceId || (!text && !selectedAttachment)) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      let attachmentToSend = selectedAttachment;

      if (
        attachmentToSend &&
        !/^https?:\/\//i.test(attachmentToSend.uri)
      ) {
        try {
          const uploadedMediaUrl = await uploadImageToCloudinary(attachmentToSend.uri);

          attachmentToSend = {
            ...attachmentToSend,
            uri: uploadedMediaUrl,
          };
        } catch (error) {
          console.warn('Chat media upload failed', error);
          return;
        }
      }

      const response = selectedAttachment
        ? await uploadMediaMessage(spaceId, {
            attachment: attachmentToSend!,
            replyToMessageId: replyTargetMessage?.id,
            text: text || undefined,
          })
        : await sendMessage(spaceId, text, replyTargetMessage?.id);

      setMessages((current) => [
        ...current.filter((message) => message.id !== response.message.id),
        {
          ...response.message,
          media: response.message.media ?? [],
          reactions: response.message.reactions ?? [],
          status: response.message.status ?? 'sent',
          senderName: currentUserName,
        },
      ].sort((left, right) => {
        const timestampDifference =
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

        if (timestampDifference !== 0) {
          return timestampDifference;
        }

        return left.id.localeCompare(right.id);
      }));
      setDraft('');
      setSelectedAttachment(null);
      setReplyTargetMessage(null);
      void notifyStopTyping();
      scrollToBottom();
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const keyExtractor = useCallback((item: ChatListItem) => item.id, []);

  const renderChatListItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatListItem>) => {
      if (item.kind === 'divider') {
        return (
          <View style={styles.newMessagesDividerContainer}>
            <View style={styles.newMessagesDividerLine} />
            <Text style={styles.newMessagesDividerText}>NEW MESSAGES</Text>
            <View style={styles.newMessagesDividerLine} />
          </View>
        );
      }

      const message = item.message;
      const isCurrentUser = currentUserId === message.senderUserId;

      return (
        <View
          style={[
            styles.messageRow,
            isCurrentUser ? styles.currentUserRow : styles.otherUserRow,
          ]}>
          <SwipeableMessageBubble
            currentUserId={currentUserId}
            displayStatus={item.status}
            isHighlighted={highlightedMessageId === message.id}
            isCurrentUser={isCurrentUser}
            message={message}
            onLongPress={openActionTray}
            onOpenMedia={handleOpenMedia}
            onReplyPress={handleReplyPress}
            onReply={handleReply}
            onSaveMedia={saveMediaToDevice}
            replyPreview={item.replyPreview}
          />
        </View>
      );
    },
    [
      currentUserId,
      handleOpenMedia,
      handleReply,
      handleReplyPress,
      highlightedMessageId,
      openActionTray,
      saveMediaToDevice,
    ],
  );

  const renderOlderMessagesLoader = useCallback(() => {
    if (!loadingOlderMessages) {
      return null;
    }

    return <ActivityIndicator color="#0f766e" style={styles.listEdgeLoader} />;
  }, [loadingOlderMessages]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View
          style={styles.headerContainer}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.headerIconButton}>
            <Ionicons color="#132238" name="arrow-back" size={22} />
          </Pressable>

          {spaceImageUrl ? (
            <Pressable onPress={() => setAvatarViewerVisible(true)}>
              <NativeImage source={{ uri: spaceImageUrl }} style={styles.headerAvatar} />
            </Pressable>
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <Text style={styles.headerAvatarInitial}>
                {spaceName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.headerTextContainer}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {spaceName}
            </Text>
            <Text style={styles.headerSubtitle}>{onlineCount} online</Text>
          </View>

          <View style={styles.headerSpacer} />

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

          {messages.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to start the conversation</Text>
            </View>
          ) : (
            <FlatList
              ref={messagesListRef}
              data={chatListItems}
              inverted
              initialNumToRender={24}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={renderOlderMessagesLoader}
              maxToRenderPerBatch={12}
              onEndReached={() => {
                void loadOlderMessages();
              }}
              onEndReachedThreshold={0.2}
              onMomentumScrollBegin={() => {
                hasUserInteractedWithLatestRef.current = true;
              }}
              onScroll={(event) => {
                const { contentOffset } = event.nativeEvent;
                const isNearBottom = contentOffset.y < 80;

                isNearBottomRef.current = isNearBottom;

                if (isNearBottom && hasUserInteractedWithLatestRef.current) {
                  void markVisibleMessagesRead();
                }

                setShowScrollToBottom(!isNearBottom);
              }}
              onScrollToIndexFailed={(info) => {
                requestAnimationFrame(() => {
                  messagesListRef.current?.scrollToOffset({
                    animated: false,
                    offset: Math.max(info.averageItemLength * info.index, 0),
                  });
                  setTimeout(() => {
                    messagesListRef.current?.scrollToIndex({
                      animated: true,
                      index: info.index,
                      viewPosition: 0.5,
                    });
                  }, 50);
                });
              }}
              removeClippedSubviews
              renderItem={renderChatListItem}
              scrollEventThrottle={16}
              style={styles.messagesScrollView}
              contentContainerStyle={[
                styles.messagesContainer,
                {
                  paddingBottom: 16,
                  paddingTop: messagesBottomPadding,
                },
              ]}
              windowSize={9}
            />
          )}

          {typingUsers.length > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.typingOverlay,
                { bottom: composerBottom + composerHeight },
              ]}>
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].name} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </Text>
              </View>
            </View>
          ) : null}

          {showScrollToBottom && (
            <Pressable
              onPress={() => {
                hasUserInteractedWithLatestRef.current = true;
                scrollToBottom(true);
                void markVisibleMessagesRead(lastMessageTimestampRef.current ?? undefined);
              }}
              style={[
                styles.scrollToBottomButton,
                { bottom: composerHeight + keyboardHeight + 20 },
              ]}
            >
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </Pressable>
          )}

          {showCopyToast && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.copyToast,
                {
                  bottom: composerHeight + keyboardHeight + 20,
                  opacity: copyToastOpacity,
                },
              ]}>
              <Text style={styles.copyToastText}>Text copied to clipboard</Text>
            </Animated.View>
          )}

          <View
            onLayout={(event) => {
              const nextHeight = Math.ceil(event.nativeEvent.layout.height);
              if (nextHeight > 0 && nextHeight !== composerHeight) {
                setComposerHeight(nextHeight);
              }
            }}
            style={[styles.composer, { bottom: composerBottom }]}>
            <View style={styles.composerContent}>
              {selectedAttachment ? (
                <View style={styles.attachmentPreviewCard}>
                  {selectedAttachment.type === 'image' ? (
                    <ExpoImage
                      contentFit="cover"
                      source={{ uri: selectedAttachment.uri }}
                      style={[
                        styles.attachmentPreviewImage,
                        {
                          aspectRatio:
                            selectedAttachment.width && selectedAttachment.height
                              ? selectedAttachment.width / selectedAttachment.height
                              : 1,
                        },
                      ]}
                    />
                  ) : (
                    <View style={styles.attachmentPreviewVideo}>
                      <Ionicons color="#ffffff" name="play-circle" size={28} />
                      <Text numberOfLines={1} style={styles.attachmentPreviewVideoText}>
                        {selectedAttachment.fileName}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    accessibilityLabel="Remove attachment"
                    hitSlop={8}
                    onPress={handleRemoveAttachment}
                    style={styles.attachmentPreviewRemoveButton}>
                    <Ionicons color="#ffffff" name="close" size={16} />
                  </Pressable>
                </View>
              ) : null}
              {replyTargetMessage ? (
                <View style={styles.replyComposerPreview}>
                  <View style={styles.replyComposerTextBlock}>
                    <Text numberOfLines={1} style={styles.replyComposerLabel}>
                      Replying to{' '}
                      {replyTargetMessage.senderUserId === currentUserId
                        ? 'yourself'
                        : replyTargetMessage.senderName}
                    </Text>
                    <Text numberOfLines={2} style={styles.replyComposerText}>
                      {getReplySnippet(replyTargetMessage.text)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Cancel reply"
                    hitSlop={8}
                    onPress={clearReply}
                    style={styles.replyComposerCloseButton}>
                    <Ionicons color="#6b7280" name="close" size={18} />
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.inputShell}>
                <Pressable
                  accessibilityLabel="Attach media"
                  hitSlop={8}
                  onPress={() => {
                    void handlePickAttachment();
                  }}
                  style={styles.attachButton}>
                  <Ionicons color="#6b7280" name="attach" size={20} />
                </Pressable>
                <TextInput
                  multiline
                  onChangeText={handleDraftChange}
                  placeholder="Type here..."
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  textAlignVertical="top"
                  value={draft}
                />
              </View>
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
              <Pressable
                accessibilityLabel={muted ? 'Unmute Notifications' : 'Mute Notifications'}
                disabled={notificationsPreferenceLoading}
                onPress={() => {
                  void handleToggleNotificationsMuted();
                }}
                style={styles.menuItem}>
                <View style={styles.menuItemContent}>
                  <Ionicons
                    color="#132238"
                    name={muted ? 'notifications-off-outline' : 'notifications-outline'}
                    size={18}
                    style={styles.menuItemIcon}
                  />
                  <Text style={styles.menuItemText}>
                    {muted ? 'Unmute Notifications' : 'Mute Notifications'}
                  </Text>
                </View>
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
              {selectedMessage ? (
                <View style={styles.reactionRow}>
                  {REACTION_OPTIONS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        void handleReact(selectedMessage.id, emoji);
                      }}
                      style={styles.reactionButton}>
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
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

      <FullScreenImageViewer
        imageUrl={spaceImageUrl}
        onClose={() => setAvatarViewerVisible(false)}
        visible={avatarViewerVisible}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setMediaViewer(null)}
        transparent
        visible={mediaViewer?.type === 'image'}>
        <View style={styles.mediaViewerOverlay}>
          <Pressable
            onPress={() => setMediaViewer(null)}
            style={styles.mediaViewerBackdrop}
          />
          <View style={styles.mediaViewerContent}>
            <Pressable
              accessibilityLabel="Close media viewer"
              hitSlop={8}
              onPress={() => setMediaViewer(null)}
              style={styles.mediaViewerCloseButton}>
              <Ionicons color="#ffffff" name="close" size={22} />
            </Pressable>
            {mediaViewer ? (
              <ExpoImage
                contentFit="contain"
                source={{ uri: mediaViewer.url }}
                style={styles.mediaViewerImage}
              />
            ) : null}
          </View>
        </View>
      </Modal>
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
  headerContainer: {
    alignItems: 'center',
    backgroundColor: '#fffdf9',
    borderBottomColor: '#e7dfd1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  headerIconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTextContainer: {
    alignItems: 'flex-start',
    flexShrink: 1,
    justifyContent: 'center',
  },
  headerTitle: {
      color: '#132238',
      fontSize: 17,
      fontWeight: '700',
      maxWidth: '100%',
    },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  headerSpacer: {
    flex: 1,
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
    justifyContent: 'flex-end',
    padding: 16,
  },
  messagesContainerEmpty: {
    justifyContent: 'center',
  },
  listEdgeLoader: {
    marginVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 280,
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
    width: '100%',
  },
  currentUserRow: {
    justifyContent: 'flex-end',
  },
  otherUserRow: {
    justifyContent: 'flex-start',
  },
  newMessagesDividerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  newMessagesDividerLine: {
    backgroundColor: '#cbd5e1',
    flex: 1,
    height: 1,
  },
  newMessagesDividerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  messageBubble: {
    borderRadius: 18,
    gap: 6,
    maxWidth: '82%',
    padding: 10,
    overflow: 'hidden',
  },
  // Keep reply target highlighting purely visual so we do not change the
  // measured message height/width and accidentally trigger a scroll jump.
  highlightedMessageBubble: {
    backgroundColor: '#fef3c7',
    elevation: 3,
    shadowColor: '#f59e0b',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  currentUserBubble: {
    backgroundColor: '#dcf8c6',
    borderTopRightRadius: 6,
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 6,
    alignSelf: 'flex-start',
  },
  senderName: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineReplyContainer: {
    borderLeftWidth: 3,
    borderRadius: 12,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineReplyCurrentUser: {
    backgroundColor: 'rgba(15, 118, 110, 0.10)',
    borderLeftColor: '#0f766e',
  },
  inlineReplyOtherUser: {
    backgroundColor: '#f4f4f5',
    borderLeftColor: '#0f766e',
  },
  inlineReplySender: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineReplyText: {
    color: '#475467',
    fontSize: 13,
    lineHeight: 18,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
  },
  mediaAttachmentPressable: {
    width: '100%',
  },
  mediaOverlay: {
    left: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 10,
  },
  mediaIconButton: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
    padding: 6,
  },
  mediaWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageMediaImage: {
    width: '100%',
  },
  messageVideoCard: {
    alignItems: 'center',
    aspectRatio: VIDEO_PLACEHOLDER_ASPECT_RATIO,
    backgroundColor: '#132238',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  messageVideoLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  messageText: {
    color: '#132238',
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  reactionChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionChipActive: {
    backgroundColor: '#dbeafe',
  },
  reactionText: {
    fontSize: 12,
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
  typingOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 5,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingText: {
    color: '#6b7280',
    fontSize: 13,
    fontStyle: 'italic',
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
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#0f766e',
    borderRadius: 24,
    padding: 10,
    elevation: 5,
    zIndex: 20,
  },
  copyToast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 50,
  },
  copyToastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  composerContent: {
    flex: 1,
    gap: 8,
  },
  attachmentPreviewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  attachmentPreviewImage: {
    borderRadius: 16,
    maxWidth: 110,
    width: 110,
  },
  attachmentPreviewVideo: {
    alignItems: 'center',
    aspectRatio: VIDEO_PLACEHOLDER_ASPECT_RATIO,
    backgroundColor: '#132238',
    borderRadius: 16,
    gap: 6,
    justifyContent: 'center',
    maxWidth: 150,
    paddingHorizontal: 14,
    width: 150,
  },
  attachmentPreviewVideoText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
  attachmentPreviewRemoveButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
  },
  replyComposerPreview: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d7dce2',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  replyComposerTextBlock: {
    flex: 1,
    gap: 2,
  },
  replyComposerLabel: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  replyComposerText: {
    color: '#475467',
    fontSize: 13,
    lineHeight: 18,
  },
  replyComposerCloseButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  inputShell: {
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderColor: '#d7dce2',
    borderRadius: 24,
    borderWidth: 1,
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  menuItemIcon: {
    marginRight: 10,
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
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  reactionButton: {
    padding: 6,
  },
  reactionEmoji: {
    fontSize: 20,
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
  mediaViewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
  },
  mediaViewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaViewerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  mediaViewerCloseButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  mediaViewerImage: {
    height: '80%',
    width: '100%',
  },
});
