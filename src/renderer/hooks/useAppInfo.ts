import { useEffect, useState } from 'react';
import type { AppInfo } from '@shared/contracts/app';

export function useAppInfo(): { info: AppInfo | null; error: string | null } {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.api
      .getAppInfo()
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return { info, error };
}
