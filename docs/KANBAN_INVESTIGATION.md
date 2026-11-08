# KANBAN_INVESTIGATION — Sistema Kanban interno

**Status:** Em investigação (análise da extensão do Chrome prevista para segunda-feira)
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

- [ ] A API pode ser chamada **fora do navegador** (ex.: `curl`, Node) com um token?
- [ ] Esse token autoriza **escrita** (pausar/retomar), e não só leitura?
- [ ] Existe operação de **retomar**, ou só de pausar?
- [ ] É possível **consultar o estado atual** da tarefa antes e depois da ação?
- [ ] Qual a validade do token, e como renovar/revogar?
- [ ] Há limite de requisições (rate limit)?
- [ ] A rede interna exige **VPN**, proxy ou certificado próprio?
- [ ] Como identificar "tarefas atribuídas a mim" (para os alertas futuros)?

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
| Nome / ID | `[A PREENCHER]` |
| Versão do manifest (V2 ou V3) | `[A PREENCHER]` |
| Permissões (`permissions`) | `[A PREENCHER]` |
| Domínios permitidos (`host_permissions`) | `[A PREENCHER]` |
| Content scripts (páginas em que atua) | `[A PREENCHER]` |
| Background / service worker | `[A PREENCHER]` |
| Código-fonte disponível? Onde? | `[A PREENCHER]` |
| Como lê os cards (API ou DOM)? | `[A PREENCHER]` |
| Como pausa um card (API ou clique)? | `[A PREENCHER]` |
| O que faz hoje com alertas | `[A PREENCHER]` |

## 5. Autenticação

| Item | Valor |
|---|---|
| Mecanismo (token, cookie de sessão, OAuth…) | `[A CONFIRMAR]` |
| Onde o usuário obtém o token | `[A CONFIRMAR]` |
| Cabeçalho/forma de envio (apenas o **nome**, ex.: `Authorization: Bearer <TOKEN>`) | `[A CONFIRMAR]` |
| Escopos/permissões do token | `[A CONFIRMAR]` |
| Validade e renovação | `[A CONFIRMAR]` |
| Como revogar | `[A CONFIRMAR]` |
| Erro quando expirado (status e corpo) | `[A CONFIRMAR]` |
| Erro quando sem permissão (status e corpo) | `[A CONFIRMAR]` |

## 6. Endpoints

Preencher **uma linha por operação observada**. Operação sem evidência fica `[A CONFIRMAR]`.

| Operação | Método e caminho | Entrada | Saída (campos relevantes) | Fonte |
|---|---|---|---|---|
| URL base | `[A CONFIRMAR]` | — | — | |
| Listar tarefas | `[A CONFIRMAR]` | | | |
| Consultar uma tarefa | `[A CONFIRMAR]` | | | |
| Pausar tarefa | `[A CONFIRMAR]` | | | |
| Retomar tarefa | `[A CONFIRMAR]` | | | |
| Usuário atual (`/me` ou similar) | `[A CONFIRMAR]` | | | |
| Tarefas atribuídas a mim | `[A CONFIRMAR]` | | | |

Exemplos reais (sanitizados) de requisição e resposta devem ir na seção 12.

## 7. Modelo de dados

### 7.1 Tarefa
Campos observados na resposta da API e como mapeiam para o nosso `Task`
(`src/shared/types/automation.ts`):

| Campo na API | Tipo | Exemplo (sanitizado) | Nosso campo | Observação |
|---|---|---|---|---|
| `[A CONFIRMAR]` | | | `id` | Identificador estável? É o mesmo exibido na tela (ex.: `KB-1042`)? |
| `[A CONFIRMAR]` | | | `title` | |
| `[A CONFIRMAR]` | | | `status` | Ver 7.2 |
| `[A CONFIRMAR]` | | | `assignee` | |
| `[A CONFIRMAR]` | | | `updatedAt` | Formato e fuso da data |

### 7.2 Estados e transições
- Valores possíveis de status: `[A CONFIRMAR]`
- Qual valor significa **pausada**: `[A CONFIRMAR]`
- Qual valor significa **em andamento**: `[A CONFIRMAR]`
- Retomar volta para qual estado? (sempre o anterior? um fixo?): `[A CONFIRMAR]`
- Pausar uma tarefa já pausada: erro ou sucesso silencioso? `[A CONFIRMAR]`
- Quem pode pausar (só o responsável? qualquer um?): `[A CONFIRMAR]`

## 8. Erros, limites e rede

| Item | Valor |
|---|---|
| Formato de erro (campos, códigos) | `[A CONFIRMAR]` |
| Códigos HTTP usados (401, 403, 404, 409, 5xx…) | `[A CONFIRMAR]` |
| Rate limit | `[A CONFIRMAR]` |
| Timeout razoável | `[A CONFIRMAR]` |
| Exige VPN/proxy/certificado interno? | `[A CONFIRMAR]` |
| Chamadas de fora do navegador funcionam? (CORS não se aplica ao Node) | `[A CONFIRMAR]` |
| Idempotência (repetir pausar gera efeito colateral?) | `[A CONFIRMAR]` |

## 9. Decisões que esta investigação deve produzir

- [ ] **Execução:** API direta com token no app (recomendado no PRD) **ou** ponte via extensão.
- [ ] **Alertas de card novo:** polling feito pelo app (API) **ou** pela extensão.
- [ ] **Tokens:** um só ou separados por escopo (leitura para alertas, escrita para ações).
- [ ] **Estado antes/depois da ação:** conseguimos confirmar o resultado? (evita duplicidade)
- [ ] Se for ponte: canal escolhido (WebSocket local ou Native Messaging) e protocolo de mensagens.

Registrar a decisão final e o motivo no PRD/ARCHITECTURE.

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

A troca do mock pela integração real deve **não exigir mudanças** nas telas nem nos casos de uso.

## 11. Log de descobertas

Registre cada achado com data e fonte, em ordem cronológica.

| Data | Achado | Fonte (arquivo, requisição, pessoa) |
|---|---|---|
| | | |

## 12. Exemplos sanitizados

Cole aqui exemplos reais com tudo sensível substituído. Um bloco por operação.

### Listar tarefas
```http
[A PREENCHER]
```

### Pausar tarefa
```http
[A PREENCHER]
```

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
| Token da API só funciona via sessão do navegador | Bloqueia a execução independente do Chrome | Confirmar na seção 5; avaliar ponte |
| Token de leitura não autoriza escrita | Pausa/retomada impossíveis pelo app | Confirmar escopos antes de implementar |
| API não informa o estado atual | Maior risco de ação duplicada | Limitar retentativas; definir contrato |
| Extensão manipula a página em vez de usar API | Sem contrato a consumir | Rever escopo do projeto |
| Dados pessoais em exemplos de resposta | Vazamento em repositório | Sanitizar antes de registrar aqui |
