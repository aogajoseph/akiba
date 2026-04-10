import {
  LoginRequestDto,
  LoginResponseDto,
  MeResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
} from '../../shared/contracts';
import { registerPushNotificationsForCurrentUser } from '../src/services/pushNotifications';
import { api, clearAuthSession, setAuthSession } from '../utils/api';

export const register = async (
  dto: RegisterRequestDto,
): Promise<RegisterResponseDto> => {
  const response = await api.post<{ data: RegisterResponseDto }>('/auth/register', dto);
  setAuthSession({
    user: response.data.data.user,
    token: response.data.data.token,
  });
  void registerPushNotificationsForCurrentUser();
  return response.data.data;
};

export const login = async (dto: LoginRequestDto): Promise<LoginResponseDto> => {
  const response = await api.post<{ data: LoginResponseDto }>('/auth/login', dto);
  setAuthSession({
    user: response.data.data.user,
    token: response.data.data.token,
  });
  void registerPushNotificationsForCurrentUser();
  return response.data.data;
};

export const me = async (): Promise<MeResponseDto> => {
  const response = await api.get<{ data: MeResponseDto }>('/auth/me');
  return response.data.data;
};

export const logout = (): void => {
  clearAuthSession();
};
