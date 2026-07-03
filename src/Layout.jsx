import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Home, 
  ClipboardCheck, 
  FileText, 
  Package, 
  Users,
  Menu,
  X,
  Wrench,
  TrendingUp,
  Sparkles,
  Calendar,
  Shield,
  Loader2,
  LogOut,
  ShoppingBag
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TODOS_MODULOS } from '@/components/modulos';
import { filtrarItensMenu } from '@/lib/menuPermissions';
import AguardandoAprovacao from '@/components/AguardandoAprovacao';
import AcessoForaHorario from '@/components/AcessoForaHorario';
import SeletorUnidade from '@/components/SeletorUnidade';

// Todos os itens de navegação com módulo associado
const NAV_ITEMS = [
  { name: 'Home', icon: Home, path: 'Home', modulo: null },
  { name: 'Novo Atendimento', icon: ClipboardCheck, path: 'NovoAtendimento', modulo: 'atendimentos' },
  { name: 'Atendimentos', icon: FileText, path: 'Atendimentos', modulo: 'atendimentos' },
  { name: 'Controle de Encomendas', icon: Package, path: 'ControleEncomendas', modulo: 'encomendas' },
  { name: 'Marketing Direto', icon: TrendingUp, path: 'Remarketing', modulo: 'remarketing' },
  { name: 'Relatórios', icon: FileText, path: 'Relatorios', modulo: 'relatorios' },
  { name: 'Produtos', icon: Package, path: 'Produtos', modulo: 'estoque' },
  { name: 'Cadastros', icon: Users, path: 'Cadastros', modulo: 'clientes' },
  { name: 'Checklist', icon: ClipboardCheck, path: 'GerenciarChecklist', modulo: 'checklist' },
  { name: 'Agenda', icon: Calendar, path: 'Agenda', modulo: 'agenda' },
  { name: 'Rotina Diária', icon: ClipboardCheck, path: 'RotinaDiaria', modulo: 'rotina' },
  { name: 'Financeiro', icon: TrendingUp, path: 'Financeiro', modulo: 'financeiro' },
  { name: 'Compras', icon: Package, path: 'Compras', modulo: 'estoque' },
  { name: 'Configurações', icon: Wrench, path: 'Configuracoes', modulo: null },
  { name: 'Usuários', icon: Users, path: 'Usuarios', modulo: null },
  { name: 'Gerenciar Plano', icon: Shield, path: 'GerenciarPlano', modulo: null, apenasAdmin: true },
  { name: 'Base de Conhecimento IA', icon: Sparkles, path: 'BaseConhecimentoIA', modulo: null, apenasAdmin: true },
  { name: 'Treinamentos', icon: FileText, path: 'ManualTreinamento', modulo: null },
  { name: 'Controle de Ferramentas', icon: Wrench, path: 'ControleFerramentas', modulo: 'ferramentas' },
];



// Páginas acessíveis sem autenticação
const PAGINAS_PUBLICAS = ['AprovarOrcamento'];

