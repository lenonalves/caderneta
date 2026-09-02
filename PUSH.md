# Ligando o push (notificação com o app fechado)

Tempo: uns 40 minutos. Custo: zero, sem cartão em lugar nenhum.

---

## Por que precisa de um "carteiro"

Notificação push não sai do nada: alguém precisa **mandar** ela na hora certa.
Esse alguém precisa de uma credencial de servidor, que não pode ficar no código do
app — se ficasse, qualquer um que abrisse seu site poderia mandar notificação pro
celular de vocês.

O Firebase tem um serviço pra isso (Cloud Functions), mas ele exige cartão de crédito.
Então vamos usar o **Cloudflare Workers** como carteiro: gratuito, sem cartão, e
dispara no minuto certo.

O desenho fica assim:

```
Cloudflare (a cada 5 min)
    ↓ pergunta
Firestore  ("tem remédio na hora? alguém anotou algo?")
    ↓ se tiver
Firebase Cloud Messaging
    ↓
celular de vocês  🔔
```

---

# PARTE 1 — Preparar o Firebase

## 1.1 Gerar a chave do navegador (VAPID)

1. Firebase Console → engrenagem → **Configurações do projeto**
2. Aba **Cloud Messaging**
3. Seção **Certificados push da Web** → **Gerar par de chaves**
4. Copie a chave que aparecer (começa com `B` e é bem comprida)

Cole no `store-firestore.js`, na linha do `VAPID`:

```js
const VAPID = "BAbc123...";
```

## 1.2 Criar a credencial do carteiro

Essa é a chave que o Cloudflare vai usar. Ela é **poderosa** — trate como senha
de banco.

1. Firebase Console → **Configurações do projeto** → aba **Contas de serviço**
2. Botão **Gerar nova chave privada** → **Gerar chave**
3. Baixa um arquivo `.json`. **Abra no bloco de notas e deixe aberto**, você vai
   colar o conteúdo inteiro daqui a pouco.

> **Nunca** coloque esse arquivo na pasta do projeto nem suba no GitHub.
> Se ele escapar, quem tiver acesso lê e escreve tudo no seu banco.
> Se isso acontecer, volte nessa tela e clique em revogar a chave.

## 1.3 Publicar as regras novas

O `firestore.rules` ganhou a coleção `dispositivos`. Firestore → Regras → cole a
versão nova → **Publicar**.

---

# PARTE 2 — Criar o carteiro no Cloudflare

## 2.1 Criar a conta

Em **dash.cloudflare.com**, crie uma conta gratuita. Não pede cartão.

## 2.2 Criar o Worker

1. No menu da esquerda: **Compute (Workers)** → **Workers e Pages**
2. **Criar** → aba **Worker** → **Começar com Hello World**
3. Nome: `carteiro-bia`
4. **Implantar** (deploy). Ele cria um worker vazio, tudo bem.

## 2.3 Colar o código

1. Na página do worker, clique em **Editar código**
2. Apague tudo o que estiver lá
3. Cole o conteúdo do `worker.js`
4. **Nas duas primeiras linhas de configuração**, confira:
   ```js
   const PROJETO = 'app-bia-banco-de-dados';
   const FAMILIA = 'nossa-filha';
   ```
   O `FAMILIA` tem que ser **exatamente igual** ao do `store-firestore.js`.
5. **Implantar**

## 2.4 Guardar a credencial em segredo

1. Volte pra página do worker → aba **Configurações** → **Variáveis e segredos**
2. **Adicionar** → tipo **Secret** (segredo, não texto simples)
3. Nome: `CONTA_DE_SERVICO`
4. Valor: cole o **conteúdo inteiro** daquele arquivo `.json` do passo 1.2,
   das chaves `{` até `}`
5. Salvar

Adicione um segundo, pra você poder testar na mão:

- Nome: `SENHA_TESTE`
- Valor: qualquer palavra que só você saiba, por exemplo `bia2026`

> Segredo no Cloudflare fica criptografado e não aparece mais na tela depois de
> salvo. Nem você consegue ler de volta — só substituir.

