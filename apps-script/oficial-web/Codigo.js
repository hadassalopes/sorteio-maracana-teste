/**
 * Sorteio Dia das Crianças 2026 – Diversões Maracanã
 * Substitua o Codigo.gs por este arquivo e acrescente SorteioPuro, SorteioAoVivo, Midia e AoVivo.html.
 * Para publicar sem trocar o link /exec da inscrição: Implantar > Gerenciar implantações >
 * editar a implantação que já está no ar > Versão: Nova versão. Executar como "Eu", acesso "Qualquer pessoa".
 * Não crie outra implantação.
 * A página ao vivo fica em outra rota deste mesmo doGet: ?p=sorteio&k=CHAVE.
 * A chave mora em Propriedades do script (CHAVE_SORTEIO) e não vai neste arquivo.
 */

var ABA_CODIGOS = 'Códigos';
var ABA_INSCRICOES = 'Inscrições';
var ABA_CONFIG = 'Config';
var ABA_SORTEIO = 'Sorteio';
var FUSO = 'America/Sao_Paulo';
var ABA_AUDITORIA = 'Auditoria';
var EH_TESTE = false;
var IGNORAR_NOME_TESTE = true;
var SPREADSHEET_ID = '1VzQnHO-vJjo_TjaF8up7oQzsiCVbhUZ7e8NVPy3T67c';
function planilha_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

