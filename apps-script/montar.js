/**
 * Gera a mídia embutida, a página do Apps Script e o preview estático.
 *   node apps-script/montar.js
 */
var fs = require('fs');
var path = require('path');

var raiz = path.join(__dirname, '..');
var ui = path.join(__dirname, 'ui');
var origem = '/tmp/projeto_sorteio/sorteio-maracana';

function ler(p) { return fs.readFileSync(p); }
function dataUrl(mime, buf) { return 'data:' + mime + ';base64,' + buf.toString('base64'); }
function jsString(s) { return JSON.stringify(s); }

var logo = dataUrl('image/webp', ler('/tmp/logo.webp'));
var jumb = dataUrl('image/jpeg', ler('/tmp/jumb.jpg'));
var fonte = dataUrl('font/ttf', ler(path.join(origem, 'arquivos/fonts/BubblegumSans-Regular.ttf')));

var midia = [
  '/** Logo, Jumbinho e Bubblegum Sans embutidos para a página ao vivo não depender de outro site. */',
  'var LOGO_DATA_URL = ' + jsString(logo) + ';',
  'var JUMB_DATA_URL = ' + jsString(jumb) + ';',
  'var FONT_DATA_URL = ' + jsString(fonte) + ';',
  ''
].join('\n');

var molde = fs.readFileSync(path.join(ui, 'ao-vivo.html'), 'utf8');
var cliente = fs.readFileSync(path.join(ui, 'cliente.js'), 'utf8');
var puro = fs.readFileSync(path.join(__dirname, 'sorteio-puro.js'), 'utf8');
var aoVivo = fs.readFileSync(path.join(__dirname, 'SorteioAoVivo.js'), 'utf8');

function montarHtml(opts) {
  return molde
    .replace('@@FONTE_FACE@@', opts.fonteFace)
    .replace('@@LOGO_SRC@@', opts.logo)
    .replace('@@JUMB_SRC@@', opts.jumb)
    .replace('@@PURO_TAG@@', opts.puroTag)
    .replace('@@CLIENTE@@', cliente)
    .replace('@@BOOT@@', opts.boot);
}

var htmlApps = montarHtml({
  fonteFace: '@font-face{font-family:Bubble;src:url(<?!= fonteSrc ?>) format("truetype");font-display:swap}',
  logo: '<?!= logoSrc ?>',
  jumb: '<?!= jumbSrc ?>',
  puroTag: '',
  boot: 'iniciarAoVivo(<?!= bootJson ?>);'
});

var participantes = [
  { numero: 4, codigo: 'TST-23ABC', nome: 'Ana Lima' },
  { numero: 7, codigo: 'TST-45DEF', nome: 'Bruno Costa' },
  { numero: 8, codigo: 'TST-67GHJ', nome: 'Caio Mendes' },
  { numero: 12, codigo: 'TST-89KLM', nome: 'Diana Rocha' },
  { numero: 15, codigo: 'TST-2NPQR', nome: 'Elena Dias' },
  { numero: 18, codigo: 'TST-3STVW', nome: 'Felipe Nunes' },
  { numero: 21, codigo: 'TST-4XYZA', nome: 'Gaia Pinto' },
  { numero: 26, codigo: 'TST-5BCD2', nome: 'Heitor Cruz' },
  { numero: 33, codigo: 'TST-6EFG3', nome: 'Iris Melo' },
  { numero: 34, codigo: 'TST-7HJK4', nome: 'João Vargas' },
  { numero: 41, codigo: 'TST-8LMN5', nome: 'Lara Campos' },
  { numero: 52, codigo: 'TST-9PQR6', nome: 'Miguel Teixeira' },
  { numero: 58, codigo: 'TST-2STV7', nome: 'Nina Borges' },
  { numero: 63, codigo: 'TST-3WXY8', nome: 'Otávio Reis' },
  { numero: 71, codigo: 'TST-4ZAB9', nome: 'Paula Duarte' },
  { numero: 86, codigo: 'TST-5CDE2', nome: 'Rafael Gomes' },
  { numero: 90, codigo: 'TST-6FGH3', nome: 'Sofia teste' },
  { numero: 99, codigo: 'TST-7JKL4', nome: 'Cupom inválido', status: 'inválido' },
  { numero: '', codigo: 'TST-8MNP5', nome: 'Sem Número', status: 'válido' }
];

var htmlPreview = montarHtml({
  fonteFace: '@font-face{font-family:Bubble;src:url("fonts/BubblegumSans-Regular.ttf") format("truetype");font-display:swap}',
  logo: '../logo.png',
  jumb: 'jumbinho-sorteio.jpg',
  puroTag: '<script>\n' + puro + '\n</script>',
  boot: 'iniciarAoVivo(' + JSON.stringify({
    teste: true,
    chave: '',
    preview: true,
    participantes: participantes
  }, null, 2) + ');'
});

var pastas = ['teste', 'teste-web', 'oficial', 'oficial-web'];
pastas.forEach(function (nome) {
  var dir = path.join(__dirname, nome);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Midia.js'), midia);
  fs.writeFileSync(path.join(dir, 'SorteioPuro.js'), puro);
  fs.writeFileSync(path.join(dir, 'SorteioAoVivo.js'), aoVivo);
  fs.writeFileSync(path.join(dir, 'AoVivo.html'), htmlApps);
  var claspOrigem = path.join(origem, nome, '.clasp.json');
  var manifest = path.join(origem, nome, 'appsscript.json');
  fs.copyFileSync(claspOrigem, path.join(dir, '.clasp.json'));
  fs.copyFileSync(manifest, path.join(dir, 'appsscript.json'));
});

var previewDir = path.join(raiz, 'preview');
fs.mkdirSync(path.join(previewDir, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(previewDir, 'index.html'), htmlPreview);
fs.copyFileSync(path.join(origem, 'form-oficial/jumbinho-sorteio.jpg'), path.join(previewDir, 'jumbinho-sorteio.jpg'));
fs.copyFileSync(
  path.join(origem, 'arquivos/fonts/BubblegumSans-Regular.ttf'),
  path.join(previewDir, 'fonts/BubblegumSans-Regular.ttf')
);

if (htmlApps.indexOf('@@') >= 0 || htmlPreview.indexOf('@@') >= 0) {
  console.error('Ficou placeholder sem substituir.');
  process.exit(1);
}
if (htmlPreview.indexOf('<?') >= 0) {
  console.error('O preview não pode ter scriptlet do Apps Script.');
  process.exit(1);
}
console.log('Páginas geradas. Midia.js com ' + midia.length + ' caracteres.');
