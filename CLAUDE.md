# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## O que é este projeto

"Caderneta da Bia" — um PWA pessoal (sem fins comerciais) para dois cuidadores (pai/mãe) acompanharem juntos,
em tempo real, a saúde de uma criança: consultas por especialidade médica, remédios com horários e controle
de doses, uma agenda de compromissos, um mural de recados (avisos como "reunião da escola" ou "apresentação
do balé", com etiqueta, data e marcação de importante), fotos anexadas a recados e consultas (receita,
pedido de exame), e uma "carteirinha" digital com alergias/tipo sanguíneo. Os dois celulares veem os mesmos
dados ao vivo. Funciona offline e se instala como app na tela inicial. Todo o texto da interface, a
documentação e os comentários no código estão em português do Brasil.

Não há sistema de build, gerenciador de pacotes nem suíte de testes — é HTML/CSS/JS estático puro, servido
como está. Rode localmente com o Live Server do VS Code (ou qualquer servidor de arquivos estático); abrir
o `index.html` direto via `file://` quebra o app, porque módulos ES exigem uma origem HTTP.

## Estrutura de arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | O app inteiro: todo o CSS (`<style>` embutido) e toda a lógica de UI (`<script type="module">` embutido, ~800 linhas). Sem arquivos separados de JS/CSS, sem componentes divididos. |
| `store-firestore.js` | O *único* arquivo que fala com o banco de dados. Exporta um único objeto `Store` com interface idêntica nos dois modos (veja abaixo). |
| `firestore.rules` | Regras de segurança do Firestore — precisam ser coladas manualmente no console do Firebase. Tem os dois UIDs de usuário autorizados fixos no texto. |
| `sw.js` | Service worker: cache offline + exibição/clique de notificações push. |
| `manifest.json`, `icon-*.png`, `logo*.png` | Manifesto de instalação PWA e ícones. |
| `README.md` | Referência resumida de configuração do Firebase/GitHub Pages. |
| `GUIA.md` | Guia completo passo a passo não técnico (criação do projeto Firebase, GitHub Pages, instalação no celular). |
| `COMO-USAR.md` | Manual do usuário final (sem conteúdo técnico). |
| `PUSH.md` | Guia de configuração das notificações push via um Cloudflare Worker "carteiro" (veja Arquitetura de push abaixo). |

Ainda não existe um arquivo `worker.js` neste repositório — o `PUSH.md` o referencia como algo a ser criado
diretamente no painel do Cloudflare ao configurar o push.

## Arquitetura

### Camada de dados com modo duplo (`store-firestore.js`)

O app inteiro é escrito contra uma única interface `Store` (`uid`, `ligarPush`, `entrar`, `sair`,
`aoTrocarUsuario`, `ouvir`, `gravarPerfil`, `gravarItem`, `apagarItem`, `gravarDose`, `apagarDose`) que tem
duas implementações, escolhidas automaticamente na hora do import, dependendo se `configuracao` (o objeto
de configuração do Firebase) foi preenchido:

- **Modo local** (`criarLocal`) — sem configuração do Firebase presente. Tudo é guardado no `localStorage`
  sob uma única chave, com um usuário único fictício (`eu-local`). Usado para desenvolver a interface sem
  precisar ter o Firebase configurado.
- **Modo nuvem** (`criarNuvem`) — Firestore + Firebase Auth. Os SDKs do Firebase são importados
  dinamicamente (`import()`) a partir do `gstatic.com` dentro da função (não no topo do módulo), para que
  uma falha no carregamento do SDK (sem internet, por exemplo) não derrube o app inteiro antes da tela de
  erro conseguir aparecer.

O `index.html` nunca verifica qual modo está ativo nem fala com o Firebase diretamente — ele só chama
`Store.*`. Ao adicionar uma nova operação de dados, adicione-a tanto em `criarLocal` quanto em `criarNuvem`
para manter a interface sincronizada.

### Modelo de sincronização em tempo real

`Store.ouvir(cb)` é o coração da sincronização: ele não busca os dados uma vez, ele se inscreve (via
`onSnapshot` do Firestore) e chama `cb(db, parte)` na primeira carga *e* a cada mudança seguinte, vinda de
qualquer um dos dois celulares. O `index.html` redesenha a seção correspondente da tela toda vez que esse
callback dispara.