/* ---------- Página do formulário ---------- */
function doGet(e) {
  if (e && e.parameter && String(e.parameter.p || '') === 'sorteio') {
    return responderPaginaSorteio_(e.parameter.k);
  }
  var codigo = normalizarCodigo_((e && e.parameter && e.parameter.c) || '');
  var cfg = lerConfig_();
  var html;
  if (String(cfg.abertas).toLowerCase().indexOf('n') === 0) {
    html = paginaMensagem_('Inscrições encerradas', 'As inscrições para o sorteio já foram encerradas. Obrigado por participar!', false);
  } else if (codigo) {
    var st = statusCodigo_(codigo); // checagem rápida só para avisar antes; a validação real é no envio
    if (st === 'inexistente') html = paginaMensagem_('Código inválido', 'O código ' + esc_(codigo) + ' não existe. Confira o cupom ou fale com a bilheteria.', false);
    else if (st === 'usado') html = paginaMensagem_('Este cupom já foi utilizado', 'O código ' + esc_(codigo) + ' já foi usado para uma inscrição. Cada cupom vale uma vez só.', false);
    else html = paginaFormulario_(codigo);
  } else {
    html = paginaFormulario_(''); // sem código no link: a pessoa (ou a bilheteria) digita o código
  }
  return HtmlService.createHtmlOutput(html)
    .setTitle('Sorteio Dia das Crianças – Diversões Maracanã')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- Envio do formulário (chamado pela página) ---------- */
function registrar(dados) {
  var codigo = normalizarCodigo_(dados && dados.codigo);
  var nome = String((dados && dados.nome) || '').trim().replace(/\s+/g, ' ');
  var whats = String((dados && dados.whatsapp) || '').replace(/\D/g, '');
  if (whats.length > 11 && whats.indexOf('55') === 0) whats = whats.substring(2);

  if (nome.length < 3) return { ok: false, titulo: 'Confira seu nome', msg: 'Digite seu nome completo.' };
  if (whats.length < 10 || whats.length > 11) return { ok: false, titulo: 'Confira seu WhatsApp', msg: 'Digite o número com DDD, ex.: (21) 99999-9999.' };
  if (!codigo) return { ok: false, titulo: 'Código inválido', msg: 'Digite o código que está no seu cupom.' };

  var cfg = lerConfig_();
  if (String(cfg.abertas).toLowerCase().indexOf('n') === 0) return { ok: false, titulo: 'Inscrições encerradas', msg: 'As inscrições para o sorteio já foram encerradas.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) {
    return { ok: false, titulo: 'Muita gente ao mesmo tempo', msg: 'Tente enviar de novo em alguns segundos.' };
  }
  try {
    var ss = planilha_();
    var abaCod = ss.getSheetByName(ABA_CODIGOS);
    var abaIns = ss.getSheetByName(ABA_INSCRICOES);
    var agora = new Date();
    var quando = Utilities.formatDate(agora, FUSO, 'dd/MM/yyyy HH:mm:ss');
    var whatsFmt = formatarWhats_(whats);
    var nomeSeguro = semFormula_(nome);

    var achado = abaCod.getRange('A2:A').createTextFinder(codigo).matchEntireCell(true).findNext();
    if (!achado) {
      abaIns.appendRow([quando, '', semFormula_(codigo), nomeSeguro, whatsFmt, 'inválido', 'sim']);
      return { ok: false, titulo: 'Código inválido', msg: 'O código ' + codigo + ' não existe. Confira o cupom ou fale com a bilheteria.' };
    }
    var linha = achado.getRow();
    var usado = String(abaCod.getRange(linha, 2).getValue()).toLowerCase();
    if (usado === 'sim') {
      abaIns.appendRow([quando, '', codigo, nomeSeguro, whatsFmt, 'duplicado', 'sim']);
      return { ok: false, titulo: 'Este cupom já foi utilizado', msg: 'O código ' + codigo + ' já foi usado para uma inscrição. Cada cupom vale uma vez só.' };
    }
    // Nº da sorte = maior número já registrado + 1 (se apagar linhas de teste, a numeração se ajusta)
    var numero = 1;
    if (abaIns.getLastRow() > 1) {
      abaIns.getRange(2, 2, abaIns.getLastRow() - 1, 1).getValues().forEach(function (r) {
        var n = Number(r[0]); if (n >= numero) numero = n + 1;
      });
    }
    abaCod.getRange(linha, 2, 1, 4).setValues([['sim', quando, nomeSeguro, whatsFmt]]); // Usado, Data de uso, Nome, Telefone (WhatsApp)
    abaIns.appendRow([quando, numero, codigo, nomeSeguro, whatsFmt, 'válido', 'sim']);
    SpreadsheetApp.flush();
    return { ok: true, numero: numero, codigo: codigo, nome: nome.split(' ')[0], horario: String(cfg.horario || 'a confirmar'), instagram: String(cfg.instagram || '') };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Menu e botão SORTEAR na aba Sorteio ---------- */
var CEL_BOTAO = 'D6';     // caixinha "SORTEAR" (células D6:F8 mescladas)
var CEL_NOME = 'A11';     // nome do ganhador (A11:F12 mescladas)
var CEL_INFO = 'A13';     // telefone / código / nº da sorte
var CEL_QUANDO = 'A14';   // data e hora do sorteio
var LINHA_HIST = 21;      // histórico de sorteios começa nesta linha (A:F)

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sorteio')
    .addItem('Sortear ganhador agora', 'sortearGanhador')
    .addItem('Ativar botão SORTEAR (fazer 1 vez)', 'ativarBotaoSortear')
    .addToUi();
}

/** Coloca a caixinha SORTEAR na aba Sorteio (só precisa fazer uma vez). */
function ativarBotaoSortear() {
  var aba = planilha_().getSheetByName(ABA_SORTEIO);
  var cel = aba.getRange(CEL_BOTAO);
  cel.clearContent();
  cel.insertCheckboxes();
  cel.setValue(false);
  cel.setFontSize(48).setHorizontalAlignment('center').setVerticalAlignment('middle');
  SpreadsheetApp.getUi().alert('Botão SORTEAR ativado! Na aba Sorteio, marque a caixinha amarela para sortear um ganhador.');
}

/** Gatilho simples: dispara quando alguém marca a caixinha SORTEAR. Não precisa de autorização extra. */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var aba = e.range.getSheet();
    if (aba.getName() !== ABA_SORTEIO || e.range.getA1Notation() !== CEL_BOTAO) return;
    if (aba.getRange(CEL_BOTAO).getValue() !== true) return;
    var g = realizarSorteio_('botão');
    aba.getRange(CEL_BOTAO).setValue(false); // desmarca a caixinha
    if (g && g.erro) e.source.toast(g.erro, 'Sorteio', 8);
    else e.source.toast(g ? ('Ganhador(a): ' + g.nome) : 'Ainda não há inscrições válidas.', '🎉 Sorteio', 8);
  } catch (err) {
    try { e.range.getSheet().getRange(CEL_BOTAO).setValue(false); } catch (x) {}
    try { e.source.toast('Erro no sorteio: ' + err, 'Sorteio', 10); } catch (x) {}
  }
}

