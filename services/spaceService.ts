import {
  CreateDepositRequestDto,
  CreateGroupRequestDto,
  CreateGroupResponseDto,
  CreateMessageResponseDto,
  CreateMessageRequestDto,
  DeleteGroupResponseDto,
  DeleteMessageResponseDto,
  GetGroupResponseDto,
  GetSpaceSummaryResponseDto,
  GetTransactionsSummaryResponseDto,
  LeaveGroupResponseDto,
  ListGroupMembersResponseDto,
  ListGroupSignatoriesResponseDto,
  ListGroupsResponseDto,
  ListMessagesResponseDto,
  MarkMessagesReadResponseDto,
  ListTypingUsersResponseDto,
  PromoteGroupMemberResponseDto,
  RevokeGroupMemberResponseDto,
  ToggleMessageReactionResponseDto,
  ToggleMessageReactionRequestDto,
  TransactionSource,
  UpdateGroupRequestDto,
  UpdateGroupResponseDto,
  UploadMediaMessageResponseDto,
} from '../../shared/contracts';
import { api } from '../utils/api';

export type MediaUploadAttachment = {
  fileName: string;
  fileSize?: number | null;
  mimeType: string;
  type: 'image' | 'video';
  uri: string;
};

export type UploadMediaMessagePayload = {
  attachment: MediaUploadAttachment;
  replyToMessageId?: string;
  text?: string;
};

export const listSpaces = async (): Promise<ListGroupsResponseDto> => {
  const response = await api.get<{ data: ListGroupsResponseDto }>('/spaces');
  return response.data.data;
};

export const createSpace = async (
  dto: CreateGroupRequestDto,
): Promise<CreateGroupResponseDto> => {
  const response = await api.post<{ data: CreateGroupResponseDto }>('/spaces', dto);
  return response.data.data;
};

export const getSpace = async (spaceId: string): Promise<GetGroupResponseDto> => {
  const response = await api.get<{ data: GetGroupResponseDto }>(`/spaces/${spaceId}`);
  return response.data.data;
};

export const updateSpace = async (
  spaceId: string,
  payload: UpdateGroupRequestDto,
): Promise<UpdateGroupResponseDto> => {
  const response = await api.patch<{ data: UpdateGroupResponseDto }>(`/spaces/${spaceId}`, payload);
  return response.data.data;
};

export const getAdmins = async (
  spaceId: string,
): Promise<ListGroupSignatoriesResponseDto> => {
  const response = await api.get<{ data: ListGroupSignatoriesResponseDto }>(
    `/spaces/${spaceId}/admins`,
  );
  return response.data.data;
};

export const getMembers = async (
  spaceId: string,
): Promise<ListGroupMembersResponseDto> => {
  const response = await api.get<{ data: ListGroupMembersResponseDto }>(`/spaces/${spaceId}/members`);
  return response.data.data;
};

export const getMessages = async (
  spaceId: string,
  params?: {
    cursor?: string;
    limit?: number;
    since?: string;
  },
): Promise<ListMessagesResponseDto> => {
  const response = await api.get<{ data: ListMessagesResponseDto }>(`/spaces/${spaceId}/messages`, {
    params,
  });
  return response.data.data;
};

export const markMessagesRead = async (
  spaceId: string,
  latestVisibleMessageTimestamp: string,
): Promise<MarkMessagesReadResponseDto> => {
  const response = await api.post<{ data: MarkMessagesReadResponseDto }>(
    `/spaces/${spaceId}/messages/read`,
    { latestVisibleMessageTimestamp },
  );
  return response.data.data;
};

export const getTransactionsSummary = async (
  spaceId: string,
): Promise<GetTransactionsSummaryResponseDto> => {
  const response = await api.get<{ data: GetTransactionsSummaryResponseDto }>(
    `/spaces/${spaceId}/transactions/summary`,
  );
  return response.data.data;
};

export const getSpaceSummary = async (
  spaceId: string,
  params?: {
    from?: string;
    to?: string;
  },
): Promise<GetSpaceSummaryResponseDto> => {
  const response = await api.get<{ data: GetSpaceSummaryResponseDto }>(
    `/spaces/${spaceId}/summary`,
    {
      params,
    },
  );
  return response.data.data;
};

export const createDeposit = async (
  spaceId: string,
  amount: number,
  options?: {
    phoneNumber?: string;
    source?: CreateDepositRequestDto['source'];
  },
) => {
  const payload: CreateDepositRequestDto = {
    amount,
    phoneNumber: options?.phoneNumber,
    source: options?.source ?? TransactionSource.MPESA,
    spaceId,
  };

  return api.post(`/spaces/${spaceId}/deposit`, payload);
};

