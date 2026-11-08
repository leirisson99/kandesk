import { z } from 'zod';
import type { SchedulerStatus, WindowState } from '../types/system';

export const windowStateSchema: z.ZodType<WindowState> = z.object({
  maximized: z.boolean(),
  fullScreen: z.boolean(),
});

export const schedulerStatusSchema: z.ZodType<SchedulerStatus> = z.object({
  running: z.boolean(),
  activeAutomations: z.number().int().nonnegative(),
  nextRunAt: z.iso.datetime({ offset: true }).nullable(),
  lastError: z.string().nullable(),
});
