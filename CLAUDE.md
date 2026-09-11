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
  ├ vacinas/{id}                → doses de vacina já tomadas (veja abaixo)
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

A barra de abas tem sempre 5 botões: **Início** (rótulo visível; id interno continua `hoje` —
`data-tela="hoje"`, `#tela-hoje`, `ir('hoje')` — só o texto do botão mudou, não vale a pena arriscar um
rename em cascata por um rótulo), Consultas, Remédios, Agenda, Mural. Ajustes não é mais uma aba —
`tela-ajustes` continua existindo como `<section>`, só não tem botão correspondente em `#abas`. Ela é
alcançada por um botão redondo (classe `.eu.avatar-topo`, mostrando as iniciais do usuário) que aparece no
topo de cada uma das 5 telas e chama `ir('ajustes')` diretamente. Esses botões são atualizados centralmente
dentro de `desenhar()` (`$$('.avatar-topo').forEach(...)`), não em cada tela individualmente — ao adicionar
uma tela nova, replique o padrão `.topo-tela` (título + botão) em vez de só um `<h1 class="titulo-tela">`.

### Agenda: lista + calendário, unificada com consultas futuras

`consultas` e `eventos` continuam duas coleções separadas (histórico rico vs. compromisso simples), mas a
Agenda e o bloco "Vem aí" da Início não leem só `eventos` — leem `itensFuturos()`, que junta
`eventosFuturos()` com `consultasFuturas()` (`db.consultas.filter(c=>c.data>hojeISO())`) num único array
ordenado por data, renderizando cada item com o card do seu próprio tipo (`cardEvento`/`cardConsulta`). Isso
existe porque uma consulta cadastrada com data futura (a mãe marcando uma consulta com antecedência, por
exemplo) é, na prática, um compromisso — e o usuário não deveria precisar cadastrar a mesma coisa duas vezes
(uma como consulta, outra como evento) só pra ela aparecer na agenda.

O corte entre "futuro" e "passado" é **estritamente depois de hoje** (`c.data>hojeISO()`, não `>=`) de
propósito: uma consulta datada de hoje é o fluxo normal do app (anotada em tempo real, no consultório — ver
COMO-USAR.md), então continua contando como já aconteceu. Isso também resolve o inverso: `desenhaUltima()`
(bloco "Última consulta" da Início) filtra `db.consultas` para `data<=hojeISO()` antes de pegar a mais
recente — sem esse filtro, uma consulta futura mais distante no tempo "vencia" no sort por string de data e
aparecia como se já tivesse acontecido, o que é o bug relatado que motivou essa mudança inteira.

`cardConsulta(c)` sabe se está renderizando uma entrada futura (`c.data>hojeISO()`) e troca "anotou {autor}"
por "marcou {autor}" e adiciona `quandoTexto(c.data)` à linha de data — mesma função que `cardEvento` já
usava, agora compartilhada — pra não ler como narração de algo que ainda não aconteceu.

A tela Agenda tem um alternador **Lista / Calendário** (`agendaModo`, controlado por `alternarAgenda()`),
persistente enquanto o app está aberto (variável de módulo, mesmo padrão de `filtroEsp`/`filtroMural`). O
modo lista é a `itensFuturos()` de cima + os eventos passados (só eventos — consultas passadas já têm seu
próprio histórico completo em Consultas, não faz sentido duplicar ali). O modo calendário
(`desenhaCalendario()`) é uma grade de mês construída na mão (sem lib de datas): `itensPorData()` agrupa
eventos **e** consultas (passadas e futuras, diferente de `itensFuturos()`) por data pra decidir em que dia
cada pontinho colorido aparece; tocar num dia (`selecionarDia()`) redesenha só o painel de baixo com os
itens daquele dia, sem recarregar a grade inteira. `agendaMes` guarda o mês visível como `Date`;
`mesAnterior()`/`mesSeguinte()` andam um mês pra cada lado.

### Mural de recados

`recados` é uma lista em tempo real igual às outras (está em `LISTAS`, streamada por `Store.ouvir()`). Cada
recado tem `etiqueta` (uma de `Balé`, `Escola`, `Saúde`, `Outro`, definidas em `ETIQUETAS` no `index.html`,
cada uma com cor e ícone do mesmo conjunto de SVGs desenhados à mão do resto do app — nunca emoji) e um
booleano `importante`, escolhido por um interruptor de verdade (`.interruptor`, `aria-pressed`), não uma
caixinha de seleção. Um recado importante aparece fixado no topo do mural (classe `.card.fixado`) e também
no bloco "Não esquecer" da tela Hoje, acima dos remédios — esse bloco (`desenhaNaoEsquecer()`) fica oculto
quando não há nenhum recado importante. O filtro do mural por etiqueta é sempre visível; o filtro
"Importantes" só aparece quando existe pelo menos um recado marcado assim (`desenhaFiltrosMural()`).

