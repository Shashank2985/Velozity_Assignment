import { z } from 'zod';
import { ValidationError } from './errors.js';
import { Role, TaskStatus, Priority } from '../types/enums.js';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(150),
  clientId: z.string().uuid('Invalid client ID format'),
  pmId: z.string().uuid('Invalid PM ID format'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  clientId: z.string().uuid().optional(),
  pmId: z.string().uuid().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().default(''),
  projectId: z.string().uuid('Invalid project ID format'),
  assigneeId: z.string().uuid('Invalid assignee ID format'),
  priority: z.nativeEnum(Priority),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string format',
  }),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.TODO),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string format',
  }).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export const taskQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))]).optional(),
  priority: z.union([z.nativeEnum(Priority), z.array(z.nativeEnum(Priority))]).optional(),
  assigneeId: z.string().uuid().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  isOverdue: z
    .preprocess((val) => {
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      if (typeof val === 'boolean') return val;
      return undefined;
    }, z.boolean().optional())
    .optional() as z.ZodType<boolean | undefined>,
  search: z.string().optional(),
  page: z
    .preprocess((val) => (val !== undefined ? parseInt(String(val), 10) : 1), z.number().optional())
    .optional() as z.ZodType<number | undefined>,
  limit: z
    .preprocess((val) => (val !== undefined ? parseInt(String(val), 10) : 50), z.number().optional())
    .optional() as z.ZodType<number | undefined>,
  sortBy: z.enum(['dueDate', 'createdAt', 'priority', 'status', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formattedErrors = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    throw new ValidationError('Validation failed', formattedErrors);
  }
  return result.data;
}
