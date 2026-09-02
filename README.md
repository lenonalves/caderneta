# Caderneta

Saúde da nossa filha em um lugar só: consultas por especialidade, remédios com horários,
agenda de compromissos e uma carteirinha com alergias e tipo sanguíneo.
Os dois celulares veem a mesma coisa, ao vivo. Funciona offline e instala como app.

## Arquivos

| arquivo | o que é |
|---|---|
| `index.html` | o app inteiro (telas, estilo, comportamento) |
| `store-firestore.js` | a única parte que conversa com o banco |
| `firestore.rules` | quem pode ler e escrever — **cole no console do Firebase** |
| `sw.js` | faz funcionar offline |
| `manifest.json`, `icon-*.png` | o que transforma o site em app instalável |

## 1. Criar o Firebase (uma vez só)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Adicionar projeto**.
   Pode recusar o Google Analytics.
2. **Build → Authentication → Começar → E-mail/senha → Ativar.**
   Em **Users → Adicionar usuário**, crie duas contas: a sua e a da mãe.
   Copie os dois **UID** que aparecem na lista.
3. **Build → Firestore Database → Criar banco.** Escolha a região `southamerica-east1`
   (São Paulo). Comece em **modo de produção** — o banco nasce trancado, que é o certo.
4. **Firestore → Regras**: apague tudo, cole o conteúdo de `firestore.rules`,
   troque os dois UID pelos de vocês e clique em **Publicar**.
5. **Configurações do projeto → Seus apps → Web (`</>`)**. Copie o objeto
   `firebaseConfig` e cole em `store-firestore.js`, no lugar de `configuracao`.
6. **Authentication → Settings → Authorized domains**: adicione `lenonalves.github.io`.
   Sem isso o login é recusado no site publicado.

## 2. Publicar no GitHub Pages

Suba todos os arquivos na raiz do repositório →
Settings → Pages → branch `main`, pasta `/ (root)`.
Em 1–2 minutos: `https://lenonalves.github.io/caderneta/`

No celular: abrir o endereço → menu do navegador → **Adicionar à tela de início**.
Nos dois celulares.

Ao publicar uma versão nova, mude `VERSAO` no `sw.js` (`caderneta-v3`, `v4`…),
senão o celular continua abrindo a versão antiga do cache.

## 3. Trazer os dados antigos

Se você já usou a versão anterior neste celular, aparece um bloco em **Ajustes →
Dados antigos** com o botão de subir tudo pra nuvem. Ele some depois de rodar.

## Como funciona por dentro

```
familias/nossa-filha          → perfil
  └ consultas/{id}
  └ remedios/{id}
  └ eventos/{id}
  └ doses/{id}
```

Cada registro é um documento separado. Isso importa: se vocês dois salvarem
ao mesmo tempo, cada um grava no próprio documento e nada é sobrescrito.

`Store.ouvir()` é o coração — ele não busca os dados uma vez, ele fica escutando.
Qualquer mudança, de qualquer um dos dois, cai na função e redesenha a tela.

Offline, o Firestore grava no cache do próprio celular e sobe sozinho quando volta
o sinal. Por isso as funções de salvar não usam `await`: esperar a confirmação do
servidor travaria a tela dentro do consultório sem sinal.

## Custo

Plano Spark (gratuito): 1 GiB, 50 mil leituras e 20 mil escritas por dia,
sem cartão de crédito. Vocês dois devem fazer umas 30 escritas por mês.
**Não migre pro plano Blaze** — é lá que existe risco de conta inesperada,
e este app não precisa de nada que o Blaze ofereça.

## Ideias pra próxima versão

- Foto da receita e do pedido de exame (comprimida em base64 dentro do registro)
- Carteira de vacinas com o calendário nacional pré-cadastrado
- Curva de crescimento (peso e altura por consulta)
- Notificação na hora do remédio
- Exportar o histórico de uma especialidade em PDF pra levar impresso
