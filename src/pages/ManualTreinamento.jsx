import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, BookOpen, CheckCircle2, AlertTriangle, Info, Star, ChevronRight, Youtube, FileImage } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AbaVideos from '../components/treinamento/AbaVideos';
import AbaConteudos from '../components/treinamento/AbaConteudos';

const ETAPAS = [
  {
    numero: 1,
    titulo: "Abertura do Atendimento",
    icone: "🚗",
    cor: "#f97316",
    corFundo: "#fff7ed",
    corBorda: "#fed7aa",
    descricao: "O primeiro contato com o cliente define toda a experiência. Seja cordial, profissional e colete todas as informações necessárias.",
    passos: [
      "Cumprimente o cliente com cordialidade: 'Bom dia/tarde/noite! Bem-vindo à Fraga Auto Portas.'",
      "Solicite o veículo para inspeção visual rápida antes de iniciar o cadastro.",
      "No sistema, acesse o menu lateral e clique em 'Novo Atendimento'.",
      "Na aba 'Dados', preencha os dados do veículo: Placa, Marca, Modelo e Ano.",
      "Preencha o KM atual do veículo (solicite ao cliente ou verifique no painel).",
      "Busque o cliente pelo nome no campo indicado. Se encontrar na lista, selecione-o.",
      "Se o cliente for novo, clique no botão laranja 'Cadastrar como novo cliente' e preencha nome e telefone.",
      "Clique em 'Próximo: Queixa Inicial' para avançar.",
    ],
    dicas: [
      "Sempre confirme a placa do veículo com o cliente para evitar erros.",
      "Cadastre o telefone do cliente — é essencial para enviar o link do orçamento.",
      "Se o cliente já estiver cadastrado, o sistema preencherá os dados automaticamente.",
    ],
    atencao: "Nunca pule o cadastro do cliente. Sem telefone, não é possível enviar o orçamento por WhatsApp."
  },
  {
    numero: 2,
    titulo: "Registro da Queixa Inicial",
    icone: "📋",
    cor: "#3b82f6",
    corFundo: "#eff6ff",
    corBorda: "#bfdbfe",
    descricao: "A queixa inicial é o motivo principal pelo qual o cliente trouxe o veículo. Registre de forma clara e objetiva.",
    passos: [
      "Na aba 'Queixa', descreva no campo de texto o problema relatado pelo cliente.",
      "Use as palavras do próprio cliente. Ex: 'Barulho ao fechar a porta traseira direita'.",
      "Clique em 'Adicionar Existente' para incluir o(s) serviço(s) relacionado(s) à queixa.",
      "Na lista de produtos, busque pelo nome ou código do serviço/peça necessário.",
      "Ajuste a quantidade se necessário clicando no item adicionado.",
      "Para adicionar um produto que não existe no catálogo, clique em 'Cadastrar Novo'.",
      "Após adicionar todos os itens, avance para a aba 'Checklist'.",
    ],
    dicas: [
      "Seja específico na queixa: indique qual porta, janela ou sistema apresenta problema.",
      "Adicione a mão de obra relacionada à queixa nesta etapa.",
      "O valor dos itens da queixa formará o subtotal da queixa no orçamento.",
    ],
    atencao: "A queixa inicial é enviada ao cliente para aprovação antes do checklist. Certifique-se que os valores estão corretos."
  },
  {
    numero: 3,
    titulo: "Realização do Checklist Técnico",
    icone: "🔍",
    cor: "#8b5cf6",
    corFundo: "#f5f3ff",
    corBorda: "#ddd6fe",
    descricao: "O checklist é a inspeção completa do veículo. É aqui que identificamos problemas além da queixa inicial e geramos valor para o cliente.",
    passos: [
      "Na aba 'Checklist', cada item representa uma parte do veículo a ser inspecionada.",
      "Para cada item, selecione o status: ✅ OK, ⚠️ Atenção ou ❌ Com Defeito.",
      "Quando marcar 'Com Defeito', marque também 'Incluir no Orçamento' se o serviço for cobrado.",
      "Adicione os produtos/serviços necessários para cada item com defeito.",
      "Use o campo 'Observação' para registrar detalhes técnicos importantes.",
      "Items marcados como 'Atenção' informam o cliente mas não geram cobrança.",
      "Percorra todos os itens do checklist de forma sistemática (não pule nenhum).",
      "Após concluir, vá para a aba 'Orçamento' para revisar os valores.",
    ],
    dicas: [
      "Faça o checklist com o veículo ligado e desligado para identificar todos os problemas.",
      "Fotografe defeitos visíveis antes de iniciar o serviço — isso protege a empresa.",
      "Items de 'Atenção' mostram ao cliente que você inspecionou o veículo com cuidado.",
    ],
    atencao: "Nunca adicione itens ao checklist sem verificar fisicamente. A credibilidade da empresa depende de um checklist honesto."
  },
  {
    numero: 4,
    titulo: "Geração e Envio do Orçamento",
    icone: "💰",
    cor: "#10b981",
    corFundo: "#f0fdf4",
    corBorda: "#bbf7d0",
    descricao: "Com o checklist concluído, o sistema consolida automaticamente todos os itens em um orçamento completo.",
    passos: [
      "Na aba 'Orçamento', revise todos os itens listados (queixa + checklist).",
      "Verifique se os valores unitários estão corretos para cada item.",
      "Aplique desconto percentual ou em reais se houver condição especial acordada.",
      "Clique em 'Salvar Atendimento' para registrar no sistema.",
      "Após salvar, na tela do atendimento, localize o botão 'Enviar Link ao Cliente'.",
      "O sistema gerará um link exclusivo. Copie e envie pelo WhatsApp do cliente.",
      "A mensagem padrão já está configurada — basta confirmar o envio.",
      "Oriente o cliente que ele poderá aprovar ou reprovar cada serviço pelo celular.",
    ],
    dicas: [
      "Revise o valor final antes de enviar. Corrija qualquer erro antes do cliente ver.",
      "Informe ao cliente o prazo estimado para aguardar a resposta do orçamento.",
      "Confirme com o cliente que o link chegou via WhatsApp.",
    ],
    atencao: "Não inicie nenhum serviço sem a aprovação do cliente. Aguarde a resposta pelo sistema."
  },
  {
    numero: 5,
    titulo: "Aprovação pelo Cliente",
    icone: "✅",
    cor: "#06b6d4",
    corFundo: "#ecfeff",
    corBorda: "#a5f3fc",
    descricao: "O cliente acessa o link enviado e aprova ou reprova cada serviço individualmente. Fique atento para receber a notificação.",
    passos: [
      "O cliente abrirá o link no celular e verá todos os itens do orçamento.",
      "Para cada item, o cliente poderá: Aprovar ✅, Reprovar ❌ ou deixar uma observação.",
      "O cliente seleciona a forma de pagamento preferida.",
      "Ao finalizar, o cliente assina digitalmente (ou manualmente no balcão).",
      "Você receberá notificação via WhatsApp da empresa ao receber a aprovação.",
      "No sistema, acesse o atendimento e veja quais itens foram aprovados/reprovados.",
      "Os itens aprovados aparecem em verde, os reprovados em vermelho.",
      "Registre quaisquer observações do cliente deixadas no orçamento.",
    ],
    dicas: [
      "Se o cliente não responder em 1 hora, ligue para confirmar que recebeu o link.",
      "Clientes sem smartphone podem aprovar presencialmente — mostre na tela do sistema.",
      "A assinatura digital tem validade jurídica — sempre colete antes de iniciar.",
    ],
    atencao: "Itens reprovados NÃO devem ser executados. Respeite a decisão do cliente em todos os casos."
  },
  {
    numero: 6,
    titulo: "Execução dos Serviços",
    icone: "🔧",
    cor: "#f59e0b",
    corFundo: "#fffbeb",
    corBorda: "#fde68a",
    descricao: "Com a aprovação em mãos, inicie a execução dos serviços aprovados com agilidade e qualidade.",
    passos: [
      "Acesse o atendimento no sistema e verifique os itens com status 'Aprovado'.",
      "Para cada serviço iniciado, atualize o status para 'Em Andamento'.",
      "Execute somente os serviços aprovados — nunca execute itens reprovados.",
      "Durante a execução, registre no sistema qualquer intercorrência ou descoberta nova.",
      "Se identificar um problema adicional durante o serviço, comunique o cliente ANTES de executar.",
      "Para serviços adicionais, gere um novo orçamento complementar e aguarde aprovação.",
      "Ao concluir cada serviço, atualize o status do item no sistema.",
      "Após concluir todos os itens aprovados, marque o atendimento como 'Concluído'.",
    ],
    dicas: [
      "Mantenha o cliente informado sobre o andamento, especialmente em serviços mais demorados.",
      "Tire fotos do antes e depois dos serviços realizados quando possível.",
      "Use o campo de observações para registrar peças substituídas com número de série.",
    ],
    atencao: "Qualquer serviço adicional identificado durante a execução DEVE ter nova aprovação do cliente antes de ser realizado."
  },
  {
    numero: 7,
    titulo: "Serviços Reprovados — Remarketing",
    icone: "📣",
    cor: "#ef4444",
    corFundo: "#fef2f2",
    corBorda: "#fecaca",
    descricao: "Serviços reprovados representam uma oportunidade futura. O sistema ajuda a manter o contato com o cliente para futuras conversões.",
    passos: [
      "Acesse 'Serviços Reprovados' no menu lateral.",
      "Veja a lista de todos os clientes com serviços não aprovados.",
      "Para reativar uma oferta, clique em 'Enviar Oferta' no atendimento desejado.",
      "O sistema gerará uma mensagem personalizada com o serviço reprovado.",
      "Envie a mensagem pelo WhatsApp nos momentos estratégicos (promoções, sazonalidade).",
      "Registre quando o contato foi feito para acompanhar o histórico.",
      "Se o cliente aceitar, crie um novo atendimento referenciando o orçamento anterior.",
    ],
    dicas: [
      "Bom momento para oferecer: chuva intensa (vidros), frio intenso (aquecedor), etc.",
      "Não seja insistente. Aguarde pelo menos 30 dias entre os contatos.",
      "Mencione o benefício principal ao reoferecer: 'Evitar problema maior no futuro'.",
    ],
    atencao: "Evite contatos muito frequentes — isso pode afastar o cliente. Seja estratégico e relevante."
  },
];

