# Caderneta — guia passo a passo

Escrito pra ser seguido do começo ao fim, sem pular nada.
Se travar em algum passo, o final tem uma tabela de socorro.

---

## O mapa: o que a gente vai fazer

São cinco etapas. Cada uma resolve um problema diferente:

1. **Fazer o app abrir no seu computador.** Só pra você ver funcionando.
2. **Criar um lugar na internet pra guardar os dados.** É o Firebase.
3. **Conectar o app a esse lugar.** Copiar e colar uma configuração.
4. **Colocar o app no ar.** É o GitHub Pages.
5. **Instalar no celular.** Seu e o da mãe.

Uma comparação que ajuda: o **GitHub Pages** é a loja — qualquer um passa na frente e
vê a vitrine. O **Firebase** é o cofre no fundo da loja, e só vocês dois têm a chave.
O código do app fica na vitrine, à vista de todos. Os dados da sua filha ficam no cofre.

---

## Palavras que vão aparecer

Leia rápido, não precisa decorar. É só pra você não travar quando aparecerem.

**Servidor local (ou localhost)** — Um site precisa ser *servido*, não só aberto.
Quando você abre um arquivo clicando duas vezes, o navegador só lê o arquivo solto.
Alguns recursos modernos não funcionam assim, por segurança. O servidor local é um
programinha que finge ser um site de verdade, rodando só dentro do seu computador.
`localhost` é o endereço dele. Ninguém de fora acessa.

**Firebase** — Um serviço do Google que oferece banco de dados e sistema de login
de graça. É onde os dados da sua filha vão morar.

**Firestore** — O banco de dados dentro do Firebase. É onde ficam as consultas,
remédios e a agenda.

**Authentication** — A parte do Firebase que cuida de login e senha.

**Security rules (regras)** — Um textinho que diz quem pode ler e escrever no banco.
É a fechadura do cofre. Sem isso, o cofre fica destrancado.

**UID** — Um código que o Firebase dá pra cada conta criada. Tipo um RG da conta.
Você vai copiar dois deles.

**PWA** — Um site que pode ser instalado no celular e vira ícone, como se fosse app
de loja. É o que a Caderneta é.

**Cache** — Cópia que o celular guarda pra abrir rápido e funcionar sem internet.
Útil, mas às vezes ele insiste em mostrar a versão velha. Tem um passo pra resolver isso.

---

# ETAPA 1 — Ver o app funcionando no seu computador

Boa notícia: nesta etapa você **não precisa do Firebase ainda**. O app vem preparado
para funcionar sozinho, guardando tudo no seu próprio navegador. É o "modo local".
Serve pra você mexer no visual à vontade.

### 1.1 — Organizar os arquivos

Crie uma pasta no seu computador, por exemplo em Documentos, chamada `caderneta`.
Coloque dentro dela, **soltos, sem subpasta nenhuma**:

```
index.html
store-firestore.js
sw.js
manifest.json
icon-192.png
icon-512.png
firestore.rules
GUIA.md
COMO-USAR.md
```

### 1.2 — Abrir a pasta no VS Code

No VS Code: menu **Arquivo → Abrir Pasta** → escolha a pasta `caderneta`.

Do lado esquerdo você deve ver a lista dos arquivos. Se estiver vendo, está certo.

### 1.3 — Instalar o Live Server

Essa é a parte do servidor local, e é bem mais simples do que o nome sugere.

1. No VS Code, clique no ícone de **Extensões** na barra da esquerda
   (parecem quatro quadradinhos, um deles se soltando).
2. Na caixa de busca, digite: `Live Server`
3. O primeiro resultado é o do autor **Ritwick Dey**. Clique em **Install**.
4. Espere terminar. Não precisa reiniciar nada.

Isso você faz uma vez só. Nos próximos projetos já vai estar instalado.

### 1.4 — Ligar o servidor

1. Na lista de arquivos à esquerda, clique com o **botão direito** em `index.html`.
2. Escolha **Open with Live Server**.

