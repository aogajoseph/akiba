import {
  CreateGroupRequestDto,
  CreateGroupResponseDto,
  GetGroupResponseDto,
  ListGroupSignatoriesResponseDto,
  ListGroupsResponseDto,
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
