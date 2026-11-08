import { useEffect, useState } from 'react';
import type { WindowState } from '@shared/types/system';

const INITIAL: WindowState = { maximized: false, fullScreen: false };

export function useWindowState(): WindowState {
  const [state, setState] = useState<WindowState>(INITIAL);

  useEffect(() => {
    let active = true;
    window.api
      .getWindowState()
      .then((s) => active && setState(s))
      .catch((e: unknown) => console.error('Falha ao ler o estado da janela:', e));
    const unsubscribe = window.api.onWindowStateChanged(setState);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}
