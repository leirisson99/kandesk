import { useCallback, useRef, useState } from 'react';
import { useResource } from './useResource';

/** Seus cards do Kanban. `refresh` ignora o cache de 60 s do Main. */
export function useCards() {
  const forceRefresh = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    const refresh = forceRefresh.current;
    forceRefresh.current = false;
    return window.api.listTasks(refresh ? { refresh: true } : undefined);
  }, []);
  const { data, error, loading, reload } = useResource(load);

  const refresh = async () => {
    forceRefresh.current = true;
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  return { cards: data, error, loading, refreshing, refresh };
}