### Carteira de vacinas

`CALENDARIO_VACINAL` (constante no `index.html`) é uma tabela fixa, no código, do calendário nacional de
vacinação (PNI) até os 4 anos — **não** é editável pelo usuário nem vem do Firestore, é só a referência
usada para calcular datas esperadas (`somarMeses(nascimento, idadeEmMeses)`) e decidir o status de cada
dose: `dada` (existe um registro em `db.vacinas` com o mesmo par vacina+rótulo da dose), `atrasada` (sem
registro e a data esperada já passou) ou `prevista` (sem registro, ainda não chegou a data). A tela
("Carteira de vacinas", aberta via `abrirVacinas()` a partir de Ajustes) é só uma folha, não uma aba —
mesmo padrão de `abrirContatos()`/`abrirPerfil()`. `db.vacinas` guarda apenas as doses **realmente tomadas**
(`{vacina, dose, data, local, autor}`, gravadas com o `Store.gravarItem('vacinas', …)` genérico, sem nada
específico em `store-firestore.js` além de `vacinas` estar em `LISTAS`); o calendário nunca é escrito lá.
"Outra vacina" permite registrar algo fora da tabela fixa (catch-up, vacina de viagem, etc.) — nesse caso
não há dose/data esperada pra comparar, então some direto pra `db.vacinas` sem passar por status calculado.
O calendário embutido é referência, não prescrição médica — o texto de aviso na tela e este comentário
existem por causa disso: datas reais de vacinação variam por atraso, doença, orientação do pediatra etc.

### Sistema visual (cores, ícones, marca)

Os tokens de cor ficam em `:root` no `<style>`. `--lavanda`, `--tinta2` e `--rosa` foram calibrados para
passar WCAG AA (contraste ≥4.5:1) em todo uso real como texto ou texto-sobre-fundo — foram medidos com a
fórmula de luminância relativa do WCAG, não escolhidos de olho (`--rosa:#C93468` dá 5.03:1 com texto branco
em cima; tons de rosa mais claros/vivos que isso, testados durante a repaginada "tema princesa", ficavam
todos abaixo de 3:1). Ao trocar qualquer cor usada como texto ou como fundo por trás de texto, meça o
contraste antes de assumir que "parece dar" — tons pastel bonitos no editor frequentemente falham em
contraste sob luz de sol ou pra quem tem baixa visão, o público real deste app (cuidadores, às vezes avós).
`--rosa`/`--rosa-clara`/`--rosa-sombra` são um acento *secundário* (estado selecionado de filtro/chip,
pílula da aba ativa, brilho da carteirinha) — `--lavanda` continua sendo a cor primária de ação (botões,
links "ver tudo"). A ideia é rosa como tempero, não substituição.

`--rebote:cubic-bezier(.34,1.56,.64,1)` é a curva de "soltar o toque" usada nos elementos interativos
(cards, filtros, botões, chips) — o aperto (`:active`) continua rápido e sem exagero (~0.07-0.09s, `ease-out`,
sem overshoot, pra não pesar em ações frequentes), só a volta ao estado normal usa essa curva com leve
"quique" (~0.22-0.34s conforme o elemento). Ao adicionar um novo elemento tocável com feedback de escala,
siga esse padrão — duas declarações de transição, uma no seletor base (com `--rebote`) e outra em `:active`
que sobrescreve `transition-duration`/`transition-timing-function` pra algo mais seco.

**Armadilha de escopo já corrigida uma vez, não reintroduzir**: existe `.eu{...}` (estilo base do botão-avatar
redondo, fundo `--lavanda` sólido) e `.hero .eu{...}` (variante translúcida, só para quando o botão está
dentro do cabeçalho colorido `.hero`, na tela Hoje). Antes de existir mais de um botão `.eu` no app, alguém
escreveu a variante translúcida sem o prefixo `.hero `, e como só havia um `.eu` (dentro do hero) isso nunca
deu problema — até o Mural adicionar o botão de Ajustes (`.avatar-topo`) no topo de Consultas/Remédios/
Agenda/Mural, fora do hero: eles ficaram brancos sobre fundo quase branco, invisíveis. Qualquer nova regra
CSS pensada para "só dentro do cabeçalho colorido" precisa do seletor `.hero ` explícito — testar essa
suposição com uma captura de tela real (não só ler o CSS) é o que pegou esse bug.

