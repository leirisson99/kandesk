# KANBAN_INVESTIGATION — Sistema Kanban interno

**Status:** Em investigação. Código da extensão analisado em 2026-11-09 (fonte: `extencao-exemplo/`).
Leitura via API confirmada **pelo código**; pausa por token **não confirmada** (ver seções 5 e 6).
**Objetivo:** reunir, a partir da extensão existente, tudo o que for necessário para integrar o
Kanban Automation ao Kanban interno: autenticação, endpoints, formato dos dados, estados e limites.

> **Regra deste documento:** só registrar o que foi **observado** (com a fonte). O que não foi
> confirmado fica como `[A CONFIRMAR]`. O CLAUDE.md proíbe inventar endpoints, payloads e regras.
> Nada do que está aqui deve virar código antes de ser confirmado.

> **Segurança:** nunca colar tokens, cookies ou cabeçalhos de autorização reais neste arquivo
> nem em commits. Substitua por `<TOKEN>`, `<COOKIE>` etc. Também remova nomes de clientes e
> dados pessoais dos exemplos de resposta.

---

## 1. Por que esta investigação existe

- O PRD prevê executar pausa/retomada pela **API do Kanban com token**, sem depender do Chrome.
- `docs/alert.md` sugere usar a **extensão como ponte**. Isso só faz sentido se a API não puder ser
  chamada diretamente (ver `docs/ROADMAP.md`, backlog).
- A resposta depende do que a extensão faz hoje. Esta investigação decide o caminho:

| Se a extensão… | Então… |
|---|---|
| chama uma API HTTP autenticável por token | O app chama a mesma API direto (`KanbanTaskRepository`). Extensão não é necessária para executar. |
| chama a API usando cookie/sessão do navegador | Precisa ficar claro se existe token alternativo. Se não, avaliar a ponte (ver seção 9). |
| manipula a página (DOM, cliques) | Não há API a consumir. Rever o escopo do projeto. |

## 2. Perguntas que precisam de resposta

Marque quando respondida e registre a fonte na seção 11.

