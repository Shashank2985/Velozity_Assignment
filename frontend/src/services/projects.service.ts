import { api } from './api';
import { ClientDto, CreateProjectDto, ProjectDto, UpdateProjectDto } from '../types/projects';
import { UserDto } from '../types/auth';
import { Role } from '../types/enums';

export const projectsService = {
  async getProjects(): Promise<{ success: boolean; projects: ProjectDto[] }> {
    const response = await api.get<{ success: boolean; projects: ProjectDto[] }>('/projects');
    return response.data;
  },

  async getProjectById(id: string): Promise<{ success: boolean; project: ProjectDto }> {
    const response = await api.get<{ success: boolean; project: ProjectDto }>(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: CreateProjectDto): Promise<{ success: boolean; project: ProjectDto }> {
    const response = await api.post<{ success: boolean; project: ProjectDto }>('/projects', data);
    return response.data;
  },

  async updateProject(id: string, data: UpdateProjectDto): Promise<{ success: boolean; project: ProjectDto }> {
    const response = await api.patch<{ success: boolean; project: ProjectDto }>(`/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/projects/${id}`);
    return response.data;
  },

  async getClients(): Promise<{ success: boolean; clients: ClientDto[] }> {
    const response = await api.get<{ success: boolean; clients: ClientDto[] }>('/clients');
    return response.data;
  },

  async getUsers(role?: Role): Promise<{ success: boolean; users: UserDto[] }> {
    const params = role ? { role } : {};
    const response = await api.get<{ success: boolean; users: UserDto[] }>('/users', { params });
    return response.data;
  },
};
