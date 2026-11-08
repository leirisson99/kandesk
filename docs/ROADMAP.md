# ROADMAP --- Kanban Automation

**Versão:** 0.1\
**Horizonte:** piloto inicial estimado em 2 semanas de desenvolvimento\
**Status:** Proposta; estimativa sujeita à disponibilidade da API e dos
ambientes de teste

## 1. Objetivo

Entregar um MVP desktop que permita a um desenvolvedor selecionar uma
tarefa do Kanban e programar pausa e retomada em dias e horários
definidos, com histórico e execução em segundo plano.

## 2. Estratégia de entrega

Desenvolver em fatias verticais: primeiro provar a integração com a API,
depois construir o fluxo completo de agendamento e, por fim, estabilizar
a experiência multiplataforma.

## 3. Fases

### Fase 0 --- Descoberta e validação técnica

**Estimativa:** 0,5--1 dia

Atividades: - \[ \] Obter documentação dos endpoints. - \[ \] Confirmar
como listar tarefas. - \[ \] Confirmar operações de pausa e retomada. -
\[ \] Confirmar consulta de estado atual. - \[ \] Verificar escopos,
expiração e renovação do token. - \[ \] Confirmar autorização interna
para o piloto. - \[ \] Definir versões alvo de Windows, macOS e Ubuntu.

Entregáveis: - Contrato da API documentado. - Lista de riscos e
dependências. - Critérios técnicos de aceite confirmados.

Critério de saída: equipe consegue autenticar e executar uma operação de
teste controlada na API.

### Fase 1 --- Fundação desktop

**Estimativa:** dias 1--2

Atividades: - \[ \] Criar projeto Electron + React + TypeScript com
electron-vite. - \[ \] Configurar Main, Preload e Renderer. - \[ \]
Habilitar isolamento de contexto e desabilitar Node no renderer. - \[ \]
Criar IPC tipado e validado. - \[ \] Criar janela principal. - \[ \]
Criar menu Tray e comportamento minimizar/fechar. - \[ \] Configurar
SQLite e migração inicial. - \[ \] Criar pipeline de desenvolvimento e
lint/testes.

Entregáveis: - Aplicativo abre localmente. - Interface comunica-se com
Main via IPC seguro. - Configuração de exemplo persiste após reinício.

Critérios de saída: - \[ \] Nenhum acesso direto a Node no renderer. -
\[ \] Persistência básica validada. - \[ \] Fechar janela não encerra o
processo quando modo Tray está ativo.

### Fase 2 --- Integração Kanban

**Estimativa:** dias 3--4

Atividades: - \[ \] Implementar armazenamento seguro do token. - \[ \]
Implementar validação de credencial. - \[ \] Implementar cliente HTTP
isolado. - \[ \] Implementar listagem de tarefas. - \[ \] Implementar
consulta de estado, se disponível. - \[ \] Implementar pausa e retomada
manuais. - \[ \] Tratar respostas HTTP, timeout e erros de autenticação.

Entregáveis: - Tela de conexão. - Lista de tarefas acessíveis. - Ações
manuais de pausa e retomada.

Critérios de saída: - \[ \] Token não aparece no renderer ou logs. - \[
\] Tarefa pode ser consultada. - \[ \] Pausa e retomada funcionam em
ambiente de teste autorizado. - \[ \] Erros de API são apresentados de
forma compreensível.

### Fase 3 --- Motor de automação

**Estimativa:** dias 5--7

Atividades: - \[ \] Definir schema da automação. - \[ \] Implementar
cadastro de horário e dias da semana. - \[ \] Implementar cálculo de
próximas ocorrências. - \[ \] Implementar scheduler. - \[ \] Implementar
Execution Manager. - \[ \] Implementar prevenção de duplicidade. - \[ \]
Implementar consulta de estado antes da ação, se disponível. - \[ \]
Implementar timeout e retentativas limitadas. - \[ \] Implementar
recuperação e registro de ocorrências perdidas. - \[ \] Persistir
histórico de execução.

