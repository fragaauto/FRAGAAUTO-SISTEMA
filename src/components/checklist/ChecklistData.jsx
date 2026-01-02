export const CHECKLIST_ITEMS = [
  // LIMPEZA E VISIBILIDADE
  { id: 'esguicho_dianteiro', item: 'Esguicho para-brisa dianteiro', categoria: 'Limpeza e Visibilidade' },
  { id: 'esguicho_traseiro', item: 'Esguicho para-brisa traseiro', categoria: 'Limpeza e Visibilidade' },
  { id: 'braco_limpador_dianteiro', item: 'Braço limpador dianteiro (ferrugem)', categoria: 'Limpeza e Visibilidade' },
  { id: 'braco_limpador_traseiro', item: 'Braço limpador traseiro (ferrugem)', categoria: 'Limpeza e Visibilidade' },
  { id: 'palhetas_dianteiras', item: 'Palhetas dianteiras', categoria: 'Limpeza e Visibilidade' },
  { id: 'palheta_traseira', item: 'Palheta traseira', categoria: 'Limpeza e Visibilidade' },
  
  // ELÉTRICA
  { id: 'buzina', item: 'Buzina', categoria: 'Elétrica' },
  { id: 'alarme', item: 'Alarme', categoria: 'Elétrica' },
  { id: 'trava_eletrica', item: 'Trava elétrica', categoria: 'Elétrica' },
  { id: 'levantamento_vidro', item: 'Levantamento de vidro', categoria: 'Elétrica' },
  { id: 'radio', item: 'Rádio', categoria: 'Elétrica' },
  { id: 'alto_falantes', item: 'Alto-falantes', categoria: 'Elétrica' },
  { id: 'camera_re', item: 'Câmera de ré', categoria: 'Elétrica' },
  
  // ILUMINAÇÃO
  { id: 'farois_amarelados', item: 'Faróis amarelados', categoria: 'Iluminação' },
  { id: 'luzes_queimadas', item: 'Luzes queimadas', categoria: 'Iluminação' },
  
  // MANUTENÇÃO GERAL
  { id: 'oleo', item: 'Óleo (verificar KM e data)', categoria: 'Manutenção Geral' },
  { id: 'ar_condicionado', item: 'Ar-condicionado', categoria: 'Manutenção Geral' },
  
  // SEGURANÇA
  { id: 'cinto_seguranca', item: 'Cinto de segurança', categoria: 'Segurança' },
  
  // INTERIOR
  { id: 'banco_manco', item: 'Banco manco (VW)', categoria: 'Interior' },
  { id: 'funcionamento_vidros', item: 'Funcionamento dos vidros', categoria: 'Interior' },
  { id: 'botoes_vidro', item: 'Funcionamento dos botões de vidro', categoria: 'Interior' },
  { id: 'tapetes', item: 'Tapetes', categoria: 'Interior' },
  { id: 'macanetas_internas', item: 'Maçanetas internas', categoria: 'Interior' },
  
  // PORTAS E FECHADURAS
  { id: 'borrachas_porta', item: 'Borrachas de porta', categoria: 'Portas e Vedação' },
  { id: 'borracha_portamalas', item: 'Borracha do porta-malas', categoria: 'Portas e Vedação' },
  { id: 'pingadeiras', item: 'Pingadeiras', categoria: 'Portas e Vedação' },
  { id: 'macanetas_externas', item: 'Maçanetas externas', categoria: 'Portas e Vedação' },
  { id: 'fechaduras', item: 'Fechaduras', categoria: 'Portas e Vedação' },
  { id: 'limitador_porta', item: 'Limitador de porta', categoria: 'Portas e Vedação' },
  { id: 'batentes', item: 'Batentes', categoria: 'Portas e Vedação' },
  { id: 'folga_dobradicas', item: 'Folga nas dobradiças (Uno, Gol, Palio, Ranger, S10, Saveiro, Voyage)', categoria: 'Portas e Vedação' },
  { id: 'cilindro_portamalas', item: 'Cilindro do porta-malas', categoria: 'Portas e Vedação' },
  { id: 'amortecedor_portamalas', item: 'Amortecedor do porta-malas', categoria: 'Portas e Vedação' },
  { id: 'cilindro_chave_porta', item: 'Cilindro de chave da porta', categoria: 'Portas e Vedação' },
  
  // RODAS E ACESSÓRIOS
  { id: 'calotas', item: 'Calotas', categoria: 'Rodas e Acessórios' },
  { id: 'anti_furto', item: 'Anti-furto', categoria: 'Rodas e Acessórios' },
];

export const CATEGORIAS = [
  'Limpeza e Visibilidade',
  'Elétrica',
  'Iluminação',
  'Manutenção Geral',
  'Segurança',
  'Interior',
  'Portas e Vedação',
  'Rodas e Acessórios'
];

export const STATUS_OPTIONS = [
  { value: 'ok', label: 'OK', color: 'bg-green-500' },
  { value: 'com_defeito', label: 'Com Defeito', color: 'bg-red-500' },
  { value: 'nao_possui', label: 'Não Possui', color: 'bg-gray-400' },
  { value: 'nao_verificado', label: 'Não Verificado', color: 'bg-yellow-500' }
];