# CLAUDE.md — Kanban Automation

## 1. Visão geral do projeto

**Kanban Automation** é um aplicativo desktop multiplataforma para automatizar ações em tarefas de um sistema Kanban interno da empresa.

O aplicativo deverá permitir que o usuário configure automações com horários definidos — por exemplo, pausar uma tarefa às 17h58 — e acompanhe a execução dessas automações pelo próprio desktop.

O projeto será desenvolvido inicialmente **sem token e sem integração real com a API**. Nesta primeira etapa, o foco é construir a fundação do aplicativo, as telas e os fluxos utilizando dados e serviços simulados (*mock*). A integração real será adicionada posteriormente, quando o contrato da API e as credenciais estiverem disponíveis.

### Objetivos principais

- Criar um aplicativo desktop para Windows, macOS e Ubuntu/Linux.
- Permitir cadastrar, editar, ativar, desativar e excluir automações.
- Permitir selecionar uma tarefa e configurar uma ação, como pausar ou retomar.
- Executar automações localmente nos horários configurados.
- Exibir histórico das execuções e seus resultados.
- Continuar funcionando em segundo plano quando a janela for fechada, mantendo o aplicativo ativo na bandeja do sistema.
- Preparar a arquitetura para substituir os mocks pela integração com a API do Kanban sem reescrever a interface.

## 2. Diretrizes para o agente de desenvolvimento

Ao trabalhar neste repositório, siga estas regras:

1. **Leia este arquivo antes de implementar qualquer funcionalidade.**
2. Antes de alterar código, entenda a estrutura existente e os padrões já adotados.
3. Não implemente funcionalidades fora do escopo solicitado.
4. Prefira soluções simples, modulares e fáceis de manter.
5. Não misture regras de negócio com componentes visuais.
6. Não acople a interface diretamente à API externa ou ao banco de dados.
7. Não invente endpoints, formatos de payload ou regras da API do Kanban.
8. Enquanto não houver credenciais e contrato da API, utilize exclusivamente implementações mock.
9. Não simule uma integração real na interface. Identifique claramente dados e resultados simulados.
10. Valide entradas e configurações com schemas, preferencialmente usando Zod.
11. Trate erros de forma explícita. Não silencie falhas.
12. Escreva nomes de variáveis, funções, classes e arquivos em inglês. A interface do usuário deve ser em português do Brasil.
13. Mantenha componentes pequenos e com responsabilidade bem definida.
14. Atualize a documentação quando uma decisão arquitetural ou fluxo importante mudar.
15. Não adicione dependências sem necessidade. Explique brevemente o motivo quando uma nova dependência for importante.

## 3. Stack tecnológica

Stack planejada para o projeto:

- **Electron:** aplicação desktop e processos nativos.
- **React:** interface do usuário.
- **TypeScript:** linguagem principal.
- **Vite:** desenvolvimento e build do frontend.
- **Tailwind CSS:** estilização.
- **shadcn/ui:** componentes visuais, quando adequado.
- **SQLite:** persistência local.
- **Zod:** validação de dados e contratos.
- **Agendador Node.js:** execução local de tarefas programadas.

As versões das dependências devem ser definidas e mantidas pelo gerenciador de pacotes do projeto. Não atualize versões principais sem avaliar compatibilidade com Electron e com as demais dependências.

## 4. Plataformas suportadas

O aplicativo deve ser preparado para:

- Windows
- macOS
- Ubuntu/Linux

Evite utilizar APIs exclusivas de um sistema operacional sem criar uma abstração para os demais.

Comportamentos específicos da bandeja do sistema, inicialização automática e notificações devem ser testados em cada plataforma.

## 5. Arquitetura

Adote uma separação clara entre interface, regras de aplicação, infraestrutura e integração com o Electron.

### Camadas conceituais

```text
┌─────────────────────────────────────────────┐
│                  Renderer                   │
│             React + TypeScript              │
│       Telas, componentes e interações       │
└──────────────────────┬──────────────────────┘
                       │ IPC seguro
┌──────────────────────▼──────────────────────┐
│                Electron Main                │
│ Agendador, ciclo de vida, serviços e eventos│
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                Application                  │
│       Casos de uso e regras do sistema      │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│              Infrastructure                 │
│    SQLite, mocks, API externa e sistema     │
└─────────────────────────────────────────────┘
```