- [x] A API pode ser chamada **fora do navegador** com um token? — **Sim, confirmado em 2026-11-09:** `curl` com
  Basic auth (usuário:token) em `/jsonrpc.php` respondeu `getMe` com sucesso, sem cookie e sem VPN/proxy. (§11, #1 e #10)
- [ ] Esse token autoriza **escrita** (pausar/retomar), e não só leitura? — **Não confirmado.** A extensão **não** pausa
  pela API; pausa pelo formulário web com cookie (§11, #3). Falta testar um método de escrita com o token.
- [ ] Existe operação de **retomar**, ou só de pausar? — A extensão não retoma; só lembra o usuário de retomar (§11, #4).
- [x] É possível **consultar o estado atual** da tarefa antes e depois da ação? — Sim para cronômetros:
  `getAllSubtasks` (`status`, `is_timer_started`, `timer_start_date`) e `hasSubtaskTimer` (§11, #5).
- [ ] Qual a validade do token, e como renovar/revogar? — O token é gerado no perfil do Kanboard (API → "Gerar um novo
  token"). Validade e revogação não aparecem no código. `[A CONFIRMAR]`
- [ ] Há limite de requisições (rate limit)? — Não aparece no código. A extensão envia lotes de até 40 chamadas e usa
  cache para reduzir tráfego. `[A CONFIRMAR]`
- [ ] A rede interna exige **VPN**, proxy ou certificado próprio? — `[A CONFIRMAR]` (a extensão roda no navegador do usuário).
- [x] Como identificar "tarefas atribuídas a mim"? — **Pelo `owner_id` do card**, que o `getBoard` já devolve
  (confirmado em 2026-11-09, §11 #12). A extensão de referência não o usa: deduz "meu" por cronômetro, subtask ou tempo
  lançado (§11 #6), o que **não** achou os cards deste usuário.
- [x] A resposta traz a **data da última mudança de status**? — **Sim:** os cards do `getBoard` trazem `date_moved`
  (§11 #12). Formato confirmado: texto com segundos Unix (§11 #15). Falta confirmar se ela muda só ao mover de coluna.
- [x] Dá para **filtrar os cards do usuário logado**? — Não por filtro de API; filtra no cliente (ver "meu" acima).
- [x] A extensão **já lê os status dos cards** hoje? — Sim, **por API** (`getBoard`), não por DOM (§11, #2).

## 3. Como coletar as informações (segunda-feira)

### 3.1 Código da extensão
1. Abrir `chrome://extensions`, ativar **Modo do desenvolvedor** e anotar o **ID** da extensão.
2. Abrir a pasta da extensão instalada:
   - Linux: `~/.config/google-chrome/Default/Extensions/<ID>/<versão>/`
   - Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\<ID>\<versão>\`
   - macOS: `~/Library/Application Support/Google/Chrome/Default/Extensions/<ID>/<versão>/`
3. Ler `manifest.json` e os scripts referenciados (background/service worker, content scripts).
   Se o código estiver minificado, o repositório da extensão (se existir) é preferível.

### 3.2 Tráfego real
1. Abrir o Kanban com o DevTools (**F12 → Network**), filtro **Fetch/XHR**.
2. Executar a ação manualmente (listar, abrir tarefa, pausar, retomar) e observar cada requisição.
3. Para cada uma, anotar: método, URL (sem dados sensíveis), cabeçalhos **nomes** (não valores),
   corpo enviado, status e corpo da resposta.
4. Repetir com a **extensão ativa** e anotar quais requisições partem dela
   (DevTools do service worker em `chrome://extensions` → "Inspecionar visualizações").

### 3.3 Armazenamento
- Em Application → Storage (Local Storage, Cookies) e no DevTools da extensão
  (`chrome.storage.local.get(null)`), listar **as chaves** que existem. Não copiar valores secretos.

## 4. Extensão existente

| Item | Valor |
|---|---|
| Nome / ID | "Card Guard - Kanboard SCI" v0.1.0 (ID da extensão: não aplicável, carregada sem compactação) |
| Versão do manifest (V2 ou V3) | V3 (`manifest.json`) |
| Permissões (`permissions`) | `alarms`, `notifications`, `storage` |
| Domínios permitidos (`host_permissions`) | `https://kanboard.sci.com.br/*` e `https://www.rhnetsocial.com.br/*` |
| Content scripts (páginas em que atua) | Nenhum. Só service worker + página de opções |
| Background / service worker | `background.js` (módulo ES), checagem por `chrome.alarms` a cada `checkEveryMinutes` (padrão 1 min) |
| Código-fonte disponível? Onde? | Sim, não minificado: `extencao-exemplo/` (README, `api.js`, `kanboard.js`, `logic.js`, `rh.js`, `cache.js`, `config.js`, `background.js`) |
| Como lê os cards (API ou DOM)? | **API JSON-RPC** (`api.js`, `kanboard.js`). Só a pausa e o RH Net usam HTML |
| Como pausa um card (API ou clique)? | **Formulário web com cookie de sessão** (`background.js: pauseSubtask`): abre a página do card, acha o link "Pausar…", abre o modal, preenche a observação e faz POST. Não usa a API |
| O que faz hoje com alertas | Em expediente: avisa card em coluna "EM …" sem cronômetro meu rodando, e card em "PAUSAD/PARAD" com cronômetro meu rodando. Fora do expediente: pausa os requisitos em andamento e avisa; ao voltar, lembra de retomar. Anti-repetição por `renotifyEveryMinutes` (60 min) |

## 5. Autenticação

| Item | Valor |
|---|---|
| Mecanismo (token, cookie de sessão, OAuth…) | **Leitura:** usuário + token da API (Kanboard). **Pausa:** cookie de sessão do navegador. **RH Net:** cookie de sessão |
| Onde o usuário obtém o token | Perfil no Kanboard → API → "Gerar um novo token" (`extencao-exemplo/README.md`) |
| Cabeçalho/forma de envio (apenas o **nome**, ex.: `Authorization: Bearer <TOKEN>`) | `Authorization: Basic base64(<USUARIO>:<TOKEN>)` + `Content-Type: application/json`, sem cookies (`api.js`) |
| Escopos/permissões do token | `[A CONFIRMAR]` (o Kanboard padrão dá ao token as permissões do usuário; não verificado aqui) |
| Validade e renovação | `[A CONFIRMAR]` |
| Como revogar | `[A CONFIRMAR]` |
| Erro quando expirado (status e corpo) | HTTP **401** com corpo `{"error":{"code":401,"message":"Unauthorized"},"id":null}` (confirmado em 2026-11-09, §11 #16) |
| Erro quando sem permissão (status e corpo) | `[A CONFIRMAR]` |

## 6. Endpoints

Preencher **uma linha por operação observada**. Operação sem evidência fica `[A CONFIRMAR]`.

| Operação | Método e caminho | Entrada | Saída (campos relevantes) | Fonte |
|---|---|---|---|---|
| URL base | `https://kanboard.sci.com.br` | — | — | `config.js` |
| Endpoint único da API | `POST /jsonrpc.php` (JSON-RPC 2.0, aceita **array** de chamadas em lote) | `[{jsonrpc, id, method, params}]` | `[{id, result}]` ou `[{id, error:{message}}]`, casadas pelo `id` | `api.js` |
| Usuário atual | RPC `getMe` | `{}` | `id`, `name`, `username` | `background.js` |
| Meus projetos (sprints) | RPC `getMyProjects` | `{}` | lista com `id`, `is_active` ("1" = ativo) | `background.js` |
| Listar cards de uma sprint | RPC `getBoard` | `{project_id}` | raias → `columns[]` → `{id, title, tasks[{id, title}]}` | `kanboard.js: boardCandidates` |
| Consultar uma tarefa | **Não usado.** `getTask` `[A CONFIRMAR]` | | | |
| Requisitos (subtasks) do card | RPC `getAllSubtasks` | `{task_id}` | `id`, `title`, `status`, `type`, `user_id`, `is_timer_started`, `timer_start_date` | `kanboard.js` |
| Tenho cronômetro neste requisito? | RPC `hasSubtaskTimer` | `{subtask_id, user_id}` | `true`/`false` | `kanboard.js` |
| Tempo lançado por mim | RPC `getSubtaskTimeSpent` | `{subtask_id, user_id}` | número (> 0 = já trabalhei) | `kanboard.js` |
| Pausar | **A API por token não pausa:** `setSubtaskEndTime` existe, mas devolve HTTP 403 para este usuário (§11 #21). Outros métodos de escrita (ex.: `updateSubtask`) **não testados**. Fluxo web já conhecido: `GET <href do link "Pausar…">` com `X-Requested-With: XMLHttpRequest` → formulário do modal → `POST <action do form>` (`application/x-www-form-urlencoded`, cookie de sessão), com campo de observação | campos do form (inclui token CSRF `[A CONFIRMAR]`) | HTTP 2xx = ok | `background.js: pauseSubtask`, `logic.js: parseConfirmForm` |
| Retomar | **Não existe na extensão** `[A CONFIRMAR]` | | | |
| Página do card (web) | `GET /sprint/{projectId}/solicitacao/{taskId}` | — | HTML com `<tr data-subtask-id>` | `background.js` |

Observações do modelo: o alvo da pausa é o **requisito (subtask) com cronômetro**, não o card. Status de subtask
"em andamento" = `"1"` (desenvolvimento) e `"4"` (teste), ou `is_timer_started === true` (`kanboard.js`).
Os ids das colunas mudam a cada sprint; a classificação é pelo **nome** (§7.2).

Exemplos reais (sanitizados) de requisição e resposta devem ir na seção 12.

## 7. Modelo de dados

### 7.1 Tarefa
Campos observados na resposta da API e como mapeiam para o nosso `Task`
(`src/shared/types/automation.ts`):

| Campo na API | Tipo | Exemplo (sanitizado) | Nosso campo | Observação |
|---|---|---|---|---|
| `tasks[].id` (em `getBoard`) | número/string | `254132` | `id` | Estável. Referência completa no sistema = `projectId/taskId` (ex.: `10526/254132`), usada em `ref` e na URL do card |
| `tasks[].title` | string | — | `title` | |
| `columns[].title` (coluna do card) | string | `EM DESENVOLVIMENTO`, `PAUSADO` | `status` | Não há campo "status" separado observado; o estado do card é a **coluna**. Ver 7.2 |
| — | — | — | `assignee` | **Sem campo de responsável usado.** Deduzir por subtasks/cronômetro (§2). `[A CONFIRMAR]` se `getBoard` traz `assignee_*` |
| — | — | — | `updatedAt` | **Não observado.** `timer_start_date` (segundos Unix) existe só na subtask |

Mapeamento de domínio: o objeto que o app pausa é a **subtask com cronômetro** (`subtasks[].id`). O `Task` atual
(`src/shared/types/automation.ts`) precisará representar `projectId` + `taskId` e, na execução, resolver as subtasks em andamento.

### 7.2 Estados e transições
- Valores possíveis de status (colunas): variam por sprint; nomes observados: `EM DESENVOLVIMENTO`, `PAUSADO`
  (relatório de execução) e, pelos padrões da extensão, `EM CODE REVIEW`, `HOMOLOGAÇÃO`, `EM TESTES`,
  `DESENVOLVIMENTO PARADO`, `TESTE PARADO`. Lista completa: `[A CONFIRMAR]`
- Qual valor significa **pausada**: coluna cujo nome casa `PAUSAD|PARAD` (sem acento, maiúsculo) — `config.js`
- Qual valor significa **em andamento**: coluna que casa `^EM ` — `config.js`
- Retomar volta para qual estado? `[A CONFIRMAR]` (não implementado na extensão)
- Pausar uma tarefa já pausada: `[A CONFIRMAR]`. A extensão evita o caso: só pausa subtask com cronômetro meu aberto
- Quem pode pausar: a extensão só pausa cronômetros **do próprio usuário**. Pausar o de outro: `[A CONFIRMAR]`
- Subtask: status `"1"` = em desenvolvimento, `"4"` = teste em andamento (`kanboard.js`); demais valores `[A CONFIRMAR]`

### 7.3 Dados para o alerta de "card parado" (monitoramento)
O alerta "card há muito tempo no mesmo status" depende destes dados. Marque o que a API/extensão fornece:

| Dado | Existe? | Campo / fonte | Observação |
|---|---|---|---|
| Data da última mudança de status (ex.: `statusChangedAt`) | **Sim (campo observado)** | `date_moved` em cada card do `getBoard` | Com ele o tempo parado é **exato**. Formato confirmado (segundos Unix, §11 #15); falta confirmar a semântica (só mudança de coluna?). |
| Histórico de status (lista de transições com data) | `[A CONFIRMAR]` | | Alternativa ao campo acima. |
| Data de última atualização genérica (`updatedAt`) | Não observado | | **Não serve sozinha**: muda com comentários, edições etc. |
| Responsável do card | **Sim** | `owner_id`, `assignee_username`, `assignee_name` no `getBoard` | Usado pelo app para listar "meus cards". |
| Filtro "meus cards" (na API ou na página) | Sem filtro no servidor | filtro no cliente por `owner_id` | A extensão deduz por cronômetro/subtask (`isMe`, `loadCardEntries`) |
| Coluna/etapa do quadro, além do status | **Sim** | `columns[].title` em `getBoard` | Base para limites por etapa. |

> **Importante:** a extensão **não mede "card muito tempo parado"** (mas o `getBoard` traz `date_moved`, que torna isso viável). Ela só detecta **inconsistência entre coluna
> e cronômetro** (ver §9.2). O alerta de tempo parado é funcionalidade **nova** a construir.

**Sem data de mudança de status**, o app só sabe quando **viu** o card naquele status pela primeira vez.
O tempo parado vira uma estimativa e se perde se o app ou o Chrome ficarem fechados por dias.
Registrar essa limitação se for o caso.

## 8. Erros, limites e rede

| Item | Valor |
|---|---|
| Formato de erro (campos, códigos) | Por chamada no lote: `{id, error:{message}}`. HTTP 401 = token inválido; outros não-ok viram `kanboard HTTP <n>` (`api.js`) |
| Códigos HTTP usados (401, 403, 404, 409, 5xx…) | Só 401 tratado explicitamente. Demais `[A CONFIRMAR]` |
| Rate limit | `[A CONFIRMAR]`. A extensão limita a 40 chamadas por envio e usa cache (TTLs em `cache.js`) |
| Timeout razoável | Não definido na extensão (sem `AbortController`). `[A CONFIRMAR]` |
| Exige VPN/proxy/certificado interno? | `[A CONFIRMAR]` |
| Chamadas de fora do navegador funcionam? (CORS não se aplica ao Node) | `[A CONFIRMAR]`: testar com `curl`/Node (próxima etapa) |
| Idempotência (repetir pausar gera efeito colateral?) | `[A CONFIRMAR]`. A extensão reduz o risco relendo o estado e invalidando o cache após pausar |

## 9. Decisões que esta investigação deve produzir

- [x] **Execução:** ~~API direta com token~~ → **ponte via extensão** (decidido em 2026-11-10: a API por token devolve 403 ao pausar, §11 #21). Desenho em `docs/ARCHITECTURE.md` §9.1.
- [ ] **Alertas de card novo:** polling feito pelo app (API) **ou** pela extensão.
- [ ] **Tokens:** um só ou separados por escopo (leitura para alertas, escrita para ações).
- [ ] **Estado antes/depois da ação:** conseguimos confirmar o resultado? (evita duplicidade)
- [ ] Se for ponte: canal escolhido (WebSocket local ou Native Messaging) e protocolo de mensagens.
- [ ] **Monitoramento de cards parados:** a extensão lê e envia ao app (o app guarda o histórico e decide
  o alerta) **ou** o app consulta a API diretamente. Ver 9.1.

Registrar a decisão final e o motivo no PRD/ARCHITECTURE.

### 9.1 Alerta de "card parado": como seria e o que decidir
Viabilidade: **possível**. A extensão lê os cards (status, responsável, data) e envia as mudanças ao app por um
canal local autenticado; o app guarda o histórico, aplica a regra e dispara a notificação do sistema.
A **regra** (limite de tempo) e a **notificação** ficam no app, configuráveis em Configurações.

Decisões de produto pendentes (não definir sem validar com quem usa):
- [ ] O que é "parado": mesmo status por quantas horas/dias?
- [ ] O limite é igual para todas as etapas ou **por status** (ex.: "Em revisão" tolera mais)?
- [ ] Conta só **horário comercial**?
- [ ] Cards que **nós mesmos pausamos** (automação) não devem gerar alerta.
- [ ] Anti-spam: no máximo um alerta por card e por período; opção de **adiar**.
- [ ] Quais cards: só os atribuídos ao usuário ou também os que ele acompanha?

Limitações a respeitar:
- Via extensão, só funciona com o **Chrome aberto e logado**, com a extensão ativa. Fechou o navegador, para de monitorar
  (aceitável para alertas; ruim para ações agendadas).
- Extensão Manifest V3 consulta com `chrome.alarms` (a partir de ~1 min) e o service worker hiberna: não é tempo real.
- Títulos e responsáveis dos cards passam pelo canal local, que precisa de autenticação (token de pareamento,
  `Origin` da extensão e escuta apenas em `127.0.0.1`).
- Se a API puder ser chamada direto com token, o próprio app monitora **sem extensão** e com o Chrome fechado.
- Item já registrado no backlog de `docs/ROADMAP.md` e descrito em `docs/alert.md`.

### 9.2 Lógica de alerta da extensão (a trazer para o app)
Fonte: `extencao-exemplo/logic.js: evaluate` e `background.js: runCheck`. Regras observadas:

| Situação | Regra | Ação da extensão |
|---|---|---|
| Em expediente, nenhum cronômetro meu aberto em nenhum card monitorado | `workTime && nothingRunning` | Alerta geral "nenhum card em andamento" (substitui os alertas por card) |
| Em expediente, card meu em coluna "working" (`^EM `) sem cronômetro meu | `columnKind=working && openMine=0` | Alerta `idle:<ref>` |
| Em expediente, card meu em coluna "paused" (`PAUSAD\|PARAD`) com cronômetro meu rodando | `columnKind=paused && openMine>0` | Alerta `running-paused:<ref>` |
| Fora do expediente, cronômetro meu aberto | `!workTime && openMine>0` | Pausa o requisito (formulário web) e avisa; senão avisa para pausar manualmente |
| Volta ao expediente | `pausedByUs` não vazio | Lembra de retomar o que a extensão pausou |

Outras regras de comportamento: anti-repetição por chave (`renotifyEveryMinutes`, padrão 60 min, limpeza em 24 h);
reconfirma com dados frescos antes de agir quando a decisão veio de cache; "expediente" vem das batidas do RH Net
(`rh.js`) ou, se indisponível, de horários manuais (08:00–12:45 / 14:00–18:00, seg–sex). Um card é "meu" se há
cronômetro meu aberto ou o registro de tempo mais recente é meu.

**Lacuna:** nenhuma dessas regras mede **tempo no mesmo status**. O alerta "card muito tempo parado" é novo e depende
de confirmar uma data de mudança de coluna na API (§7.3, `date_moved` `[A CONFIRMAR]`). Sem ela, o app só saberá desde
quando *viu* o card na coluna. As regras acima não dependem disso e podem ser portadas como estão.

## 10. Impacto no código

Onde cada descoberta entra, para não reescrever telas:

| Descoberta | Onde entra |
|---|---|
| Endpoints de listar/consultar | `KanbanTaskRepository.findAll/findById` (`src/infrastructure/repositories/kanban/`) |
| Pausar/retomar | `KanbanTaskRepository.pause/resume`, devolvendo `TaskActionResult` (`APPLIED` ou `ALREADY_IN_STATE`; falhas lançam erro → `ERROR` no histórico) |
| Formato das respostas | Schemas Zod na borda da infraestrutura; a aplicação continua usando `Task` |
| Token e URL base | Armazenamento com `safeStorage`; campos em Configurações (hoje omitidos por regra do CLAUDE.md) |
| Erros 401/403/expiração | Mensagens de falha de autenticação e a preferência "Falha de autenticação" |
| Rate limit/timeout/retentativas | Política no executor de ocorrências (retentativas limitadas, sem execução atrasada) |
| Campo de responsável | Alertas de card novo (backlog) |
| Data de mudança de status / histórico | Regra de "card parado" (alerta no app); sem ela o tempo é estimado |
| Canal extensão → app (se adotado) | Nova porta de entrada na infraestrutura (servidor local) e `ExtensionBridge`; a regra de alerta fica na camada de aplicação |

A troca do mock pela integração real deve **não exigir mudanças** nas telas nem nos casos de uso.

## 11. Log de descobertas

Registre cada achado com data e fonte, em ordem cronológica.

| # | Data | Achado | Fonte (arquivo, requisição, pessoa) |
|---|---|---|---|
| 1 | 2026-11-09 | O Kanboard expõe JSON-RPC em `/jsonrpc.php`; a extensão autentica com Basic `usuário:token`, `credentials: "omit"` (sem cookie). Ainda não testado fora do navegador | `extencao-exemplo/api.js` |
| 2 | 2026-11-09 | Os cards são lidos por API (`getBoard`), não por DOM; o estado do card é a coluna, classificada pelo nome | `kanboard.js`, `config.js` |
| 3 | 2026-11-09 | **A pausa não usa a API**: usa cookie de sessão e o formulário HTML do modal "Pausar…" com campo de observação | `background.js: pauseSubtask`, `logic.js: parseConfirmForm` |
| 4 | 2026-11-09 | Não existe "retomar" na extensão; ela só lembra o usuário | `background.js: resumeReminder` |
| 5 | 2026-11-09 | Estado do cronômetro consultável por API: `getAllSubtasks` (`is_timer_started`, `timer_start_date`), `hasSubtaskTimer` | `kanboard.js` |
| 6 | 2026-11-09 | Não há "responsável do card": "meu" é deduzido por cronômetro/subtask/tempo lançado | `kanboard.js: loadCardEntries`, `logic.js: evaluate` |
| 7 | 2026-11-09 | Alvo da ação é a **subtask (requisito)** com cronômetro, não o card | `background.js`, `kanboard.js` |
| 8 | 2026-11-09 | Relatório de execução de exemplo: 2 sprints, 4 cards (2 EM DESENVOLVIMENTO, 2 PAUSADO), erro `rh-login` (sessão do RH Net expirada) com fallback para horários manuais | `vemda-do-sistema.md` |
| 9 | 2026-11-09 | A extensão não mede tempo parado em status; só detecta inconsistência coluna × cronômetro | `logic.js: evaluate` |
| 12 | 2026-11-09 | **Campos de cada card do `getBoard`** (só nomes, lidos no app): `id, reference, title, description, date_creation, date_modification, date_completed, date_started, date_due, color_id, project_id, column_id, swimlane_id, owner_id, creator_id, position, score, category_id, priority, date_moved, time_estimated_dev, time_spent_dev, status, assignee_username, assignee_name, assignee_email, category_name, column_name, swimlane_name, project_name, status_name, classification_name, tags, nb_subtasks, nb_comments…`. Há **responsável** (`owner_id`, `assignee_*`) e **data de mudança de coluna** (`date_moved`) | Log do app (`getBoard`) |
| 13 | 2026-11-09 | `getMyProjects` devolveu 2 sprints ativas; o usuário tem 13 cards por `owner_id`, em AGUARDANDO DESENVOLVIMENTO, EM DESENVOLVIMENTO, AGUARDANDO CODE REVIEW, AGUARDANDO HOMOLOGAÇÃO, LIBERAR PRODUÇÃO e uma coluna de mês (OUTUBRO). Colunas de mês aparecem como arquivo do quadro | Log do app |
| 14 | 2026-11-09 | As 4 colunas "de trabalho" por regex (EM …, PAUSADO) tinham 4 cards no total, mas só 1 era do usuário: a lista da extensão (`cards` do relatório) mostra candidatos, não "meus" | `vemda-do-sistema.md` × log do app |
| 15 | 2026-11-09 | **`date_moved` vem como texto com segundos Unix** (ex.: `"1793039219"`), `project_name` e `assignee_name` como texto. O app converte para ISO e mostra "Na coluna há". Semântica exata (só mudança de coluna?) segue `[A CONFIRMAR]` | Log do app (tipo e valor de `date_moved`) |
| 16 | 2026-11-09 | Token inválido ou revogado: **HTTP 401** com corpo `{"jsonrpc":"2.0","error":{"code":401,"message":"Unauthorized"},"id":null}` (o `id` vem nulo, sem casar com a chamada). Um token revogado deixa de funcionar na hora | Teste manual com `curl` |
| 17 | 2026-11-10 | `getAllSubtasks` (card de teste) devolve 8 requisitos. Campos: `id, task_id, title, name, type, status, status_name, status_can_be_reverted, user_id, username, is_timer_started, timer_start_date, position, time_spent, time_spent_dev(_real), time_spent_test(_real), time_spent_special, time_estimated*, system_analysis, business_analysis, created_after_start, description`. Só o requisito de `type` 1 (desenvolvimento) tinha `user_id` do usuário; os de análise/code review/FAQ (`type` 2 a 8) vêm sem responsável (`user_id` 0) | Teste manual com `curl` (somente leitura) |
| 18 | 2026-11-10 | **O status do requisito tem nome pronto** (`status_name`). Valor `5` = "Teste parado" (com `is_timer_started=false`). Os valores 1 e 4 são "em andamento" na extensão. Lista completa de status e transições `[A CONFIRMAR]` | idem |
| 19 | 2026-11-10 | **`setSubtaskEndTime` EXISTE no servidor, com assinatura diferente do Kanboard padrão.** Com `{subtask_id, user_id}` responde `-32602 Invalid params: Too many arguments`; com `{subtask_id: 0}` responde `403 Forbidden` (`id` nulo). **Corrigido em #21:** o 403 era do método, não do id 0. Método inexistente responde `-32601 Method not found`. **Efeito testado em #21.** | Teste manual com `curl`, subtask 0 (sem efeito) |
| 20 | 2026-11-10 | `hasSubtaskTimer {subtask_id, user_id}` → `false` para o requisito parado, como esperado. Formato de erro JSON-RPC: `-32602` params inválidos, `403` sem permissão, `-32601` método inexistente (HTTP 200 com erro no corpo; só autenticação falha com HTTP 401) | idem |
| 21 | 2026-11-10 | **A API por token NÃO consegue encerrar o cronômetro.** `setSubtaskEndTime {subtask_id: <requisito real, seu, com cronômetro rodando>}` respondeu **HTTP 403 `{"error":{"code":403,"message":"Forbidden"},"id":null}`** (status HTTP 403, diferente dos erros de parâmetro, que vêm com HTTP 200). Antes e depois: `hasSubtaskTimer=true`, `timer_start_date` e `time_spent` idênticos, ou seja, **nada foi alterado**. Usuário com papel `app-user`; o método existe mas está barrado para este usuário/papel. O requisito era do próprio usuário (`user_id` igual ao do token) | Teste manual com `curl` no requisito R06 do card 251847 (autorizado pelo usuário) |
| 10 | 2026-11-09 | `getMe` via `curl` + Basic `usuário:token` funciona fora do navegador (sem cookie, sem VPN/proxy). HTTP 200, resposta JSON-RPC 2.0. Campos: `id`, `username`, `name`, `role` (`app-user`), `is_active`, `timezone` (nulo), etc. | Teste manual do usuário |
| 11 | 2026-11-09 | **`getMe` devolve segredos**: `api_access_token` (o próprio token) e `twofactor_secret`. O app deve validar a resposta com Zod pegando **só** `id`, `username`, `name`, e **nunca** logar nem repassar o corpo bruto ao renderer | Teste manual do usuário |

## 12. Exemplos sanitizados

Cole aqui exemplos reais com tudo sensível substituído. Um bloco por operação.

Os blocos abaixo vêm **do código da extensão** (formato de envio), não de tráfego capturado. Respostas reais ainda
precisam ser coletadas (marcadas `[A PREENCHER]`).

### Listar tarefas (leitura em lote)
```http
POST https://kanboard.sci.com.br/jsonrpc.php
Authorization: Basic <BASE64(USUARIO:TOKEN)>
Content-Type: application/json

[
  {"jsonrpc":"2.0","id":1,"method":"getBoard","params":{"project_id":10526}},
  {"jsonrpc":"2.0","id":2,"method":"getAllSubtasks","params":{"task_id":254132}}
]
```
Resposta: `[A PREENCHER]` (forma esperada: `[{"jsonrpc":"2.0","id":1,"result":[...]}, ...]`)

### Pausar tarefa (fluxo web, NÃO é API)
```http
GET  https://kanboard.sci.com.br<HREF_DO_LINK_PAUSAR>     # cookie de sessão + X-Requested-With: XMLHttpRequest
POST https://kanboard.sci.com.br<ACTION_DO_FORM>          # application/x-www-form-urlencoded, campos do form + observação "pausa"
```
Campos do formulário e resposta: `[A PREENCHER]`

### Retomar tarefa
```http
[A PREENCHER]
```

### Erro de autenticação / permissão
```http
[A PREENCHER]
```

## 13. Riscos conhecidos

| Risco | Impacto | Ação |
|---|---|---|
| **Pausa só existe via formulário web com cookie (observado)** | Token não basta para pausar; app independente do Chrome fica sem a ação | Spike: testar método de escrita da API com o token; senão decidir entre sessão ou ponte |
| Token da API só funciona via sessão do navegador | Bloqueia a execução independente do Chrome | Leitura por token está indicada no código; confirmar com `curl`/Node |
| Marcação de HTML do Kanboard pode mudar (pausa e RH Net usam scraping) | Pausa quebra sem aviso | Não depender de scraping no app; se inevitável, testes e erro explícito |
| Alvo da ação é a subtask, não o card | Pausar o requisito errado | Casar por id e título e reler o estado depois |
| Token de leitura não autoriza escrita | Pausa/retomada impossíveis pelo app | Confirmar escopos antes de implementar |
| API não informa o estado atual | Maior risco de ação duplicada | Limitar retentativas; definir contrato |
| Extensão manipula a página em vez de usar API | Sem contrato a consumir | Rever escopo do projeto |
| Dados pessoais em exemplos de resposta | Vazamento em repositório | Sanitizar antes de registrar aqui |
| Sem data de mudança de status | Alerta de "card parado" impreciso (estimado) | Confirmar em 7.3; documentar a limitação |
| Monitoramento depende do Chrome aberto | Alertas deixam de chegar com o navegador fechado | Preferir a API direta se disponível |