Ícones são todos SVG de um traço só, desenhados à mão no dicionário `D` dentro do `<script type="module">`
(função `ico(nome, classe)`), grade 24×24, mesmo `stroke-width`. Emoji nativo do sistema (🩸⚠️💳📍🔁) foi
deliberadamente removido de chips e cards funcionais (carteirinha, cards de consulta/evento) porque o
render "glossy"/colorido do emoji do SO destoa do estilo flat da marca — ficam só nos micro-momentos de
celebração (confete em `faiscas()`), onde a variação de cor é parte do efeito. Ao adicionar um novo indicador
visual (chip, badge, ícone de categoria), desenhe um símbolo novo em `D` em vez de usar emoji.

O ícone do app (`icon-192.png`, `icon-512.png`, `icon-maskable.png`) é um coração liso sobre o mesmo
gradiente do `.hero`, gerado como SVG e rasterizado (não é mais o texto "Bia", que virava ilegível no
tamanho de ícone de tela inicial). `logo.png`/`logo-branco.png` viraram um *lockup* coração+"Bia" lado a
lado, no lugar do coração flutuando isolado acima do texto. Se esses arquivos precisarem ser regenerados,
o método usado foi: desenhar em SVG/HTML, renderizar via Chrome/Edge headless (`--headless=new
--screenshot`) e recortar com `System.Drawing` do PowerShell — headless Chrome/Edge não respeita
`--window-size` de forma confiável para larguras abaixo de ~500px (há um mínimo interno), então viewports de
celular só saem certos renderizando dentro de um `<iframe>` com largura CSS fixa, nunca direto na janela
de topo.

### Movimento: `redesenha()` em vez de `innerHTML =` direto

Toda tela é reconstruída via `innerHTML =` puro (nunca um framework de diffing) — o que significa que uma
`transition` de CSS declarada num elemento de lista nunca dispara sozinha, porque o nó é destruído e recriado
a cada redesenho, não modificado. `redesenha(el, html)` existe pra dar um sinal visual rápido de "isso
mudou" nesses casos: troca o `innerHTML` e reinicia uma animação de opacidade de 180ms no container inteiro
(não por item — sem stagger). Use `redesenha()` nos containers de lista/resumo que mudam por sincronização
ao vivo ou troca de filtro (`doses-hoje`, `lista-consultas`, `lista-mural`, `carteirinha`, etc.). **Não** use
em conteúdo redesenhado a cada toque dentro do mesmo formulário (grade de horários, escolha de etiqueta,
bichinho) — aí a frequência é alta demais pra animação ajudar, só atrapalha.

Na mesma linha, `alternarVisivel(el, mostrar)` substitui `el.hidden = true/false` cru pra elementos que
precisam de uma transição de entrada/saída (botão flutuante, visor de foto em tela cheia): o
`[hidden]{display:none!important}` global corta qualquer `transition` no meio se você só trocar `hidden`
direto, então a função espera a transição de opacidade terminar antes de aplicar `hidden=true` de verdade.
A troca de aba (`ir()`) continua usando `hidden` cru de propósito — é uma ação de altíssima frequência, e
ação frequente não deveria ganhar animação (ver troca de tela abaixo).

A tela de carregamento inicial (`#porta-carregando`) mostra uma silhueta da tela Hoje (classe `.osso`, brilho
via `background-position` animado) em vez de um spinner solto — só é visível de verdade numa conexão real
com o Firebase; em modo local o carregamento é rápido demais pra aparecer.

A troca de tela (`ir()`, animação `entra` em `.tela.on`) tem entrada mas não tem saída — decisão deliberada,
não esquecimento: trocar de aba é a ação mais frequente do app, e o guia de movimento deste projeto (ver
`design-motion-principles`) recomenda restrição justamente nas ações de alta frequência.

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

**Antes de fazer `git push`, `diff` o repositório inteiro contra a pasta local — nunca copie "só os arquivos
que eu lembro de ter mudado".** Já aconteceu de uma sessão editar `store-firestore.js` (LISTAS/vazio() de um
recurso novo) e só enviar `index.html` nos commits seguintes, porque cada push posterior só copiava os
arquivos daquela tarefa específica. O bug só aparece em produção (Firestore de verdade), nunca no teste
local (que usa a cópia local do `store-firestore.js`, já correta) — o app carrega normal, mas quebra ao abrir
a tela que depende do campo que faltou no banco publicado, com um erro tipo "Cannot read properties of
undefined". Rotina segura: `diff` de cada arquivo rastreado entre o clone e a pasta local antes de decidir o
que entra no commit, não confiar na memória de "o que essa tarefa tocou".

Regras do Firestore (`firestore.rules`) não fazem parte do deploy do GitHub Pages — publicar no GitHub não
publica a regra nova no Firebase. Toda vez que uma coleção nova ganha uma linha em `firestore.rules`, isso
precisa ser colado manualmente no console do Firebase (Firestore Database → Regras → Publicar) além do
`git push` — as duas coisas são passos separados, esquecer a segunda dá erro de permissão, não o
"undefined" de dado ausente.
