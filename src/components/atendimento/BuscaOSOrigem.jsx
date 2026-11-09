import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2 } from 'lucide-react';
import { buildAtendimentoSearchQuery } from '@/lib/atendimentoSearchQuery';

// Busca por número aceita digitação parcial: além do número exato, procura
// as OS cujo número começa com os dígitos digitados (ex.: "267" encontra 2675).
function buildQueryOrigem(termo) {
  const limpo = termo.replace(/\s/g, '');
  if (!/^\d{2,}$/.test(limpo)) return buildAtendimentoSearchQuery(termo);

  const alternativas = [{ numero_os: Number(limpo) }, { placa: { $regex: limpo, $options: 'i' } }];
  for (let tamanho = limpo.length + 1; tamanho <= 6; tamanho++) {
    const fator = Math.pow(10, tamanho - limpo.length);
    const base = Number(limpo) * fator;
    alternativas.push({ numero_os: { $gte: base, $lt: base + fator } });
  }
  return { $or: alternativas };
}

const TONES = {
  amber: { hover: 'hover:bg-amber-50', texto: 'text-amber-700' },
  green: { hover: 'hover:bg-green-50', texto: 'text-green-700' },
};

// Campo de busca da OS de origem: procura no servidor por número da OS,
// placa ou cliente (com resultado aproximado), sem depender da lista carregada.
export default function BuscaOSOrigem({
  origem,
  onSelect,
  recentes = [],
  label = 'Vincular à OS de origem',
  placeholder = 'Buscar por nº da OS, placa ou cliente...',
  tone = 'amber',
}) {
  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTermo(texto.trim()), 350);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    if (origem) {
      setTexto(`OS #${origem.numero_os} — ${origem.placa || 'Sem placa'} ${origem.cliente_nome || ''}`.trim());
    } else {
      setTexto('');
    }
  }, [origem?.id]);

  const { data: encontrados = [], isFetching } = useQuery({
    queryKey: ['busca-os-origem', termo],
    queryFn: async () => {
      const page = await base44.entities.Atendimento.filter(
        { ...buildQueryOrigem(termo), retorno_servico: { $ne: true } },
        { sort: '-numero_os', limit: 10 }
      );
      return page.items;
    },
    enabled: termo.length >= 1,
    staleTime: 30 * 1000,
  });

  const sugestoes = useMemo(() => {
    if (termo.length < 1) return (recentes || []).slice(0, 8);
    return encontrados;
  }, [termo, encontrados, recentes]);

  const cor = TONES[tone] || TONES.amber;

  const selecionar = (a) => {
    onSelect(a);
    setAberto(false);
  };

  return (
    <div className="relative">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={placeholder}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 200)}
          className="pl-9 pr-9"
          autoComplete="off"
          spellCheck={false}
        />
        {isFetching && termo.length >= 1 && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {sugestoes.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selecionar(a); }}
              className={`w-full text-left px-3 py-2.5 transition-colors border-b last:border-0 flex items-center gap-3 ${cor.hover}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">
                  OS #{a.numero_os} — {a.placa || 'Sem placa'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {a.cliente_nome || 'Sem cliente'}{a.modelo ? ` · ${a.modelo}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {aberto && termo.length >= 1 && !isFetching && sugestoes.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2.5">
          <p className="text-xs text-slate-500">Nenhuma OS encontrada para “{termo}”.</p>
        </div>
      )}

      {origem && (
        <p className={`text-xs mt-2 font-medium ${cor.texto}`}>✓ Vinculado à OS #{origem.numero_os}</p>
      )}
    </div>
  );
}