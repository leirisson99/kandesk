import type { AutomationInput } from '@shared/schemas/automation';
import type { Automation } from '@shared/types/automation';
import { useResource, type Resource } from './useResource';

const load = () => window.api.listAutomations();

export interface AutomationsApi extends Resource<Automation[]> {
  create: (input: AutomationInput) => Promise<Automation>;
  update: (id: string, input: AutomationInput) => Promise<Automation>;
  remove: (id: string) => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
}

/** Cada mutação é executada no Main e a lista é recarregada em seguida. */
export function useAutomations(): AutomationsApi {
  const resource = useResource(load);
  const { reload } = resource;

  return {
    ...resource,
    create: async (input) => {
      const created = await window.api.createAutomation(input);
      await reload();
      return created;
    },
    update: async (id, input) => {
      const updated = await window.api.updateAutomation(id, input);
      await reload();
      return updated;
    },
    remove: async (id) => {
      await window.api.deleteAutomation(id);
      await reload();
    },
    setEnabled: async (id, enabled) => {
      await window.api.setAutomationEnabled(id, enabled);
      await reload();
    },
  };
}