O navegador abre sozinho num endereço parecido com `http://127.0.0.1:5500`.
Esse número é o seu computador falando com ele mesmo. Ninguém de fora enxerga.

> **O que você deve ver:** a tela roxa clara com o bichinho, e logo depois a folha
> de "Dados dela" subindo de baixo pra você preencher o nome.
>
> **Se aparecer uma tela dizendo "Algo travou":** leia a mensagem, ela diz o motivo.
> O mais comum é ter esquecido algum arquivo na pasta.
>
> **Se a página ficar branca:** você provavelmente abriu o arquivo clicando duas
> vezes, e não pelo Live Server. Volte ao passo 1.4.

### 1.5 — Brincar um pouco

Preencha o nome, uma data de nascimento, cadastre um remédio com horários,
registre uma consulta. Tudo isso está sendo guardado só no seu navegador, e some
se você limpar os dados do navegador. É de mentirinha, pra testar.

**Enquanto você estiver mexendo no visual:** deixe o Live Server ligado. Toda vez que
você salvar o `index.html` (Ctrl+S), a página recarrega sozinha. É assim que se
trabalha — edita, salva, olha, edita de novo.

Para desligar o servidor: na barra azul de baixo do VS Code aparece **Port: 5500**.
Clicar ali desliga.

**Só siga para a Etapa 2 quando o visual estiver do jeito que você quer.**
Mexer agora é barato. Depois de tudo publicado, mexer dá mais trabalho.

---

# ETAPA 2 — Criar o cofre (Firebase)

Agora vamos criar o lugar onde os dados de verdade vão ficar, e que os dois
celulares vão enxergar ao mesmo tempo.

Tudo acontece em **console.firebase.google.com**. Entre com a sua conta Google.

### 2.1 — Criar o projeto

1. Clique em **Adicionar projeto** (ou *Create a project*).
2. Nome: `caderneta`. Clique em Continuar.
3. Vai perguntar sobre o Google Analytics. **Desligue** — você não precisa disso.
4. Clique em **Criar projeto** e espere. Leva menos de um minuto.

### 2.2 — Ligar o login por e-mail e senha

No menu da esquerda, procure a seção **Criação** (ou *Build*).

1. Clique em **Authentication** → **Vamos começar**.
2. Aparece uma lista de formas de login. Clique em **E-mail/senha**.
3. Ligue a **primeira** chavinha (E-mail/senha). A segunda, "Link de e-mail",
   deixe desligada.
4. **Salvar**.

### 2.3 — Criar as contas de vocês dois

Ainda em Authentication, aba **Users** (Usuários):

1. **Adicionar usuário** → seu e-mail e uma senha → Adicionar.
2. **Adicionar usuário** de novo → e-mail e senha da mãe → Adicionar.

> **Sobre a senha dela:** crie uma senha provisória agora e combine que ela troca
> depois. Cada um com a sua senha, não compartilhem uma só. É isso que faz o app
> saber quem anotou cada coisa.

Agora vem a parte importante: na lista de usuários, tem uma coluna chamada
**Identificador do usuário (UID)**. São dois códigos compridos, tipo
`kJ2mQ8vXpR...`. **Copie os dois e cole num bloco de notas.** Você vai usar no
passo 2.6 e é chato voltar aqui depois.

### 2.4 — Trancar o cadastro público

Ainda em Authentication → aba **Settings** (Configurações) → **User actions**.

Desmarque a opção de permitir criação de contas (*Enable create*). Salve.

Por quê: sem isso, alguém que veja o código do seu app poderia criar uma conta no
seu projeto por fora. Não conseguiria ver os dados — as regras impedem — mas conta
que não deveria existir não deve existir.

### 2.5 — Criar o banco de dados

Menu da esquerda → **Firestore Database** → **Criar banco de dados**.

1. **Região:** escolha `southamerica-east1 (São Paulo)`.
   Preste atenção aqui: **a região não pode ser trocada depois.** Escolher São Paulo
   deixa o app mais rápido pra vocês.
