import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image as NativeImage,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Message,
  MessageMedia,
  MessageStatus,
  SpaceMember,
  TypingUser,
} from '../../../../../shared/contracts';
import {
  deleteMessage,
  getTypingUsers,
  getMembers,
  getMessages,
  getSpace,
  leaveSpace,
  sendMessage,
  startTyping,
  stopTyping,
  toggleReaction,
  uploadMediaMessage,
  type MediaUploadAttachment,
} from '../../../../services/spaceService';
import { ApiError, getAuthSession } from '../../../../utils/api';

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

type ComposerMediaAttachment = MediaUploadAttachment & {
  height?: number;
  width?: number;
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

const getTemporaryMessageStatus = (
  message: Message,
  currentUserId: string | null,
): MessageStatus => {
  if (message.senderUserId === currentUserId) {
    return 'delivered';
  }

  return 'read';
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

function ChatMediaAttachment({
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

function SwipeableMessageBubble({
  currentUserId,
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
        {message.media?.length ? (
          <View style={styles.mediaAttachmentStack}>
            {message.media.map((mediaItem) => (
              <ChatMediaAttachment
                key={`${message.id}-${mediaItem.url}`}
                media={mediaItem}
                onPress={onOpenMedia}
                onSave={onSaveMedia}
              />
            ))}
          </View>
        ) : null}
        <Text style={styles.senderName}>{isCurrentUser ? 'You' : message.senderName}</Text>
        {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
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
          <View style={styles.statusContainer}>{renderStatusIcon(message.status)}</View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

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
  const [replyTargetMessage, setReplyTargetMessage] = useState<ChatMessage | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<ComposerMediaAttachment | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [mediaViewer, setMediaViewer] = useState<MediaViewer | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const isTypingRef = useRef(false);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageLayoutsRef = useRef<Record<string, { height: number; y: number }>>({});
  const highlightedMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);

  const insets = useSafeAreaInsets();

  const currentSession = getAuthSession();
  const currentUserId = currentSession?.user.id ?? null;
  const currentUserName = currentSession?.user.name ?? 'You';

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

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
    };
  }, []);

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
          media: message.media ?? [],
          reactions: message.reactions ?? [],
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

  const handleReplyPress = useCallback(
    (message: ChatMessage) => {
      if (!message.replyToMessageId) {
        return;
      }

      const targetLayout = messageLayoutsRef.current[message.replyToMessageId];

      if (!targetLayout) {
        return;
      }

      const visibleTop = scrollOffsetRef.current;
      const visibleBottom = visibleTop + viewportHeightRef.current;
      const targetTop = targetLayout.y;
      const targetBottom = targetLayout.y + targetLayout.height;

      highlightMessage(message.replyToMessageId);

      // We store each row's y-offset relative to the ScrollView content.
      // If the full replied-to row is already inside the visible viewport,
      // we only flash it instead of scrolling again.
      if (targetTop >= visibleTop && targetBottom <= visibleBottom) {
        return;
      }

      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(targetTop - 12, 0),
      });
    },
    [highlightMessage],
  );

  const syncMessageUpdate = useCallback(
    (updatedMessage: Message) => {
      const nextStatus = getTemporaryMessageStatus(updatedMessage, currentUserId);

      setMessages((current) =>
        current.map((message) =>
          message.id === updatedMessage.id
            ? {
                ...message,
                ...updatedMessage,
                media: updatedMessage.media ?? [],
                reactions: updatedMessage.reactions ?? [],
                status: nextStatus,
              }
            : message,
        ),
      );

      setSelectedMessage((current) =>
        current && current.id === updatedMessage.id
          ? {
              ...current,
              ...updatedMessage,
              media: updatedMessage.media ?? [],
              reactions: updatedMessage.reactions ?? [],
              status: nextStatus,
            }
          : current,
      );
    },
    [currentUserId],
  );

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
      const response = selectedAttachment
        ? await uploadMediaMessage(spaceId, {
            attachment: selectedAttachment,
            replyToMessageId: replyTargetMessage?.id,
            text: text || undefined,
          })
        : await sendMessage(spaceId, text, replyTargetMessage?.id);

      setMessages((current) => [
        ...current,
        {
          ...response.message,
          media: response.message.media ?? [],
          reactions: response.message.reactions ?? [],
          status: 'sent',
          senderName: currentUserName,
        },
      ]);
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
            onLayout={(event) => {
              viewportHeightRef.current = event.nativeEvent.layout.height;
            }}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            style={styles.messagesScrollView}
            contentContainerStyle={[
              styles.messagesContainer,
              { paddingBottom: messagesBottomPadding },
            ]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollToBottom(!loading)}
            scrollEventThrottle={16}>
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
                  onLayout={(event) => {
                    messageLayoutsRef.current[message.id] = {
                      height: event.nativeEvent.layout.height,
                      y: event.nativeEvent.layout.y,
                    };
                  }}
                  style={[
                    styles.messageRow,
                    isCurrentUser ? styles.currentUserRow : styles.otherUserRow,
                  ]}>
                  <SwipeableMessageBubble
                    currentUserId={currentUserId}
                    isHighlighted={highlightedMessageId === message.id}
                    isCurrentUser={isCurrentUser}
                    message={message}
                    onLongPress={openActionTray}
                    onOpenMedia={handleOpenMedia}
                    onReplyPress={handleReplyPress}
                    onSaveMedia={saveMediaToDevice}
                    onReply={handleReply}
                    replyPreview={getReplyPreview(message)}
                  />
                </View>
              );
            })}
          </ScrollView>

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
                  placeholder="Type a message"
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
    width: '100%',
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
  mediaAttachmentStack: {
    gap: 8,
  },
  mediaContainer: {
    width: '100%',
    position: 'relative',
  },
  mediaAttachmentPressable: {
    alignSelf: 'flex-start',
  },
  mediaOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  composerContent: {
    flex: 1,
    gap: 8,
  },
  attachmentPreviewCard: {
    alignSelf: 'flex-start',
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
