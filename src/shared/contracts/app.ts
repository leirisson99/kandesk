import { z } from 'zod';

/** Informações básicas do aplicativo, expostas ao renderer. */
export const appInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  platform: z.enum(['win32', 'darwin', 'linux']),
});

export type AppInfo = z.infer<typeof appInfoSchema>;
