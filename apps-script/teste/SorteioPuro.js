/**
 * Sorteio verificável do Dia das Crianças.
 * A mesma função roda no Apps Script (V8), no preview e no teste Node.
 * Não usa Math.random. Não lê telefone. Não guarda telefone no texto hasheado.
 *
 * Conta, com a lista já ordenada:
 *   hash = SHA-256( linha "numero|codigo|nome" por inscrito, separadas por \n )
 *   seed = SHA-256( carimbo de Brasília + "\n" + hash )
 *   índice = inteiro(seed) módulo quantidade   (posição 0 é o primeiro da lista)
 */
var SorteioPuro = (function () {
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  function utf8(texto) {
    var s = String(texto);
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var c2 = s.charCodeAt(++i);
        var u = ((c - 0xd800) << 10) + (c2 - 0xdc00) + 0x10000;
        out.push(
          0xf0 | (u >> 18),
          0x80 | ((u >> 12) & 0x3f),
          0x80 | ((u >> 6) & 0x3f),
          0x80 | (u & 0x3f)
        );
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return out;
  }

  function sha256Hex(texto) {
    var bytes = utf8(texto);
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var hi = Math.floor(bitLen / 0x100000000);
    var lo = bitLen >>> 0;
    var i;
    for (i = 3; i >= 0; i--) bytes.push((hi >>> (i * 8)) & 0xff);
    for (i = 3; i >= 0; i--) bytes.push((lo >>> (i * 8)) & 0xff);

    var H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    for (var off = 0; off < bytes.length; off += 64) {
      var W = new Array(64);
      var t;
      for (t = 0; t < 16; t++) {
        var p = off + t * 4;
        W[t] = (((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0);
      }
      for (t = 16; t < 64; t++) {
        var s0 = (rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3)) >>> 0;
        var s1 = (rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10)) >>> 0;
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        var ch = ((e & f) ^ ((~e) & g)) >>> 0;
        var temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var temp2 = (S0 + maj) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }

    var hex = '';
    for (i = 0; i < 8; i++) {
      var v = H[i];
      for (var shift = 28; shift >= 0; shift -= 4) {
        hex += '0123456789abcdef'.charAt((v >>> shift) & 0xf);
      }
    }
    return hex;
  }

  function nomeCanonico(nome) {
    return String(nome == null ? '' : nome).replace(/^'/, '').replace(/\s+/g, ' ').trim();
  }

  function textoNumero(valor) {
    if (typeof valor === 'number' && isFinite(valor)) return String(Math.trunc(valor));
    return String(valor == null ? '' : valor).replace(/^'/, '').trim();
  }

  function terminaEmTeste(nome) {
    var partes = nomeCanonico(nome).toLowerCase().split(' ');
    return partes.length > 0 && partes[partes.length - 1] === 'teste';
  }

  /** Mesmos filtros de realizarSorteio_: Status válido e Nº da sorte preenchido.
   *  No oficial, ignorarNomeTeste tira quem tem o último nome "teste". */
  function elegivel(linha, ignorarNomeTeste) {
    if (!linha) return false;
    if (String(linha[5] == null ? '' : linha[5]).trim() !== 'válido') return false;
    if (linha[1] === '' || linha[1] === null || typeof linha[1] === 'undefined') return false;
    if (textoNumero(linha[1]) === '') return false;
    if (ignorarNomeTeste && terminaEmTeste(linha[3])) return false;
    return true;
  }

  function prepararElegiveis(linhas, ignorarNomeTeste) {
    var lista = [];
    for (var i = 0; i < linhas.length; i++) {
      var r = linhas[i];
      if (!elegivel(r, ignorarNomeTeste)) continue;
      lista.push({
        numero: textoNumero(r[1]),
        codigo: String(r[2] == null ? '' : r[2]).replace(/^'/, '').trim(),
        nome: nomeCanonico(r[3])
      });
    }
    lista.sort(function (a, b) {
      var na = Number(a.numero);
      var nb = Number(b.numero);
      var fa = isFinite(na) ? na : Number.MAX_VALUE;
      var fb = isFinite(nb) ? nb : Number.MAX_VALUE;
      if (fa !== fb) return fa - fb;
      if (a.codigo < b.codigo) return -1;
      if (a.codigo > b.codigo) return 1;
      if (a.nome < b.nome) return -1;
      if (a.nome > b.nome) return 1;
      return 0;
    });
    return lista;
  }

  function canonico(lista) {
    var linhas = [];
    for (var i = 0; i < lista.length; i++) {
      linhas.push(lista[i].numero + '|' + lista[i].codigo + '|' + lista[i].nome);
    }
    return linhas.join('\n');
  }

  function indicePorSeed(seedHex, n) {
    var total = Number(n);
    if (!isFinite(total) || total < 1) throw new Error('quantidade inválida');
    var hex = String(seedHex || '').toLowerCase().replace(/^0x/, '');
    if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('seed inválida');
    return Number(BigInt('0x' + hex) % BigInt(total));
  }

  function escolher(lista, carimbo) {
    if (!lista || !lista.length) throw new Error('lista vazia');
    var texto = canonico(lista);
    var hashLista = sha256Hex(texto);
    var quando = String(carimbo);
    var seed = sha256Hex(quando + '\n' + hashLista);
    var indice = indicePorSeed(seed, lista.length);
    return {
      canonico: texto,
      hashLista: hashLista,
      seed: seed,
      indice: indice,
      ganhador: lista[indice],
      quando: quando
    };
  }

  function resumir(lista) {
    if (!lista || !lista.length) {
      return { ok: true, total: 0, menor: '', maior: '', numeros: [] };
    }
    var numeros = [];
    for (var i = 0; i < lista.length; i++) numeros.push(lista[i].numero);
    return {
      ok: true,
      total: lista.length,
      menor: lista[0].numero,
      maior: lista[lista.length - 1].numero,
      numeros: numeros
    };
  }

  function primeiroNome(nome) {
    var n = nomeCanonico(nome);
    if (!n) return '';
    return n.split(' ')[0];
  }

  function mascararCodigo(codigo) {
    var c = String(codigo || '').replace(/^'/, '').trim().toUpperCase();
    var m = c.match(/^([A-Z0-9]+)-([A-Z0-9]+)$/);
    if (!m) return '•••••';
    var corpo = m[2];
    var visiveis = corpo.length <= 2 ? 1 : 2;
    var esconde = '';
    for (var i = visiveis; i < corpo.length; i++) esconde += '•';
    if (!esconde) esconde = '•••';
    return m[1] + '-' + corpo.slice(0, visiveis) + esconde;
  }

  /** O que a tela ao vivo pode receber. Sem telefone, sem nome completo, sem código inteiro. */
  function visaoPublica(g) {
    var numeros = [];
    var fonte = g.numeros || [];
    for (var i = 0; i < fonte.length; i++) numeros.push(String(fonte[i]));
    return {
      ok: true,
      numero: String(g.numero),
      primeiroNome: primeiroNome(g.nome),
      codigoMascara: mascararCodigo(g.codigo),
      total: g.total,
      menor: String(g.menor),
      maior: String(g.maior),
      numeros: numeros,
      hashLista: g.hashLista,
      seed: g.seed,
      quando: g.quando,
      indice: g.indice,
      origem: g.origem || ''
    };
  }

  /** Mesmo formato gravado na aba Auditoria: yyyy-MM-ddTHH:mm:ss.SSS-03:00 */
  function carimboDeData(data) {
    var d = data instanceof Date ? data : new Date(data);
    var partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(d);
    var map = {};
    for (var i = 0; i < partes.length; i++) map[partes[i].type] = partes[i].value;
    var hora = map.hour === '24' ? '00' : map.hour;
    var ms = String(d.getMilliseconds());
    while (ms.length < 3) ms = '0' + ms;
    return map.year + '-' + map.month + '-' + map.day + 'T' + hora + ':' + map.minute + ':' + map.second + '.' + ms + '-03:00';
  }

  function conferir(carimbo, hashLista, seed, indice, total) {
    var seedCalculada = sha256Hex(String(carimbo) + '\n' + String(hashLista));
    var indiceCalculado = indicePorSeed(seedCalculada, total);
    return {
      seedConfere: seedCalculada === String(seed),
      indiceConfere: indiceCalculado === Number(indice),
      seedCalculada: seedCalculada,
      indiceCalculado: indiceCalculado
    };
  }

  return {
    sha256Hex: sha256Hex,
    nomeCanonico: nomeCanonico,
    textoNumero: textoNumero,
    terminaEmTeste: terminaEmTeste,
    elegivel: elegivel,
    prepararElegiveis: prepararElegiveis,
    canonico: canonico,
    indicePorSeed: indicePorSeed,
    escolher: escolher,
    resumir: resumir,
    primeiroNome: primeiroNome,
    mascararCodigo: mascararCodigo,
    visaoPublica: visaoPublica,
    conferir: conferir,
    carimboDeData: carimboDeData
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SorteioPuro;
