import { Role } from './enums';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  user: UserDto;
  accessToken: string;
}

export interface RefreshResponseDto {
  user: UserDto;
  accessToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  iat?: number;
  exp?: number;
}
