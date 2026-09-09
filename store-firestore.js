/* =========================================================
   store-firestore.js — a única parte que fala com o banco
   =========================================================
   Enquanto a configuração abaixo não estiver preenchida, o app
   roda em MODO LOCAL: guarda tudo neste aparelho, sem login e
   sem nuvem. Serve pra mexer no visual sem depender de nada.
   ========================================================= */

// Firebase Console → Configurações do projeto → Seus apps → Web
const configuracao = {
  apiKey: "AIzaSyAYV9-vQdfV5LqeDjK6kU3q8GLoc7qJUcA",
  authDomain: "app-bia-banco-de-dados.firebaseapp.com",
  projectId: "app-bia-banco-de-dados",
  storageBucket: "app-bia-banco-de-dados.firebasestorage.app",
  messagingSenderId: "521718486777",
  appId: "1:521718486777:web:092083bbf4c2f6942cf428"
};

// Firebase Console → Configurações → Cloud Messaging → Certificados push da Web
// Deixe vazio enquanto não tiver configurado o push.
const VAPID = "BHHHDLU4p6VYhChnt4WgCX3ssX7gQp6Ln8AvFIqhuTUODpuZ_e4acNgPaZz-qFSr2vHHpPVocofAEKOsujBcCBw";

// Nome da "pasta" da sua família no banco. Pode ser qualquer texto.
const FAMILIA = 'nossa-filha';

const CONFIGURADO = !!configuracao.apiKey && !!configuracao.projectId;
const LISTAS = ['consultas', 'remedios', 'eventos', 'membros', 'dispositivos', 'recados', 'vacinas'];
const vazio = () => ({ perfil: {}, consultas: [], remedios: [], eventos: [], membros: [], dispositivos: [], doses: {}, recados: [], anexos: [], vacinas: [] });
const agora = () => new Date().toISOString();

/* =========================================================
   MODO LOCAL — mesma interface, sem nuvem
   ========================================================= */
