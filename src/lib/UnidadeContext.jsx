import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const UnidadeContext = createContext(null);

export function UnidadeProvider({ children }) {
  const [user, setUser] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [unidadeAtual, setUnidadeAtualState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const [me, lista] = await Promise.all([
        base44.auth.me(),
        base44.entities.Unidade.filter({ status: 'ativo' })
      ]);
      setUser(me);
      setUnidades(lista);

      // Admin: restaura última seleção ou usa primeira unidade
      if (me?.role === 'admin') {
        const salva = localStorage.getItem('unidade_selecionada_id');
        const encontrada = salva ? lista.find(u => u.id === salva) : null;
        setUnidadeAtualState(encontrada || lista[0] || null);
      } else {
        // Operacional: usa a unidade vinculada ao usuário
        if (me?.unidade_id) {
          const uniUser = lista.find(u => u.id === me.unidade_id);
          setUnidadeAtualState(uniUser || null);
        } else {
          setUnidadeAtualState(lista[0] || null);
        }
      }
    } catch {
      // não autenticado — sem contexto de unidade
    } finally {
      setLoading(false);
    }
  };

  const setUnidadeAtual = useCallback((unidade) => {
    setUnidadeAtualState(unidade);
    if (unidade) {
      localStorage.setItem('unidade_selecionada_id', unidade.id);
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  // Retorna filtro pronto para usar em .filter() do SDK
  const filtroUnidade = unidadeAtual ? { unidade_id: unidadeAtual.id } : {};

  return (
    <UnidadeContext.Provider value={{
      user,
      unidades,
      unidadeAtual,
      setUnidadeAtual,
      filtroUnidade,
      isAdmin,
      loading,
      reload: init
    }}>
      {children}
    </UnidadeContext.Provider>
  );
}

export function useUnidade() {
  const ctx = useContext(UnidadeContext);
  if (!ctx) throw new Error('useUnidade must be used within UnidadeProvider');
  return ctx;
}