2. **Modo:** escolha **modo de produção**.
   O modo de teste deixa o banco aberto pra qualquer pessoa por 30 dias. Não use.
3. Criar.

### 2.6 — Colocar a fechadura no cofre

Essa é a etapa mais importante do guia inteiro. Faça com calma.

1. Dentro do Firestore, clique na aba **Regras** (*Rules*), lá em cima.
2. Apague **tudo** o que estiver escrito lá.
3. Abra o arquivo `firestore.rules` no VS Code, copie o conteúdo inteiro e cole ali.
4. Procure as duas linhas com `COLE_AQUI_O_UID_DO_PAI` e `COLE_AQUI_O_UID_DA_MAE`.
   Substitua pelos dois códigos que você guardou no passo 2.3.
   **Mantenha as aspas.** Deve ficar assim:

   ```
   'kJ2mQ8vXpR4nL7wS...',
   'aB9cD3eF6gH1iJ5k...'
   ```

5. Clique em **Publicar**.

> **O que isso faz:** de agora em diante, o banco só responde para essas duas contas.
> Qualquer outra pessoa que tente ler ou escrever é recusada, mesmo tendo o código
> do app em mãos.

### 2.7 — Autorizar o endereço do seu site

Volte em **Authentication → Settings → Domínios autorizados**
(*Authorized domains*).

Clique em **Adicionar domínio** e digite exatamente:

```
lenonalves.github.io
```

Sem `https://`, sem barra no fim, só isso.

> Esse passo é traiçoeiro: se você esquecer, tudo funciona no seu computador e o
> login falha no celular, com uma mensagem que não explica nada. Já deixa feito.

---

# ETAPA 3 — Conectar o app ao cofre

### 3.1 — Pegar a configuração

1. No Firebase, clique na **engrenagem** ao lado de "Visão geral do projeto"
   (canto superior esquerdo) → **Configurações do projeto**.
2. Role até o fim, na seção **Seus apps**.
3. Clique no ícone **`</>`** (é o símbolo de "app da Web").
4. Apelido: `caderneta`. **Não marque** a opção de Firebase Hosting.
5. Clique em Registrar app.

Aparece um bloco de código. A parte que interessa é essa:

