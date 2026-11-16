// Monta links de páginas públicas (cliente) sempre apontando para a versão publicada,
// nunca para o editor/preview do Base44 (que exige login).

const ORIGEM_PUBLICADA = 'https://fragaautoportas.base44.app';
const HOST_PUBLICADO = 'fragaautoportas.base44.app';

export function getPublicOrigin() {
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return ORIGEM_PUBLICADA;
  }
  const { hostname, origin } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return ORIGEM_PUBLICADA;
  }
  // Qualquer host *.base44.app que não seja o publicado exige login:
  // app.base44.app, preview--branch.base44.app, links de teste e o endereço
  // interno do app (xxxxxxxxxxxxxxxxxxxxxxxx.base44.app).
  if (hostname.endsWith('base44.app') && hostname !== HOST_PUBLICADO) {
    return ORIGEM_PUBLICADA;
  }
  return origin;
}

export function getPublicUrl(path) {
  return `${getPublicOrigin()}${path}`;
}