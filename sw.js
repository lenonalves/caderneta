// Troque a versão sempre que atualizar o app, pro celular pegar a versão nova.
const VERSAO = 'caderneta-v13';
const ARQUIVOS = [
  './', './index.html', './store-firestore.js',
  './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable.png', './logo.png', './logo-branco.png'
];

// Só guardamos em cache o que é nosso e as bibliotecas.
// O Firestore precisa passar direto: ele tem o próprio cache offline,
// e interceptar as chamadas dele quebra a sincronização.
const podeGuardar = url =>
  url.origin === self.location.origin ||
  url.host === 'www.gstatic.com' ||
  url.host === 'fonts.googleapis.com' ||
  url.host === 'fonts.gstatic.com';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!podeGuardar(url)) return;

  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copia = r.clone();
        caches.open(VERSAO).then(c => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

/* =========================================================
   PUSH
   O worker do Cloudflare manda só dados (sem "notification"),
   então quem monta o aviso é este arquivo. Assim o texto, o
   ícone e o clique ficam sob nosso controle.
   ========================================================= */
self.addEventListener('push', e => {
  let d = {};
  try { d = (e.data && e.data.json().data) || {}; } catch (_) {}
  const titulo = d.titulo || 'Caderneta da Bia';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.corpo || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || 'bia',
    renotify: true,
    data: { url: './index.html' }
  }));
});

// Tocar no aviso traz a janela já aberta, em vez de abrir outra.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const c of lista) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./index.html');
    })
  );
});
