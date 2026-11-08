import type { ReactNode } from 'react';
import { History, LayoutDashboard, Settings, Zap, type LucideIcon } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export interface AppRoute {
  path: string;
  label: string;
  icon: LucideIcon;
  element: ReactNode;
}

export const routes: AppRoute[] = [
  { path: '/', label: 'Painel', icon: LayoutDashboard, element: <DashboardPage /> },
  { path: '/automations', label: 'Automações', icon: Zap, element: <AutomationsPage /> },
  { path: '/history', label: 'Histórico', icon: History, element: <HistoryPage /> },
  { path: '/settings', label: 'Configurações', icon: Settings, element: <SettingsPage /> },
];
