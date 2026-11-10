import { normalizeSettings } from './config.js';
import { DEFAULT_PORT, validPort } from './pause-logic.js';

const $ = (id) => document.getElementById(id);
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const { settings } = await chrome.storage.sync.get('settings');
const cfg = normalizeSettings(settings);

[$('s1').value, $('e1').value] = [cfg.workIntervals[0].start, cfg.workIntervals[0].end];
[$('s2').value, $('e2').value] = [cfg.workIntervals[1].start, cfg.workIntervals[1].end];
const { kbCreds } = await chrome.storage.local.get('kbCreds');
$('kbUser').value = kbCreds?.user ?? '';
$('kbToken').placeholder = kbCreds?.token
  ? '(token salvo; deixe em branco para manter)'
  : 'cole o token aqui';
const { bridge } = await chrome.storage.local.get('bridge');
$('bridgePort').value = validPort(bridge?.port) ?? DEFAULT_PORT;
$('bridgeCode').value = bridge?.code ?? '';
const { bridgeState } = await chrome.storage.local.get('bridgeState');
if (bridgeState) $('bridgeMsg').textContent = bridgeState.message;
$('myName').value = cfg.myName;
$('sprintIds').value = cfg.sprintIds;
$('autoPause').checked = cfg.autoPause;
$('useRhNet').checked = cfg.useRhNet;
$('renotify').value = cfg.renotifyEveryMinutes;

DAY_NAMES.forEach((name, i) => {
  const label = document.createElement('label');
  label.style.fontWeight = 'normal';
  label.innerHTML = `<input type="checkbox" data-day="${i}" ${cfg.days.includes(i) ? 'checked' : ''}> ${name}`;
  $('days').append(label);
});

$('save').addEventListener('click', async () => {
  const days = [...document.querySelectorAll('[data-day]:checked')].map((el) =>
    Number(el.dataset.day),
  );
  await chrome.storage.sync.set({
    settings: {
      ...cfg,
      workIntervals: [
        { start: $('s1').value, end: $('e1').value },
        { start: $('s2').value, end: $('e2').value },
      ],
      days,
      myName: $('myName').value.trim(),
      sprintIds: $('sprintIds').value.trim(),
      autoPause: $('autoPause').checked,
      useRhNet: $('useRhNet').checked,
      renotifyEveryMinutes: Number($('renotify').value) || 60,
    },
  });
  await saveBridge();
  const user = $('kbUser').value.trim();
  const token = $('kbToken').value.trim() || kbCreds?.token || '';
  if (user && token) {
    await chrome.storage.local.set({ kbCreds: { user, token } });
    await chrome.runtime.sendMessage('clearCache');
    $('kbToken').value = '';
    $('kbToken').placeholder = '(token salvo; deixe em branco para manter)';
  }
  $('msg').textContent = 'Salvo.';
});

async function saveBridge() {
  const port = validPort($('bridgePort').value);
  if (!port) {
    $('bridgeMsg').textContent = 'Porta inválida (use um número de 1024 a 65535).';
    return false;
  }
  await chrome.storage.local.set({
    bridge: { port, code: $('bridgeCode').value.trim() },
  });
  await chrome.runtime.sendMessage('bridgeChanged');
  return true;
}

$('testBridge').addEventListener('click', async () => {
  if (!(await saveBridge())) return;
  $('bridgeMsg').textContent = 'testando...';
  const r = await chrome.runtime.sendMessage('testBridge');
  if (!r.ok) {
    $('bridgeMsg').textContent = r.message;
    return;
  }
  // O app respondeu. Dá um instante para a consulta de comandos começar e mostra o estado real.
  $('bridgeMsg').textContent = 'App respondeu; conferindo se a consulta de comandos começou...';
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const { bridgeState } = await chrome.storage.local.get('bridgeState');
  $('bridgeMsg').textContent = bridgeState?.ok
    ? 'Pronto: a extensão está consultando o app. Ele deve mostrar "Conectada".'
    : `Atenção: ${bridgeState?.message ?? 'a consulta de comandos não começou.'}`;
});

const showReport = (r) => {
  $('report').textContent = r ? JSON.stringify(r, null, 2) : '(sem checagem ainda)';
};
const { lastReport } = await chrome.storage.local.get('lastReport');
showReport(lastReport);
$('check').addEventListener('click', async () => {
  $('report').textContent = 'checando...';
  showReport(await chrome.runtime.sendMessage('check'));
});
$('clearCache').addEventListener('click', async () => {
  await chrome.runtime.sendMessage('clearCache');
  $('report').textContent = 'cache limpo';
});
$('testNotify').addEventListener('click', () => chrome.runtime.sendMessage('testNotify'));

$('testKb').addEventListener('click', async () => {
  const user = $('kbUser').value.trim();
  const token = $('kbToken').value.trim();
  // Testa com o que está digitado; sem token digitado, usa o salvo.
  if (user && token) await chrome.storage.local.set({ kbCreds: { user, token } });
  $('kbMsg').textContent = 'testando...';
  const r = await chrome.runtime.sendMessage('testKanboard');
  $('kbMsg').textContent = r.ok ? `Conectado como ${r.name} (${r.username})` : `Falhou: ${r.error}`;
  if (r.ok) {
    $('kbToken').value = '';
    $('kbToken').placeholder = '(token salvo; deixe em branco para manter)';
  }
});
