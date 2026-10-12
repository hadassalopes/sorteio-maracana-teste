# Sorteio ao vivo — Dia das Crianças

Página vertical para sortear o número ganhador na live do Instagram, no dia 18/10. A planilha continua sendo a fonte da verdade. O resultado entra no histórico da aba **Sorteio** e numa aba nova, **Auditoria**.

Nada disso foi publicado. Não rodei `clasp push` nem criei implantação.

A página de inscrição deste repositório (`index.html` na raiz) não foi alterada.

## Ver o visual agora

Abra [`preview/index.html`](../preview/index.html) no navegador. Pode ser o arquivo direto, sem servidor.

É um ensaio com **nomes e cupons inventados**. O botão **Sortear agora** gira números reais dessa lista fictícia, solta confete e mostra o número, o primeiro nome e o cupom mascarado (`TST-23•••`). Embaixo ficam o carimbo de Brasília, o hash da lista e a seed. **Sortear novamente** pede confirmação. Nenhum telefone aparece, e nada é gravado na planilha.

## Como o número é escolhido

Entram na urna as inscrições com Status `válido` e Nº da sorte preenchido. No **oficial**, também sai quem tem o último nome `teste` (a mesma regra do `realizarSorteio_` de hoje). Na planilha de **teste**, esses nomes continuam concorrendo, senão o ensaio da live ficaria vazio.

A lista é ordenada pelo número e, no empate, pelo código e pelo nome. Cada linha do texto hasheado é `numero|codigo|nome`, sem telefone. O nome perde um apóstrofo inicial (o que a planilha usa para bloquear fórmula) e espaços repetidos viram um só.

- Hash da lista = SHA-256 desse texto, em hexadecimal minúsculo (UTF-8).
- Carimbo = horário de Brasília no formato `yyyy-MM-ddTHH:mm:ss.SSS-03:00`. É exatamente o texto da coluna A da Auditoria.
- Seed = SHA-256 do carimbo, uma quebra de linha, e o hash.
- Índice = o inteiro da seed módulo a quantidade. A posição 0 é a primeira da lista ordenada.

O mesmo horário e a mesma lista produzem sempre o mesmo ganhador. `Math.random` não escolhe ninguém. Ele só embaralha a ordem em que os números passam na roleta, para a animação não ser sempre igual.

Conferir uma linha já sorteada, sem abrir a planilha:

```bash
node apps-script/verificar-algoritmo.js \
  --quando "2026-10-18T17:00:00.123-03:00" \
  --hash "cole-o-hash" \
  --seed "cole-a-seed" \
  --indice 0 \
  --total 128
```

O teste do algoritmo (vetores do SHA-256, filtros, máscara e ausência de telefone na resposta da tela):

```bash
node apps-script/verificar-algoritmo.js
```

**Sortear novamente** faz outro sorteio, com carimbo novo, entre todos os válidos de novo. O anterior continua no histórico. Se cair a mesma pessoa, é só sortear outra vez. Para tirar alguém da urna, mude o Status na aba Inscrições antes — a lista muda, o hash muda, e a auditoria mostra isso.

O menu e a caixinha da aba Sorteio usam a mesma função. O alerta do menu, só para quem está na planilha, continua mostrando o WhatsApp, porque a bilheteria precisa ligar. A tela da live não recebe o telefone.

## O que entra em cada projeto

| Pasta | Planilha | O que publicar agora |
| --- | --- | --- |
| `apps-script/teste` | TESTE, script ligado à planilha (menu e caixinha) | sim |
| `apps-script/teste-web` | TESTE, aplicativo da Web | sim |
| `apps-script/oficial` | oficial, script da planilha | não, só quando o ensaio estiver bom |
| `apps-script/oficial-web` | oficial, aplicativo da Web | não |

A rota nova é a mesma nos quatro: `?p=sorteio&k=SUA_CHAVE`. Sem a chave, ou com a chave errada, a resposta é só “Página não encontrada”. A palavra “chave” não aparece.

Arquivos de cada pasta:

- `Codigo.js` — formulário de inscrição como está, mais a rota no `doGet`. O `realizarSorteio_` saiu daqui.
- `SorteioPuro.js` — a conta do SHA-256.
- `SorteioAoVivo.js` — sorteio, auditoria, `doPost` da inscrição e a página.
- `Midia.js` — logo, Jumbinho e a fonte Bubblegum Sans embutidos, para a live não depender de outro site.
- `AoVivo.html` — a tela 9:16.
- `appsscript.json` e `.clasp.json` — os mesmos projetos de antes.

## 1. Criar a chave

No computador:

```bash
openssl rand -hex 18
```

São 36 caracteres. O mínimo que o script aceita é 12. Se for menor, a página fica como não encontrada de propósito.

No Apps Script do projeto **teste-web** (e também no projeto **teste**, se for usar o link da planilha):

