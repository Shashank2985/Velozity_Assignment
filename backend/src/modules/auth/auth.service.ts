import crypto from 'crypto';
import argon2 from 'argon2';
import { prisma } from '../../plugins/prisma.js';
import { Role } from '../../types/enums.js';
import { JwtPayload, UserDto } from '../../types/auth.js';
import { NotFoundError, UnauthorizedError } from '../../lib/errors.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRawRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function toUserDto(user: { id: string; name: string; email: string; role: Role | string; createdAt: Date }): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    createdAt: user.createdAt.toISOString(),
  };
}

export class AuthService {
  async login(
    email: string,
    password: string,
    signJwt: (payload: JwtPayload) => string
  ): Promise<{ user: UserDto; accessToken: string; rawRefreshToken: string; expiresAt: Date }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await argon2.verify(user.passwordHash, password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      name: user.name,
    };

    const accessToken = signJwt(jwtPayload);
    const rawRefreshToken = generateRawRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        revoked: false,
      },
    });

    return {
      user: toUserDto(user),
      accessToken,
      rawRefreshToken,
      expiresAt,
    };
  }

  async refresh(
    rawRefreshToken: string,
    signJwt: (payload: JwtPayload) => string
  ): Promise<{ user: UserDto; accessToken: string; rawRefreshToken: string; expiresAt: Date }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      if (tokenRecord && tokenRecord.revoked) {
        // Reuse detection: If a revoked token is used, revoke all tokens for this user
        await prisma.refreshToken.updateMany({
          where: { userId: tokenRecord.userId },
          data: { revoked: true },
        });
      }
      throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Revoke old refresh token (Token Rotation)
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    // Create new refresh token
    const newRawRefreshToken = generateRawRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.user.id,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
        revoked: false,
      },
    });

    const jwtPayload: JwtPayload = {
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role as Role,
      name: tokenRecord.user.name,
    };

    const accessToken = signJwt(jwtPayload);

    return {
      user: toUserDto(tokenRecord.user),
      accessToken,
      rawRefreshToken: newRawRefreshToken,
      expiresAt: newExpiresAt,
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }
  }

  async getMe(userId: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return toUserDto(user);
  }
}

export const authService = new AuthService();
