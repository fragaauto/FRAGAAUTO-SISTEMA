// Monta links de páginas públicas (cliente) sempre apontando para a versão publicada,
// nunca para o editor/preview do Base44 (que exige login).

const ORIGEM_PUBLICADA = 'https://fragaautoportas.base44.app';

export function getPublicOrigin() {
  try {
    const { hostname, origin } = window.location;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return ORIGEM_PUBLICADA;
    }
    if (hostname === 'app.base44.app') {
      return ORIGEM_PUBLICADA;
    }
    // Preview de editor/branch: preview--slug.base44.app
    const branch = hostname.match(/^[a-z0-9-]+--([a-z0-9-]+)\.base44\.app$/i);
    if (branch) {
      return `https://${branch[1]}.base44.app`;
    }
    return origin;
  } catch {
    return ORIGEM_PUBLICADA;
  }
}

export function getPublicUrl(path) {
  return `${getPublicOrigin()}${path}`;
}