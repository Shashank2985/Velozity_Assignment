import { api } from './api';
import { LoginRequestDto, LoginResponseDto, RefreshResponseDto, UserDto } from '../types/auth';

export const authService = {
  async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    const response = await api.post<LoginResponseDto>('/auth/login', credentials);
    return response.data;
  },

  async me(): Promise<{ user: UserDto }> {
    const response = await api.get<{ user: UserDto }>('/auth/me');
    return response.data;
  },

  async refresh(): Promise<RefreshResponseDto> {
    const response = await api.post<RefreshResponseDto>('/auth/refresh');
    return response.data;
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>('/auth/logout');
    return response.data;
  },
};