### Responsabilidades

**Renderer**
- Renderizar as telas.
- Gerenciar estados visuais e formulários.
- Solicitar operações por meio de uma API IPC exposta pelo preload.
- Não acessar diretamente Node.js, SQLite, arquivos locais ou tokens.

**Preload**
- Expor somente métodos específicos e necessários ao frontend.
- Usar `contextBridge`.
- Não expor objetos completos do Electron ou APIs genéricas de IPC.

**Electron Main**
- Controlar o ciclo de vida do aplicativo.
- Registrar handlers IPC.
- Inicializar o banco de dados e os serviços.
- Gerenciar o agendador.
- Gerenciar bandeja do sistema e notificações.
- Futuramente, proteger e utilizar as credenciais da API.

**Application**
- Implementar casos de uso, como criar automação, listar tarefas e executar ação.
- Coordenar repositórios e serviços.
- Não depender diretamente de componentes React ou detalhes de SQLite.

**Infrastructure**
- Implementar persistência SQLite.
- Implementar repositórios mock.
- Futuramente implementar repositórios da API real.
- Encapsular integrações com recursos do sistema operacional.

## 6. Organização de código sugerida

A estrutura pode ser adaptada à configuração real do projeto, mantendo as responsabilidades separadas.

```text
src/
├── main/
│   ├── index.ts
│   ├── ipc/
│   ├── scheduler/
│   ├── tray/
│   └── services/
│
├── preload/
│   └── index.ts
│
├── renderer/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── styles/
│   └── App.tsx
│
├── shared/
│   ├── contracts/
│   ├── schemas/
│   ├── types/
│   └── constants/
│
├── application/
│   ├── use-cases/
│   └── services/
│
└── infrastructure/
    ├── database/
    ├── repositories/
    │   ├── mock/
    │   └── kanban/
    └── scheduler/
```

Não crie todas as pastas antecipadamente sem necessidade. Introduza a estrutura conforme as funcionalidades forem implementadas.

## 7. Domínio inicial

### Task

Representa uma tarefa do Kanban.

Campos sugeridos:

- `id`: identificador.
- `title`: título da tarefa.
- `status`: estado atual.
- `assignee`: responsável, quando disponível.
- `updatedAt`: data da última atualização.

Os campos definitivos deverão respeitar o contrato da API quando ele estiver disponível.

### Automation

Representa uma automação configurada pelo usuário.

Campos sugeridos:

- `id`
- `name`
- `taskId`
- `action`: `PAUSE` ou `RESUME`.
- `scheduledTime`
- `enabled`
- `createdAt`
- `updatedAt`
- `lastExecutedAt`, opcional.

A modelagem de recorrência (diária, dias específicos da semana ou execução única) deverá ser definida na implementação da funcionalidade de agendamento.

### ExecutionHistory

Representa uma tentativa de execução.

Campos sugeridos:

- `id`
- `automationId`
- `taskId`
- `action`
- `status`: `SUCCESS`, `FAILED` ou `SIMULATED`.
- `message`
- `executedAt`

Durante a etapa mock, o histórico deve deixar claro que a ação foi simulada e não alterou uma tarefa real.

## 8. Contratos e repositórios

A camada de aplicação deve depender de contratos, e não de implementações concretas.

Exemplo conceitual:

```ts
interface TaskRepository {
  findAll(): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  pause(id: string): Promise<void>;
  resume(id: string): Promise<void>;
}
```

Implementações previstas:

- `MockTaskRepository`: fornece tarefas fictícias e simula ações.
- `KanbanTaskRepository`: futura integração com a API real.

A implementação mock deve respeitar o mesmo contrato esperado da implementação real. Assim, a troca de implementação não exige alterações nas telas ou nos casos de uso.

Não considere a assinatura acima definitiva caso a implementação revele a necessidade de retornar resultados mais ricos ou tratar erros de domínio.

## 9. Telas do aplicativo

### Dashboard

Deve apresentar um resumo da operação:

