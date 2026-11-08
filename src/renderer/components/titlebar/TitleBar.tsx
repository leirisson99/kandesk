import { usePlatform } from '@/hooks/usePlatform';
import { useWindowState } from '@/hooks/useWindowState';
import { Breadcrumb } from './Breadcrumb';
import { SchedulerStatusPill } from './SchedulerStatusPill';
import { TitleBarMenu } from './TitleBarMenu';
import { TitleBarSearch } from './TitleBarSearch';
import { WindowControls } from './WindowControls';

/** Espaço dos semáforos nativos do macOS (hiddenInset); some em tela cheia. */
const MAC_TRAFFIC_LIGHTS_SPACE = 78;

export function TitleBar() {
  const platform = usePlatform();
  const windowState = useWindowState();

  const reserveTrafficLights = platform === 'darwin' && !windowState.fullScreen;

  // No Linux o duplo clique na barra não é tratado pelo sistema; Windows e macOS já o fazem.
  const onDoubleClick = (event: React.MouseEvent) => {
    if (platform !== 'linux') return;
    if ((event.target as HTMLElement).closest('button, input, [role="menu"], [role="listbox"]')) {
      return;
    }
    void window.api.toggleMaximizeWindow();
  };

  return (
    <header
      onDoubleClick={onDoubleClick}
      className="app-drag relative flex h-10 shrink-0 items-center border-b border-slate-200 bg-white select-none"
    >
      <div
        className="flex min-w-0 items-center pl-3.5"
        style={reserveTrafficLights ? { paddingLeft: MAC_TRAFFIC_LIGHTS_SPACE } : undefined}
      >
        <Breadcrumb />
      </div>

      <div className="absolute left-1/2 w-80 max-w-[34%] -translate-x-1/2">
        <TitleBarSearch />
      </div>

      <div className="ml-auto flex h-full items-center gap-2.5 pl-3">
        <SchedulerStatusPill />
        <TitleBarMenu />
        {platform === 'darwin' ? <span className="w-1" /> : null}
        <WindowControls platform={platform} state={windowState} />
      </div>
    </header>
  );
}
