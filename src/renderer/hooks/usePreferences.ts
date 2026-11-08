import { useCallback, useEffect, useState } from 'react';
import type { Preferences } from '@shared/schemas/preferences';
import { errorMessage } from '@/lib/errors';

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.api
      .getPreferences()
      .then(setPreferences)
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  const update = useCallback(async (patch: Partial<Preferences>) => {
    try {
      setPreferences(await window.api.updatePreferences(patch));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  return { preferences, error, update };
}