/** Opção do menu (continua funcionando como antes). */
function sortearGanhador() {
  var g = realizarSorteio_('menu');
  var ui = SpreadsheetApp.getUi();
  if (!g) { ui.alert('Ainda não há inscrições válidas.'); return; }
  if (g.erro) { ui.alert(g.erro); return; }
  ui.alert('🎉 Ganhador(a): ' + g.nome + '\nNº da sorte: ' + g.numero + '\nCódigo: ' + g.codigo + '\nTelefone (WhatsApp): ' + g.telefone + '\n\n(Total de inscrições válidas: ' + g.total + ')\nSeed: ' + g.seed);
}

/* O sorteio verificável está em SorteioAoVivo.js (realizarSorteio_). */
/* ---------- Auxiliares ---------- */
function statusCodigo_(codigo) {
  var abaCod = planilha_().getSheetByName(ABA_CODIGOS);
  var achado = abaCod.getRange('A2:A').createTextFinder(codigo).matchEntireCell(true).findNext();
  if (!achado) return 'inexistente';
  return String(abaCod.getRange(achado.getRow(), 2).getValue()).toLowerCase() === 'sim' ? 'usado' : 'livre';
}

function lerConfig_() {
  var cfg = { horario: 'a confirmar', instagram: '', abertas: 'sim' };
  var aba = planilha_().getSheetByName(ABA_CONFIG);
  if (!aba) return cfg;
  aba.getRange('A2:B6').getValues().forEach(function (r) {
    var k = String(r[0]).toLowerCase();
    if (k.indexOf('horário') === 0) cfg.horario = r[1] || 'a confirmar';
    else if (k.indexOf('instagram') === 0) cfg.instagram = String(r[1] || '').indexOf('a confirmar') >= 0 ? '' : r[1];
    else if (k.indexOf('inscrições abertas') === 0) cfg.abertas = r[1] || 'sim';
  });
  return cfg;
}

