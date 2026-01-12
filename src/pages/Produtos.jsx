import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Package,
  Edit,
  Trash2,
  Upload,
  Loader2,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIAS = [
  { value: 'eletrica', label: 'Elétrica', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'portas', label: 'Portas', color: 'bg-blue-100 text-blue-800' },
  { value: 'acessorios', label: 'Acessórios', color: 'bg-purple-100 text-purple-800' },
  { value: 'estetica', label: 'Estética', color: 'bg-pink-100 text-pink-800' },
  { value: 'seguranca', label: 'Segurança', color: 'bg-red-100 text-red-800' },
  { value: 'vidros', label: 'Vidros', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'limpeza', label: 'Limpeza', color: 'bg-green-100 text-green-800' },
  { value: 'outros', label: 'Outros', color: 'bg-gray-100 text-gray-800' }
];

const getCategoriaColor = (cat) => CATEGORIAS.find(c => c.value === cat)?.color || 'bg-gray-100';

export default function Produtos() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteMultiple, setShowDeleteMultiple] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStats, setDeleteStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    errors: 0,
    errorDetails: []
  });
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    updated: 0,
    errors: 0,
    errorDetails: []
  });
  const [preValidation, setPreValidation] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [showAvisos, setShowAvisos] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: '',
    valor: '',
    descricao: '',
    vantagens: '',
    desvantagens: '',
    ativo: true
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('', 3000),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Produto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['produtos']);
      toast.success('Produto criado!');
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Produto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['produtos']);
      toast.success('Produto atualizado!');
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Produto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['produtos']);
      toast.success('Produto excluído!');
      setDeleteId(null);
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids) => {
      setDeleteProgress(0);
      setDeleteStats({
        total: ids.length,
        processed: 0,
        success: 0,
        errors: 0,
        errorDetails: []
      });

      const total = ids.length;
      let sucessos = 0;
      const erros = [];
      
      for (let i = 0; i < ids.length; i++) {
        try {
          const produto = produtos.find(p => p.id === ids[i]);
          await base44.entities.Produto.delete(ids[i]);
          sucessos++;
        } catch (error) {
          const produto = produtos.find(p => p.id === ids[i]);
          erros.push({
            codigo: produto?.codigo || 'N/A',
            nome: produto?.nome || 'Produto não encontrado',
            erro: 'Erro ao excluir (pode estar vinculado a orçamentos)'
          });
        }
        
        setDeleteStats({
          total,
          processed: i + 1,
          success: sucessos,
          errors: erros.length,
          errorDetails: erros
        });
        setDeleteProgress(((i + 1) / total) * 100);
      }

      return { sucessos, erros };
    },
    onSuccess: ({ sucessos, erros }) => {
      queryClient.invalidateQueries(['produtos']);
      
      if (erros.length === 0) {
        toast.success(`✅ ${sucessos} produto(s) excluído(s) com sucesso!`);
      } else {
        toast.warning(`⚠️ ${sucessos} excluídos, ${erros.length} com erro. Veja o relatório.`);
      }
      
      setSelectedIds([]);
      setTimeout(() => {
        if (erros.length === 0) {
          setShowDeleteMultiple(false);
          setDeleteProgress(0);
          setDeleteStats({ total: 0, processed: 0, success: 0, errors: 0, errorDetails: [] });
        }
      }, 3000);
    },
    onError: () => {
      toast.error('Erro crítico ao processar exclusões');
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Produto.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['produtos']);
      toast.success(`${result.length} produtos importados!`);
    }
  });

  const filteredProdutos = produtos.filter(p => {
    const matchSearch = p.nome?.toLowerCase().includes(search.toLowerCase()) || 
                        p.codigo?.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = categoriaFilter === 'all' || p.categoria === categoriaFilter;
    return matchSearch && matchCategoria;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProdutos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProdutos.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openModal = (produto = null) => {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        codigo: produto.codigo || '',
        nome: produto.nome,
        categoria: produto.categoria,
        valor: produto.valor,
        descricao: produto.descricao || '',
        vantagens: produto.vantagens || '',
        desvantagens: produto.desvantagens || '',
        ativo: produto.ativo !== false
      });
    } else {
      setEditingProduto(null);
      setFormData({
        codigo: '',
        nome: '',
        categoria: '',
        valor: '',
        descricao: '',
        vantagens: '',
        desvantagens: '',
        ativo: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduto(null);
    setFormData({
      codigo: '',
      nome: '',
      categoria: '',
      valor: '',
      descricao: '',
      vantagens: '',
      desvantagens: '',
      ativo: true
    });
  };

  const handleSave = () => {
    if (!formData.codigo || !formData.nome || !formData.categoria || !formData.valor) {
      toast.error('Preencha todos os campos obrigatórios (código, nome, categoria, valor)');
      return;
    }

    const data = {
      ...formData,
      valor: parseFloat(formData.valor)
    };

    if (editingProduto) {
      updateMutation.mutate({ id: editingProduto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const validateAndPrepareImport = async (file) => {
    console.log('🔍 Iniciando validação do arquivo:', file.name);
    
    try {
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      let lines = [];
      
      if (isExcel) {
        console.log('📊 Processando arquivo Excel...');
        try {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { 
            type: 'array',
            codepage: 65001, // UTF-8
            raw: false // Processar como strings, não números brutos
          });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Arquivo Excel vazio ou sem planilhas');
          }
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Converter para CSV mantendo UTF-8
          const csvText = XLSX.utils.sheet_to_csv(worksheet, { 
            FS: ';', 
            RS: '\n',
            blankrows: false // Ignorar linhas vazias
          });
          
          lines = csvText.split('\n').filter(line => line.trim());
          console.log(`✅ Excel processado: ${lines.length} linhas`);
        } catch (excelError) {
          console.error('❌ Erro ao processar Excel:', excelError);
          throw new Error(`Erro ao ler Excel: ${excelError.message}`);
        }
      } else {
        console.log('📄 Processando arquivo CSV...');
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            let result = e.target.result;
            
            // Remover BOM UTF-8 se presente (0xFEFF)
            if (result.charCodeAt(0) === 0xFEFF) {
              result = result.substring(1);
            }
            
            resolve(result);
          };
          reader.onerror = (error) => {
            console.error('❌ Erro ao ler arquivo:', error);
            reject(error);
          };
          reader.readAsText(file, 'UTF-8');
        });
        lines = text.split('\n').filter(line => line.trim());
        console.log(`✅ CSV lido: ${lines.length} linhas`);
      }
      
      if (lines.length < 2) {
        toast.error('Arquivo vazio ou inválido');
        return null;
      }

      // Parser CSV robusto que respeita aspas e vírgulas dentro de campos
      // CRÍTICO: Preservar UTF-8 - não fazer nenhuma conversão de encoding
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if ((char === ',' || char === ';') && !inQuotes) {
            // Remover aspas duplas do início e fim, mas preservar o conteúdo UTF-8
            const trimmed = current.trim();
            result.push(trimmed.startsWith('"') && trimmed.endsWith('"') 
              ? trimmed.slice(1, -1) 
              : trimmed);
            current = '';
          } else {
            current += char;
          }
        }
        // Processar último campo
        const trimmed = current.trim();
        result.push(trimmed.startsWith('"') && trimmed.endsWith('"') 
          ? trimmed.slice(1, -1) 
          : trimmed);
        return result;
      };

      // Normalizar APENAS headers (não o conteúdo!) removendo acentos para mapeamento
      // CRÍTICO: Esta normalização é APENAS para comparar nomes de colunas, NÃO para dados
      const normalizeHeader = (header) => {
        return header
          .toLowerCase()
          .trim()
          .replace(/"/g, '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '_');
      };
      
      const rawHeaders = parseCSVLine(lines[0]);
      const headers = rawHeaders.map(normalizeHeader);
      
      // Log para debug - mostrar mapeamento detectado
      console.log('📋 Headers detectados:', headers);
      
      // Criar mapa de índices com validação estrita de nomes
      const getHeaderIndex = (possibleNames) => {
        for (const name of possibleNames) {
          const idx = headers.findIndex(h => h === normalizeHeader(name));
          if (idx !== -1) return idx;
        }
        return -1;
      };
      
      const codigoIdx = getHeaderIndex(['codigo', 'código', 'code']);
      const nomeIdx = getHeaderIndex(['nome', 'name', 'produto', 'servico', 'serviço']);
      const categoriaIdx = getHeaderIndex(['categoria', 'category', 'tipo']);
      const valorIdx = getHeaderIndex(['valor', 'preco', 'preço', 'price']);
      const descricaoIdx = getHeaderIndex(['descricao', 'descrição', 'description', 'obs', 'observacao', 'observação']);
      const vantagensIdx = getHeaderIndex(['vantagens', 'beneficios', 'benefícios', 'vantagens_de_fazer', 'vantagens_fazer']);
      const desvantagensIdx = getHeaderIndex(['desvantagens', 'riscos', 'desvantagens_nao_fazer', 'desvantagens_de_nao_fazer']);

      // Validação de colunas obrigatórias
      if (codigoIdx === -1 || nomeIdx === -1 || valorIdx === -1) {
        toast.error('❌ Arquivo inválido: colunas obrigatórias "codigo", "nome" e "valor" não encontradas');
        console.error('Headers esperados:', ['codigo', 'nome', 'valor']);
        console.error('Headers encontrados:', rawHeaders);
        return null;
      }
      
      // Log do mapeamento final
      console.log('🗺️ Mapeamento de colunas:', {
        codigo: rawHeaders[codigoIdx],
        nome: rawHeaders[nomeIdx],
        categoria: categoriaIdx !== -1 ? rawHeaders[categoriaIdx] : 'N/A',
        valor: rawHeaders[valorIdx],
        descricao: descricaoIdx !== -1 ? rawHeaders[descricaoIdx] : 'N/A',
        vantagens: vantagensIdx !== -1 ? rawHeaders[vantagensIdx] : 'N/A',
        desvantagens: desvantagensIdx !== -1 ? rawHeaders[desvantagensIdx] : 'N/A'
      });

      // Parse e validação de produtos
      const produtosValidos = [];
      const produtosComAviso = [];
      const errosCriticos = [];
      const codigosNaPlanilha = new Set();
      let autoCodeCounter = 1;
      
      // Mapear produtos existentes por código para UPSERT
      const produtosExistentesMap = new Map(produtos.map(p => [p.codigo, p]));
      
      for (let i = 1; i < lines.length; i++) {
        const lineNumber = i + 1;
        try {
          const values = parseCSVLine(lines[i]);
          let codigo = values[codigoIdx]?.trim();
          const nome = values[nomeIdx]?.trim();
          const valorStr = values[valorIdx]?.trim();
          
          // Validações CRÍTICAS (impedem importação)
          let avisos = [];
          
          // Se não tem código, gerar automaticamente
          if (!codigo) {
            codigo = `AUTO_${String(autoCodeCounter++).padStart(4, '0')}`;
            avisos.push('Código gerado automaticamente');
          }
          
          if (codigosNaPlanilha.has(codigo)) {
            errosCriticos.push({ 
              linha: lineNumber, 
              codigo, 
              nome: nome || '-',
              erro: 'Código duplicado na planilha',
              motivo: `O código "${codigo}" aparece mais de uma vez no arquivo`
            });
            continue;
          }
          codigosNaPlanilha.add(codigo);
          
          if (!nome) {
            errosCriticos.push({ 
              linha: lineNumber, 
              codigo, 
              nome: '-',
              erro: 'Nome obrigatório faltando',
              motivo: 'Todo produto precisa de um nome descritivo'
            });
            continue;
          }
          
          // Validar tamanho do nome (aviso se muito longo)
          if (nome.length > 150) {
            avisos.push(`Nome muito longo (${nome.length} caracteres), será truncado para 150`);
          }

          // Validar vantagens e desvantagens (limite 500 caracteres)
          let vantagens = (vantagensIdx !== -1 ? values[vantagensIdx] : '') || '';
          let desvantagens = (desvantagensIdx !== -1 ? values[desvantagensIdx] : '') || '';
          
          vantagens = vantagens.trim();
          desvantagens = desvantagens.trim();

          if (vantagens.length > 500) {
            errosCriticos.push({ 
              linha: lineNumber, 
              codigo, 
              nome,
              erro: `Vantagens muito longas (${vantagens.length} caracteres)`,
              motivo: 'O campo "vantagens" deve ter no máximo 500 caracteres'
            });
            continue;
          }

          if (desvantagens.length > 500) {
            errosCriticos.push({ 
              linha: lineNumber, 
              codigo, 
              nome,
              erro: `Desvantagens muito longas (${desvantagens.length} caracteres)`,
              motivo: 'O campo "desvantagens" deve ter no máximo 500 caracteres'
            });
            continue;
          }
          
          const valor = parseFloat(valorStr?.replace(',', '.'));
          if (!valor || valor <= 0) {
            errosCriticos.push({ 
              linha: lineNumber, 
              codigo, 
              nome,
              erro: `Valor inválido: "${valorStr}"`,
              motivo: 'O valor deve ser um número maior que zero (ex: 150.00 ou 89,90)'
            });
            continue;
          }
          
          // Validações COM AVISO (permite importação)
          const categoria = (values[categoriaIdx]?.trim() || 'outros').toLowerCase();
          const categoriasValidas = CATEGORIAS.map(c => c.value);
          
          let categoriaFinal = categoria;
          if (!categoriasValidas.includes(categoria)) {
            avisos.push(`Categoria "${categoria}" não encontrada, será usado "outros"`);
            categoriaFinal = 'outros';
          }
          
          if (!values[descricaoIdx]?.trim()) {
            avisos.push('Sem descrição');
          }
          
          const produto = {
            codigo,
            nome: nome.substring(0, 150),
            categoria: categoriaFinal,
            valor,
            descricao: (values[descricaoIdx] || '').trim(),
            vantagens: vantagens.substring(0, 500),
            desvantagens: desvantagens.substring(0, 500),
            ativo: true
          };
          
          if (avisos.length > 0) {
            produtosComAviso.push({
              ...produto,
              _avisos: avisos,
              _linha: lineNumber
            });
          } else {
            produtosValidos.push(produto);
          }
        } catch (err) {
          console.error(`❌ Erro na linha ${lineNumber}:`, err);
          errosCriticos.push({ 
            linha: lineNumber, 
            codigo: '-', 
            nome: '-',
            erro: 'Erro ao processar linha',
            motivo: err.message || 'Formato de dados inválido ou corrompido'
          });
        }
      }

      const totalValidos = produtosValidos.length + produtosComAviso.length;
      
      console.log('📊 Resultado da validação:', {
        validos: produtosValidos.length,
        comAvisos: produtosComAviso.length,
        erros: errosCriticos.length,
        total: totalValidos
      });
      
      if (totalValidos === 0) {
        const msgErro = errosCriticos.length > 0 
          ? `Nenhum produto válido. ${errosCriticos.length} erro(s) encontrado(s). Veja os detalhes.`
          : 'Nenhum produto válido encontrado no arquivo';
        toast.error(msgErro);
        
        // Retornar com erros para mostrar no modal
        if (errosCriticos.length > 0) {
          return {
            validos: 0,
            comAvisos: 0,
            novos: 0,
            atualizacoes: 0,
            erros: errosCriticos.length,
            errorDetails: errosCriticos,
            avisoDetails: [],
            data: { novos: [], atualizacoes: [], novosComAviso: [], atualizacoesComAviso: [] }
          };
        }
        return null;
      }

      if (totalValidos > 2000) {
        toast.error(`Limite de 2000 produtos por importação. Arquivo contém ${totalValidos} produtos.`);
        return null;
      }

      // Detectar novos vs atualizações (UPSERT)
      const novos = [];
      const atualizacoes = [];
      const novosComAviso = [];
      const atualizacoesComAviso = [];
      
      // Produtos 100% válidos
      for (const prod of produtosValidos) {
        if (produtosExistentesMap.has(prod.codigo)) {
          const existente = produtosExistentesMap.get(prod.codigo);
          atualizacoes.push({ id: existente.id, data: prod, produtoExistente: existente });
        } else {
          novos.push(prod);
        }
      }
      
      // Produtos com avisos
      for (const prod of produtosComAviso) {
        const { _avisos, _linha, ...produtoLimpo } = prod;
        if (produtosExistentesMap.has(produtoLimpo.codigo)) {
          const existente = produtosExistentesMap.get(produtoLimpo.codigo);
          atualizacoesComAviso.push({ id: existente.id, data: produtoLimpo, avisos: _avisos, linha: _linha, produtoExistente: existente });
        } else {
          novosComAviso.push({ ...produtoLimpo, _avisos, _linha });
        }
      }

      return {
        validos: produtosValidos.length,
        comAvisos: produtosComAviso.length,
        novos: novos.length,
        atualizacoes: atualizacoes.length,
        erros: errosCriticos.length,
        errorDetails: errosCriticos,
        avisoDetails: produtosComAviso.map(p => ({
          linha: p._linha,
          codigo: p.codigo,
          nome: p.nome,
          avisos: p._avisos
        })),
        data: { novos, atualizacoes, novosComAviso, atualizacoesComAviso },
        // Adicionar informação do mapeamento de colunas para exibir na validação
        columnMapping: {
          codigo: codigoIdx !== -1 ? rawHeaders[codigoIdx] : null,
          nome: nomeIdx !== -1 ? rawHeaders[nomeIdx] : null,
          categoria: categoriaIdx !== -1 ? rawHeaders[categoriaIdx] : null,
          valor: valorIdx !== -1 ? rawHeaders[valorIdx] : null,
          descricao: descricaoIdx !== -1 ? rawHeaders[descricaoIdx] : null,
          vantagens: vantagensIdx !== -1 ? rawHeaders[vantagensIdx] : null,
          desvantagens: desvantagensIdx !== -1 ? rawHeaders[desvantagensIdx] : null
        }
      };

    } catch (error) {
      console.error('❌ Erro crítico na validação:', error);
      
      let errorMsg = '❌ Erro ao processar arquivo: ';
      if (error.message?.includes('Excel')) {
        errorMsg += 'Arquivo Excel inválido ou corrompido. Tente salvar como CSV.';
      } else if (error.message === 'ENCODING_ERROR') {
        errorMsg += 'Caracteres corrompidos detectados. Salve como UTF-8.';
      } else {
        errorMsg += error.message || 'Formato inválido. Verifique o arquivo.';
      }
      
      toast.error(errorMsg, { duration: 5000 });
      
      // Mostrar erro técnico no console para debug
      console.error('Detalhes do erro:', {
        nome_arquivo: file?.name,
        tamanho: file?.size,
        tipo: file?.type,
        erro_completo: error
      });
      
      return null;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📁 Arquivo selecionado:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
    
    try {
      // PRÉ-VALIDAÇÃO
      const validation = await validateAndPrepareImport(file);
      
      if (!validation) {
        e.target.value = '';
        return;
      }

      console.log('✅ Validação concluída, abrindo modal de confirmação');
      
      // Mostrar modal de confirmação
      setPreValidation(validation);
      setPendingImport(validation.data);
      setShowValidationModal(true);
      setShowAvisos(false);
    } catch (error) {
      console.error('❌ Erro no handleFileUpload:', error);
      toast.error('Erro inesperado ao processar arquivo. Veja o console.');
    }
    
    e.target.value = '';
  };

  const executeImport = async (incluirAvisos = false) => {
    if (!pendingImport) return;

    setShowValidationModal(false);
    setIsImporting(true);
    setImportProgress(0);
    
    let novos = [...pendingImport.novos];
    let atualizacoes = [...pendingImport.atualizacoes];
    
    if (incluirAvisos) {
      novos = [...novos, ...pendingImport.novosComAviso.map(p => {
        const { _avisos, _linha, ...prod } = p;
        return prod;
      })];
      atualizacoes = [...atualizacoes, ...pendingImport.atualizacoesComAviso];
    }
    
    setImportStats({
      total: novos.length + atualizacoes.length,
      processed: 0,
      success: 0,
      updated: 0,
      errors: preValidation.erros,
      errorDetails: preValidation.errorDetails
    });

    try {
      const total = novos.length + atualizacoes.length;
      
      const batchSize = 50;
      let processados = 0;
      let sucessos = 0;
      let atualizados = 0;
      const errosImportacao = [...preValidation.errorDetails];

      // Processar novos produtos em lotes
      for (let i = 0; i < novos.length; i += batchSize) {
        const batch = novos.slice(i, i + batchSize);
        try {
          const resultado = await bulkCreateMutation.mutateAsync(batch);
          sucessos += batch.length;
          console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} criado: ${batch.length} produtos`);
        } catch (err) {
          console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, err);
          for (const item of batch) {
            errosImportacao.push({ 
              linha: '-',
              codigo: item.codigo,
              nome: item.nome,
              erro: `Erro ao criar: ${err.message || 'Erro desconhecido'}`
            });
          }
        }
        processados += batch.length;
        
        setImportStats(prev => ({
          ...prev,
          processed: processados,
          success: sucessos,
          errors: errosImportacao.length,
          errorDetails: errosImportacao
        }));
        setImportProgress((processados / total) * 100);
      }

      // Processar atualizações individualmente
      for (const { id, data } of atualizacoes) {
        try {
          await updateMutation.mutateAsync({ id, data });
          atualizados++;
          console.log(`🔄 Atualizado: ${data.codigo} - ${data.nome}`);
        } catch (err) {
          console.error(`❌ Erro ao atualizar ${data.codigo}:`, err);
          errosImportacao.push({ 
            linha: '-',
            codigo: data.codigo,
            nome: data.nome,
            erro: `Erro ao atualizar: ${err.message || 'Erro desconhecido'}`
          });
        }
        processados++;
        
        setImportStats(prev => ({
          ...prev,
          processed: processados,
          updated: atualizados,
          errors: errosImportacao.length,
          errorDetails: errosImportacao
        }));
        setImportProgress((processados / total) * 100);
      }

      // Finalizar
      await queryClient.invalidateQueries(['produtos']);
      
      setTimeout(() => {
        const msg = sucessos + atualizados > 0 
          ? `✅ Importação concluída! ${sucessos} criados, ${atualizados} atualizados${errosImportacao.length > 0 ? `, ${errosImportacao.length} com erro` : ''}`
          : '❌ Nenhum produto foi importado';
        
        if (sucessos + atualizados > 0) {
          toast.success(msg, { duration: 5000 });
        } else {
          toast.error(msg);
        }

        // Log resumo no console para debug
        console.log('📊 Resumo da Importação:', {
          novos_criados: sucessos,
          produtos_atualizados: atualizados,
          erros: errosImportacao.length,
          total_processado: sucessos + atualizados + errosImportacao.length
        });
        
        if (errosImportacao.length === 0) {
          setIsImporting(false);
          setImportProgress(0);
        }
      }, 500);

    } catch (error) {
      toast.error('Erro crítico durante importação');
      setIsImporting(false);
    }
    
    setPendingImport(null);
    setPreValidation(null);
  };

  const downloadTemplate = () => {
    // Adicionar BOM UTF-8 para garantir que Excel abra corretamente com acentos
    const BOM = '\uFEFF';
    const csvContent = `codigo;nome;categoria;valor;descricao;vantagens;desvantagens
P001;"Troca de motor de vidro elétrico";"eletrica";150.00;"Serviço completo de substituição";"Restaura o funcionamento completo do vidro, evita acidentes e melhora o conforto";"Sem o reparo, o vidro pode travar aberto ou fechado, comprometendo segurança e conforto"
P002;"Regulagem de fechadura";"portas";89.90;"Ajuste e lubrificação";"Melhora o fechamento da porta, evita desgaste prematuro das travas";"Porta pode não fechar corretamente, permitindo entrada de água, sujeira e até furtos"`;
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_produtos.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Produtos e Serviços</h1>
              <p className="text-slate-500">
                {produtos.length} cadastrados
                {selectedIds.length > 0 && ` • ${selectedIds.length} selecionado(s)`}
              </p>
            </div>
            <div className="flex gap-2">{selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteMultiple(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir ({selectedIds.length})
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isImporting}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Importar
              </Button>
              <Button
                variant="outline"
                onClick={downloadTemplate}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Modelo
              </Button>
              <Button 
                onClick={() => openModal()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {filteredProdutos.length > 0 && (
            <label className="flex items-center gap-2 px-3 h-12 border rounded-lg bg-white cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredProdutos.length}
                onChange={toggleSelectAll}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Selecionar todos</span>
            </label>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar produto ou serviço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Import Progress */}
      {isImporting && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-orange-900">
                  Importação em andamento...
                </span>
                <span className="text-lg font-bold text-orange-700">
                  {Math.round(importProgress)}%
                </span>
              </div>
              
              <div className="w-full bg-orange-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-orange-500 h-full transition-all duration-300 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${importProgress}%` }}
                >
                  {importProgress > 10 && (
                    <span className="text-xs font-semibold text-white">
                      {Math.round(importProgress)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-800 font-medium">
                  Importando item {importStats.processed} de {importStats.total}
                </span>
                <span className="text-orange-700">
                  {importStats.total > 0 && Math.max(1, Math.round((importStats.total - importStats.processed) / 10))} seg restantes
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-green-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{importStats.success}</div>
                  <div className="text-xs text-green-600">Criados</div>
                </div>
                <div className="bg-blue-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{importStats.updated}</div>
                  <div className="text-xs text-blue-600">Atualizados</div>
                </div>
                <div className="bg-red-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{importStats.errors}</div>
                  <div className="text-xs text-red-600">Erros</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 border-t border-orange-300">
                <Loader2 className="w-4 h-4 animate-spin text-orange-700" />
                <p className="text-sm text-orange-800 font-medium">
                  Não saia desta página durante a importação
                </p>
              </div>

              {importStats.errorDetails.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-700 font-semibold hover:text-red-800">
                    Ver detalhes dos erros ({importStats.errorDetails.length})
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto bg-white rounded p-2 space-y-1">
                    {importStats.errorDetails.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="text-xs text-red-600">
                        <strong>Linha {err.linha}:</strong> {err.erro}
                      </div>
                    ))}
                    {importStats.errorDetails.length > 10 && (
                      <div className="text-xs text-red-500 italic">
                        ... e mais {importStats.errorDetails.length - 10} erro(s)
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredProdutos.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Nenhum produto encontrado</p>
              <Button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Produto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredProdutos.map((produto, index) => (
              <motion.div
                key={produto.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(produto.id)}
                          onChange={() => toggleSelect(produto.id)}
                          className="w-4 h-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                             {produto.codigo || 'S/C'}
                           </span>
                           <h3 className="font-semibold text-slate-800">{produto.nome}</h3>
                         </div>
                         <div className="flex items-center gap-2">
                           <Badge className={getCategoriaColor(produto.categoria)}>
                             {produto.categoria}
                           </Badge>
                            {produto.descricao && (
                              <span className="text-xs text-slate-500 truncate max-w-[200px]">
                                {produto.descricao}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-green-600 text-lg">
                          R$ {produto.valor?.toFixed(2)}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModal(produto)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(produto.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ex: P001"
                className="h-12"
              />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do produto ou serviço"
                className="h-12"
              />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
                className="h-12"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Observações sobre o produto..."
                className="min-h-[60px]"
              />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Vantagens de Fazer</span>
                <span className="text-xs text-slate-500">
                  {formData.vantagens?.length || 0}/500
                </span>
              </Label>
              <Textarea
                value={formData.vantagens}
                onChange={(e) => {
                  const value = e.target.value.substring(0, 500);
                  setFormData({ ...formData, vantagens: value });
                }}
                placeholder="Benefícios de realizar o serviço..."
                className="min-h-[60px]"
                maxLength={500}
              />
              <p className="text-xs text-slate-500 mt-1">
                Máximo 500 caracteres
              </p>
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Desvantagens de Não Fazer</span>
                <span className="text-xs text-slate-500">
                  {formData.desvantagens?.length || 0}/500
                </span>
              </Label>
              <Textarea
                value={formData.desvantagens}
                onChange={(e) => {
                  const value = e.target.value.substring(0, 500);
                  setFormData({ ...formData, desvantagens: value });
                }}
                placeholder="Riscos de não realizar o serviço..."
                className="min-h-[60px]"
                maxLength={500}
              />
              <p className="text-xs text-slate-500 mt-1">
                Máximo 500 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Multiple Confirmation */}
      <AlertDialog open={showDeleteMultiple} onOpenChange={setShowDeleteMultiple}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} produto(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os produtos selecionados serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteMultipleMutation.isPending && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Excluindo item {deleteStats.processed} de {deleteStats.total}
                </span>
                <span className="text-sm font-bold text-slate-900">{Math.round(deleteProgress)}%</span>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${deleteProgress}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 rounded p-2 text-center">
                  <div className="text-lg font-bold text-green-700">{deleteStats.success}</div>
                  <div className="text-xs text-green-600">Excluídos</div>
                </div>
                <div className="bg-red-50 rounded p-2 text-center">
                  <div className="text-lg font-bold text-red-700">{deleteStats.errors}</div>
                  <div className="text-xs text-red-600">Erros</div>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Por favor, aguarde. Não feche esta janela.
              </p>
            </div>
          )}

          {!deleteMultipleMutation.isPending && deleteStats.errorDetails.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-red-700 mb-2">
                ⚠️ Relatório de Erros ({deleteStats.errorDetails.length})
              </h4>
              <div className="max-h-40 overflow-y-auto bg-red-50 rounded p-3 space-y-1">
                {deleteStats.errorDetails.map((err, idx) => (
                  <div key={idx} className="text-xs">
                    <strong className="text-red-800">{err.codigo} - {err.nome}:</strong>
                    <span className="text-red-600 ml-1">{err.erro}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-2">
                💡 Produtos podem estar vinculados a orçamentos existentes
              </p>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteMultipleMutation.isPending}
              onClick={() => {
                setDeleteProgress(0);
                setDeleteStats({ total: 0, processed: 0, success: 0, errors: 0, errorDetails: [] });
              }}
            >
              {deleteStats.errorDetails.length > 0 ? 'Fechar' : 'Cancelar'}
            </AlertDialogCancel>
            {deleteStats.errorDetails.length === 0 && (
              <AlertDialogAction 
                onClick={() => deleteMultipleMutation.mutate(selectedIds)}
                disabled={deleteMultipleMutation.isPending}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteMultipleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Confirmar Exclusão'
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {preValidation?.erros === 0 ? '✅' : '⚠️'} Validação da Importação
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Column Mapping Preview */}
            {preValidation?.columnMapping && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  🗺️ Mapeamento de Colunas Detectado
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {Object.entries(preValidation.columnMapping).map(([campo, coluna]) => (
                    coluna && (
                      <div key={campo} className="bg-white rounded p-2 border border-blue-100">
                        <span className="font-mono text-xs text-blue-700">{coluna}</span>
                        <span className="text-slate-500 mx-2">→</span>
                        <span className="font-semibold text-slate-700">{campo}</span>
                      </div>
                    )
                  ))}
                </div>
                <p className="text-xs text-blue-700 mt-3">
                  ✓ Verifique se o mapeamento está correto antes de prosseguir
                </p>
              </div>
            )}
            
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{preValidation?.validos || 0}</div>
                <div className="text-xs text-green-600">100% válidos</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{preValidation?.comAvisos || 0}</div>
                <div className="text-xs text-amber-600">Com avisos</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {(preValidation?.novos || 0) + (preValidation?.data?.novosComAviso?.length || 0)}
                </div>
                <div className="text-xs text-blue-600">🆕 Novos</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-700">
                  {(preValidation?.atualizacoes || 0) + (preValidation?.data?.atualizacoesComAviso?.length || 0)}
                </div>
                <div className="text-xs text-purple-600">🔄 Atualizar</div>
              </div>
            </div>

            {((preValidation?.atualizacoes || 0) + (preValidation?.data?.atualizacoesComAviso?.length || 0)) > 0 && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800 font-semibold">
                  🔄 {(preValidation?.atualizacoes || 0) + (preValidation?.data?.atualizacoesComAviso?.length || 0)} produto(s) já existem e serão atualizados com as novas informações
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Os produtos existentes serão localizados pelo código e terão seus dados substituídos pelos valores da planilha
                </p>
              </div>
            )}

            {preValidation?.erros > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-semibold">
                  ❌ {preValidation.erros} produto(s) com erros críticos NÃO serão importados
                </p>
              </div>
            )}

            {/* Warnings Details */}
            {preValidation?.comAvisos > 0 && (
              <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                <button
                  onClick={() => setShowAvisos(!showAvisos)}
                  className="w-full flex items-center justify-between font-semibold text-amber-800 mb-2"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Produtos com Avisos ({preValidation.comAvisos})
                  </span>
                  <span className="text-xs">
                    {showAvisos ? '▼ Ocultar' : '▶ Ver detalhes'}
                  </span>
                </button>
                <p className="text-xs text-amber-700 mb-2">
                  Estes produtos podem ser importados, mas contêm dados incompletos ou ajustados automaticamente.
                </p>
                {showAvisos && (
                  <div className="max-h-64 overflow-y-auto space-y-2 mt-3">
                    {preValidation.avisoDetails?.slice(0, 20).map((item, idx) => (
                      <div key={idx} className="text-sm bg-white rounded p-2 border border-amber-100">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="font-mono text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                            Linha {item.linha}
                          </span>
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {item.codigo}
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs font-medium">{item.nome}</p>
                        <ul className="mt-1 space-y-0.5">
                          {item.avisos.map((aviso, i) => (
                            <li key={i} className="text-amber-600 text-xs">⚠️ {aviso}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {preValidation.avisoDetails?.length > 20 && (
                      <p className="text-xs text-amber-600 text-center italic">
                        ... e mais {preValidation.avisoDetails.length - 20} produto(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Details */}
            {preValidation?.erros > 0 && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Erros Críticos - Não Podem Ser Importados ({preValidation.erros})
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {preValidation.errorDetails.slice(0, 20).map((err, idx) => (
                    <div key={idx} className="text-sm bg-white rounded p-3 border border-red-100">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="font-mono text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Linha {err.linha}
                        </span>
                        {err.codigo !== '-' && (
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {err.codigo}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 text-xs font-medium mb-1">{err.nome}</p>
                      <p className="text-red-600 font-semibold text-xs">❌ {err.erro}</p>
                      <p className="text-red-500 text-xs mt-1">💡 {err.motivo}</p>
                    </div>
                  ))}
                  {preValidation.errorDetails.length > 20 && (
                    <p className="text-xs text-red-600 text-center italic mt-2">
                      ... e mais {preValidation.errorDetails.length - 20} erro(s)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Confirmation Message */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                📋 Resumo da Operação
              </p>
              <div className="space-y-1 text-sm text-slate-700">
                {preValidation?.erros === 0 && preValidation?.comAvisos === 0 ? (
                  <>
                    <p>✅ <strong>Todos os {preValidation?.validos} registros estão 100% válidos!</strong></p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(preValidation?.novos || 0) > 0 && `🆕 ${preValidation.novos} novos produtos`}
                      {(preValidation?.novos || 0) > 0 && (preValidation?.atualizacoes || 0) > 0 && ' • '}
                      {(preValidation?.atualizacoes || 0) > 0 && `🔄 ${preValidation.atualizacoes} atualizações`}
                    </p>
                  </>
                ) : (
                  <>
                    {preValidation?.validos > 0 && (
                      <p>✅ {preValidation.validos} produto(s) 100% válidos</p>
                    )}
                    {preValidation?.comAvisos > 0 && (
                      <p>⚠️ {preValidation.comAvisos} produto(s) com avisos (podem ser importados)</p>
                    )}
                    {preValidation?.erros > 0 && (
                      <p>❌ {preValidation.erros} produto(s) com erros críticos (não serão importados)</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      {(preValidation?.novos || 0) + (preValidation?.data?.novosComAviso?.length || 0) > 0 && 
                        `🆕 ${(preValidation?.novos || 0) + (preValidation?.data?.novosComAviso?.length || 0)} novos`}
                      {((preValidation?.novos || 0) + (preValidation?.data?.novosComAviso?.length || 0) > 0) && 
                       ((preValidation?.atualizacoes || 0) + (preValidation?.data?.atualizacoesComAviso?.length || 0) > 0) && ' • '}
                      {(preValidation?.atualizacoes || 0) + (preValidation?.data?.atualizacoesComAviso?.length || 0) > 0 && 
                        `🔄 ${(preValidation?.atualizacoes || 0) + (preValidation?.data?.atualizacoesComAviso?.length || 0)} atualizações`}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowValidationModal(false);
                setPendingImport(null);
                setPreValidation(null);
                setShowAvisos(false);
              }}
            >
              Cancelar
            </Button>
            
            {preValidation?.comAvisos > 0 && (
              <Button 
                onClick={() => executeImport(true)}
                className="bg-amber-500 hover:bg-amber-600"
                disabled={(preValidation?.validos + preValidation?.comAvisos) === 0}
              >
                Importar Tudo ({(preValidation?.validos || 0) + (preValidation?.comAvisos || 0)})
              </Button>
            )}
            
            <Button 
              onClick={() => executeImport(false)}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={preValidation?.validos === 0}
            >
              {preValidation?.comAvisos > 0 
                ? `Importar Válidos (${preValidation.validos})` 
                : `✓ Confirmar Importação (${preValidation?.validos || 0})`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}