```js
const firebaseConfig = {
  apiKey: "AIzaSy....",
  authDomain: "caderneta-1234.firebaseapp.com",
  projectId: "caderneta-1234",
  storageBucket: "caderneta-1234.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Copie de `{` até `}`.

### 3.2 — Colar no app

1. No VS Code, abra o arquivo `store-firestore.js`.
2. Lá no começo tem um bloco assim, com tudo vazio:

   ```js
   const configuracao = {
     apiKey: "",
     ...
   };
   ```
3. Substitua o **conteúdo** pelo que você copiou. Cuidado: mantenha o nome
   `configuracao` no começo, não troque por `firebaseConfig`.

   Resultado final:
   ```js
   const configuracao = {
     apiKey: "AIzaSy....",
     authDomain: "caderneta-1234.firebaseapp.com",
     ...
   };
   ```
4. Salve (Ctrl+S).

### 3.3 — Testar

Volte no navegador e recarregue a página do Live Server.

> **O que você deve ver:** a tela de login, pedindo e-mail e senha.
> Entre com os seus. Se a carteirinha aparecer, está tudo ligado. 🎉
>
> **Se disser "A configuração do Firebase não foi preenchida":** o passo 3.2 não
> pegou. Confira se você salvou o arquivo.
>
> **Se disser "O Firestore recusou o acesso":** as regras do passo 2.6 não foram
> publicadas, ou os UID estão errados. Volte lá e confira.

Os dados de teste que você criou na Etapa 1 continuam guardados no navegador.
Em **Ajustes** aparece um bloco **Dados antigos** com um botão pra enviá-los
pra nuvem, se você quiser aproveitá-los.

---

# ETAPA 4 — Colocar no ar

### 4.1 — Criar o repositório

1. Entre em github.com com sua conta (`lenonalves`).
2. Botão **+** no canto superior direito → **New repository**.
3. Nome: `caderneta`.
4. Deixe marcado **Public**.

   > Precisa ser público mesmo. O GitHub Pages gratuito não publica repositório
   > privado. E tudo bem: o que vai pro GitHub é só o código, a "casca" vazia.
   > Nenhum dado da sua filha passa por lá — eles moram no Firebase.

5. **Create repository**.

### 4.2 — Subir os arquivos

O jeito mais simples, sem comando nenhum: na página que abrir, clique em
**uploading an existing file**.

Arraste os arquivos da sua pasta para a área indicada. Todos eles, soltos.
Depois desça a página e clique em **Commit changes**.

> **Cuidado:** arraste os *arquivos*, não a *pasta*. Se você arrastar a pasta, eles
> ficam dentro de uma subpasta e o site não funciona. Na lista do repositório você
> deve ver `index.html` direto, não `caderneta/index.html`.

### 4.3 — Ligar o GitHub Pages

1. No repositório, clique em **Settings** (aba de cima, à direita).
2. No menu da esquerda, clique em **Pages**.
3. Em *Source*, escolha **Deploy from a branch**.
4. Em *Branch*, escolha `main` e a pasta `/ (root)`.
5. **Save**.

Espere de 1 a 2 minutos e recarregue a página. Vai aparecer um aviso verde com o
endereço do seu site:

```
https://lenonalves.github.io/caderneta/
```

### 4.4 — Conferir

Abra esse endereço no computador e faça login.

> **Se aparecer a tela de login e você conseguir entrar:** está no ar. 🎉
>
> **Se der erro de domínio não autorizado:** o passo 2.7 ficou faltando.
> Volte lá e adicione `lenonalves.github.io`.

---

# ETAPA 5 — Instalar no celular

### No Android (pelo Chrome)

1. Abra `https://lenonalves.github.io/caderneta/` no Chrome.
2. Toque no menu **⋮** (três pontinhos, canto superior direito).
3. Toque em **Instalar aplicativo** (ou *Adicionar à tela inicial*).
4. Confirme.

### No iPhone (tem que ser pelo Safari)

1. Abra o endereço **no Safari**. Pelo Chrome não funciona no iPhone.
2. Toque no botão de **compartilhar** (quadradinho com seta pra cima, embaixo).
3. Role a lista e toque em **Adicionar à Tela de Início**.
4. Confirme.

### Nos dois celulares, depois de instalar

1. Abra o ícone que apareceu na tela. Ele abre em tela cheia, sem barra de navegador.
2. Faça login: você com a sua conta, ela com a dela.
3. Vá em **Ajustes → Este aparelho** e escreva quem usa aquele celular
   ("Papai" / "Mamãe"). É isso que faz cada anotação mostrar quem escreveu.

Pronto. A partir daqui, o que um escreve aparece no celular do outro em segundos.

---

# Como atualizar depois

Toda vez que você mexer no app e quiser publicar:

1. Abra o `sw.js` e mude a linha da versão:
   ```js
   const VERSAO = 'caderneta-v2';   →   const VERSAO = 'caderneta-v3';
   ```
2. Suba os arquivos alterados no GitHub (**Add file → Upload files**, arrastar,
   Commit changes).
3. Espere 1 a 2 minutos.
4. No celular, feche e abra o app.

> **Se esquecer o passo 1**, o celular continua mostrando a versão antiga e você vai
> jurar que o GitHub não publicou. É o erro que mais dá dor de cabeça em PWA, e
> acontece com todo mundo pelo menos uma vez.

---

# Segurança, explicada

Três ideias resolvem 90% disso:

**1. O código é público, e tudo bem.**
Qualquer pessoa consegue ler o código do seu app e ver as chaves do Firebase.
Isso é normal e esperado. Aquelas chaves são o *endereço* do seu cofre, não a chave
dele. Saber onde fica o banco não abre o banco.

