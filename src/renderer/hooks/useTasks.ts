import { useResource } from './useResource';

const load = () => window.api.listTasks();

export const useTasks = () => useResource(load);
