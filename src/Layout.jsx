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
  Shield
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TODOS_MODULOS } from '@/components/modulos';

// Todos os itens de navegação com módulo associado
const NAV_ITEMS = [
  { name: 'Home', icon: Home, path: 'Home', modulo: null },
  { name: 'Dashboard', icon: Home, path: 'Dashboard', modulo: 'relatorios' },
  { name: 'Novo Atendimento', icon: ClipboardCheck, path: 'NovoAtendimento', modulo: 'atendimentos' },
  { name: 'Atendimentos', icon: FileText, path: 'Atendimentos', modulo: 'atendimentos' },
  { name: 'REMARKETING', icon: TrendingUp, path: 'Remarketing', modulo: 'remarketing' },
  { name: 'Relatórios', icon: FileText, path: 'Relatorios', modulo: 'relatorios' },
  { name: 'Produtos', icon: Package, path: 'Produtos', modulo: 'estoque' },
  { name: 'Clientes', icon: Users, path: 'Clientes', modulo: 'clientes' },
  { name: 'Checklist', icon: ClipboardCheck, path: 'GerenciarChecklist', modulo: 'checklist' },
  { name: 'Agenda', icon: Calendar, path: 'Agenda', modulo: 'agenda' },
  { name: 'Financeiro', icon: TrendingUp, path: 'Financeiro', modulo: 'financeiro' },
  { name: 'Compras', icon: Package, path: 'Compras', modulo: 'estoque' },
  { name: 'Configurações', icon: Wrench, path: 'Configuracoes', modulo: null },
  { name: 'Usuários', icon: Users, path: 'Usuarios', modulo: null },
  { name: 'Gerenciar Plano', icon: Shield, path: 'GerenciarPlano', modulo: null, apenasAdmin: true },
  { name: 'Manual de Treinamento', icon: FileText, path: 'ManualTreinamento', modulo: null },
];



export default function Layout({ children, currentPageName }) {
  const [open, setOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });
  const modulosAtivos = configs[0]?.modulos_ativos ?? null;

  // Páginas públicas que não devem mostrar navegação
  const paginasPublicas = ['AprovarOrcamento'];
  const isPaginaPublica = paginasPublicas.includes(currentPageName);

  // Filtra itens do menu conforme módulos ativos e role do usuário
  const itensFiltrados = NAV_ITEMS.filter(item => {
    if (item.apenasAdmin && user?.role !== 'admin') return false;
    if (!item.modulo) return true;
    if (!modulosAtivos || modulosAtivos.length === 0) return true;
    const modulo = TODOS_MODULOS.find(m => m.id === item.modulo);
    if (modulo?.essencial) return true;
    return modulosAtivos.includes(item.modulo);
  });

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
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="p-4 border-b border-slate-200">
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
            <div className="p-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col bg-white border-r border-slate-200 h-screen">
          <div className="p-6 border-b border-slate-200 flex-shrink-0">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
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

      {/* Botão flutuante Assistente IA */}
      {currentPageName !== 'AssistenteIA' && (
        <Link
          to={createPageUrl('AssistenteIA')}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-full shadow-lg shadow-purple-500/40 transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold text-sm">Assistente IA</span>
        </Link>
      )}
    </div>
  );
}