export default function Layout({ children, currentPageName }) {
  const [open, setOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    base44.auth.me()
      .then(async (authUser) => {
        if (!mounted) return;
        // Busca o registro completo para garantir campos customizados (funcao_id, modulos_liberados, aprovado)
        try {
          const full = await base44.entities.User.filter({ id: authUser.id });
          const merged = (full && full.length) ? { ...authUser, ...full[0] } : authUser;
          if (mounted) setUser(merged);
        } catch {
          if (mounted) setUser(authUser);
        }
      })
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setAuthLoading(false));
    return () => { mounted = false; };
  }, []);

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });
  const modulosAtivos = configs[0]?.modulos_ativos ?? null;

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.FuncaoFuncionario.list(),
    enabled: !!user && user.role !== 'admin',
  });

  const isPaginaPublica = PAGINAS_PUBLICAS.includes(currentPageName);

  // Mostrar loading enquanto verifica auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Se não autenticado, redirecionar para login
  if (!user && !isPaginaPublica) {
    base44.auth.redirectToLogin(window.location.href);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Mostrar tela de aguardando aprovação se usuário não for admin e não estiver aprovado
  if (user && user.role !== 'admin' && !user.aprovado && !isPaginaPublica) {
    return <AguardandoAprovacao user={user} />;
  }

  // Restrição de horário de acesso (não se aplica a admins)
  const configAcesso = configs[0];
  if (user && user.role !== 'admin' && !isPaginaPublica && configAcesso?.restringir_horario_acesso) {
    const agora = new Date();
    const dia = agora.getDay();
    const diasPermitidos = configAcesso.dias_acesso_permitidos;
    const diaBloqueado = Array.isArray(diasPermitidos) && diasPermitidos.length > 0 && !diasPermitidos.includes(dia);
    let horarioBloqueado = false;
    const inicio = configAcesso.horario_acesso_inicio;
    const fim = configAcesso.horario_acesso_fim;
    if (inicio && fim) {
      const minAgora = agora.getHours() * 60 + agora.getMinutes();
      const [hi, mi] = inicio.split(':').map(Number);
      const [hf, mf] = fim.split(':').map(Number);
      const minInicio = hi * 60 + mi;
      const minFim = hf * 60 + mf;
      horarioBloqueado = minAgora < minInicio || minAgora > minFim;
    }
    if (diaBloqueado || horarioBloqueado) {
      return <AcessoForaHorario inicio={inicio} fim={fim} dias={diasPermitidos} diaBloqueado={diaBloqueado} />;
    }
  }

  // Filtra itens do menu conforme módulos ativos, permissões do usuário e role
  const itensFiltrados = filtrarItensMenu(NAV_ITEMS, { user, funcoes, modulosAtivos });

  const NavLinks = ({ onNavigate }) => (
    <div className="space-y-1">
      {itensFiltrados.map((item) => {
        const isActive = currentPageName === item.path;
        return (
          <Link
            key={item.path}
            to={createPageUrl(item.path)}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              isActive 
                ? "bg-orange-500 text-white font-semibold" 
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        );
      })}
      <button
        onClick={() => {
          base44.auth.logout();
          if (onNavigate) onNavigate();
        }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-600 hover:bg-red-50 hover:text-red-600 w-full"
      >
        <LogOut className="w-5 h-5" />
        Sair
      </button>
    </div>
  );

  // Don't show nav on certain pages
  const hideNav = ['Home', 'AprovarOrcamento'].includes(currentPageName);

  if (hideNav || isPaginaPublica) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <Link to={createPageUrl('Home')} className="flex items-center gap-2">
          <img src="/logo.png" alt="Fraga Auto" className="w-8 h-8 rounded-lg object-cover" onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }} />
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center" style={{display: 'none'}}>
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800">Fraga Auto</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <SeletorUnidade />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0" style={{display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100dvh'}}>
              <div className="p-4 border-b border-slate-200" style={{flexShrink: 0}}>
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Fraga Auto" className="w-10 h-10 rounded-xl object-cover" onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }} />
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center" style={{display: 'none'}}>
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Fraga Auto Portas</p>
                    <p className="text-xs text-slate-500">Sistema de Gestão</p>
                  </div>
                </div>
              </div>
              <div className="p-4" style={{flex: 1, overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col bg-white border-r border-slate-200 h-screen">
          <div className="p-4 border-b border-slate-200 flex-shrink-0">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3 mb-3">
              <img src="/logo.png" alt="Fraga Auto" className="w-10 h-10 rounded-xl object-cover" onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }} />
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center" style={{display: 'none'}}>
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Fraga Auto</p>
                <p className="text-xs text-slate-500">Sistema de Gestão</p>
              </div>
            </Link>
            <SeletorUnidade />
          </div>
          <div className="flex-1 p-4 overflow-y-auto" style={{overflowY: 'auto', scrollbarWidth: 'thin'}}>
            <NavLinks />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="pt-16 lg:pt-0">
          {children}
        </main>
      </div>


    </div>
  );
}