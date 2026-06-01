export type ID = string;

export type ApiResponse<T> = {
  data: T;
};

export enum GroupRole {
  MEMBER = 'member',
  // TODO: DEPRECATED — replace SIGNATORY with ADMIN in Phase 5
  SIGNATORY = 'signatory',
}

export type SignatoryRole = 'primary' | 'secondary' | 'tertiary' | null;

export type GroupSignatory = {
  userId: ID;
  name: string;
  username?: string;
  avatarUrl?: string;
  signatoryRole: Exclude<SignatoryRole, null>;
};

export type SpaceAdmin = {
  userId: ID;
  name: string;
  username: string;
  avatarUrl?: string;
  role: 'admin';
};

export type SpaceMember = GroupMember & {
  name: string;
  username: string;
  avatarUrl?: string;
  roleV2?: 'ADMIN' | 'MEMBER' | 'CREATOR';
};

export type TypingUser = {
  userId: ID;
  name: string;
  username: string;
  avatarUrl?: string;
};

export type MessageReaction = {
  emoji: string;
  userIds: ID[];
};

export type MessageMedia = {
  type: 'image' | 'video';
  url: string;
};

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FEE = 'fee',
}

export enum TransactionStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

export enum TransactionSource {
  MPESA = 'mpesa',
  MPESA_PAYBILL = 'mpesa_paybill',
  MPESA_STK = 'mpesa_stk',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  SYSTEM_FEE = 'system_fee',
}

export enum ApprovalStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum NotificationType {
  DEPOSIT_COMPLETED = 'deposit_completed',
  WITHDRAWAL_REQUESTED = 'withdrawal_requested',
  WITHDRAWAL_APPROVED = 'withdrawal_approved',
  WITHDRAWAL_REJECTED = 'withdrawal_rejected',
  WITHDRAWAL_COMPLETED = 'withdrawal_completed',
  SPACE_UPDATED = 'space_updated',
  SPACE_DELETED = 'space_deleted',
}

export type User = {
  id: ID;
  phoneNumber: string;
  name: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
};

export type Group = {
  id: ID;
  name: string;
  description?: string;
  imageUrl?: string;
  paybillNumber: string;
  accountNumber: string;
  targetAmount?: number;
  collectedAmount?: number;
  deadline?: string;
  createdByUserId: ID;
  approvalThreshold: number;
  membersCount?: number;
  totalBalance?: number;
  totalFees?: number;
  reservedAmount?: number;
  availableBalance?: number;
  pendingWithdrawalAmount?: number;
  createdAt: string;
};

export type GroupMember = {
  id: ID;
  groupId: ID;
  userId: ID;
  role: GroupRole;
  signatoryRole: SignatoryRole;
  joinedAt: string;
};

export type Transaction = {
  id: ID;
  spaceId: ID;
  userId?: ID;
  type: TransactionType;
  amount: number;
  reference: string;
  source: TransactionSource | string;
  phoneNumber?: string;
  externalName?: string;
  initiatorName: string;
  runningBalance?: number;
  recipientPhoneNumber?: string;
  recipientName?: string;
  status: TransactionStatus;
  createdAt: string;
  groupId?: ID;
  initiatedByUserId?: ID;
  currency?: string;
  description?: string;
  reason?: string;
  destination?: string;
};

export type Approval = {
  id: ID;
  transactionId: ID;
  signatoryUserId: ID;
  status: ApprovalStatus;
  createdAt: string;
};

export type MessageStatus = 'sent' | 'delivered' | 'read';

export type Message = {
  id: ID;
  groupId: ID;
  senderUserId: ID;
  text: string;
  replyToMessageId?: ID;
  media?: MessageMedia[];
  reactions: MessageReaction[];
  status: MessageStatus;
  createdAt: string;
};

export type RegisterRequestDto = {
  password: string;
  phoneNumber: string;
  username: string;
};

export type RegisterResponseDto = {
  user: User;
  accessToken: string;
};

export type InviteLinkResponseDto = {
  fallbackLink: string;
  link: string;
  primaryLink: string;
  token: string;
};

export type InviteMembershipStatus = 'member' | 'not_member' | 'unknown';

export type InviteValidationResponseDto = {
  alreadyMember: boolean;
  expired: boolean;
  expiresAt?: string;
  isAuthenticated: boolean;
  link: string;
  membershipStatus: InviteMembershipStatus;
  primaryLink: string;
  spaceId?: string;
  spaceImageUrl?: string;
  spaceName?: string;
  token: string;
  valid: boolean;
};

export type LoginRequestDto = {
  identifier: string;
  password: string;
};

export type LoginResponseDto = {
  user: User;
  accessToken: string;
};

export type UsernameAvailabilityResponseDto = {
  available: boolean;
  suggestions: string[];
};

export type PasswordResetRequestDto = {
  phoneNumber: string;
};

export type PasswordResetRequestResponseDto = {
  success: true;
};

export type PasswordResetVerifyRequestDto = {
  newPassword: string;
  otp: string;
  phoneNumber: string;
};

export type PasswordResetVerifyResponseDto = {
  success: true;
};

export type MeResponseDto = {
  user: User;
};

export type UpdateProfileRequestDto = {
  avatarUrl?: string | null;
  username?: string;
};

export type UpdateProfileResponseDto = {
  user: User;
};

