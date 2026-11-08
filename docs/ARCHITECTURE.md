# ARCHITECTURE --- Kanban Automation

**Versão:** 0.1\
**Status:** Proposta técnica para o projeto piloto

## 1. Objetivo

Definir a arquitetura de um aplicativo desktop multiplataforma para
agendar e executar ações autorizadas na API do Kanban interno.

A aplicação será independente do Google Chrome. A extensão existente
poderá continuar em uso, mas não será dependência do novo aplicativo.

## 2. Decisões arquiteturais

  -----------------------------------------------------------------------
  Tema                    Decisão inicial         Motivo
  ----------------------- ----------------------- -----------------------
  Desktop                 Electron                Suporte a Windows,
                                                  macOS e Linux

  Interface               React + TypeScript      Ecossistema conhecido e
                                                  reutilização de
                                                  componentes

  Build/dev               electron-vite           Integração de Electron,
                                                  Vite e TypeScript

  Persistência            SQLite                  Regras e histórico
                                                  locais, sem servidor
                                                  adicional

  Agendamento             Croner ou scheduler     Agendamento local e
                          próprio baseado em      controle explícito de
                          timers recalculáveis    fuso/recuperação

  Validação               Zod                     Validar configurações e
                                                  mensagens IPC

  Empacotamento           electron-builder        Gerar instaladores por
                                                  plataforma

  Testes                  Vitest + testes de      Testar regras,
                          integração              scheduler e cliente API

  HTTP                    fetch nativo ou cliente Evitar dependência
                          HTTP já padronizado     desnecessária
                          pela equipe             
  -----------------------------------------------------------------------

A biblioteca de agendamento deve ser escolhida após um spike técnico que
valide fuso horário, reinicialização, cancelamento e concorrência. O
agendador não deve ser a fonte de verdade: as regras persistidas no
SQLite são a fonte de verdade.

## 3. Visão de componentes

``` text
┌────────────────────────────────────────────────────┐
│                  Electron Application               │
│                                                    │
│  ┌──────────────── Renderer ────────────────────┐  │
│  │ React UI                                     │  │
│  │ Dashboard / Automations / History / Settings │  │
│  └──────────────────────┬───────────────────────┘  │
│                         │ IPC tipado               │
│  ┌──────────────────────▼───────────────────────┐  │
│  │ Preload                                      │  │
│  │ API explícita e mínima para o renderer       │  │
│  └──────────────────────┬───────────────────────┘  │
│                         │                          │
│  ┌──────────────────────▼───────────────────────┐  │
│  │ Main Process                                 │  │
│  │                                              │  │
│  │ Automation Service ─ Scheduler               │  │
│  │          │                                   │  │
│  │          ├── Execution Manager               │  │
│  │          ├── Kanban API Client               │  │
│  │          ├── Secure Token Service            │  │
│  │          ├── Notification Service            │  │
│  │          └── Repository Layer                │  │
│  │                     │                        │  │
│  │                   SQLite                     │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────┬──────────────────────────┘
                          │ HTTPS
                          ▼
                   Kanban Internal API
```

## 4. Separação de processos

### 4.1 Renderer

Responsável exclusivamente pela interface.

-   Não acessa Node.js diretamente.
-   Não recebe token bruto.
-   Não acessa SQLite diretamente.
-   Solicita operações por uma API IPC explícita exposta pelo preload.

### 4.2 Preload

Expõe funções tipadas e específicas, por exemplo:

-   `getAppStatus()`
-   `validateToken()`
-   `listTasks()`
-   `saveAutomation()`
-   `toggleAutomation()`
-   `getExecutionHistory()`
-   `onExecutionUpdated(callback)`

Não expor `ipcRenderer` inteiro nem permitir que o renderer envie nomes
arbitrários de canais IPC.

### 4.3 Main Process

Responsável por operações privilegiadas:

-   Ciclo de vida do aplicativo.
-   Bandeja do sistema.
-   Persistência local.
-   Scheduler.
-   Chamadas à API.
-   Acesso ao armazenamento seguro.
-   Notificações.
-   Recuperação após reinicialização.

## 5. Estrutura de diretórios proposta

``` text
kanban-automation/
├── electron/
│   ├── main/
│   │   ├── index.ts
│   │   ├── app-lifecycle.ts
│   │   ├── tray.ts
│   │   └── ipc/
│   │       ├── automation.ipc.ts
│   │       ├── kanban.ipc.ts
│   │       └── settings.ipc.ts
│   ├── preload/
│   │   ├── index.ts
│   │   └── api.ts
│   └── services/
│       ├── scheduler.service.ts
│       ├── automation.service.ts
│       ├── execution-manager.service.ts
│       ├── kanban-api.service.ts
│       ├── secure-token.service.ts
│       └── notification.service.ts
│
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── automation/
│   │   ├── kanban/
│   │   ├── history/
│   │   └── settings/
│   └── shared/
│
├── shared/
│   ├── contracts/
│   ├── schemas/
│   └── types/
│
├── database/
│   ├── migrations/
│   └── schema/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
└── README.md
```