export const createWithdrawal = async (
  spaceId: string,
  amount: number,
  recipientPhoneNumber: string,
  recipientName: string,
  reason: string,
) => {
  return api.post(`/spaces/${spaceId}/withdraw`, {
    amount,
    recipientPhoneNumber,
    recipientName,
    reason,
  });
};

export const approveWithdrawal = async (withdrawalId: string) => {
  return api.post(`/spaces/withdrawals/${withdrawalId}/approve`);
};

export const startTyping = async (spaceId: string): Promise<void> => {
  await api.post(`/spaces/${spaceId}/typing/start`);
};

export const stopTyping = async (spaceId: string): Promise<void> => {
  await api.post(`/spaces/${spaceId}/typing/stop`);
};

export const getTypingUsers = async (
  spaceId: string,
): Promise<ListTypingUsersResponseDto> => {
  const response = await api.get<{ data: ListTypingUsersResponseDto }>(`/spaces/${spaceId}/typing`);
  return response.data.data;
};

export const sendMessage = async (
  spaceId: string,
  text: string,
  replyToMessageId?: string,
): Promise<CreateMessageResponseDto> => {
  const dto: CreateMessageRequestDto = { text, replyToMessageId };
  const response = await api.post<{ data: CreateMessageResponseDto }>(
    `/spaces/${spaceId}/messages`,
    dto,
  );
  return response.data.data;
};

export const uploadMediaMessage = async (
  spaceId: string,
  payload: UploadMediaMessagePayload,
): Promise<UploadMediaMessageResponseDto> => {
  const formData = new FormData();

  if (payload.text) {
    formData.append('text', payload.text);
  }

  if (payload.replyToMessageId) {
    formData.append('replyToMessageId', payload.replyToMessageId);
  }

  if (/^https?:\/\//i.test(payload.attachment.uri)) {
    const uploadedFileResponse = await fetch(payload.attachment.uri);
    const uploadedFileBlob = await uploadedFileResponse.blob();

    formData.append('file', uploadedFileBlob, payload.attachment.fileName);
  } else {
    formData.append('file', {
      uri: payload.attachment.uri,
      name: payload.attachment.fileName,
      type: payload.attachment.mimeType,
    } as unknown as Blob);
  }

  const response = await api.post<{ data: UploadMediaMessageResponseDto }>(
    `/spaces/${spaceId}/messages/media`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data; charset=utf-8',
      },
    },
  );

  return response.data.data;
};

export const deleteMessage = async (
  spaceId: string,
  messageId: string,
): Promise<DeleteMessageResponseDto> => {
  const response = await api.delete<{ data: DeleteMessageResponseDto }>(
    `/spaces/${spaceId}/messages/${messageId}`,
  );
  return response.data.data;
};

export const toggleReaction = async (
  spaceId: string,
  messageId: string,
  emoji: string,
): Promise<ToggleMessageReactionResponseDto> => {
  const dto: ToggleMessageReactionRequestDto = { emoji };
  const response = await api.post<{ data: ToggleMessageReactionResponseDto }>(
    `/spaces/${spaceId}/messages/${messageId}/reactions`,
    dto,
  );
  return response.data.data;
};

export const promoteMember = async (
  spaceId: string,
  memberId: string,
): Promise<PromoteGroupMemberResponseDto> => {
  const response = await api.post<{ data: PromoteGroupMemberResponseDto }>(
    `/spaces/${spaceId}/members/${memberId}/promote`,
  );
  return response.data.data;
};

export const revokeMember = async (
  spaceId: string,
  memberId: string,
): Promise<RevokeGroupMemberResponseDto> => {
  const response = await api.post<{ data: RevokeGroupMemberResponseDto }>(
    `/spaces/${spaceId}/members/${memberId}/revoke`,
  );
  return response.data.data;
};

export const leaveSpace = async (
  spaceId: string,
  memberId: string,
): Promise<LeaveGroupResponseDto> => {
  const response = await api.delete<{ data: LeaveGroupResponseDto }>(
    `/spaces/${spaceId}/members/${memberId}/leave`,
  );
  return response.data.data;
};

export const deleteSpace = async (
  spaceId: string,
): Promise<DeleteGroupResponseDto> => {
  const response = await api.delete<{ data: DeleteGroupResponseDto }>(`/spaces/${spaceId}`);
  return response.data.data;
};