function criarLocal() {
  const CHAVE = 'caderneta:local';
  const EU = 'eu-local';
  const ler = () => { try { return { ...vazio(), ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch { return vazio(); } };
  let avisar = () => {};
  const grava = (db, parte) => { localStorage.setItem(CHAVE, JSON.stringify(db)); avisar(ler(), parte); return Promise.resolve(); };

  return {
    modo: 'local',
    uid: () => EU,
    ligarPush: () => Promise.resolve(null),
    entrar: () => Promise.resolve(),
    sair: () => Promise.resolve(),
    aoTrocarUsuario(cb) { setTimeout(() => cb({ uid: EU, email: 'modo local' }), 0); },
    ouvir(cb) {
      avisar = cb;
      const db = ler();
      LISTAS.forEach(l => cb(db, l));
      cb(db, 'doses');
      cb(db, 'perfil');
    },
    gravarPerfil(perfil) { const db = ler(); db.perfil = { ...perfil, updatedAt: agora() }; return grava(db, 'perfil'); },
    gravarItem(lista, item) {
      const db = ler();
      const i = db[lista].findIndex(x => x.id === item.id);
      const pronto = { ...item, updatedAt: agora() };
      if (i >= 0) db[lista][i] = pronto; else db[lista].push(pronto);
      return grava(db, lista);
    },
    apagarItem(lista, id) { const db = ler(); db[lista] = db[lista].filter(x => x.id !== id); return grava(db, lista); },
    gravarDose(chave, valor) { const db = ler(); db.doses[chave] = { chave, ...valor }; return grava(db, 'doses'); },
    apagarDose(chave) { const db = ler(); delete db.doses[chave]; return grava(db, 'doses'); },

    /* Anexos ficam fora do `ouvir()` de propósito — são lidos só quando
       o item dono é aberto, nunca despejados todos de uma vez. */
    listarAnexos(dono) { return Promise.resolve(ler().anexos.filter(a => a.dono === dono)); },
    salvarAnexo(anexo) { const db = ler(); db.anexos.push(anexo); return grava(db, 'anexos'); },
    apagarAnexo(id) { const db = ler(); db.anexos = db.anexos.filter(a => a.id !== id); return grava(db, 'anexos'); },
    apagarAnexosDe(dono) { const db = ler(); db.anexos = db.anexos.filter(a => a.dono !== dono); return grava(db, 'anexos'); }
  };
}

/* =========================================================
   MODO NUVEM — Firestore
   ========================================================= */
async function criarNuvem() {
  // Importado aqui dentro, e não no topo do arquivo: se o SDK não
  // carregar (sem internet, versão errada), o app não morre em branco.
  const BASE = 'https://www.gstatic.com/firebasejs/11.0.0';
  const { initializeApp } = await import(`${BASE}/firebase-app.js`);
  const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import(`${BASE}/firebase-auth.js`);
  const {
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
    doc, collection, onSnapshot, setDoc, deleteDoc, getDocs, query, where
  } = await import(`${BASE}/firebase-firestore.js`);

  const app = initializeApp(configuracao);
  const auth = getAuth(app);

  // Cache offline: o app abre e salva sem sinal, e sobe sozinho depois.
  const bd = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });

  const raiz = doc(bd, 'familias', FAMILIA);
  const subcol = nome => collection(raiz, nome);
  const chaveOk = k => k.replace(/[\/\|:]/g, '_');   // id de documento não aceita "/"

  /* Sob demanda: uma leitura só, não um listener. Abrir um recado ou
     consulta não pode custar o mesmo que abrir o mural inteiro. */
  const buscarAnexos = async dono => {
    const s = await getDocs(query(subcol('anexos'), where('dono', '==', dono)));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  return {
    modo: 'nuvem',
    uid: () => auth.currentUser?.uid || '',

    /* Pede o "endereço" deste aparelho ao Firebase, pra o carteiro
       saber pra onde mandar. Devolve null se o push não foi configurado. */
    async ligarPush(){
      if(!VAPID) return null;
      const { getMessaging, getToken, isSupported } = await import(`${BASE}/firebase-messaging.js`);
      if(!(await isSupported())) return null;
      const registro = await navigator.serviceWorker.ready;
      return await getToken(getMessaging(app), { vapidKey: VAPID, serviceWorkerRegistration: registro });
    },
    entrar: (email, senha) => signInWithEmailAndPassword(auth, email, senha),
    sair: () => signOut(auth),
    aoTrocarUsuario(cb) { onAuthStateChanged(auth, cb); },

    /* Não devolve os dados: chama `cb(db, parte)` na primeira carga e
       de novo a cada alteração — sua ou do outro celular. */
    ouvir(cb) {
      const db = vazio();
      const erro = e => window.mostrarErro?.(
        e.code === 'permission-denied'
          ? 'O Firestore recusou o acesso. Publique as regras do arquivo firestore.rules com os UID de vocês dois.'
          : e.message);

      onSnapshot(raiz, s => { db.perfil = s.data()?.perfil || {}; cb(db, 'perfil'); }, erro);
      LISTAS.forEach(lista =>
        onSnapshot(subcol(lista), s => {
          db[lista] = s.docs.map(d => ({ id: d.id, ...d.data() }));
          cb(db, lista);
        }, erro));
      onSnapshot(subcol('doses'), s => {
        db.doses = {};
        s.docs.forEach(d => { db.doses[d.data().chave] = d.data(); });
        cb(db, 'doses');
      }, erro);
    },

    /* Cada gravação toca só o próprio documento — por isso dois
       celulares editando coisas diferentes nunca se atropelam. */
    gravarPerfil(perfil) { return setDoc(raiz, { perfil: { ...perfil, updatedAt: agora() } }, { merge: true }); },
    gravarItem(lista, item) {
      const { id, ...resto } = item;
      return setDoc(doc(subcol(lista), id), { ...resto, updatedAt: agora() });
    },
    apagarItem(lista, id) { return deleteDoc(doc(subcol(lista), id)); },
    gravarDose(chave, valor) { return setDoc(doc(subcol('doses'), chaveOk(chave)), { chave, ...valor }); },
    apagarDose(chave) { return deleteDoc(doc(subcol('doses'), chaveOk(chave))); },

    listarAnexos: buscarAnexos,
    salvarAnexo(anexo) { const { id, ...resto } = anexo; return setDoc(doc(subcol('anexos'), id), resto); },
    apagarAnexo(id) { return deleteDoc(doc(subcol('anexos'), id)); },
    async apagarAnexosDe(dono) {
      const lista = await buscarAnexos(dono);
      await Promise.all(lista.map(a => deleteDoc(doc(subcol('anexos'), a.id))));
    }
  };
}

export const Store = CONFIGURADO ? await criarNuvem() : criarLocal();