## 6. Modelo de dados

### 6.1 `automations`

  -----------------------------------------------------------------------
  Campo                   Tipo lógico             Observação
  ----------------------- ----------------------- -----------------------
  id                      TEXT                    UUID

  name                    TEXT                    Nome amigável

  task_id                 TEXT                    Identificador da tarefa
                                                  na API

  task_title              TEXT                    Rótulo para exibição;
                                                  não usar como
                                                  identificador

  pause_at                TEXT                    `HH:mm`

  resume_at               TEXT                    `HH:mm`

  weekdays                TEXT                    JSON com dias da semana

  timezone                TEXT                    Identificador IANA, ex.
                                                  `America/Sao_Paulo`

  enabled                 INTEGER                 0 ou 1

  created_at              TEXT                    ISO 8601

  updated_at              TEXT                    ISO 8601
  -----------------------------------------------------------------------

### 6.2 `execution_history`

  Campo            Tipo lógico   Observação
  ---------------- ------------- -----------------------------------------
  id               TEXT          UUID
  automation_id    TEXT          Referência à automação
  occurrence_key   TEXT          Chave única da ocorrência agendada
  action           TEXT          `PAUSE` ou `RESUME`
  status           TEXT          `SUCCESS`, `ERROR`, `SKIPPED`, `MISSED`
  started_at       TEXT          ISO 8601
  finished_at      TEXT          ISO 8601, anulável
  safe_message     TEXT          Mensagem sem segredo ou dado sensível
  http_status      INTEGER       Opcional

Criar índice único para `occurrence_key` (ou combinação equivalente)
para impedir que a mesma ocorrência seja processada duas vezes. Definir
política de retenção do histórico.

## 7. Fluxo de execução

1.  O aplicativo inicia.
2.  Carrega automações habilitadas do SQLite.
3.  Determina o horário atual e o fuso de cada automação.
4.  Identifica ocorrências futuras e ocorrências perdidas desde a última
    execução.
5.  Registra ocorrências perdidas como `MISSED` conforme política
    inicial, sem executá-las automaticamente.
6.  Agenda a próxima ocorrência de cada automação.
7.  Quando uma ocorrência chega, o Execution Manager adquire um bloqueio
    local para aquela ocorrência.
8.  Consulta o estado atual da tarefa, se a API oferecer endpoint para
    isso.
9.  Se a ação já estiver satisfeita, registra `SKIPPED`.
10. Caso contrário, chama a API com autenticação segura.
11. Classifica o resultado e registra no histórico.
12. Recalcula a próxima ocorrência.

## 8. Scheduler e confiabilidade

-   Persistir a configuração antes de programar o timer.
-   Não depender apenas de `setTimeout` de longa duração.
-   Recalcular timers após alteração de configuração, retorno de
    suspensão, mudança de fuso e inicialização.
-   Tratar mudanças de horário de verão por meio de identificadores
    IANA.
-   Usar chave de ocorrência para impedir duplicidade.
-   Aplicar timeout nas chamadas HTTP.
-   Implementar retentativas limitadas para falhas transitórias, com
    backoff e jitter.
-   Não repetir automaticamente erros permanentes, como token inválido
    ou falta de permissão.
-   Não presumir que um timeout significa que a API não executou a ação;
    consultar o estado antes de tentar novamente quando possível.

O aplicativo local não executa enquanto o computador estiver desligado
ou suspenso. A retomada do sistema deve disparar reconciliação das
ocorrências perdidas. Para garantia de execução independente do
dispositivo, será necessária uma solução server-side futura.

## 9. Integração com a API Kanban

Criar um adaptador isolado (`KanbanApiService`) para não espalhar
detalhes do contrato HTTP pelo aplicativo.

Operações esperadas, sujeitas à confirmação da API real:

-   Validar token ou obter perfil do usuário.
-   Listar tarefas acessíveis.
-   Consultar estado atual de uma tarefa.
-   Pausar tarefa.
-   Retomar tarefa.

Antes da implementação, documentar para cada operação:

-   Método e endpoint.
-   Payload e parâmetros.
-   Respostas de sucesso.
-   Estados válidos.
-   Erros possíveis.
-   Escopos de autorização.
-   Expiração e renovação do token.
-   Rate limit.
-   Suporte a idempotência.