Modelo de dados no Firestore:
```
familias/nossa-filha          → perfil da criança (documento único)
  ├ membros/{uid}              → um documento por cuidador (nome, etc.)
  ├ consultas/{id}             → consultas médicas
  ├ remedios/{id}              → remédios
  ├ eventos/{id}               → compromissos na agenda
  ├ doses/{id}                 → registro de doses marcadas
  ├ recados/{id}                → mural de recados (título, texto, etiqueta, importante)
  ├ dispositivos/{id}          → tokens de push, um por aparelho instalado
  └ anexos/{id}                → fotos em base64, fora do fluxo ao vivo (veja abaixo)
```

Cada registro é seu próprio documento (nunca um array grande dentro de um campo). Isso é proposital: significa
que os dois celulares gravando ao mesmo tempo cada um mexe no próprio documento, e nada é sobrescrito por uma
disputa de "última escrita vence" num blob compartilhado.

As gravações (`gravarItem`, `gravarPerfil`, etc.) propositalmente **não** usam `await` na ida e volta com o
servidor — o cache local persistente do Firestore (`persistentLocalCache` / `persistentMultipleTabManager`)
grava na hora, offline, e sincroniza sozinho depois em segundo plano. Bloquear com `await` travaria a tela
dentro de um consultório sem sinal.

### Navegação: Ajustes saiu da barra de abas

A barra de abas tem sempre 5 botões: Hoje, Consultas, Remédios, Agenda, Mural. Ajustes não é mais uma aba —
`tela-ajustes` continua existindo como `<section>`, só não tem botão correspondente em `#abas`. Ela é
alcançada por um botão redondo (classe `.eu.avatar-topo`, mostrando as iniciais do usuário) que aparece no
topo de cada uma das 5 telas e chama `ir('ajustes')` diretamente. Esses botões são atualizados centralmente
dentro de `desenhar()` (`$$('.avatar-topo').forEach(...)`), não em cada tela individualmente — ao adicionar
uma tela nova, replique o padrão `.topo-tela` (título + botão) em vez de só um `<h1 class="titulo-tela">`.

### Mural de recados

`recados` é uma lista em tempo real igual às outras (está em `LISTAS`, streamada por `Store.ouvir()`). Cada
recado tem `etiqueta` (uma de `Balé`, `Escola`, `Saúde`, `Outro`, definidas em `ETIQUETAS` no `index.html`,
cada uma com cor e ícone do mesmo conjunto de SVGs desenhados à mão do resto do app — nunca emoji) e um
booleano `importante`, escolhido por um interruptor de verdade (`.interruptor`, `aria-pressed`), não uma
caixinha de seleção. Um recado importante aparece fixado no topo do mural (classe `.card.fixado`) e também
no bloco "Não esquecer" da tela Hoje, acima dos remédios — esse bloco (`desenhaNaoEsquecer()`) fica oculto
quando não há nenhum recado importante. O filtro do mural por etiqueta é sempre visível; o filtro
"Importantes" só aparece quando existe pelo menos um recado marcado assim (`desenhaFiltrosMural()`).

### Fotos anexadas (recados e consultas)

Não há Cloud Storage (fora do plano gratuito do Firebase), então fotos viram base64 dentro de documentos
Firestore comuns, numa coleção própria `anexos` com um campo `dono` no formato `recado:{id}` ou
`consulta:{id}`. Três decisões deliberadas aqui, todas em `store-firestore.js` e na seção "fotos anexadas"
do `index.html`:

- **`anexos` fica fora de `LISTAS`** — não é streamada por `Store.ouvir()`. É lida sob demanda
  (`Store.listarAnexos(dono)`, uma consulta pontual com `where('dono','==',dono)`, não um listener) só
  quando um recado ou consulta específico é aberto, via `carregarAnexos()`. Se entrasse no fluxo ao vivo,
  abrir o mural baixaria todas as fotos de todo mundo de uma vez. Por isso também um item **novo** (ainda
  sem `id`) não pode receber fotos — `blocoAnexos(id)` mostra um aviso pedindo para salvar primeiro, em vez
  de inventar um `dono` provisório.
- **Cada anexo guarda duas imagens**: `imagem` (a foto comprimida) e `miniatura` (compressão bem mais
  agressiva, poucos KB) — a grade de anexos usa só a miniatura; a imagem cheia só é buscada quando o usuário
  toca para abrir em tela cheia (`verFoto()` / `#visor-foto`).