1. Configurações do projeto (engrenagem).
2. Propriedades do script.
3. Adicionar propriedade: nome `CHAVE_SORTEIO`, valor a chave.
4. Salvar.

Não commite a chave e não coloque o link com `k=` na bio, no story ou na figurinha da live. A barra de endereço do celular mostra a chave: abra a página, role para esconder a barra, ou use “Adicionar à tela de início”, e não filme o endereço.

`clasp push` não apaga essa propriedade.

## 2. Enviar o código — clasp

Entre na conta Google dona das planilhas (`clasp login`).

```bash
cd apps-script/teste-web
clasp push
cd ../teste
clasp push
```

O `clasp push` manda a pasta inteira. Arquivo que existir só no editor do Google, e não nesta pasta, é apagado do projeto. O projeto de teste original só tinha `Codigo.js`.

## 2. Alternativa — colar no editor

No Apps Script, para cada projeto de teste:

1. Abra o arquivo que hoje tem o script (deve se chamar `Codigo.gs`) e substitua o conteúdo por `Codigo.js`. Não deixe o `realizarSorteio_` antigo em outro arquivo: duas funções com o mesmo nome quebram o projeto.
2. Arquivo novo de script, cole `SorteioPuro.js` (pode chamar `SorteioPuro.gs`).
3. Arquivo novo, cole `SorteioAoVivo.js`.
4. Arquivo novo, cole `Midia.js`. Ele é grande por causa das imagens.
5. Arquivo **HTML** (o + do editor, opção HTML), nome exatamente `AoVivo`, cole `AoVivo.html`.

Salve.

## 3. Publicar sem trocar o link da inscrição

A página pública de inscrição faz POST no `/exec` que já está no ar. Se você criar **outra** implantação, esse link muda e o cadastro para de responder.

1. Implantar → Gerenciar implantações.
2. No aplicativo da Web que já atende o `/exec`, clique no lápis.
3. Versão: **Nova versão**.
4. Executar como: **Eu**. Acesso: **Qualquer pessoa** (o manifesto já está `ANYONE_ANONYMOUS`).
5. Implantar.

Se o teste-web ainda não tiver implantação nenhuma, aí sim crie a primeira, com essas mesmas opções. Isso não mexe no `/exec` oficial, que é outro projeto.

Se o Google pedir autorização de novo, aceite. Os escopos do manifesto não foram aumentados.

O `doPost` foi incluído de propósito. A cópia local do `oficial-web` não tinha `doPost`, mas a página pública posta o formulário e espera um `postMessage` com `origem: "sorteio"`. Sem isso, substituir o script derruba o cadastro. O `doPost` só chama `registrar` (código, nome, WhatsApp). Ele não sorteia.

Antes da live, faça uma inscrição de teste de ponta a ponta e confirme que o número da sorte ainda volta na tela.

## 4. Abrir na live

```text
https://script.google.com/macros/s/ID_DA_IMPLANTACAO/exec?p=sorteio&k=SUA_CHAVE
```

O `ID_DA_IMPLANTACAO` é o da implantação que você atualizou, não o scriptId do `.clasp.json`.

A tela mostra o total de válidos e a faixa (do menor ao maior número). **Sortear agora** gira esses números, para no ganhador e revela o primeiro nome e o cupom mascarado. Confete. Seed e hash ficam na tela e na aba Auditoria.

Colunas da Auditoria: data/hora de Brasília, origem (`ao vivo` ou `ao vivo (novamente)`), quantidade, número mínimo, número máximo, hash, seed, índice, nº da sorte, nome e código. Sem telefone. A célula A1 tem a mesma receita de conferência. O histórico antigo da aba Sorteio (a partir da linha 21) continua, agora com a origem `ao vivo`, e as células A11, A13 e A14 são atualizadas como antes.

## Quando for a hora do oficial

As pastas `oficial` e `oficial-web` já estão com a mesma tela e a mesma conta. As diferenças:

- `IGNORAR_NOME_TESTE = true` (último nome `teste` fica de fora, como o sorteio oficial faz hoje).
- Sem o selo TESTE.
- Códigos `MRC-`, planilha oficial.
- O `oficial-web` não ganhou a rota `?ping=1`, que só existe no teste.
- O `doPost` da inscrição está incluído, pelo motivo acima.

O passo é o mesmo: chave `CHAVE_SORTEIO` nos dois projetos oficiais, `clasp push` em `apps-script/oficial-web` e `apps-script/oficial`, e **nova versão da implantação que já existe**. Não crie uma implantação nova.

Se o script oficial publicado tiver um `doPost` diferente do que estava na cópia local, compare com `SorteioAoVivo.js` antes de substituir. O deste repositório cobre o formulário atual: campos `codigo`, `nome`, `whatsapp` e a resposta em `postMessage`.

## Se mudar o visual

O HTML de verdade está em `apps-script/ui/`. Depois de editar:

```bash
node apps-script/montar.js
```

Isso regrava `AoVivo.html`, `Midia.js` e `preview/index.html`.
