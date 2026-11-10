# Card Guard

Extensão Chrome/Edge (MV3) para o Kanboard SCI (`kanboard.sci.com.br`).

- **Em expediente:** avisa quando um card seu está em _EM DESENVOLVIMENTO / CODE REVIEW / HOMOLOGAÇÃO_ sem cronômetro seu rodando, ou em _PAUSADO_ com cronômetro rodando.
- **Fora do expediente** (almoço, fim do dia, fim de semana): pausa (`Pausar desenvolvimento`) seus requisitos em andamento e avisa; na volta, lembra de retomar.

Lê o Kanboard pela **API** (usuário + token da API, informados nas Opções e guardados só neste navegador). O RH Net e a pausa automática usam a sessão logada do navegador.

## Instalar

1. `chrome://extensions` → Modo do desenvolvedor → _Carregar sem compactação_ → pasta `extension/` deste repositório.
2. Abra as _Opções_: informe o **usuário de login** e o **token da API** do Kanboard (perfil → API → Gerar um novo token), clique em _Testar conexão_ e _Salvar_.

## Ajustes

- Horários, dias, auto-pausa: página de opções.
- Colunas monitoradas e projeto: `config.js`.
- "Tramitado" = você tem cronômetro aberto (registro sem _Fim_ em _Rastreamento de tempo_) no card. Um card é "seu" se você tem cronômetro aberto nele ou se o registro de tempo mais recente é seu.

## Ponte com o app Kanban Automation

A extensão também executa as **pausas pedidas pelo app** nos horários das automações (a API por token não pausa).

1. No app: _Configurações_ → _Extensão do navegador_ → copie o **código de pareamento**.
2. Nas _Opções_ da extensão: confira a porta (padrão `47615`), cole o código e clique em _Testar ponte_. A ponte fica ligada enquanto houver um código; para desligar, apague o código.
3. Mantenha o Chrome aberto e **logado no Kanboard**. A extensão pausa só os requisitos **seus** com cronômetro rodando no card pedido e confere o resultado.

A conversa é só neste computador (`127.0.0.1`). Nenhum token do Kanboard é enviado ao app. Retomar continua manual (o app avisa).