Entregáveis: - Agendamento recorrente de pausa e retomada. - Histórico
de execuções e falhas. - Recuperação conservadora após reinício.

Critérios de saída: - \[ \] Horários e dias respeitados. - \[ \] Uma
ocorrência não é executada duas vezes. - \[ \] Ocorrências perdidas são
registradas. - \[ \] Não há pausa atrasada automática na política
padrão. - \[ \] Falhas não encerram o aplicativo.

### Fase 4 --- Interface do MVP

**Estimativa:** dias 8--9

Atividades: - \[ \] Dashboard com estado e próxima execução. - \[ \]
Formulário de seleção de tarefa. - \[ \] Formulário de dias e
horários. - \[ \] Controle ativar/desativar automação. - \[ \] Histórico
com filtros básicos. - \[ \] Notificações desktop. - \[ \] Configurações
de Tray e inicialização.

Entregáveis: - Fluxo de uso completo sem editar arquivos manualmente.

Critérios de saída: - \[ \] Usuário configura a automação pela
interface. - \[ \] Usuário entende o próximo horário. - \[ \] Histórico
diferencia sucesso, erro, ignorado e perdido. - \[ \] Usuário consegue
desativar a automação.

### Fase 5 --- Estabilização multiplataforma

**Estimativa:** dias 10--12

Atividades: - \[ \] Testar em Windows. - \[ \] Testar em macOS Intel
e/ou Apple Silicon conforme disponibilidade. - \[ \] Testar em Ubuntu. -
\[ \] Validar Tray em cada ambiente. - \[ \] Validar armazenamento
seguro em cada ambiente. - \[ \] Validar notificações. - \[ \] Validar
inicialização com o sistema. - \[ \] Validar suspensão, retomada e
reinicialização. - \[ \] Revisar logs e proteção de dados. - \[ \]
Corrigir problemas críticos.

Entregáveis: - Builds de teste por sistema operacional. - Relatório de
testes e limitações conhecidas.

Critérios de saída: - \[ \] Instalação e inicialização testadas em cada
plataforma alvo. - \[ \] Nenhum defeito crítico de segurança ou
duplicidade conhecido. - \[ \] Comportamento após reinício documentado.

### Fase 6 --- Piloto controlado

**Estimativa:** dias 13--14

Atividades: - \[ \] Selecionar pequeno grupo de desenvolvedores
voluntários. - \[ \] Distribuir instaladores. - \[ \] Orientar
configuração do token. - \[ \] Acompanhar execuções e falhas. - \[ \]
Coletar feedback. - \[ \] Registrar melhorias e priorizar correções.

Entregáveis: - Versão piloto. - Registro de feedback. - Backlog
priorizado para próxima versão.

Critérios de saída: - \[ \] Usuários conseguem configurar sem
assistência técnica contínua. - \[ \] Ações programadas são confiáveis
no cenário de computador ligado e aplicativo ativo. - \[ \] Problemas e
limitações estão documentados. - \[ \] Responsável pelo produto aprova a
continuidade.

## 4. Cronograma resumido

  Período       Foco            Entrega
  ------------- --------------- -----------------------------------
  Pré-início    Descoberta      API e requisitos confirmados
  Dias 1--2     Fundação        Aplicativo desktop e persistência
  Dias 3--4     Integração      Token, tarefas e ações manuais
  Dias 5--7     Automação       Scheduler, execução e histórico
  Dias 8--9     Interface       Fluxo completo do usuário
  Dias 10--12   Estabilização   Builds e testes multiplataforma
  Dias 13--14   Piloto          Distribuição e feedback

O cronograma é uma estimativa, não uma promessa. A ausência de
documentação da API, de máquinas para testes ou de credenciais de
homologação pode alterar as datas.

## 5. Definition of Done

Uma funcionalidade só será considerada concluída quando:

-   [ ] Código revisado.
-   [ ] Validação de entrada implementada.
-   [ ] Tratamento de erro implementado.
-   [ ] Testes relevantes passando.
-   [ ] Logs sem segredos.
-   [ ] Comportamento documentado.
-   [ ] Testada no ambiente aplicável.
-   [ ] Critério de aceite atendido.

## 6. Plano de testes do piloto

### Cenários funcionais

-   Token válido.
-   Token inválido ou expirado.
-   Tarefa acessível e tarefa não acessível.
-   Pausa manual.
-   Retomada manual.
-   Pausa agendada.
-   Retomada agendada.
-   Regra desativada.
-   Dia da semana não configurado.
-   Tarefa já pausada ou já retomada.

### Cenários de resiliência

-   Internet indisponível no horário.
-   API retorna erro 5xx.
-   API retorna erro 4xx.
-   Aplicativo é fechado explicitamente.
-   Janela é fechada e aplicativo permanece no Tray.
-   Computador suspende e retorna.
-   Computador reinicia após um horário agendado.
-   Configuração é alterada perto do horário de execução.
-   Duas ocorrências tentam executar simultaneamente.

### Cenários multiplataforma

-   Windows: instalação, Tray, notificação, início automático.
-   macOS: instalação, menu bar, notificação, permissões e assinatura
    quando aplicável.
-   Ubuntu: instalação, Tray conforme ambiente gráfico, notificações e
    keyring.

## 7. Riscos e dependências

  -----------------------------------------------------------------------
  Item                    Impacto                 Ação
  ----------------------- ----------------------- -----------------------
  Contrato da API         Bloqueia integração     Resolver na Fase 0
  desconhecido                                    

  Token não compatível    Bloqueia autenticação   Validar com equipe da
  com cliente desktop                             API

  API não informa estado  Aumenta risco de        Definir contrato ou
  atual                   duplicidade             limitar retentativas

  Linux sem keyring       Afeta proteção do token Testar `safeStorage` e
  disponível                                      não usar fallback
                                                  inseguro

  Computador              Execução local não      Registrar ocorrência
  desligado/suspenso      ocorre no horário       perdida; considerar
                                                  backend futuro

  Assinatura de           Pode dificultar         Planejar certificados e
  aplicativos             instalação              distribuição

  Ambientes gráficos      Tray pode variar        Definir ambientes
  Linux diferentes                                Ubuntu suportados
  -----------------------------------------------------------------------

## 8. Backlog pós-piloto

Priorizar após observar o uso real:

-   [ ] Múltiplas automações por usuário.
-   [ ] Várias tarefas por automação.
-   [ ] Regras por projeto.
-   [ ] Política configurável para ocorrências perdidas.
-   [ ] Sincronização de configurações entre dispositivos.
-   [ ] Agendador server-side para execução independente do computador.
-   [ ] Painel administrativo para equipes.
-   [ ] Atualização automática assinada.
-   [ ] Relatórios de confiabilidade.
-   [ ] Alertas de novos cards atribuídos ao usuário (monitoramento por
    polling). Depende do contrato da API (listar tarefas, responsável,
    frequência permitida). Origem: `docs/alert.md`. A extensão do Chrome
    como ponte só deve ser considerada se a API não permitir o acesso
    direto; isso exigiria revisar PRD e ARCHITECTURE antes.
-   [ ] Alerta de antecedência ("será pausado às 17h58") antes da execução.

## 9. Go / No-Go

**Go:** integração aprovada, ações confiáveis, segurança validada e
usuários conseguem configurar a automação.

**No-Go:** token exposto, ações duplicadas, execução em tarefa
incorreta, contrato da API indefinido ou comportamento de recuperação
inseguro.

## 10. Próxima ação

Antes de iniciar a Fase 1, realizar a Fase 0: obter o contrato da API e
validar uma pausa e retomada controladas em ambiente autorizado. Essa
validação reduz o maior risco técnico do projeto.
