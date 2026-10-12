/**
 * Sorteio ao vivo (Instagram) e auditoria.
 * A tela só abre com ?p=sorteio&k=... e a chave fica em Propriedades do script: CHAVE_SORTEIO.
 * realizarSorteio_ termina com _ de propósito: o google.script.run não consegue chamá-la.
 * sortearAoVivo e estadoSorteio checam a chave e não devolvem telefone.
 */

var CHAVE_SORTEIO_PROP = 'CHAVE_SORTEIO';

function planilhaDoSorteio_() {
  if (typeof planilha_ === 'function') return planilha_();
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ignorarNomeTeste_() {
  return (typeof IGNORAR_NOME_TESTE !== 'undefined') && !!IGNORAR_NOME_TESTE;
}

function ehTeste_() {
  return (typeof EH_TESTE !== 'undefined') && !!EH_TESTE;
}

function carimboBrasilia_(data) {
  return Utilities.formatDate(data, FUSO, "yyyy-MM-dd'T'HH:mm:ss.SSS") + '-03:00';
}

function chaveConfere_(informada) {
  var esperada = '';
  try {
    esperada = PropertiesService.getScriptProperties().getProperty(CHAVE_SORTEIO_PROP) || '';
  } catch (err) {
    return false;
  }
  esperada = String(esperada);
  var recebida = String(informada || '');
  if (esperada.length < 12) return false;
  if (recebida.length !== esperada.length) return false;
  var diff = 0;
  for (var i = 0; i < esperada.length; i++) {
    diff |= esperada.charCodeAt(i) ^ recebida.charCodeAt(i);
  }
  return diff === 0;
}

function jsonSeguro_(valor) {
  return JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function paginaNaoEncontrada_() {
  var selo = ehTeste_()
    ? '<div style="position:fixed;top:8px;right:8px;background:#c00;color:#fff;font:bold 12px Arial;padding:4px 8px;border-radius:6px">TESTE</div>'
    : '';
  return '<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Diversões Maracanã</title>' +
    '<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:linear-gradient(160deg,#ffcc00,#ff6f3c);min-height:100vh">' +
    selo +
    '<div style="background:#fff;max-width:420px;margin:24px auto;padding:28px 20px;border-radius:18px;text-align:center;color:#222">' +
    '<h1 style="color:#e4002b;font-size:22px;margin:0 0 8px">Página não encontrada</h1>' +
    '<p style="margin:0">Confira o endereço com a bilheteria.</p>' +
    '<p style="font-size:12px;color:#666;margin-top:16px">Diversões Maracanã</p></div></body></html>';
}

function responderPaginaSorteio_(chave) {
  if (!chaveConfere_(chave)) {
    return HtmlService.createHtmlOutput(paginaNaoEncontrada_())
      .setTitle((ehTeste_() ? 'TESTE – ' : '') + 'Diversões Maracanã')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  var t = HtmlService.createTemplateFromFile('AoVivo');
  t.logoSrc = (typeof LOGO_DATA_URL !== 'undefined') ? LOGO_DATA_URL : '';
  t.jumbSrc = (typeof JUMB_DATA_URL !== 'undefined') ? JUMB_DATA_URL : '';
  t.fonteSrc = (typeof FONT_DATA_URL !== 'undefined') ? JSON.stringify(FONT_DATA_URL) : '""';
  t.bootJson = jsonSeguro_({
    teste: ehTeste_(),
    chave: String(chave),
    preview: false,
    participantes: null
  });
  var out = t.evaluate();
  out.setTitle((ehTeste_() ? 'TESTE – ' : '') + 'Sorteio ao vivo – Diversões Maracanã');
  out.addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  return out;
}

/**
 * A página pública de inscrição faz POST no /exec e espera um postMessage
 * {origem:"sorteio", resultado:{...}} dentro do iframe. Sem este doPost,
 * publicar o script novo derruba o cadastro.
 * acao=sorteio é o cadastro. O sorteio ao vivo não passa por aqui.
 */
function doPost(e) {
  var p = (e && e.parameter) || {};
  var resultado;
  try {
    resultado = registrar({
      codigo: p.codigo,
      nome: p.nome,
      whatsapp: p.whatsapp
    });
  } catch (err) {
    resultado = { ok: false, titulo: 'Não foi possível enviar', msg: 'Tente de novo em alguns segundos.' };
  }
  var json = jsonSeguro_(resultado);
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>' +
    'try{parent.postMessage({origem:"sorteio",resultado:' + json + '},"*");}catch(e){}' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function estadoSorteio(chave) {
  if (!chaveConfere_(chave)) return { ok: false, msg: 'Não autorizado.' };
  try {
    var aba = planilhaDoSorteio_().getSheetByName(ABA_INSCRICOES);
    if (!aba) return { ok: true, total: 0, menor: '', maior: '', numeros: [] };
    var lista = SorteioPuro.prepararElegiveis(aba.getDataRange().getValues().slice(1), ignorarNomeTeste_());
    return SorteioPuro.resumir(lista);
  } catch (err) {
    return { ok: false, msg: 'Não foi possível ler as inscrições.' };
  }
}

function sortearAoVivo(chave, novamente) {
  if (!chaveConfere_(chave)) return { ok: false, msg: 'Não autorizado.' };
  var g = realizarSorteio_(novamente ? 'ao vivo (novamente)' : 'ao vivo');
  if (!g) return { ok: false, msg: 'Ainda não há inscrições válidas para sortear.' };
  if (g.erro) return { ok: false, msg: g.erro };
  return SorteioPuro.visaoPublica(g);
}

var NOTA_AUDITORIA_ = 'Como conferir, sem usar telefone:\n' +
  '1. Filtro: Status exatamente "válido" e Nº da sorte preenchido. ' +
  'No oficial, também saem nomes cujo último nome é "teste". Na planilha de teste, esses nomes continuam concorrendo.\n' +
  '2. Ordene por Nº da sorte e, no empate, pelo código e pelo nome.\n' +
  '3. Uma linha por pessoa: numero|codigo|nome — nome sem apóstrofo inicial, espaços internos viram um só. ' +
  'Separe as linhas com quebra de linha, sem linha vazia no fim. Não inclua o telefone.\n' +
  '4. Hash da lista = SHA-256 desse texto, em hexadecimal minúsculo (UTF-8).\n' +
  '5. A coluna A é o carimbo exato, no formato yyyy-MM-ddTHH:mm:ss.SSS-03:00.\n' +
  '6. Seed = SHA-256 do carimbo, uma quebra de linha, e o hash da lista.\n' +
  '7. Índice = o inteiro da seed (hexadecimal) módulo a quantidade. Posição 0 é a primeira da lista ordenada.\n' +
  'O histórico da aba Sorteio guarda o telefone para a bilheteria ligar. Esta aba não guarda telefone.';

function garantirAuditoria_(ss) {
  var nome = (typeof ABA_AUDITORIA !== 'undefined') ? ABA_AUDITORIA : 'Auditoria';
  var aba = ss.getSheetByName(nome);
  if (!aba) aba = ss.insertSheet(nome);
  if (aba.getRange('A1').getValue() === '' || aba.getRange('A1').getValue() === null) {
    var cab = [[
      'Data/hora (Brasília)', 'Origem', 'Quantidade', 'Número mínimo', 'Número máximo',
      'Hash da lista', 'Seed', 'Índice', 'Nº da sorte', 'Nome', 'Código'
    ]];
    aba.getRange(1, 1, 1, 11).setValues(cab);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#ffcc00').setFontColor('#1c2430');
    aba.setColumnWidth(6, 460);
    aba.setColumnWidth(7, 460);
    aba.getRange('F:G').setFontFamily('Courier New');
    aba.getRange('A1').setNote(NOTA_AUDITORIA_);
    aba.getRange('A1').setWrap(true);
  }
  return aba;
}

function gravarAuditoria_(ss, g) {
  var aba = garantirAuditoria_(ss);
  aba.appendRow([
    g.quando,
    g.origem,
    g.total,
    g.menor,
    g.maior,
    g.hashLista,
    g.seed,
    g.indice,
    g.numero,
    semFormula_(g.nome),
    g.codigo
  ]);
}

/** Sorteia, grava a aba Sorteio (como antes) e a aba Auditoria. Devolve o telefone só para o menu da planilha. */
function realizarSorteio_(forma) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return { erro: 'Outro sorteio está sendo gravado. Espere uns segundos e tente de novo.' };
  }
  try {
    var ss = planilhaDoSorteio_();
    var abaIns = ss.getSheetByName(ABA_INSCRICOES);
    if (!abaIns) return null;
    var valores = abaIns.getDataRange().getValues();
    var ignorar = ignorarNomeTeste_();
    var elegiveis = SorteioPuro.prepararElegiveis(valores.slice(1), ignorar);
    if (!elegiveis.length) return null;

    var agora = new Date();
    var carimbo = carimboBrasilia_(agora);
    var quandoHumano = Utilities.formatDate(agora, FUSO, 'dd/MM/yyyy HH:mm:ss');
    var sorteio = SorteioPuro.escolher(elegiveis, carimbo);
    var escolhido = sorteio.ganhador;

    var telefone = '';
    var nomePlanilha = escolhido.nome;
    for (var i = 1; i < valores.length; i++) {
      var r = valores[i];
      if (!SorteioPuro.elegivel(r, ignorar)) continue;
      var codigoLinha = String(r[2] == null ? '' : r[2]).replace(/^'/, '').trim();
      if (SorteioPuro.textoNumero(r[1]) === escolhido.numero &&
          codigoLinha === escolhido.codigo &&
          SorteioPuro.nomeCanonico(r[3]) === escolhido.nome) {
        telefone = r[4];
        nomePlanilha = String(r[3] == null ? '' : r[3]).replace(/^'/, '');
        break;
      }
    }

    var resumo = SorteioPuro.resumir(elegiveis);
    var g = {
      numero: escolhido.numero,
      codigo: escolhido.codigo,
      nome: nomePlanilha,
      telefone: telefone,
      total: resumo.total,
      menor: resumo.menor,
      maior: resumo.maior,
      numeros: resumo.numeros,
      hashLista: sorteio.hashLista,
      seed: sorteio.seed,
      quando: carimbo,
      indice: sorteio.indice,
      origem: forma
    };

    var aba = ss.getSheetByName(ABA_SORTEIO);
    if (aba) {
      aba.getRange(CEL_NOME).setValue(semFormula_(g.nome));
      aba.getRange(CEL_INFO).setValue('Telefone: ' + g.telefone + '   •   Código: ' + g.codigo + '   •   Nº da sorte: ' + g.numero);
      aba.getRange(CEL_QUANDO).setValue('Sorteado em ' + quandoHumano + ' (entre ' + g.total + ' inscrições válidas)');
      var col = aba.getRange(LINHA_HIST, 1, Math.max(aba.getLastRow() - LINHA_HIST + 1, 1), 1).getValues();
      var livre = LINHA_HIST;
      for (var h = 0; h < col.length; h++) {
        if (col[h][0] === '' || col[h][0] === null) { livre = LINHA_HIST + h; break; }
        livre = LINHA_HIST + h + 1;
      }
      aba.getRange(livre, 1, 1, 6).setValues([[quandoHumano, forma, g.numero, semFormula_(g.nome), g.telefone, g.codigo]]);
    }

    gravarAuditoria_(ss, g);
    SpreadsheetApp.flush();
    return g;
  } finally {
    lock.releaseLock();
  }
}
