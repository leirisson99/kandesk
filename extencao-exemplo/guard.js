// Mostra erros de carregamento das Opções na própria página (sem precisar do DevTools).
const show = (msg) => {
  const el = document.getElementById("report");
  if (el) el.textContent = `ERRO: ${msg}`;
};

window.addEventListener(
  "error",
  (e) => show(e.message || `falha ao carregar ${e.target?.src ?? "recurso"}`),
  true,
);
window.addEventListener("unhandledrejection", (e) =>
  show(String(e.reason?.stack ?? e.reason)),
);
