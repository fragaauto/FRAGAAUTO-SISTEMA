import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Seletor pesquisável (por nome ou código) para componentes de kit/composição.
// props: produtos (lista completa), value (produto_id), onSelect(produto), placeholder
export default function SeletorComponenteKit({ produtos = [], value, onSelect, placeholder = 'Buscar por nome ou código...' }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const selecionado = useMemo(
    () => produtos.find(p => p.id === value) || null,
    [produtos, value]
  );

  // filtro: ambos os termos devem bater (nome contém E código contém, quando ambos informados)
  // na verdade juntamos nome+codigo e checamos se a string de busca (tolower) está contida
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    const termos = q.split(/\s+/).filter(Boolean);
    return produtos.filter(p => {
      const alvo = `${p.codigo || ''} ${p.nome || ''}`.toLowerCase();
      return termos.every(t => alvo.includes(t));
    });
  }, [produtos, busca]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-9 justify-between text-sm font-normal"
        >
          <span className={cn('truncate', !selecionado && 'text-muted-foreground')}>
            {selecionado
              ? `${selecionado.codigo ? selecionado.codigo + ' — ' : ''}${selecionado.nome}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4}>
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Nome ou código..."
              value={busca}
              onValueChange={setBusca}
              className="h-9"
            />
          </div>
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {filtrados.slice(0, 200).map(p => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => { onSelect(p); setOpen(false); setBusca(''); }}
                  className="gap-2"
                >
                  <Check className={cn('h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="font-mono text-xs text-slate-500 min-w-[60px]">{p.codigo || '—'}</span>
                  <span className="truncate">{p.nome}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}