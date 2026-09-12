import { prisma } from '../../plugins/prisma.js';
import { ClientDto } from '../../types/projects.js';

export class ClientsService {
  async getClients(): Promise<ClientDto[]> {
    const clients = await prisma.client.findMany({
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      projectsCount: c._count.projects,
    }));
  }

  async createClient(name: string): Promise<ClientDto> {
    const client = await prisma.client.create({
      data: { name },
    });

    return {
      id: client.id,
      name: client.name,
      projectsCount: 0,
    };
  }
}

export const clientsService = new ClientsService();