**2. Quem tranca o cofre são as regras.**
O arquivo `firestore.rules` que você publicou no passo 2.6 é a fechadura de verdade.
Ele diz: "só essas duas contas entram". É por isso que aquele passo é o mais
importante do guia.

**3. A maior brecha é o celular desbloqueado.**
Depois do login, o app fica aberto. Quem pegar o celular destravado lê tudo.
Bloqueio de tela nos dois aparelhos protege mais que qualquer coisa do Firebase.

### Checklist — antes de digitar dados reais dela

- [ ] Regras publicadas no Firestore, com os dois UID certos (passo 2.6)
- [ ] Banco criado em modo produção, não em modo de teste (passo 2.5)
- [ ] Criação de contas desativada no Authentication (passo 2.4)
- [ ] Verificação em duas etapas ligada na sua conta Google
- [ ] Bloqueio de tela nos dois celulares
- [ ] Cada um com a própria senha, diferentes das que usam em outros sites

### Recomendado, mas pode fazer depois

- **Limitar a chave por endereço.** No Google Cloud Console → APIs e Serviços →
  Credenciais → clique na chave do navegador → em Restrições de aplicativo escolha
  **Sites** → adicione `lenonalves.github.io/*` e `127.0.0.1:5500/*`.
  Isso impede que a chave seja usada a partir de outro site qualquer.
- **Backup uma vez por mês.** Em Ajustes → *Baixar uma cópia*. O plano gratuito do
  Firebase não faz backup automático. Guarde o arquivo em algum lugar seu.

### Nunca faça isso

- **Não escreva dados reais dentro do código.** O repositório é público. Dados só
  entram pelo app.
- **Não migre pro plano Blaze do Firebase.** O plano gratuito (Spark) bloqueia
  quando atinge o limite; o Blaze cobra. Este app não precisa de nada que o Blaze
  oferece, e vocês dois vão usar uma fração mínima do que é grátis.
- **Não usem a mesma conta nos dois celulares.** Duas contas é o que faz o
  "quem anotou" e o "quem deu o remédio" ter sentido.

### Se um celular sumir

1. Firebase → Authentication → Users → clique na conta daquela pessoa →
   **Redefinir senha**. Trocar a senha derruba as sessões abertas.
2. Se quiser cortar na hora, **desative** a conta na mesma tela.
3. No celular novo, instale e faça login com a mesma conta. **Nenhum dado se perde** —
   tudo está na nuvem, não no aparelho.

---

# Tabela de socorro

| O que aconteceu | Provável causa | Onde consertar |
|---|---|---|
| Página totalmente branca | Abriu o arquivo clicando duas vezes | Use o Live Server (1.4) |
| "Algo travou" com erro de arquivo | Falta arquivo na pasta, ou nome errado | Confira a lista em 1.1 |
| Login diz que a configuração não foi preenchida | O `store-firestore.js` ficou vazio ou não foi salvo | Passo 3.2 |
| "O Firestore recusou o acesso" | Regras não publicadas ou UID errado | Passo 2.6 |
| Entra e volta pra tela de login | Domínio não autorizado | Passo 2.7 |
| Erro de e-mail ou senha, mas está certo | Login por e-mail não foi ativado | Passo 2.2 |
| Site do GitHub dá erro 404 | Arquivos ficaram dentro de subpasta | Passo 4.2 |
| Alterei, subi, e o celular não mudou | Esqueceu de trocar a `VERSAO` | Como atualizar |
| Um vê os dados e o outro não | UID de um dos dois falta nas regras | Passo 2.6 |
| Salva mas some ao recarregar | Um aparelho está no modo local, o outro na nuvem | Passo 3.2 |

---

# Depois que estiver rodando

Ideias já mapeadas para as próximas versões:

- Foto da receita e do pedido de exame
- Carteira de vacinas com o calendário nacional já pré-cadastrado
- Curva de crescimento (peso e altura por consulta)
- Aviso na hora do remédio
- Exportar o histórico de uma especialidade em PDF, pra levar impresso
