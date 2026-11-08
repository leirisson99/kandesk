import { z } from 'zod';

/** Informações básicas do aplicativo, expostas ao renderer. */
export const appInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  platform: z.enum(['win32', 'darwin', 'linux']),
  /** Enquanto não houver API real, toda integração é simulada. */
  integrationMode: z.enum(['MOCK', 'REAL']),
});

export type AppInfo = z.infer<typeof appInfoSchema>;
