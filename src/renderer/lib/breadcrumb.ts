/** Rótulo da página atual para o breadcrumb ("" se a rota for desconhecida). */
export function pageLabel(
  pathname: string,
  routes: readonly { path: string; label: string }[],
): string {
  return routes.find((r) => r.path === pathname)?.label ?? '';
}
