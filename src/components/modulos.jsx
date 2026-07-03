// Definição central de todos os módulos do sistema
export const TODOS_MODULOS = [
  {
    id: 'atendimentos',
    nome: 'Atendimentos',
    descricao: 'Abertura e gerenciamento de ordens de serviço',
    icone: '🔧',
    paginas: ['NovoAtendimento', 'Atendimentos', 'VerAtendimento', 'EditarAtendimento', 'EditarQueixa', 'ServicosReprovados'],
    essencial: true,
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    descricao: 'Cadastro e histórico de clientes e veículos',
    icone: '👥',
    paginas: ['Cadastros', 'Clientes'],
  },
  {
    id: 'checklist',
    nome: 'Checklist',
    descricao: 'Checklist de inspeção veicular',
    icone: '✅',
    paginas: ['GerenciarChecklist'],
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    descricao: 'Caixa, contas a pagar e receber, relatórios financeiros',
    icone: '💰',
    paginas: ['Financeiro'],
  },
  {
    id: 'estoque',
    nome: 'Estoque & Produtos',
    descricao: 'Cadastro de produtos, compras e controle de estoque',
    icone: '📦',
    paginas: ['Produtos', 'Compras'],
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    descricao: 'Agendamento de serviços',
    icone: '📅',
    paginas: ['Agenda'],
  },
  {
    id: 'remarketing',
    nome: 'Marketing Direto',
    descricao: 'Recuperação de vendas e campanhas de mensagem',
    icone: '📣',
    paginas: ['Remarketing'],
  },
  {
    id: 'encomendas',
    nome: 'Controle de Encomendas',
    descricao: 'Gestão de peças encomendadas e status de entrega',
    icone: '📦',
    paginas: ['ControleEncomendas'],
  },
  {
    id: 'ferramentas',
    nome: 'Controle de Ferramentas',
    descricao: 'Gestão de ferramentas, kits e insumos',
    icone: '🧰',
    paginas: ['ControleFerramentas'],
  },
  {
    id: 'rotina',
    nome: 'Rotina Diária',
    descricao: 'Tarefas rotineiras e checklists diários',
    icone: '🔁',
    paginas: ['RotinaDiaria'],
  },
  {
    id: 'relatorios',
    nome: 'Relatórios & Dashboard',
    descricao: 'Relatórios gerenciais e dashboard de métricas',
    icone: '📊',
    paginas: ['Relatorios', 'Dashboard'],
  },
  {
    id: 'ia',
    nome: 'Assistente IA',
    descricao: 'Assistente inteligente integrado ao sistema',
    icone: '✨',
    paginas: ['AssistenteIA'],
  },
];

export const MODULOS_DEFAULT = TODOS_MODULOS.map(m => m.id);

export function moduloAtivo(modulosAtivos, moduloId) {
  const modulo = TODOS_MODULOS.find(m => m.id === moduloId);
  if (modulo?.essencial) return true;
  if (!modulosAtivos || modulosAtivos.length === 0) return true;
  return modulosAtivos.includes(moduloId);
}

export function paginaPermitida(modulosAtivos, pageName) {
  const modulo = TODOS_MODULOS.find(m => m.paginas?.includes(pageName));
  if (!modulo) return true;
  return moduloAtivo(modulosAtivos, modulo.id);
}