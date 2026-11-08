# PRD --- Kanban Automation

**Versão:** 0.1\
**Status:** Proposta para projeto piloto\
**Produto:** Aplicativo desktop para automatizar ações em tarefas do
Kanban interno

## 1. Visão do produto

O Kanban Automation é um aplicativo desktop multiplataforma que permite
ao desenvolvedor programar ações em tarefas do Kanban interno,
inicialmente pausar e retomar uma tarefa em horários definidos.

O aplicativo utilizará a API existente do sistema interno e o mecanismo
de token já disponível. A automação será executada localmente, sem
depender de uma aba ou janela do Google Chrome.

## 2. Problema

Atualmente, a extensão existente apresenta alertas simples e depende da
interação do usuário para acompanhar determinados horários. Isso não
oferece uma experiência completa de agendamento, histórico e execução
automática.

## 3. Objetivo do piloto

Validar que um usuário consegue:

1.  Instalar o aplicativo no Windows, macOS ou Ubuntu Linux.
2.  Informar um token de acesso válido.
3.  Consultar e selecionar uma tarefa do Kanban.
4.  Definir dias da semana e horários de pausa e retomada.
5.  Deixar o aplicativo executando em segundo plano.
6.  Consultar o resultado das ações realizadas.

## 4. Público-alvo

Desenvolvedores da empresa que utilizam o Kanban interno e possuem
autorização para consultar e atualizar suas tarefas por meio da API.

## 5. Escopo do MVP

### 5.1 Funcionalidades incluídas

  ------------------------------------------------------------------------
  ID                Funcionalidade     Prioridade        Critério resumido
  ----------------- ------------------ ----------------- -----------------
  F01               Configurar token   Alta              Usuário consegue
                                                         salvar e validar
                                                         um token

  F02               Consultar tarefas  Alta              Aplicativo lista
                                                         tarefas
                                                         acessíveis ao
                                                         token

  F03               Selecionar tarefa  Alta              Usuário escolhe
                                                         uma tarefa para
                                                         automatizar

  F04               Configurar agenda  Alta              Usuário define
                                                         pausa, retomada e
                                                         dias da semana

  F05               Ativar/desativar   Alta              Regra pode ser
                    regra                                habilitada ou
                                                         desabilitada

  F06               Executar pausa     Alta              Aplicativo chama
                                                         a operação
                                                         autorizada da API

  F07               Executar retomada  Alta              Aplicativo chama
                                                         a operação
                                                         autorizada da API

  F08               Execução em        Alta              Fechar a janela
                    segundo plano                        mantém o processo
                                                         ativo, se o
                                                         usuário não sair
                                                         do aplicativo

  F09               Histórico          Média             Sucessos, falhas
                                                         e tentativas
                                                         ficam registrados

  F10               Notificações       Média             Usuário recebe
                                                         resultado de uma
                                                         execução

  F11               Inicialização com  Média             Usuário pode
                    o sistema                            habilitar início
                                                         automático

  F12               Recuperação após   Alta              Aplicativo
                    reinício                             identifica
                                                         execuções
                                                         perdidas e aplica
                                                         política segura
                                                         de recuperação
  ------------------------------------------------------------------------

### 5.2 Fora do escopo do MVP

-   Agendamentos centralizados em servidor.
-   Sincronização de regras entre computadores.
-   Administração centralizada de equipes.
-   Múltiplas regras complexas por usuário.
-   Editor visual de fluxos.
-   Integração com outros sistemas além do Kanban.
-   Automação de ações que não estejam documentadas e autorizadas pela
    API.

## 6. Fluxo principal do usuário

1.  Usuário abre o Kanban Automation.
2.  Informa o token de acesso.
3.  Aplicativo valida o token com a API.
4.  Aplicativo carrega as tarefas disponíveis.
5.  Usuário seleciona uma tarefa.
6.  Define horário de pausa, horário de retomada e dias da semana.
7.  Salva e ativa a automação.
8.  Aplicativo agenda as próximas execuções.
9.  No horário previsto, verifica a condição atual da tarefa e executa a
    ação necessária.
10. Registra o resultado e apresenta uma notificação conforme a
    preferência do usuário.

## 7. Regras de negócio

-   **RN01 --- Autorização:** somente executar ações permitidas pelo
    token e pela API.
-   **RN02 --- Estado atual:** antes de pausar ou retomar, consultar o
    estado da tarefa quando a API oferecer essa informação.
-   **RN03 --- Idempotência:** não repetir uma ação que já esteja
    satisfeita; quando possível, usar chave de idempotência ou mecanismo
    equivalente.
-   **RN04 --- Duplicidade:** uma mesma automação não pode gerar duas
    execuções concorrentes para a mesma ocorrência.
-   **RN05 --- Dias ativos:** executar somente nos dias configurados.
-   **RN06 --- Fuso horário:** interpretar horários no fuso local
    configurado, inicialmente `America/Sao_Paulo`, sem presumir que
    todos os usuários estejam no mesmo fuso.
-   **RN07 --- Falha:** registrar falhas de rede, autenticação,
    validação e resposta da API separadamente.
-   **RN08 --- Token inválido:** interromper novas ações que dependam de
    autenticação e informar o usuário; nunca registrar o token no log.
-   **RN09 --- Recuperação:** após iniciar, detectar ocorrências que
    passaram enquanto o aplicativo estava fechado. Não executar
    automaticamente uma pausa atrasada sem aplicar uma política
    explícita e segura.
