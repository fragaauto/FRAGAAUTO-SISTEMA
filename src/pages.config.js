import Home from './pages/Home';
import NovoAtendimento from './pages/NovoAtendimento';
import Atendimentos from './pages/Atendimentos';
import VerAtendimento from './pages/VerAtendimento';
import Produtos from './pages/Produtos';
import Clientes from './pages/Clientes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "NovoAtendimento": NovoAtendimento,
    "Atendimentos": Atendimentos,
    "VerAtendimento": VerAtendimento,
    "Produtos": Produtos,
    "Clientes": Clientes,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};