## 2.5 Marcar o horário

1. Aba **Configurações** → **Gatilhos** (Triggers) → **Cron Triggers**
2. **Adicionar Cron Trigger**
3. Escreva: `*/5 * * * *`  (a cada 5 minutos)
4. Salvar

> O horário do Cloudflare é UTC, mas o código já converte pra Brasília sozinho.
> Ele também não faz nada entre 23h e 6h — ninguém quer ser acordado às 3 da manhã.

---

# PARTE 3 — Ligar no celular

1. Suba os arquivos novos no GitHub (`index.html`, `sw.js`, `store-firestore.js`)
2. Lembre de trocar a `VERSAO` no `sw.js`
3. No celular, **abra o app instalado** (não o navegador)
4. **Ajustes → Avisos → Ligar avisos neste aparelho** → permitir
5. Confira: logo abaixo deve aparecer *"Recebendo push em: Papai"*

Faça isso nos dois celulares.

> **No iPhone isso só funciona com o app instalado na tela de início.**
> Aberto pelo Safari normal, não recebe push nenhum. É restrição da Apple.

---

# PARTE 4 — Testar

## Teste rápido, sem esperar

Abra no navegador:

```
https://carteiro-bia.SEU-USUARIO.workers.dev/?teste=bia2026
```

(o endereço exato está na página do worker, e `bia2026` é a `SENHA_TESTE`)

Deve responder algo como `ok · 0 aviso(s)` — significa que ele conseguiu falar com
o Firebase e não achou nada pra mandar agora. Se disser `nenhum aparelho cadastrado`,
volte na Parte 3.

## Teste de verdade

O mais fácil: peça pra mãe anotar qualquer coisa no celular dela, e espere até
5 minutos. Deve chegar no seu.

Ou cadastre um remédio com um horário daqui a uns 10 minutos e não marque a dose.

---

# Quando der errado

| O que aparece | Causa | Onde resolver |
|---|---|---|
| `Credencial recusada` | O JSON foi colado errado ou cortado | Refaça o passo 2.4, cole de `{` a `}` |
| `nenhum aparelho cadastrado` | Ninguém ligou os avisos ainda | Parte 3 |
| Worker responde a mensagem padrão | Senha de teste errada na URL | Confira a `SENHA_TESTE` |
| Chega no seu, não chega no dela | O app dela não está instalado, ou ela não permitiu | Parte 3 no celular dela |
| Nada chega no iPhone | Aberto pelo Safari em vez do app instalado | Adicionar à Tela de Início |
| Chega em duplicado | Dois cadastros do mesmo aparelho | Apague o antigo em `dispositivos`, no Firestore |
| Avisos pararam depois de semanas | O endereço de push expirou | Abrir o app renova sozinho |

Pra ver o que o carteiro está fazendo: página do worker → aba **Logs** →
**Iniciar transmissão**. Os erros aparecem ali em tempo real.

---

# Quanto isso consome

- **Cloudflare:** ~200 execuções por dia. O plano gratuito dá 100 mil.
- **Firestore:** ~15 leituras por execução, ~3 mil por dia. O gratuito dá 50 mil.
- **Cloud Messaging:** gratuito sem limite.

Sobra muito espaço. Se um dia apertar, é só mudar o cron pra `*/10`.

---

# Segurança

- A credencial do passo 1.2 **nunca** entra na pasta do projeto nem no GitHub.
  Ela existe só dentro dos segredos do Cloudflare.
- Se você desconfiar que ela vazou: Firebase → Contas de serviço → revogue a
  chave e gere outra. O app continua funcionando; só o carteiro para até você
  atualizar o segredo.
- O worker não tem página pública: sem a `SENHA_TESTE` na URL, ele só responde
  uma frase e não faz nada.
- Ele lê e escreve no banco por fora das regras do Firestore, porque é servidor.
  Por isso ele só faz o que está escrito no `worker.js` — vale a pena ler o
  arquivo antes de implantar. É curto e está todo comentado em português.
