import {
  LoginRequestDto,
  LoginResponseDto,
  MeResponseDto,
  PasswordResetRequestDto,
  PasswordResetRequestResponseDto,
  PasswordResetVerifyRequestDto,
  PasswordResetVerifyResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
  UpdateProfileRequestDto,
  UpdateProfileResponseDto,
  UsernameAvailabilityResponseDto,
} from '../../shared/contracts';
import { registerPushNotificationsForCurrentUser } from '../src/services/pushNotifications';
import { api, clearAuthSession, setAuthSession, setAuthSessionUser } from '../utils/api';

export const register = async (
  dto: RegisterRequestDto,
): Promise<RegisterResponseDto> => {
  const response = await api.post<{ data: RegisterResponseDto }>('/auth/register', dto);
  await setAuthSession({
    user: response.data.data.user,
    accessToken: response.data.data.accessToken,
  });
  void registerPushNotificationsForCurrentUser();
  return response.data.data;
};

export const login = async (dto: LoginRequestDto): Promise<LoginResponseDto> => {
  const response = await api.post<{ data: LoginResponseDto }>('/auth/login', dto);
  await setAuthSession({
    user: response.data.data.user,
    accessToken: response.data.data.accessToken,
  });
  void registerPushNotificationsForCurrentUser();
  return response.data.data;
};

export const me = async (): Promise<MeResponseDto> => {
  const response = await api.get<{ data: MeResponseDto }>('/auth/me');
  return response.data.data;
};

export const checkUsernameAvailability = async (
  username: string,
): Promise<UsernameAvailabilityResponseDto> => {
  const response = await api.get<{ data: UsernameAvailabilityResponseDto }>(
    '/auth/username-availability',
    {
      params: {
        username,
      },
    },
  );

  return response.data.data;
};

export const requestPasswordReset = async (
  dto: PasswordResetRequestDto,
): Promise<PasswordResetRequestResponseDto> => {
  const response = await api.post<{ data: PasswordResetRequestResponseDto }>(
    '/auth/password-reset/request',
    dto,
  );

  return response.data.data;
};

export const verifyPasswordReset = async (
  dto: PasswordResetVerifyRequestDto,
): Promise<PasswordResetVerifyResponseDto> => {
  const response = await api.post<{ data: PasswordResetVerifyResponseDto }>(
    '/auth/password-reset/verify',
    dto,
  );

  return response.data.data;
};

export const updateProfile = async (
  dto: UpdateProfileRequestDto,
): Promise<UpdateProfileResponseDto> => {
  const response = await api.patch<{ data: UpdateProfileResponseDto }>('/users/me', dto);
  setAuthSessionUser(response.data.data.user);
  return response.data.data;
};

export const logout = async (): Promise<void> => {
  await clearAuthSession();
};