- **Compressão adaptativa em `comprimirAdaptativo()`**: reduz por `<canvas>` no cliente e tenta em passos
  cada vez mais agressivos (1600px/.75 até 500px/.4) até o data URL caber sob `TETO_ANEXO` (700 000
  caracteres — folga proposital abaixo do limite de 1 MiB por documento do Firestore, que base64 já infla
  em ~33%). Sem isso, uma foto de celular novo (5+ MB) faz o Firestore recusar o documento com um erro que
  não explica nada ao usuário.
- **Exclusão em cascata é manual**: o Firestore não apaga subdocumentos sozinho. `apagar(lista,id)` olha
  `DONO_ANEXO` (`{consultas:'consulta', recados:'recado'}`) e, se a lista apagada tiver anexos possíveis,
  chama `Store.apagarAnexosDe(dono)` — que busca e apaga cada anexo daquele dono — antes de fechar a folha.
  Esquecer esse passo ao criar uma nova entidade "dona" de fotos deixa anexos órfãos ocupando espaço para
  sempre, sem aparecer em lugar nenhum da interface.

Ao criar uma nova operação de anexos, ela também precisa existir nos dois modos de `Store` (local e nuvem),
como qualquer outro método — `criarLocal` guarda `anexos` como mais um array dentro do mesmo blob do
`localStorage`; `criarNuvem` usa `getDocs`/`query`/`where` (importados sob demanda, junto com o resto do SDK
do Firestore) em vez de `onSnapshot`.

### Modelo de segurança

- `firestore.rules` fixa os dois UIDs de Auth do Firebase autorizados numa função `somosNos()`; toda
  coleção exige `somosNos()`. Não existe **regra curinga (catch-all)** de propósito — uma coleção nova
  adicionada depois fica bloqueada por padrão até ser explicitamente liberada aqui.
- A configuração do cliente Firebase (`apiKey`, `projectId`, etc.) em `store-firestore.js` é feita para ser
  pública — é só um endereço, não uma credencial. A trava de verdade é o arquivo de regras acima.
- O cadastro de novos usuários está desativado no console do Firebase Auth (só as duas contas pré-criadas
  conseguem fazer login).
- Os domínios autorizados no Firebase Auth precisam incluir o domínio do GitHub Pages, senão o login falha
  silenciosamente lá.

### Notificações push (opcional, ver `PUSH.md`)

Não usa Cloud Functions do Firebase (exigiria plano pago/Blaze com cartão cadastrado). Em vez disso, um
Cloudflare Worker faz o papel de "carteiro": roda num gatilho cron (a cada 5 min), consulta o Firestore
diretamente usando uma credencial de conta de serviço (guardada como segredo no Cloudflare, nunca neste
repositório) atrás de remédios na hora ou anotações novas, e envia via Firebase Cloud Messaging para os
tokens guardados na coleção `dispositivos`. O handler `push` do `sw.js` monta a notificação visível no lado
do cliente a partir do payload só-de-dados que o worker envia (sem campo `notification`), então o
texto/ícone/clique continuam sob controle deste repositório, não do worker. No iOS, o push só chega se o
PWA estiver instalado na tela inicial e aberto como app instalado (não pelas abas do Safari) — é uma
restrição da plataforma da Apple, não um bug deste código.

## Deploy

Hospedado como site estático no GitHub Pages (raiz do repositório, branch `main`). Não há CI nem etapa de
build — os arquivos são enviados/commitados como estão.

**A invalidação de cache é manual**: o `sw.js` tem uma constante `VERSAO` (ex.: `caderneta-v7`) usada como
chave da Cache API. Ela precisa ser incrementada a cada deploy que altere qualquer arquivo em cache
(`index.html`, `store-firestore.js`, `manifest.json`, ícones/logos), senão os celulares instalados continuam
servindo a versão antiga indefinidamente. Essa é a fonte mais comum da confusão "eu publiquei mas nada
mudou" — sempre confira se a `VERSAO` foi incrementada ao investigar um deploy que parece "preso".

O service worker só guarda em cache requisições da mesma origem mais os domínios de Google Fonts; as
chamadas de rede do Firestore/Firebase passam direto, sem cache, já que o Firestore gerencia seu próprio
cache offline e interceptar essas chamadas quebraria a sincronização.
