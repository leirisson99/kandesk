import { useEffect } from 'react';
import { useResource } from './useResource';

const load = () => window.api.getSchedulerStatus();

export function useSchedulerStatus() {
  const resource = useResource(load);
  const { reload } = resource;
  useEffect(() => window.api.onSchedulerStatusChanged(() => void reload()), [reload]);
  return resource;
}
