import Atendimentos from './pages/Atendimentos';
import Clientes from './pages/Clientes';
import Configuracoes from './pages/Configuracoes';
import GerenciarChecklist from './pages/GerenciarChecklist';
import Home from './pages/Home';
import NovoAtendimento from './pages/NovoAtendimento';
import Produtos from './pages/Produtos';
import Usuarios from './pages/Usuarios';
import VerAtendimento from './pages/VerAtendimento';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Atendimentos": Atendimentos,
    "Clientes": Clientes,
    "Configuracoes": Configuracoes,
    "GerenciarChecklist": GerenciarChecklist,
    "Home": Home,
    "NovoAtendimento": NovoAtendimento,
    "Produtos": Produtos,
    "Usuarios": Usuarios,
    "VerAtendimento": VerAtendimento,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};