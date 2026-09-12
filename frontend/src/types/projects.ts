import { UserDto } from './auth';

export interface ClientDto {
  id: string;
  name: string;
  projectsCount?: number;
}

export interface ProjectDto {
  id: string;
  name: string;
  clientId: string;
  client?: ClientDto;
  pmId: string;
  pm?: UserDto;
  tasksCount?: {
    total: number;
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
    overdue: number;
  };
  createdAt: string;
}

export interface CreateProjectDto {
  name: string;
  clientId: string;
  pmId: string;
}

export interface UpdateProjectDto {
  name?: string;
  clientId?: string;
  pmId?: string;
}