- Quantidade de automações cadastradas.
- Automações ativas.
- Próximas execuções.
- Últimas execuções.
- Estado do aplicativo e da integração.

Na fase mock, indicar que os dados são de demonstração.

### Automações

Deve permitir:

- Listar automações.
- Pesquisar ou filtrar automações.
- Ativar e desativar.
- Editar.
- Excluir, solicitando confirmação quando necessário.

### Nova automação / Editar automação

Deve permitir configurar:

- Nome da automação.
- Tarefa associada.
- Ação (pausar ou retomar).
- Horário.
- Recorrência, quando implementada.
- Estado inicial (ativa ou inativa).

Validar os dados antes de salvar.

### Histórico

Deve apresentar:

- Automação executada.
- Tarefa relacionada.
- Ação solicitada.
- Data e horário.
- Resultado.
- Mensagem explicativa.

### Configurações

Deve concentrar preferências como:

- Iniciar com o sistema, quando suportado.
- Minimizar para a bandeja ao fechar a janela.
- Notificações.
- Preferências de execução.

Campos de usuário e token do Kanban ficam em uma seção própria de conexão (o token é só de entrada, nunca exibido nem devolvido ao Renderer; guardado com `safeStorage`). A integração real das ações continua pendente: as ações permanecem simuladas até a pausa ser validada.

## 10. Agendamento e execução

O agendador deve ficar no processo principal do Electron, e não depender de uma janela React aberta.

Regras importantes:

- Fechar a janela não deve encerrar o aplicativo quando a opção de bandeja estiver habilitada.
- O agendador deve continuar ativo enquanto o processo principal estiver em execução.
- Ao iniciar, o aplicativo deve carregar as automações persistidas e registrar os próximos agendamentos.
- Evite registrar duas vezes o mesmo agendamento.
- Ao editar, desativar ou excluir uma automação, atualize ou remova o agendamento correspondente.
- Registre o resultado de cada tentativa no histórico.
- Considere fuso horário local e mudanças de horário do sistema.
- Processe falhas sem interromper o agendamento das demais automações.

**Limitação operacional:** automações locais não serão executadas enquanto o computador estiver desligado, suspenso ou com o aplicativo completamente encerrado. Ao iniciar novamente, o sistema poderá identificar execuções perdidas e aplicar uma política explícita de recuperação. Não execute ações atrasadas automaticamente sem uma regra definida e segura.

## 11. Segurança

A segurança deve ser considerada desde a fundação do projeto.

Configurações obrigatórias do Electron:

- `contextIsolation: true`.
- `nodeIntegration: false`.
- `sandbox: true`, quando compatível com a arquitetura adotada.
- Comunicação Renderer/Main somente por IPC controlado.
- Validar os dados recebidos em todos os handlers IPC.
- Não expor tokens ou segredos ao Renderer.
- Não registrar tokens, cabeçalhos de autorização ou dados sensíveis em logs.

Quando a integração real for implementada:

- Armazenar credenciais com mecanismo seguro do sistema operacional, como `safeStorage` do Electron.
- Não salvar tokens em texto puro no SQLite ou em arquivos de configuração.
- Tratar expiração, revogação e falhas de autenticação.
- Confirmar os escopos e permissões do token.
- Implementar somente as operações autorizadas pela API.
- Não presumir que um token de leitura autoriza operações de escrita.

## 12. Integração futura com a API do Kanban

A integração real está fora do escopo da primeira etapa.

Antes de implementá-la, será necessário conhecer:

- URL base e documentação da API.
- Endpoint para listar tarefas.
- Endpoint para consultar uma tarefa.
- Endpoint para pausar uma tarefa.
- Endpoint para retomar uma tarefa, se existir.
- Formato das requisições e respostas.
- Forma de autenticação.
- Validade e renovação do token.
- Permissões e escopos.
- Limites de requisições.
- Códigos e formatos de erro.
- Possibilidade de consultar o estado da tarefa após uma ação.

Não invente esses detalhes. Enquanto não forem fornecidos, mantenha a integração isolada e simulada.

## 13. Persistência local

O SQLite será utilizado para persistir:

- Automações.
- Histórico de execuções.
- Preferências do usuário.
- Outras configurações locais necessárias.

Diretrizes:

- Centralizar acesso ao banco em repositórios.
- Utilizar migrações para alterações de schema.
- Não executar SQL diretamente em componentes React.
- Tratar erros de leitura e escrita.
- Definir índices quando houver necessidade comprovada.
- Não armazenar tokens em texto puro.

## 14. Padrões de qualidade

- TypeScript com `strict` habilitado.
- Evitar `any`; quando inevitável, justificar e limitar seu uso.
- Preferir funções pequenas e coesas.
- Evitar duplicação de regras de negócio.
- Utilizar schemas para validar dados externos e entradas IPC.
- Separar erros de validação, domínio e infraestrutura.
- Escrever testes para casos de uso e regras importantes.
- Testar o comportamento do agendador com relógio controlado ou abstração de tempo, evitando testes dependentes do horário real.
- Não deixar dados fictícios misturados com dados reais sem identificação.

## 15. Plano de desenvolvimento

### Fase 1 — Fundação

- Criar o projeto Electron + React + TypeScript.
- Configurar Vite.
- Configurar Tailwind e biblioteca de componentes.
- Configurar IPC seguro.
- Criar layout base e navegação.
- Definir contratos e tipos compartilhados.

### Fase 2 — Interface com mocks

- Criar Dashboard.
- Criar listagem de automações.
- Criar formulário de automação.
- Criar Histórico.
- Criar Configurações.
- Criar dados fictícios identificados como demonstração.

### Fase 3 — Regras e persistência

- Implementar casos de uso.
- Implementar repositórios mock.
- Configurar SQLite e migrações.
- Persistir automações e histórico.
- Implementar ativação e desativação de automações.

### Fase 4 — Agendador local

- Integrar o agendador no processo principal.
- Registrar e remover tarefas agendadas.
- Executar ações simuladas.
- Registrar resultados no histórico.
- Implementar bandeja do sistema e comportamento ao fechar a janela.

### Fase 5 — Integração real

- Analisar o contrato da API.
- Implementar armazenamento seguro do token.
- Implementar repositórios reais.
- Tratar erros, autenticação e limites.
- Testar as operações com autorização adequada.

### Fase 6 — Distribuição e validação

- Gerar instaladores para Windows, macOS e Ubuntu.
- Validar comportamento da bandeja e inicialização em cada sistema.
- Testar atualização e persistência dos dados.
- Documentar instalação e operação.

## 16. Como trabalhar em cada tarefa

Para cada funcionalidade solicitada:

1. Identifique a camada responsável.
2. Verifique se já existe um contrato ou componente que possa ser reutilizado.
3. Apresente um plano curto quando a mudança afetar várias camadas.
4. Implemente a menor solução completa.
5. Adicione ou atualize testes relevantes.
6. Execute lint, typecheck e testes disponíveis.
7. Informe arquivos alterados, decisões tomadas e comandos executados.
8. Liste limitações ou pendências reais. Não afirme que testes passaram se não foram executados.

## 17. Estado atual do projeto

- Nome: **Kanban Automation**.
- Tipo: aplicativo desktop.
- Plataformas-alvo: Windows, macOS e Ubuntu/Linux.
- Stack planejada: Electron, React, TypeScript, Vite, Tailwind, shadcn/ui, SQLite e Zod.
- Integração com API: **leitura implementada** (JSON-RPC do Kanboard, ver `docs/KANBAN_INVESTIGATION.md`); **pausa pela extensão do Chrome** (ponte local em `127.0.0.1`, ver `docs/ARCHITECTURE.md` §9.1; a API por token devolve 403), ainda sem teste de ponta a ponta; **retomada é manual** (o app avisa).
- Token: informado em Configurações e guardado com `safeStorage`. Não há mais dados nem repositórios simulados.
- Etapa atual: conexão por token e listagem real; falta implementar a pausa/retomada e a lógica de alertas da extensão.

**Prioridade imediata:** teste de ponta a ponta da pausa pela extensão com um requisito real (autorizado pelo usuário), ligar `FEATURES.pauseAndResume` e depois trazer os alertas da extensão.
