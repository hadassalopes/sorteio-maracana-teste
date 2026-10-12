/**
 * Tela ao vivo. O ganhador já veio da planilha (ou do preview).
 * Math.random aqui só embaralha a ordem em que os números passam na roleta.
 */
function iniciarAoVivo(cfg) {
  var ALTURA = 132;
  var numerosAtuais = [];
  var digsAtuais = 2;
  var ocupado = false;
  var modalAberto = false;
  var ultimo = null;
  var total = 0;
  var pararCiclo = function () {};

  var el = {
    selo: document.getElementById('selo'),
    faixa: document.getElementById('faixa-preview'),
    sub: document.getElementById('sub'),
    total: document.getElementById('pill-total'),
    faixaNum: document.getElementById('pill-faixa'),
    janela: document.getElementById('janela'),
    reel: document.getElementById('reel'),
    status: document.getElementById('status'),
    resultado: document.getElementById('resultado'),
    rotulo: document.getElementById('rotulo'),
    nome: document.getElementById('nome'),
    codigo: document.getElementById('codigo'),
    quando: document.getElementById('aud-quando'),
    hash: document.getElementById('aud-hash'),
    seed: document.getElementById('aud-seed'),
    indice: document.getElementById('aud-indice'),
    btn: document.getElementById('btn-sortear'),
    deNovo: document.getElementById('btn-novamente'),
    erro: document.getElementById('erro'),
    modal: document.getElementById('modal'),
    canvas: document.getElementById('confete')
  };

  if (cfg.teste) el.selo.hidden = false;
  if (cfg.preview) {
    el.faixa.hidden = false;
    el.sub.textContent = 'Pré-visualização com dados fictícios';
  } else if (cfg.teste) {
    el.sub.textContent = 'Ensaio · ao vivo em 18 de outubro';
  } else {
    el.sub.textContent = 'Ao vivo · 18 de outubro';
  }

  function texto(no, valor) { no.textContent = valor == null ? '' : String(valor); }

  function formatar(n, digs) {
    var num = Number(n);
    if (!isFinite(num)) return String(n);
    var s = String(Math.trunc(num));
    while (s.length < digs) s = '0' + s;
    return s;
  }

  function calcularDigitos(nums) {
    var m = 2;
    for (var i = 0; i < nums.length; i++) {
      var t = String(Math.trunc(Number(nums[i]))).length;
      if (isFinite(Number(nums[i])) && t > m) m = t;
    }
    return m;
  }

  function mostrarNumero(n) {
    el.reel.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'n';
    div.textContent = n;
    el.reel.appendChild(div);
    el.reel.style.transform = 'translate3d(0,0,0)';
  }

  function mostrarPronto() {
    el.janela.classList.remove('girando');
    el.janela.classList.remove('parado');
    mostrarNumero('••••');
  }

  function textoFaixa(menor, maior) {
    if (menor === '' || menor == null) return '—';
    if (String(menor) === String(maior)) return String(menor);
    return String(menor) + ' ao ' + String(maior);
  }

  function aplicarEstado(r) {
    total = r && r.total ? r.total : 0;
    numerosAtuais = (r && r.numeros) ? r.numeros.slice() : [];
    digsAtuais = calcularDigitos(numerosAtuais.length ? numerosAtuais : ['0']);
    texto(el.total, total ? String(total) : '0');
    texto(el.faixaNum, total ? textoFaixa(r.menor, r.maior) : '—');
    el.btn.disabled = !total;
    if (!total) {
      texto(el.status, 'Ainda não há inscrições válidas.');
      mostrarPronto();
    } else if (!ultimo) {
      texto(el.status, 'Tudo pronto para sortear.');
      mostrarPronto();
    }
  }

  function mostrarErro(msg) {
    texto(el.erro, msg || '');
    el.erro.hidden = !msg;
  }

  function esconderResultado() {
    el.resultado.hidden = true;
  }

  function mostrarGanhador(r) {
    var deNovo = String(r.origem || '').indexOf('novamente') >= 0;
    texto(el.rotulo, deNovo ? 'Novo sorteio' : 'Número da sorte');
    texto(el.nome, r.primeiroNome || 'Participante');
    texto(el.codigo, 'Cupom ' + (r.codigoMascara || '•••••'));
    texto(el.quando, r.quando || '');
    texto(el.hash, r.hashLista || '');
    texto(el.seed, r.seed || '');
    texto(el.indice, 'Índice ' + r.indice + ' de ' + r.total + ' · a contagem começa em 0');
    el.resultado.hidden = false;
    el.btn.hidden = true;
    el.deNovo.hidden = false;
    mostrarErro('');
  }

  function embaralharVisual(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function montarSequencia(nums, vencedor) {
    var base = nums && nums.length ? nums.slice() : [vencedor];
    var seq = [];
    var voltas = base.length < 8 ? 6 : 3;
    var v, i;
    for (v = 0; v < voltas; v++) {
      var rodada = embaralharVisual(base);
      for (i = 0; i < rodada.length; i++) seq.push(rodada[i]);
    }
    if (seq.length > 36) seq = seq.slice(seq.length - 36);
    if (String(seq[seq.length - 1]) === String(vencedor)) seq.pop();
    seq.push(vencedor);
    return seq;
  }

  function iniciarCiclo(nums, digs) {
    var lista = nums.length ? nums : ['0'];
    var i = 0;
    var vivo = true;
    var ultimoT = 0;
    el.janela.classList.add('girando');
    el.janela.classList.remove('parado');
    function frame(now) {
      if (!vivo) return;
      if (now - ultimoT > 55) {
        ultimoT = now;
        mostrarNumero(formatar(lista[i % lista.length], digs));
        i++;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return function () { vivo = false; };
  }

  function animarPouso(seq, digs) {
    return new Promise(function (resolve) {
      el.reel.innerHTML = '';
      for (var i = 0; i < seq.length; i++) {
        var div = document.createElement('div');
        div.className = 'n';
        div.textContent = formatar(seq[i], digs);
        el.reel.appendChild(div);
      }
      el.reel.style.transform = 'translate3d(0,0,0)';
      el.janela.classList.add('girando');
      el.janela.classList.remove('parado');
      var destino = (seq.length - 1) * ALTURA;
      var dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 400 : 6400;
      var inicio = performance.now();
      function ease(t) { return 1 - Math.pow(1 - t, 3.4); }
      function frame(now) {
        var t = Math.min(1, (now - inicio) / dur);
        el.reel.style.transform = 'translate3d(0,' + (-(ease(t) * destino)) + 'px,0)';
        if (t > 0.86) el.janela.classList.remove('girando');
        if (t < 1) requestAnimationFrame(frame);
        else {
          el.janela.classList.add('parado');
          resolve();
        }
      }
      requestAnimationFrame(function () { requestAnimationFrame(frame); });
    });
  }

  function soltarConfete() {
    var canvas = el.canvas;
    var ctx = canvas.getContext('2d');
    var palco = document.getElementById('palco');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = palco.clientWidth;
    var h = palco.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var cores = ['#ffcc00', '#ff6f3c', '#e4002b', '#0057b8', '#ffffff', '#ffe680'];
    var pecas = [];
    var i;
    for (i = 0; i < 110; i++) {
      pecas.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.35,
        w: (5 + Math.random() * 7) * dpr,
        h: (8 + Math.random() * 10) * dpr,
        c: cores[i % cores.length],
        vy: (3.2 + Math.random() * 4.2) * dpr,
        vx: (-1.8 + Math.random() * 3.6) * dpr,
        rot: Math.random() * 6,
        vr: -0.18 + Math.random() * 0.36
      });
    }
    var inicio = performance.now();
    function frame(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var k = 0; k < pecas.length; k++) {
        var p = pecas[k];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06 * dpr;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (now - inicio < 4200) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(frame);
  }

  function chamarServidor(nome, args) {
    return new Promise(function (resolve, reject) {
      var run = google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(function (e) {
          reject(new Error((e && e.message) || 'Não consegui falar com a planilha.'));
        });
      run[nome].apply(run, args);
    });
  }

  function linhasPreview() {
    return (cfg.participantes || []).map(function (p) {
      return ['', p.numero, p.codigo, p.nome, '', p.status || 'válido', 'sim'];
    });
  }

  function sortearLocal(novamente) {
    var lista = SorteioPuro.prepararElegiveis(linhasPreview(), false);
    if (!lista.length) return { ok: false, msg: 'Ainda não há inscrições válidas para sortear.' };
    var carimbo = SorteioPuro.carimboDeData(new Date());
    var s = SorteioPuro.escolher(lista, carimbo);
    var resumo = SorteioPuro.resumir(lista);
    return SorteioPuro.visaoPublica({
      numero: s.ganhador.numero,
      nome: s.ganhador.nome,
      codigo: s.ganhador.codigo,
      total: resumo.total,
      menor: resumo.menor,
      maior: resumo.maior,
      numeros: resumo.numeros,
      hashLista: s.hashLista,
      seed: s.seed,
      quando: s.quando,
      indice: s.indice,
      origem: novamente ? 'ao vivo (novamente)' : 'ao vivo'
    });
  }

  function esperar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function executar(novamente) {
    if (ocupado || !total) return;
    ocupado = true;
    el.btn.disabled = true;
    el.deNovo.disabled = true;
    mostrarErro('');
    esconderResultado();
    texto(el.status, 'Os números estão girando…');
    pararCiclo = iniciarCiclo(numerosAtuais, digsAtuais);
    var t0 = performance.now();
    var pedido = cfg.preview
      ? Promise.resolve(sortearLocal(novamente))
      : chamarServidor('sortearAoVivo', [cfg.chave, !!novamente]);
    pedido.then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.msg) || 'Não foi possível sortear.');
      var esperaMs = Math.max(0, 700 - (performance.now() - t0));
      return esperar(esperaMs).then(function () { return r; });
    }).then(function (r) {
      pararCiclo();
      var nums = r.numeros && r.numeros.length ? r.numeros : numerosAtuais;
      return animarPouso(montarSequencia(nums, r.numero), calcularDigitos(nums)).then(function () { return r; });
    }).then(function (r) {
      ultimo = r;
      if (r.numeros && r.numeros.length) {
        numerosAtuais = r.numeros.slice();
        digsAtuais = calcularDigitos(numerosAtuais);
        total = r.total;
        texto(el.total, String(r.total));
        texto(el.faixaNum, textoFaixa(r.menor, r.maior));
      }
      mostrarGanhador(r);
      texto(el.status, '');
      soltarConfete();
    }).catch(function (err) {
      pararCiclo();
      el.janela.classList.remove('girando');
      if (ultimo) mostrarGanhador(ultimo);
      else mostrarPronto();
      mostrarErro((err && err.message) || 'Não foi possível sortear. Tente de novo.');
    }).then(function () {
      ocupado = false;
      el.btn.disabled = !total;
      el.deNovo.disabled = false;
    });
  }

  function pedirConfirmacao() {
    el.modal.hidden = false;
    return new Promise(function (resolve) {
      function fechar(sim) {
        el.modal.hidden = true;
        el.modal.querySelector('#modal-cancelar').removeEventListener('click', no);
        el.modal.querySelector('#modal-confirmar').removeEventListener('click', yes);
        resolve(sim);
      }
      function no() { fechar(false); }
      function yes() { fechar(true); }
      el.modal.querySelector('#modal-cancelar').addEventListener('click', no);
      el.modal.querySelector('#modal-confirmar').addEventListener('click', yes);
    });
  }

  el.btn.addEventListener('click', function () { executar(false); });
  el.deNovo.addEventListener('click', function () {
    if (ocupado || modalAberto) return;
    modalAberto = true;
    pedirConfirmacao().then(function (sim) {
      modalAberto = false;
      if (sim) executar(true);
    });
  });

  mostrarPronto();
  if (cfg.preview) {
    aplicarEstado(SorteioPuro.resumir(SorteioPuro.prepararElegiveis(linhasPreview(), false)));
    return;
  }
  texto(el.status, 'Contando as inscrições válidas…');
  chamarServidor('estadoSorteio', [cfg.chave]).then(function (r) {
    if (!r || !r.ok) {
      mostrarErro((r && r.msg) || 'Não foi possível ler as inscrições.');
      el.btn.disabled = true;
      return;
    }
    aplicarEstado(r);
  }).catch(function () {
    mostrarErro('Não foi possível ler as inscrições. Atualize a página.');
    el.btn.disabled = true;
  });
}
