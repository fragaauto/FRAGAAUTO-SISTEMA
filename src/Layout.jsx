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
  Wrench
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: 'Home', icon: Home, path: 'Home' },
  { name: 'Dashboard', icon: Home, path: 'Dashboard' },
  { name: 'Novo Atendimento', icon: ClipboardCheck, path: 'NovoAtendimento' },
  { name: 'Atendimentos', icon: FileText, path: 'Atendimentos' },
  { name: 'Relatórios', icon: FileText, path: 'Relatorios' },
  { name: 'Produtos', icon: Package, path: 'Produtos' },
  { name: 'Clientes', icon: Users, path: 'Clientes' },
  { name: 'Checklist', icon: ClipboardCheck, path: 'GerenciarChecklist' },
  { name: 'Configurações', icon: Wrench, path: 'Configuracoes' },
  { name: 'Usuários', icon: Users, path: 'Usuarios' },
];

export default function Layout({ children, currentPageName }) {
  const [open, setOpen] = React.useState(false);

  const NavLinks = ({ onNavigate }) => (
    <div className="space-y-1">
      {NAV_ITEMS.map((item) => {
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
  const hideNav = ['Home'].includes(currentPageName);

  if (hideNav) {
    return <>{children}</>;
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
        <div className="flex flex-col flex-grow bg-white border-r border-slate-200">
          <div className="p-6 border-b border-slate-200">
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
          <div className="flex-1 p-4 overflow-y-auto">
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