const REGRAS = [
  { titulo: "Jamais inicie serviços sem aprovação", descricao: "Toda execução exige assinatura digital do cliente no sistema." },
  { titulo: "Sempre cadastre o telefone do cliente", descricao: "Sem telefone, não é possível enviar o link de aprovação pelo WhatsApp." },
  { titulo: "Registre tudo no sistema", descricao: "Observações, fotos e histórico protegem a empresa em casos de reclamação." },
  { titulo: "Respeite a decisão do cliente", descricao: "Serviços reprovados nunca devem ser executados sem nova autorização." },
  { titulo: "Mantenha o checklist honesto", descricao: "Adicione somente itens que realmente precisam de serviço." },
  { titulo: "Informe sobre serviços adicionais", descricao: "Qualquer problema descoberto durante a execução deve ser comunicado imediatamente." },
];

export default function ManualTreinamento() {
  const navigate = useNavigate();
  const printRef = useRef();
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isAdmin = user?.role === 'admin';

  const handleGerarPDF = () => {
    const conteudo = printRef.current;
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Manual de Treinamento – Fraga Auto Portas</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.55; }
  
  .capa { background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%); color: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 60px 40px; page-break-after: always; }
  .capa-logo { width: 80px; height: 80px; background: #f97316; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; font-size: 40px; }
  .capa h1 { font-size: 38px; font-weight: 800; margin-bottom: 12px; color: #f97316; letter-spacing: -1px; }
  .capa h2 { font-size: 22px; font-weight: 400; color: #cbd5e1; margin-bottom: 40px; }
  .capa .badge { display: inline-block; background: rgba(249,115,22,0.2); border: 1px solid rgba(249,115,22,0.4); color: #fb923c; padding: 8px 24px; border-radius: 50px; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
  .capa .subtitulo { color: #94a3b8; font-size: 15px; max-width: 500px; line-height: 1.7; }
  .capa .versao { margin-top: 60px; color: #64748b; font-size: 12px; }

  .sumario { padding: 48px 48px; page-break-after: always; }
  .sumario h2 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 28px; padding-bottom: 12px; border-bottom: 3px solid #f97316; }
  .sumario-item { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
  .sumario-numero { width: 36px; height: 36px; background: #f97316; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
  .sumario-titulo { font-size: 15px; font-weight: 600; color: #334155; flex: 1; }
  .sumario-icone { font-size: 22px; }
  .sumario-intro { background: #fff7ed; border-left: 4px solid #f97316; padding: 20px 24px; border-radius: 0 12px 12px 0; margin-bottom: 32px; font-size: 14px; color: #7c2d12; line-height: 1.7; }

  .etapa { padding: 48px 48px; page-break-after: always; }
  .etapa-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
  .etapa-numero-badge { background: #1e293b; color: white; padding: 6px 16px; border-radius: 50px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; display: inline-block; margin-bottom: 8px; }
  .etapa-icone-grande { font-size: 48px; line-height: 1; }
  .etapa-titulo-grupo { flex: 1; }
  .etapa-titulo { font-size: 26px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
  .etapa-descricao { font-size: 14px; color: #64748b; line-height: 1.7; }

  .secao { margin-bottom: 24px; }
  .secao-titulo { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .secao-titulo::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }

  .passos-lista { counter-reset: passo-counter; }
  .passo { display: flex; gap: 16px; margin-bottom: 12px; align-items: flex-start; }
  .passo-numero { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: white; flex-shrink: 0; }
  .passo-texto { flex: 1; font-size: 14px; color: #334155; padding-top: 4px; line-height: 1.6; }

  .dicas-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .dica-item { background: #f0fdf4; border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #065f46; display: flex; gap: 10px; align-items: flex-start; }
  .dica-icon { flex-shrink: 0; margin-top: 1px; }

  .atencao-box { background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-top: 20px; }
  .atencao-header { font-size: 11px; font-weight: 700; color: #dc2626; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .atencao-texto { font-size: 13px; color: #7f1d1d; line-height: 1.6; }

  .regras-page { padding: 48px 48px; page-break-after: always; }
  .regras-page h2 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
  .regras-page .subtitulo { color: #64748b; margin-bottom: 32px; font-size: 14px; }
  .regra-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; display: flex; gap: 16px; align-items: flex-start; }
  .regra-numero { width: 40px; height: 40px; background: #1e293b; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0; }
  .regra-titulo { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .regra-desc { font-size: 13px; color: #64748b; line-height: 1.6; }

  .fluxo-page { padding: 48px 48px; }
  .fluxo-page h2 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
  .fluxo-page .subtitulo { color: #64748b; margin-bottom: 32px; font-size: 14px; }
  .fluxo-container { display: flex; flex-direction: column; gap: 0; }
  .fluxo-etapa { display: flex; gap: 20px; align-items: stretch; }
  .fluxo-linha { display: flex; flex-direction: column; align-items: center; }
  .fluxo-circulo { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; border: 3px solid white; }
  .fluxo-linha-vertical { width: 3px; background: #e2e8f0; flex: 1; min-height: 20px; }
  .fluxo-conteudo { flex: 1; padding: 4px 0 28px 0; }
  .fluxo-titulo { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .fluxo-desc { font-size: 13px; color: #64748b; }
  .fluxo-seta { text-align: center; font-size: 20px; color: #cbd5e1; margin: 4px 0; }
  
  .rodape { text-align: center; padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page-break { page-break-after: always; }
  }
</style>
</head>
<body>

<!-- CAPA -->
<div class="capa">
  <div class="capa-logo">🔧</div>
  <div class="badge">Manual de Treinamento</div>
  <h1>Fraga Auto Portas</h1>
  <h2>Sistema de Gestão de Atendimentos</h2>
  <p class="subtitulo">
    Guia completo do fluxo de atendimento ao cliente, desde a abertura do serviço até a conclusão. 
    Este manual foi criado para ajudar os colaboradores a entenderem e executarem cada etapa com excelência.
  </p>
  <div class="versao">Versão 1.0 &nbsp;·&nbsp; Fevereiro 2026 &nbsp;·&nbsp; Uso Interno</div>
</div>

<!-- SUMÁRIO -->
<div class="sumario">
  <h2>📚 Índice do Manual</h2>
  <div class="sumario-intro">
    Este manual detalha as <strong>7 etapas do fluxo de atendimento</strong>. Siga a ordem sempre que atender um cliente — cada passo é importante para garantir qualidade, organização e aprovação dos serviços.
  </div>
  ${ETAPAS.map(e => `
  <div class="sumario-item">
    <div class="sumario-numero">${e.numero}</div>
    <div class="sumario-icone">${e.icone}</div>
    <div class="sumario-titulo">${e.titulo}</div>
  </div>`).join('')}
  <div class="sumario-item">
    <div class="sumario-numero" style="background:#1e293b">📌</div>
    <div class="sumario-icone">⚖️</div>
    <div class="sumario-titulo">Regras de Ouro do Atendimento</div>
  </div>
  <div class="sumario-item">
    <div class="sumario-numero" style="background:#1e293b">📌</div>
    <div class="sumario-icone">🔄</div>
    <div class="sumario-titulo">Fluxograma Visual do Atendimento</div>
  </div>
</div>

<!-- ETAPAS -->
${ETAPAS.map((e) => `
<div class="etapa">
  <div class="etapa-header">
    <div class="etapa-icone-grande">${e.icone}</div>
    <div class="etapa-titulo-grupo">
      <div class="etapa-numero-badge">Etapa ${e.numero} de ${ETAPAS.length}</div>
      <div class="etapa-titulo">${e.titulo}</div>
      <div class="etapa-descricao">${e.descricao}</div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">Passo a passo</div>
    <div class="passos-lista">
      ${e.passos.map((p, i) => `
      <div class="passo">
        <div class="passo-numero" style="background:${e.cor}">${i + 1}</div>
        <div class="passo-texto">${p}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">💡 Dicas importantes</div>
    <div class="dicas-grid">
      ${e.dicas.map(d => `
      <div class="dica-item">
        <span class="dica-icon">✓</span>
        <span>${d}</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="atencao-box">
    <div class="atencao-header">⚠ Atenção</div>
    <div class="atencao-texto">${e.atencao}</div>
  </div>
</div>`).join('')}

<!-- REGRAS DE OURO -->
<div class="regras-page">
  <h2>⚖️ Regras de Ouro do Atendimento</h2>
  <p class="subtitulo">Estas regras são inegociáveis. Todo colaborador deve conhecê-las e segui-las.</p>
  ${REGRAS.map((r, i) => `
  <div class="regra-card">
    <div class="regra-numero">${i + 1}</div>
    <div>
      <div class="regra-titulo">${r.titulo}</div>
      <div class="regra-desc">${r.descricao}</div>
    </div>
  </div>`).join('')}
</div>

<!-- FLUXOGRAMA -->
<div class="fluxo-page">
  <h2>🔄 Fluxograma do Atendimento</h2>
  <p class="subtitulo">Visão rápida do ciclo completo — do recebimento do veículo à conclusão.</p>
  <div class="fluxo-container">
    ${ETAPAS.map((e, i) => `
    <div class="fluxo-etapa">
      <div class="fluxo-linha">
        <div class="fluxo-circulo" style="background:${e.cor}">${e.icone}</div>
        ${i < ETAPAS.length - 1 ? '<div class="fluxo-linha-vertical"></div>' : ''}
      </div>
      <div class="fluxo-conteudo">
        <div class="fluxo-titulo">Etapa ${e.numero}: ${e.titulo}</div>
        <div class="fluxo-desc">${e.descricao.substring(0, 90)}...</div>
      </div>
    </div>`).join('')}
  </div>
</div>

<div class="rodape">
  Manual de Treinamento — Fraga Auto Portas &nbsp;·&nbsp; Sistema de Gestão &nbsp;·&nbsp; Uso interno e exclusivo &nbsp;·&nbsp; v1.0 / 2026
</div>

</body>
</html>`;

    const janela = window.open('', '_blank');
    janela.document.write(htmlContent);
    janela.document.close();
    setTimeout(() => {
      janela.print();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Treinamentos</h1>
              <p className="text-sm text-slate-500">Fluxo completo de atendimento</p>
            </div>
          </div>
          <Button onClick={handleGerarPDF} className="bg-orange-500 hover:bg-orange-600">
            <Download className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="manual">
          <TabsList className="mb-6 h-auto gap-1 flex-wrap">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              Vídeos de Treinamento
            </TabsTrigger>
            <TabsTrigger value="conteudos" className="flex items-center gap-2">
              <FileImage className="w-4 h-4" />
              Outros Conteúdos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <AbaVideos isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="conteudos">
            <AbaConteudos isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="manual">
      <div className="space-y-6" ref={printRef}>
        {/* Hero Card */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-8 flex items-center gap-6">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-orange-400 text-xs font-bold tracking-wider uppercase mb-1">Manual de Treinamento</p>
            <h2 className="text-2xl font-bold mb-1">Fluxo de Atendimento ao Cliente</h2>
            <p className="text-slate-300 text-sm">7 etapas detalhadas com passo a passo, dicas e alertas para execução com excelência.</p>
          </div>
        </div>

        {/* Etapas */}
        {ETAPAS.map((etapa) => (
          <div key={etapa.numero} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header da etapa */}
            <div className="p-6 border-b border-slate-100" style={{ background: etapa.corFundo, borderColor: etapa.corBorda }}>
              <div className="flex items-start gap-4">
                <div className="text-4xl">{etapa.icone}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: etapa.cor }}>
                      Etapa {etapa.numero}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{etapa.titulo}</h3>
                  <p className="text-slate-600 text-sm">{etapa.descricao}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Passo a passo */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Passo a Passo</p>
                <div className="space-y-2">
                  {etapa.passos.map((passo, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5" style={{ background: etapa.cor }}>
                        {i + 1}
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed pt-1">{passo}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dicas */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">💡 Dicas Importantes</p>
                <div className="space-y-2">
                  {etapa.dicas.map((dica, i) => (
                    <div key={i} className="flex gap-2 items-start bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-green-800 text-sm">{dica}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Atenção */}
              <div className="flex gap-3 items-start bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Atenção</p>
                  <p className="text-red-800 text-sm">{etapa.atencao}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Regras de ouro */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-800">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400" />
              Regras de Ouro do Atendimento
            </h3>
            <p className="text-slate-300 text-sm mt-1">Inegociáveis — todo colaborador deve conhecer e seguir.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {REGRAS.map((regra, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4 flex gap-3 items-start">
                <div className="w-9 h-9 bg-slate-800 text-white rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{regra.titulo}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{regra.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fluxograma resumido */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800">🔄 Fluxo Resumido</h3>
            <p className="text-slate-500 text-sm mt-1">Visão rápida do ciclo completo de atendimento.</p>
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-0">
              {ETAPAS.map((e, i) => (
                <div key={e.numero} className="flex gap-4 items-stretch">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-4 border-white shadow-md flex-shrink-0" style={{ background: e.corFundo }}>
                      {e.icone}
                    </div>
                    {i < ETAPAS.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 my-1" />}
                  </div>
                  <div className={`flex-1 pb-6 ${i < ETAPAS.length - 1 ? 'pb-6' : 'pb-0'}`}>
                    <p className="font-semibold text-slate-800 text-sm">{e.titulo}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{e.descricao.substring(0, 100)}...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs pb-4">
          Manual de Treinamento – Fraga Auto Portas · Sistema de Gestão · Uso Interno · v1.0 / 2026
        </p>
      </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}