export type DeleteAccountResponseDto = {
  userId: ID;
};

export type CreateGroupRequestDto = {
  name: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  targetAmount?: number;
  deadline?: string;
};

export type UpdateGroupRequestDto = {
  name?: string;
  description?: string;
  targetAmount?: number;
  deadline?: string;
  imageUrl?: string;
};

export type CreateGroupResponseDto = {
  group: Group;
  space: Group;
};

export type ListGroupsResponseDto = {
  groups: Group[];
  spaces: Group[];
};

export type GetGroupResponseDto = {
  group: Group;
  space: Group;
};

export type UpdateGroupResponseDto = {
  group: Group;
  space: Group;
};

export type JoinGroupRequestDto = {
  groupId: ID;
};

export type JoinGroupResponseDto = {
  member: GroupMember;
};

export type LeaveGroupResponseDto = {
  member: GroupMember;
};

export type DeleteGroupResponseDto = {
  success: true;
};

export type ListGroupMembersResponseDto = {
  members: SpaceMember[];
};

export type ListGroupSignatoriesResponseDto = {
  admins: SpaceAdmin[];
  remainingSlots: number;
  signatories?: SpaceAdmin[];
};

export type PromoteGroupMemberResponseDto = {
  member: GroupMember;
};

export type RevokeGroupMemberResponseDto = {
  member: GroupMember;
};

export type CreateDepositRequestDto = {
  spaceId: ID;
  amount: number;
  source: TransactionSource;
  phoneNumber?: string;
};

export type CreateDepositResponseDto = {
  transaction: Transaction;
};

export type CreateWithdrawalRequestDto = {
  amount: number;
  recipientPhoneNumber: string;
  recipientName: string;
  reason: string;
  currency?: string;
  description?: string;
  destination?: string;
};

export type CreateWithdrawalResponseDto = {
  transaction: Transaction;
};

export type ListTransactionsResponseDto = {
  transactions: Transaction[];
};

export type GetTransactionResponseDto = {
  transaction: Transaction;
};

export type PendingWithdrawalSummaryDto = {
  id: ID;
  requestedByUserId: ID;
  requestedByName: string;
  amount: number;
  recipientName?: string;
  recipientPhoneNumber?: string;
  reason?: string;
  approvals: ID[];
  requiredApprovals: number;
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
};

export type TimeSeriesPointDto = {
  date: string;
  amount: number;
};

export type TransactionsSummaryDto = {
  totalDeposits: number;
  totalWithdrawals: number;
  currentBalance: number;
  depositsOverTime: TimeSeriesPointDto[];
  withdrawalsOverTime: TimeSeriesPointDto[];
  pendingWithdrawals: PendingWithdrawalSummaryDto[];
};

export type GetTransactionsSummaryResponseDto = TransactionsSummaryDto;

export type SpaceSummaryDto = {
  totalDeposits: number;
  totalWithdrawals: number;
  totalFees: number;
  availableBalance: number;
  netBalance: number;
};

export type GetSpaceSummaryResponseDto = {
  summary: SpaceSummaryDto;
  transactions: Transaction[];
};

export interface NotificationDTO {
  id: string;
  cursorId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  createdAt: string;
  spaceId?: string;
  transactionId?: string;
  metadata?: {
    updatedFields?: string[];
  };
  isRead: boolean;
}

export interface NotificationEvent {
  type: 'notification_created';
  payload: NotificationDTO;
}

export interface GetNotificationsResponse {
  notifications: NotificationDTO[];
  nextCursor?: string;
}

export interface MarkNotificationReadResponse {
  success: boolean;
}

export type GetSpaceNotificationPreferenceResponseDto = {
  muted: boolean;
};

export type UpdateSpaceNotificationPreferenceRequestDto = {
  muted: boolean;
};

export type UpdateSpaceNotificationPreferenceResponseDto = {
  muted: boolean;
};

export type RegisterDeviceRequestDto = {
  token: string;
};

export type RegisterDeviceResponseDto = {
  success: true;
};

export type CreateApprovalRequestDto = {
  status: ApprovalStatus;
};

export type CreateApprovalResponseDto = {
  approval: Approval;
  transaction: Transaction;
};

export type ListApprovalsResponseDto = {
  approvals: Approval[];
};

export type CreateMessageRequestDto = {
  text: string;
  replyToMessageId?: ID;
};

export type CreateMessageResponseDto = {
  message: Message;
};

export type UploadMediaMessageFile = {
  name: string;
  type: string;
  size?: number;
};

export type UploadMediaMessageRequestDto = {
  text?: string;
  replyToMessageId?: ID;
  file: UploadMediaMessageFile;
};

export type UploadMediaMessageResponseDto = {
  message: Message;
};

export type DeleteMessageResponseDto = {
  success: true;
};

export type ListMessagesResponseDto = {
  lastReadAt?: string;
  messages: Message[];
  nextCursor?: string;
};

export type MarkMessagesReadRequestDto = {
  latestVisibleMessageTimestamp: string;
};

export type MarkMessagesReadResponseDto = {
  lastReadAt: string;
  success: true;
};

export type ToggleMessageReactionRequestDto = {
  emoji: string;
};

export type ToggleMessageReactionResponseDto = {
  message: Message;
};

export type ListTypingUsersResponseDto = {
  users: TypingUser[];
};