Não inventar endpoints ou payloads. Usar exclusivamente o contrato
documentado pela equipe do sistema.

## 10. Segurança

-   Habilitar `contextIsolation`.
-   Manter `nodeIntegration: false` no renderer.
-   Usar sandbox quando compatível com a configuração escolhida.
-   Validar todos os dados recebidos por IPC.
-   Aplicar Content Security Policy.
-   Restringir navegação e abertura de janelas externas.
-   Não expor token ao renderer.
-   Não registrar cabeçalhos Authorization, tokens ou respostas que
    contenham segredos.
-   Proteger token com `safeStorage` do Electron e avaliar
    disponibilidade/limitações por plataforma.
-   Se o armazenamento seguro não estiver disponível, não armazenar o
    token em texto puro como fallback silencioso; solicitar nova
    configuração ou definir uma alternativa aprovada.
-   Proteger o banco local e limitar permissões de arquivo quando
    possível.
-   Não incluir credenciais em instaladores, logs ou repositório.

`safeStorage` protege dados usando mecanismos do sistema operacional,
mas a proteção depende do ambiente e da configuração local. Documentar
as limitações em Linux e testar em Ubuntu com o keyring disponível.

## 11. Bandeja e ciclo de vida

-   Fechar a janela pode ocultar/minimizar o aplicativo para a bandeja.
-   O comando explícito "Sair" encerra o processo e cancela timers em
    memória.
-   Ao iniciar novamente, recarregar regras persistidas e reconciliar
    ocorrências.
-   Oferecer configuração para iniciar com o sistema.
-   Validar comportamento específico de cada ambiente Linux, Windows e
    macOS.

Não prometer execução após encerramento explícito do aplicativo,
desligamento ou suspensão do computador.

## 12. Notificações

Usar notificações nativas do Electron para comunicar:

-   Ação executada com sucesso.
-   Falha de autenticação.
-   Falha de comunicação após esgotar retentativas.
-   Ocorrência perdida detectada.

Não exibir token, conteúdo sensível ou detalhes internos da resposta da
API.

## 13. Testes

### Unitários

-   Cálculo da próxima ocorrência.
-   Dias da semana.
-   Fuso horário e transição de horário.
-   Regras de recuperação.
-   Classificação de erros.
-   Idempotência por occurrence key.

### Integração

-   Persistência SQLite.
-   Cliente HTTP com API simulada.
-   Token inválido/expirado.
-   Timeout e indisponibilidade.
-   Pausa/retomada e consulta de estado.
-   Recuperação após reinicialização.

### Multiplataforma

-   Tray.
-   Inicialização com o sistema.
-   Armazenamento seguro.
-   Notificações.
-   Instalação e atualização.
-   Suspensão e retomada.

## 14. Empacotamento

Utilizar electron-builder com artefatos por sistema:

-   Windows: instalador `.exe` ou `.msi`, conforme decisão de
    distribuição.
-   macOS: `.dmg`, com builds para Intel e Apple Silicon conforme
    máquinas alvo.
-   Ubuntu: `.deb` e/ou AppImage, conforme padrão interno.

Para macOS, avaliar assinatura e notarização. Para Windows, avaliar
assinatura do instalador. Fixar versões e validar dependências nativas
do SQLite em cada plataforma.

## 15. Riscos técnicos

  -----------------------------------------------------------------------
  Risco                               Mitigação
  ----------------------------------- -----------------------------------
  API sem consulta de estado          Confirmar contrato antes de
                                      implementar retentativas

  Token expirado                      Fluxo de renovação ou instrução
                                      para gerar novo token

  Computador suspenso/desligado       Registrar ocorrência perdida e
                                      reconciliar ao iniciar

  Ação duplicada                      Chave de ocorrência, bloqueio e
                                      consulta de estado

  Diferenças de keyring no Linux      Spike técnico de `safeStorage` em
                                      Ubuntu

  Dependência nativa do SQLite        Build e testes em cada sistema
                                      operacional

  Mudança de fuso                     Armazenar timezone IANA e
                                      recalcular

  API indisponível                    Timeout, retentativas limitadas e
                                      histórico
  -----------------------------------------------------------------------

## 16. Decisões pendentes

1.  Confirmar contrato real da API.
2.  Confirmar estratégia de token e renovação.
3.  Definir versões mínimas dos sistemas operacionais.
4.  Escolher biblioteca final de agendamento após spike.
5.  Definir formatos de distribuição aprovados pela empresa.
6.  Definir retenção do histórico.
7.  Confirmar política de execução e pausa de tarefas com o responsável
    pelo Kanban.
