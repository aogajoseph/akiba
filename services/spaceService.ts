import {
  CreateGroupRequestDto,
  CreateGroupResponseDto,
  DeleteGroupResponseDto,
  GetGroupResponseDto,
  LeaveGroupResponseDto,
  ListGroupMembersResponseDto,
  ListGroupSignatoriesResponseDto,
  ListGroupsResponseDto,
  PromoteGroupMemberResponseDto,
  RevokeGroupMemberResponseDto,
} from '../../shared/contracts';
import { api } from '../utils/api';

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

export const getAdmins = async (
  spaceId: string,
): Promise<ListGroupSignatoriesResponseDto> => {
  const response = await api.get<{ data: ListGroupSignatoriesResponseDto }>(`/spaces/${spaceId}/admins`);
  return response.data.data;
};

export const getMembers = async (
  spaceId: string,
): Promise<ListGroupMembersResponseDto> => {
  const response = await api.get<{ data: ListGroupMembersResponseDto }>(`/spaces/${spaceId}/members`);
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

