/**
 * Confere o sorteio sem planilha e sem dados pessoais.
 *   node apps-script/verificar-algoritmo.js
 *   node apps-script/verificar-algoritmo.js --quando "2026-10-18T17:00:00.123-03:00" --hash <64 hex> --seed <64 hex> --indice 3 --total 128
 */
var crypto = require('crypto');
var S = require('./sorteio-puro.js');

function falha(msg) {
  console.error('FALHOU: ' + msg);
  process.exitCode = 1;
  throw new Error(msg);
}

function igual(nome, obtido, esperado) {
  if (obtido !== esperado) falha(nome + '\n  obtido:   ' + obtido + '\n  esperado: ' + esperado);
}

function args() {
  var out = {};
  var a = process.argv.slice(2);
  for (var i = 0; i < a.length; i += 2) out[a[i].replace(/^--/, '')] = a[i + 1];
  return out;
}

function testarCarimbo() {
  var d = new Date('2026-10-18T20:00:00.123Z');
  igual('carimbo de Brasília', S.carimboDeData(d), '2026-10-18T17:00:00.123-03:00');
}

function testarSha() {
  igual('sha256 vazio', S.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  igual('sha256 abc', S.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  var amostras = ['', 'abc', 'João Vargas', '4|TST-23ABC|Ana Lima\n7|TST-45DEF|Bruno Costa', 'carimbo\n' + S.sha256Hex('lista')];
  amostras.forEach(function (s) {
    var node = crypto.createHash('sha256').update(s, 'utf8').digest('hex');
    igual('sha256 bate com o Node para ' + JSON.stringify(s).slice(0, 40), S.sha256Hex(s), node);
  });
}

function linha(numero, codigo, nome, status, telefone) {
  return ['01/10/2026 10:00:00', numero, codigo, nome, telefone || '', status || 'válido', 'sim'];
}

function testarFiltros() {
  var linhas = [
    linha(4, 'TST-23ABC', 'Ana Lima', 'válido', '(21) 90000-0000'),
    linha(2, 'TST-45DEF', 'Bruno teste', 'válido', '(21) 91111-1111'),
    linha('', 'TST-67GHJ', 'Sem numero', 'válido', '(21) 92222-2222'),
    linha(9, 'TST-89KLM', 'Codigo ruim', 'inválido', '(21) 93333-3333'),
    linha(9, 'TST-2NPQR', '  Caio   Mendes ', 'válido', '(21) 94444-4444'),
    linha(3, 'TST-3STVW', "'Diana Rocha", 'válido')
  ];
  var comTeste = S.prepararElegiveis(linhas, false);
  var semTeste = S.prepararElegiveis(linhas, true);
  igual('total no teste (inclui sobrenome teste)', String(comTeste.length), '4');
  igual('total no oficial (ignora sobrenome teste)', String(semTeste.length), '3');
  igual('ordem por número', comTeste.map(function (p) { return p.numero; }).join(','), '2,3,4,9');
  igual('nome canônico', comTeste[3].nome, 'Caio Mendes');
  igual('apóstrofo de fórmula sai', comTeste[1].nome, 'Diana Rocha');
  var texto = S.canonico(semTeste);
  if (texto.indexOf('90000') >= 0 || texto.indexOf('telefone') >= 0 || texto.indexOf('(') >= 0) {
    falha('o texto hasheado não pode ter telefone: ' + texto);
  }
  igual('canônico', texto, '3|TST-3STVW|Diana Rocha\n4|TST-23ABC|Ana Lima\n9|TST-2NPQR|Caio Mendes');
}

function testarEscolha() {
  var linhas = [];
  for (var n = 1; n <= 17; n++) {
    linhas.push(linha(n, 'TST-2ABCD', 'Pessoa ' + n, 'válido', '(21) 99999-0000'));
  }
  linhas[4][2] = 'TST-3ABCD';
  var lista = S.prepararElegiveis(linhas, true);
  var carimbo = '2026-10-18T17:00:00.123-03:00';
  var a = S.escolher(lista, carimbo);
  var b = S.escolher(lista, carimbo);
  igual('determinístico', a.seed + ':' + a.indice, b.seed + ':' + b.indice);
  if (a.indice < 0 || a.indice >= lista.length) falha('índice fora da lista');
  igual('ganhador é a posição', a.ganhador.numero, lista[a.indice].numero);
  var conf = S.conferir(carimbo, a.hashLista, a.seed, a.indice, lista.length);
  if (!conf.seedConfere || !conf.indiceConfere) falha('conferir não fechou a conta');
  var outro = S.escolher(lista, '2026-10-18T17:00:01.123-03:00');
  if (outro.seed === a.seed) falha('carimbo diferente tem de mudar a seed');

  var unico = S.escolher(S.prepararElegiveis([linha(8, 'MRC-23ABC', 'Ana Lima')], true), carimbo);
  igual('um inscrito cai no índice 0', String(unico.indice), '0');
  igual('máscara', S.mascararCodigo('TST-23ABC'), 'TST-23•••');
  igual('máscara oficial', S.mascararCodigo('MRC-89KLM'), 'MRC-89•••');
  igual('primeiro nome', S.primeiroNome('  João   Vargas '), 'João');

  var pub = S.visaoPublica({
    numero: a.ganhador.numero,
    nome: a.ganhador.nome,
    codigo: 'TST-23ABC',
    total: lista.length,
    menor: lista[0].numero,
    maior: lista[lista.length - 1].numero,
    numeros: lista.map(function (p) { return p.numero; }),
    hashLista: a.hashLista,
    seed: a.seed,
    quando: carimbo,
    indice: a.indice,
    origem: 'ao vivo',
    telefone: '(21) 98888-7777',
    whatsapp: '21988887777'
  });
  var cru = JSON.stringify(pub);
  ['telefone', 'whatsapp', '98888', '99999', 'TST-23ABC'].forEach(function (proibido) {
    if (cru.indexOf(proibido) >= 0) falha('visão pública vazou ' + proibido + ': ' + cru);
  });
  igual('máscara na visão pública', pub.codigoMascara, 'TST-23•••');
  igual('primeiro nome na visão pública', pub.primeiroNome, 'Pessoa');
}

function conferirCli(op) {
  var conf = S.conferir(op.quando, op.hash, op.seed, op.indice, op.total);
  console.log(JSON.stringify(conf, null, 2));
  if (!conf.seedConfere || !conf.indiceConfere) process.exitCode = 1;
}

var op = args();
if (op.quando && op.hash && op.seed && op.indice && op.total) {
  conferirCli(op);
} else {
  testarCarimbo();
  testarSha();
  testarFiltros();
  testarEscolha();
  if (!process.exitCode) console.log('Algoritmo conferido: SHA-256, filtros, máscara e visão sem telefone.');
}
