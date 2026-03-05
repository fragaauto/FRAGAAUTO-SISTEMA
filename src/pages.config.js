/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Agenda from './pages/Agenda';
import AprovarOrcamento from './pages/AprovarOrcamento';
import AssistenteIA from './pages/AssistenteIA';
import Atendimentos from './pages/Atendimentos';
import Clientes from './pages/Clientes';
import Compras from './pages/Compras';
import Configuracoes from './pages/Configuracoes';
import Dashboard from './pages/Dashboard';
import EditarAtendimento from './pages/EditarAtendimento';
import EditarQueixa from './pages/EditarQueixa';
import Financeiro from './pages/Financeiro';
import GerenciarChecklist from './pages/GerenciarChecklist';
import GerenciarPlano from './pages/GerenciarPlano';
import Home from './pages/Home';
import ManualTreinamento from './pages/ManualTreinamento';
import NovoAtendimento from './pages/NovoAtendimento';
import Produtos from './pages/Produtos';
import Relatorios from './pages/Relatorios';
import Remarketing from './pages/Remarketing';
import ServicosReprovados from './pages/ServicosReprovados';
import Usuarios from './pages/Usuarios';
import VerAtendimento from './pages/VerAtendimento';
import Cadastros from './pages/Cadastros';
import BaseConhecimentoIA from './pages/BaseConhecimentoIA';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "AprovarOrcamento": AprovarOrcamento,
    "AssistenteIA": AssistenteIA,
    "Atendimentos": Atendimentos,
    "Clientes": Clientes,
    "Compras": Compras,
    "Configuracoes": Configuracoes,
    "Dashboard": Dashboard,
    "EditarAtendimento": EditarAtendimento,
    "EditarQueixa": EditarQueixa,
    "Financeiro": Financeiro,
    "GerenciarChecklist": GerenciarChecklist,
    "GerenciarPlano": GerenciarPlano,
    "Home": Home,
    "ManualTreinamento": ManualTreinamento,
    "NovoAtendimento": NovoAtendimento,
    "Produtos": Produtos,
    "Relatorios": Relatorios,
    "Remarketing": Remarketing,
    "ServicosReprovados": ServicosReprovados,
    "Usuarios": Usuarios,
    "VerAtendimento": VerAtendimento,
    "Cadastros": Cadastros,
    "BaseConhecimentoIA": BaseConhecimentoIA,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};