# Kanban Automation (kandesk)

Aplicativo desktop (Electron + React + TypeScript) para automatizar ações em tarefas do Kanban.
Nesta etapa a integração com a API é **simulada (mock)**. Veja [CLAUDE.md](CLAUDE.md) e [docs/](docs/).

## Comandos

| Comando             | O que faz                               |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Executa o app em modo desenvolvimento   |
| `npm run build`     | Typecheck + build de produção em `out/` |
| `npm run typecheck` | Verificação de tipos (`tsc -b`)         |
| `npm run lint`      | ESLint                                  |
| `npm test`          | Testes (Vitest)                         |

> Se o app falhar com `Cannot read properties of undefined (reading 'app')`, a variável
> `ELECTRON_RUN_AS_NODE` está definida no terminal (comum em terminais do VS Code). Rode com
> `env -u ELECTRON_RUN_AS_NODE npm run dev`.

## Estrutura

- `src/main` — processo principal: janela, handlers IPC e `composition-root.ts` (único lugar que escolhe SQLite/mock).
- `src/application` — portas (`ports.ts`), erros e casos de uso; não conhece Electron, React nem SQLite.
- `src/infrastructure` — SQLite (`node:sqlite`, sem dependência nativa), migrações, repositórios e mocks.
- `src/preload` — API mínima exposta via `contextBridge` (`window.api`).
- `src/renderer` — interface React (rotas, layout, páginas).
- `src/shared` — contratos e schemas Zod compartilhados (canais IPC em `contracts/ipc.ts`).

Para adicionar uma operação IPC: declare o canal e seus schemas em `ipcChannels`, registre o
handler em `src/main/ipc/register-handlers.ts` e exponha um método nomeado no preload.

## Componentes do renderer

- `components/ui` — primitivos sem regra de negócio (Button, Card, Badge, Switch, Alert, FormField…).
- `components/layout` — Sidebar e status da integração.
- `components/titlebar` — barra de título própria (breadcrumb, busca Ctrl/⌘ K, estado do agendador, menu ⋯, botões de janela).
- `components/{automation,history,dashboard,settings}` — componentes por tela, orientados por props.
- `hooks/` — acesso aos dados via `window.api` (IPC); sem SQL nem regra de negócio no renderer.
- `lib/` — formatação e filtros puros (testados).

Layouts de referência: `layouts-exemplos/`.

## Persistência

- Banco `kandesk.db` em `app.getPath('userData')`, aberto no Main. Versão do schema em `PRAGMA user_version`.
- Para alterar o schema, **acrescente** uma entrada em `MIGRATIONS` ([migrations.ts](src/infrastructure/database/migrations.ts)); nunca edite uma já publicada.
- Na primeira execução é gravada uma carga de **demonstração** (automações `demo-*` e histórico com `simulated = true`). Tarefas vêm de `MockTaskRepository`. Para recomeçar, apague `kandesk.db`.

## Agendador, bandeja e notificações

- **Agendador** ([scheduler-service.ts](src/application/scheduler-service.ts)): timer único no processo principal.
  As regras salvas são a fonte de verdade: a cada tick (no máximo 30 s, ou no próximo horário) ele recalcula
  as ocorrências devidas desde o último tick. Editar, desativar ou excluir uma automação reavalia na hora.
- **Execução simulada:** pausa/retomada chamam `MockTaskRepository` e gravam o histórico com `simulated = true`.
  Nenhuma tarefa real é alterada.
- **Sem execução duplicada:** cada ocorrência (automação + ação + horário agendado) tem índice único no banco.
- **Política de ocorrências perdidas:** se o atraso passar de 2 minutos (computador suspenso, app fechado), a
  ocorrência é registrada como `MISSED` e **nunca** executada com atraso. O retrospecto é limitado a 7 dias.
  Uma automação criada ou editada só vale a partir da alteração (não gera "passado").
- **Fuso horário:** cada automação tem o seu; horários são calculados em [src/shared/domain](src/shared/domain).
  Em horário inexistente (salto de horário de verão) vale o instante logo após o salto.
- **Bandeja:** com "Fechar a janela mantém o app na bandeja" a janela é só escondida e o agendador continua.
  "Sair" (menu da bandeja ou Configurações) encerra de verdade. Se o sistema não conseguir criar a bandeja,
  a janela fecha normalmente (para o app não ficar inacessível). Abrir o app de novo mostra a janela existente.
