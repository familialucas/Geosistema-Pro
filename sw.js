const CACHE_NAME = 'geosistema-v5';
const CACHE_STATIC = [
  './',
  './home.html',
  './index.html',
  './Dashboard_obra.html',
  './Dashboard_Financeiro.html',
  './Diario_de_Obra_v2.html',
  './Dashboard_Manutencao.html',
  './Diario_Manutencao.html',
  './visualizador.html',
  './manifest.json',
  './js/armazenamento.js',
  './js/main.js',
  './js/mapa.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

// Instala e cacheia todos os arquivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_STATIC))
      .then(() => self.skipWaiting())
  );
});

// Remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Estratégia: Cache First para estáticos, Network First para dinâmicos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requests externos (leaflet CDN, fonts, etc.)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache First para arquivos do app
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cacheia respostas bem-sucedidas
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback offline: retorna index.html para navegação
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
