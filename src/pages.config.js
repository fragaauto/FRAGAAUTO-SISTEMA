import Atendimentos from './pages/Atendimentos';
import Clientes from './pages/Clientes';
import Configuracoes from './pages/Configuracoes';
import Dashboard from './pages/Dashboard';
import GerenciarChecklist from './pages/GerenciarChecklist';
import Home from './pages/Home';
import NovoAtendimento from './pages/NovoAtendimento';
import Produtos from './pages/Produtos';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';
import VerAtendimento from './pages/VerAtendimento';
import EditarAtendimento from './pages/EditarAtendimento';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Atendimentos": Atendimentos,
    "Clientes": Clientes,
    "Configuracoes": Configuracoes,
    "Dashboard": Dashboard,
    "GerenciarChecklist": GerenciarChecklist,
    "Home": Home,
    "NovoAtendimento": NovoAtendimento,
    "Produtos": Produtos,
    "Relatorios": Relatorios,
    "Usuarios": Usuarios,
    "VerAtendimento": VerAtendimento,
    "EditarAtendimento": EditarAtendimento,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};