- **Iniciar com o sistema:** só no app instalado (nunca em `npm run dev`) e apenas Windows/macOS; Linux não suporta.
- **Notificações nativas:** respeitam as preferências (sucesso, falha, ocorrência perdida) e dizem quando a ação foi simulada.
- **Som e toque:** a notificação do sistema sai sempre `silent` e o app toca o próprio som ([sound-player.ts](src/main/services/sound-player.ts)),
  porque o som nativo só é confiável no macOS. Em Configurações o usuário liga/desliga o som e escolhe 1 de 5 toques
  (Cristal, Alerta, Gota, Sino, Pulso), usado em **todas** as notificações; ao escolher, o toque é reproduzido ("Ouvir" repete).
  Usa uma janela oculta, sem acesso a Node, criada sob demanda (toca mesmo com a janela principal na bandeja).
  Os arquivos são `resources/sounds/<id>.wav` (gerados, sem direitos de terceiros). Para adicionar um toque: novo `.wav`,
  novo id em [notification-tones.ts](src/shared/constants/notification-tones.ts), import em `main/index.ts` e rótulo em
  `renderer/lib/notification-tones.ts`. Um toque salvo que deixe de existir volta ao padrão (Cristal).
- **Empacotamento (Fase 6):** os assets em `resources/` (ícones, sons, `audio-host.html`) são referenciados por caminho
  relativo (`?asset`); o instalador precisa incluir a pasta `resources/` junto do app.

### Limitações conhecidas

- Em algumas distribuições Linux (ex.: GNOME sem extensão de AppIndicator) o ícone da bandeja pode não aparecer
  mesmo sem erro; nesse caso reabra o app para mostrar a janela. Precisa ser validado por plataforma (Fase 6).
- O alerta de antecedência ("será pausado às 17h58") e os alertas de novos cards ainda não existem (ver `docs/ROADMAP.md`).
- Os testes de ponta a ponta com Electron foram feitos manualmente; a suíte automática cobre domínio, casos de uso,
  agendador (relógio controlado) e repositórios.

## Barra de título

A janela não usa a moldura nativa: a barra de 40 px é desenhada pelo app ([TitleBar.tsx](src/renderer/components/titlebar/TitleBar.tsx)),
seguindo `layouts-exemplos/`. Só muda quem desenha os botões de janela:

| SO      | Janela (main)                  | Botões                                                                 |
| ------- | ------------------------------ | ---------------------------------------------------------------------- |
| Windows | `frame: false`                 | 46×40, desenhados pelo app                                             |
| macOS   | `titleBarStyle: 'hiddenInset'` | semáforos nativos; o app reserva 78 px à esquerda (some em tela cheia) |
| Linux   | `frame: false`                 | redondos, estilo GNOME                                                 |

- Regiões de arrastar: classes `app-drag` / `app-no-drag` (CSS `-webkit-app-region`). Todo controle interativo da barra deve ser `app-no-drag`.
- Controles de janela via IPC específico (`window:minimize`, `window:toggle-maximize`, `window:close`); fechar passa pelo
  handler de "manter na bandeja". O estado (maximizada/tela cheia) chega por evento.
- `platform` é exposto de forma síncrona pelo preload, para a barra não piscar.
- Windows e Linux não têm menu nativo (`Menu.setApplicationMenu(null)`); o macOS mantém o menu padrão (copiar/colar, ⌘Q).
- A pílula "Agendador ativo" reflete `SchedulerService.getStatus()` (ativo, sem automações ativas, erro, parado) e só informa.
- Busca: Ctrl/⌘ K foca o campo; escolher um resultado abre `/automations?select=<id>` (a seleção da página de automações vive na URL).

### Não validado nesta máquina

Só foi testado no Ubuntu (Wayland). Falta validar no Windows e no macOS: aparência dos botões/semáforos, espaço reservado,
duplo clique na barra e redimensionamento. No Linux o duplo clique para maximizar é tratado pelo app (DOM); em algumas
sessões a região de arrastar pode engolir o evento — conferir em X11 e Wayland (Fase 6).
