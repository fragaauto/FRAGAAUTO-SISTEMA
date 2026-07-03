import { TODOS_MODULOS } from '@/components/modulos';

/**
 * Filtra itens de menu/acesso conforme role, módulos ativos do sistema e
 * permissões do usuário/função. Acesso restrito por padrão (nega se não houver
 * permissão explícita), exceto módulos essenciais e a Home.
 *
 * Cada item deve conter: { path (string), modulo (string|null) } e opcionalmente
 * { apenasAdmin (bool) }.
 */
export function filtrarItensMenu(items, { user, funcoes, modulosAtivos }) {
  if (!items) return [];
  return items.filter(item => {
    // Admin tem acesso total
    if (user?.role === 'admin') {
      if (item.apenasAdmin) return true;
      if (!item.modulo) return true;
      const modulo = TODOS_MODULOS.find(m => m.id === item.modulo);
      if (modulo?.essencial) return true;
      if (!modulosAtivos || modulosAtivos.length === 0) return true;
      return modulosAtivos.includes(item.modulo);
    }

    // Apenas admin pode acessar
    if (item.apenasAdmin) return false;

    // Home sempre visível
    if (item.path === 'Home') return true;

    // Obter função do usuário
    const funcao = user?.funcao_id ? funcoes.find(f => f.id === user.funcao_id) : null;

    // Páginas controladas por flags específicas da função (acesso restrito por padrão)
    if (item.path === 'ManualTreinamento') return funcao?.pode_acessar_manual !== false;
    if (item.path === 'Configuracoes') return funcao?.pode_acessar_configuracoes === true;
    if (item.path === 'Usuarios') return funcao?.pode_acessar_usuarios === true;

    // Itens sem módulo definido (exceto Home, já tratado) ficam ocultos
    if (!item.modulo) return false;

    const modulo = TODOS_MODULOS.find(m => m.id === item.modulo);
    // Módulo essencial (atendimentos) sempre visível
    if (modulo?.essencial) return true;
    // Se o sistema desativou este módulo, esconde
    if (modulosAtivos && modulosAtivos.length > 0 && !modulosAtivos.includes(item.modulo)) return false;

    // Permissão: usuário sobrescreve a função
    let modulosPermitidos = user?.modulos_liberados || [];
    if (modulosPermitidos.length === 0 && funcao) {
      modulosPermitidos = funcao.modulos_liberados || [];
    }
    // Sem permissão configurada → esconde (exceto essencial, já tratado acima)
    if (modulosPermitidos.length === 0) return false;
    return modulosPermitidos.includes(item.modulo);
  });
}