-   **RN10 --- Fechamento:** fechar a janela deve minimizar para a
    bandeja quando essa opção estiver habilitada; escolher "Sair"
    encerra o aplicativo.
-   **RN11 --- Computador indisponível:** nenhuma execução local é
    garantida enquanto o computador estiver desligado ou suspenso.
-   **RN12 --- Alterações:** mudanças de agenda devem
    cancelar/recalcular os próximos agendamentos.

## 8. Política inicial de recuperação

Para o piloto, adotar comportamento conservador:

-   Ao iniciar, recalcular os próximos horários futuros.
-   Registrar ocorrências vencidas durante o período offline como
    `MISSED`.
-   Não executar automaticamente ações vencidas por padrão.
-   Permitir uma evolução futura para política configurável, após
    validação com os usuários e com o responsável pelo processo.

## 9. Requisitos não funcionais

-   **RNF01 --- Multiplataforma:** suportar Windows, macOS e Ubuntu
    Linux nas versões definidas na matriz de testes.
-   **RNF02 --- Segurança:** manter token fora do renderer e protegê-lo
    com armazenamento seguro do sistema operacional.
-   **RNF03 --- Comunicação:** utilizar HTTPS para chamadas à API.
-   **RNF04 --- Privilégio mínimo:** a aplicação só pode executar
    operações autorizadas pelo token.
-   **RNF05 --- Resiliência:** falhas temporárias não podem encerrar o
    aplicativo.
-   **RNF06 --- Observabilidade:** manter histórico local de execuções
    sem dados secretos.
-   **RNF07 --- Usabilidade:** permitir configurar a regra principal sem
    conhecimento técnico.
-   **RNF08 --- Atualização:** planejar distribuição e atualização
    segura dos instaladores.
-   **RNF09 --- Acessibilidade:** controles identificáveis por teclado e
    rótulos claros.
-   **RNF10 --- Desempenho:** consumo de recursos em segundo plano deve
    ser baixo e medido durante o piloto.

## 10. Telas do MVP

1.  **Dashboard:** estado da automação, próxima execução, tarefa
    selecionada e última execução.
2.  **Configuração:** token, teste de conexão e seleção de tarefa.
3.  **Agendamento:** dias da semana, horário de pausa, horário de
    retomada e ativação.
4.  **Histórico:** data, ação, tarefa, resultado e mensagem de erro
    segura.
5.  **Configurações:** iniciar com o sistema, minimizar para bandeja,
    notificações e fuso horário.

## 11. Critérios de aceite do piloto

-   [ ] Aplicativo inicia nos três sistemas operacionais alvo.
-   [ ] Token pode ser cadastrado, validado e substituído.
-   [ ] Token não aparece em logs, banco local em texto puro ou
    ferramentas de diagnóstico.
-   [ ] Usuário consegue listar e selecionar uma tarefa.
-   [ ] Usuário configura dias e horários de pausa e retomada.
-   [ ] Pausa e retomada manuais funcionam pela API.
-   [ ] Ações agendadas são executadas no horário esperado com
    tolerância definida nos testes.
-   [ ] Fechar a janela não encerra o agendador quando o modo bandeja
    estiver ativo.
-   [ ] Sair explicitamente encerra o aplicativo.
-   [ ] Reiniciar o computador não causa execução duplicada.
-   [ ] Ocorrências perdidas são registradas sem ação atrasada
    automática no padrão inicial.
-   [ ] Falhas de rede e autenticação são apresentadas e registradas
    corretamente.
-   [ ] Histórico não contém tokens nem dados sensíveis desnecessários.

## 12. Métricas do piloto

-   Percentual de execuções concluídas com sucesso.
-   Quantidade de execuções duplicadas (meta: zero).
-   Quantidade de ações executadas fora do horário esperado.
-   Quantidade de falhas de autenticação e comunicação.
-   Consumo de memória e CPU em segundo plano.
-   Feedback dos desenvolvedores sobre clareza e confiabilidade.

## 13. Premissas e dependências

-   A API do Kanban já oferece operações autorizadas para consultar
    tarefas, pausar e retomar.
-   A equipe disponibilizará documentação dos endpoints, formatos de
    payload e respostas.
-   O token atual pode ser utilizado por um cliente desktop, respeitando
    as políticas de segurança da empresa.
-   Será necessário confirmar escopos, expiração, renovação e revogação
    do token.
-   A empresa definirá as versões mínimas de Windows, macOS e Ubuntu
    suportadas.

## 14. Questões em aberto

1.  Quais são os endpoints e métodos HTTP para listar, pausar e retomar
    tarefas?
2.  Qual payload e quais estados representam pausa e retomada?
3.  O token expira? Existe refresh ou é necessário gerar outro?
4.  O token é individual e vinculado ao usuário?
5.  A API permite consultar o estado atual da tarefa?
6.  Há limites de requisição ou política de rate limit?
7.  A API oferece idempotência ou identificador de operação?
8.  Quais versões de Windows, macOS e Ubuntu serão suportadas?
9.  O uso de automação de pausa/retomada está aprovado pelo responsável
    pelo processo interno?

## 15. Decisão de produto

O piloto será um aplicativo desktop local, com uma automação simples por
usuário, uma tarefa selecionada e dois horários recorrentes. A expansão
para múltiplas regras e gerenciamento centralizado depende dos
resultados do piloto.
