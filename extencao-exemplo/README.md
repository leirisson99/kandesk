# Card Guard

Extensão Chrome/Edge (MV3) para o Kanboard SCI (`kanboard.sci.com.br`).

- **Em expediente:** avisa quando um card seu está em *EM DESENVOLVIMENTO / CODE REVIEW / HOMOLOGAÇÃO* sem cronômetro seu rodando, ou em *PAUSADO* com cronômetro rodando.
- **Fora do expediente** (almoço, fim do dia, fim de semana): pausa (`Pausar desenvolvimento`) seus requisitos em andamento e avisa; na volta, lembra de retomar.

Lê o Kanboard pela **API** (usuário + token da API, informados nas Opções e guardados só neste navegador). O RH Net e a pausa automática usam a sessão logada do navegador.

## Instalar
1. `chrome://extensions` → Modo do desenvolvedor → *Carregar sem compactação* → pasta `tools/card-guard`.
2. Abra as *Opções*: informe o **usuário de login** e o **token da API** do Kanboard (perfil → API → Gerar um novo token), clique em *Testar conexão* e *Salvar*.

## Ajustes
- Horários, dias, auto-pausa: página de opções.
- Colunas monitoradas e projeto: `config.js`.
- "Tramitado" = você tem cronômetro aberto (registro sem *Fim* em *Rastreamento de tempo*) no card. Um card é "seu" se você tem cronômetro aberto nele ou se o registro de tempo mais recente é seu.