function normalizarCodigo_(c) {
  c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!c) return '';
  if (c.indexOf('MRC') === 0) c = c.substring(3);
  return 'MRC-' + c;
}
function formatarWhats_(d) {
  return d.length === 11 ? '(' + d.substr(0, 2) + ') ' + d.substr(2, 5) + '-' + d.substr(7)
                         : '(' + d.substr(0, 2) + ') ' + d.substr(2, 4) + '-' + d.substr(6);
}
function semFormula_(s) { s = String(s); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function esc_(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }

var CSS_ = '<style>' +
  'body{margin:0;font-family:Arial,Helvetica,sans-serif;background:linear-gradient(160deg,#ffcc00,#ff6f3c);min-height:100vh;color:#222}' +
  '.card{background:#fff;max-width:420px;margin:24px auto;padding:24px 20px;border-radius:18px;box-shadow:0 6px 24px rgba(0,0,0,.18)}' +
  'h1{font-size:22px;margin:0 0 4px;color:#e4002b}h2{font-size:15px;margin:0 0 18px;color:#555;font-weight:normal}' +
  'label{display:block;font-weight:bold;margin:14px 0 6px;font-size:15px}' +
  'input{width:100%;box-sizing:border-box;font-size:18px;padding:12px;border:2px solid #ddd;border-radius:10px}' +
  'input:focus{border-color:#0057b8;outline:none}input[readonly]{background:#f3f3f3;color:#555}' +
  'button{width:100%;margin-top:20px;padding:15px;font-size:19px;font-weight:bold;color:#fff;background:#0057b8;border:0;border-radius:12px}' +
  'button:disabled{opacity:.6}.aviso{font-size:12px;color:#666;margin-top:14px;line-height:1.4}' +
  '.erro{color:#c00;font-weight:bold;margin-top:12px}.big{font-size:44px;font-weight:bold;color:#0057b8;margin:6px 0}' +
  '.ok{text-align:center}.emoji{font-size:48px}</style>';

function paginaMensagem_(titulo, msg, ok) {
  return CSS_ + '<div class="card ok"><div class="emoji">' + (ok ? '🎉' : '⚠️') + '</div><h1>' + esc_(titulo) + '</h1><p>' + msg + '</p>' +
    '<p class="aviso">Diversões Maracanã – Sorteio Dia das Crianças</p></div>';
}

function paginaFormulario_(codigo) {
  var campoCodigo = codigo
    ? '<input id="codigo" value="' + esc_(codigo) + '" readonly>'
    : '<input id="codigo" placeholder="MRC-XXXXX" autocapitalize="characters" required>';
  return CSS_ +
    '<div class="card" id="card"><h1>🎈 Sorteio Dia das Crianças</h1><h2>Diversões Maracanã – preencha e concorra!</h2>' +
    '<form id="f" onsubmit="enviar(event)">' +
    '<label for="codigo">Código do cupom</label>' + campoCodigo +
    '<label for="nome">Seu nome</label><input id="nome" autocomplete="name" required minlength="3" placeholder="Nome e sobrenome">' +
    '<label for="whats">WhatsApp (com DDD)</label><input id="whats" type="tel" inputmode="numeric" autocomplete="tel" required placeholder="(21) 99999-9999">' +
    '<button id="btn" type="submit">Quero concorrer!</button><div id="erro" class="erro"></div>' +
    '<p class="aviso">🔒 Seus dados serão usados apenas para este sorteio e para avisar o ganhador. Cada cupom vale uma única inscrição.</p>' +
    '</form></div>' +
    '<script>' +
    'function enviar(ev){ev.preventDefault();var b=document.getElementById("btn");b.disabled=true;b.textContent="Enviando...";document.getElementById("erro").textContent="";' +
    'google.script.run.withSuccessHandler(resultado).withFailureHandler(function(){b.disabled=false;b.textContent="Quero concorrer!";document.getElementById("erro").textContent="Não foi possível enviar. Verifique a internet e tente de novo.";})' +
    '.registrar({codigo:document.getElementById("codigo").value,nome:document.getElementById("nome").value,whatsapp:document.getElementById("whats").value});}' +
    'function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}' +
    'function resultado(r){var c=document.getElementById("card");var b=document.getElementById("btn");' +
    'if(r.ok){c.className="card ok";c.innerHTML="<div class=emoji>🎉</div><h1>Você está concorrendo, "+esc(r.nome)+"!</h1>"+' +
    '"<p>Seu número da sorte é</p><div class=big>"+r.numero+"</div><p>Código do cupom: <b>"+esc(r.codigo)+"</b></p>"+' +
    '"<p>O sorteio será ao vivo no Instagram"+(r.instagram?" <b>"+esc(r.instagram)+"</b>":"")+".<br>Horário da live: <b>"+esc(r.horario)+"</b></p>"+' +
    '"<p>Se você ganhar, avisaremos pelo WhatsApp. Tire um print desta tela! 📸</p><p class=aviso>Diversões Maracanã – Dia das Crianças</p>";}' +
    'else if(r.titulo==="Confira seu nome"||r.titulo==="Confira seu WhatsApp"||r.titulo==="Muita gente ao mesmo tempo"||(r.titulo==="Código inválido"&&!document.getElementById("codigo").readOnly)){b.disabled=false;b.textContent="Quero concorrer!";document.getElementById("erro").textContent=r.msg;}' +
    'else{c.className="card ok";c.innerHTML="<div class=emoji>⚠️</div><h1>"+esc(r.titulo)+"</h1><p>"+esc(r.msg)+"</p>";}}' +
    '</script>';
}
