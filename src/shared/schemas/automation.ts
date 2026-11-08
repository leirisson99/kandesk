import { z } from 'zod';
import { isValidTimeZone } from '../domain/time-zone';
import type { Automation, ExecutionRecord, Task, Weekday } from '../types/automation';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.');
const isoSchema = z.iso.datetime({ offset: true });

export const weekdaySchema: z.ZodType<Weekday> = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const automationFields = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(80, 'Máximo de 80 caracteres.'),
  taskId: z.string().min(1, 'Selecione uma tarefa.'),
  pauseAt: timeSchema,
  resumeAt: timeSchema,
  weekdays: z
    .array(weekdaySchema)
    .min(1, 'Selecione ao menos um dia.')
    .refine((days) => new Set(days).size === days.length, 'Dias duplicados.'),
  timezone: z
    .string()
    .min(1, 'Selecione o fuso horário.')
    .refine(isValidTimeZone, 'Fuso horário inválido.'),
  enabled: z.boolean(),
});

/** Dados editáveis de uma automação (formulário). */
export const automationInputSchema = automationFields.refine((v) => v.pauseAt !== v.resumeAt, {
  path: ['resumeAt'],
  message: 'Pausa e retomada não podem ter o mesmo horário.',
});

export type AutomationInput = z.infer<typeof automationInputSchema>;

export const taskSchema: z.ZodType<Task> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
});

export const automationSchema: z.ZodType<Automation> = automationFields.extend({
  id: z.string().min(1),
  createdAt: isoSchema,
  updatedAt: isoSchema,
  lastExecutedAt: isoSchema.nullable(),
});

export const executionRecordSchema: z.ZodType<ExecutionRecord> = z.object({
  id: z.string().min(1),
  automationId: z.string().min(1),
  automationName: z.string(),
  taskId: z.string().min(1),
  action: z.enum(['PAUSE', 'RESUME']),
  status: z.enum(['SUCCESS', 'SKIPPED', 'MISSED', 'ERROR']),
  scheduledFor: isoSchema,
  executedAt: isoSchema,
  httpStatus: z.number().int().nullable(),
  message: z.string(),
  simulated: z.boolean(),
});
