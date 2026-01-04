import Atendimentos from './pages/Atendimentos';
import Clientes from './pages/Clientes';
import Home from './pages/Home';
import NovoAtendimento from './pages/NovoAtendimento';
import Produtos from './pages/Produtos';
import VerAtendimento from './pages/VerAtendimento';
import Configuracoes from './pages/Configuracoes';
import Usuarios from './pages/Usuarios';
import GerenciarChecklist from './pages/GerenciarChecklist';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Atendimentos": Atendimentos,
    "Clientes": Clientes,
    "Home": Home,
    "NovoAtendimento": NovoAtendimento,
    "Produtos": Produtos,
    "VerAtendimento": VerAtendimento,
    "Configuracoes": Configuracoes,
    "Usuarios": Usuarios,
    "GerenciarChecklist": GerenciarChecklist,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};