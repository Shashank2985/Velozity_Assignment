import { prisma } from '../../plugins/prisma.js';
import { Role } from '../../types/enums.js';
import { UserDto } from '../../types/auth.js';
import { NotFoundError } from '../../lib/errors.js';
import { toUserDto } from '../auth/auth.service.js';

export class UsersService {
  async getUsers(role?: Role): Promise<UserDto[]> {
    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { name: 'asc' },
    });

    return users.map(toUserDto);
  }

  async getUserById(id: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return toUserDto(user);
  }
}

export const usersService = new UsersService();
