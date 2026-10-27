import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowRight, Target, Trophy, TrendingUp } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { FRASES_MARCO } from '@/hooks/useCelebracaoMetas';

const ESTILOS = {
  geral: {
    Icone: Trophy,
    gradiente: 'from-emerald-500 via-green-500 to-teal-600',
    titulo: 'META GERAL BATIDA!',
    legenda: 'A loja alcançou a meta do mês. Parabéns ao time!',
  },
  categoria: {
    Icone: Target,
    gradiente: 'from-blue-500 via-indigo-500 to-violet-600',
    titulo: 'META DE CATEGORIA BATIDA!',
    legenda: 'Uma categoria alcançou a meta do mês.',
  },
  progresso: {
    Icone: TrendingUp,
    gradiente: 'from-orange-500 via-amber-500 to-yellow-500',
    titulo: 'A meta está avançando!',
    legenda: 'A equipe está no caminho certo.',
  },
};

const formatar = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CelebracaoMetaModal({ celebracao, onFechar }) {
  const navigate = useNavigate();
  const estilo = celebracao ? ESTILOS[celebracao.tipo] : null;
  const Icone = estilo?.Icone;

  useEffect(() => {
    if (!celebracao) return;
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
    const timer = setTimeout(
      () => confetti({ particleCount: 90, spread: 120, origin: { y: 0.35 } }),
      400
    );
    return () => clearTimeout(timer);
  }, [celebracao]);

  const abrirMetas = () => {
    onFechar();
    navigate(createPageUrl('Metas'));
  };

  return (
    <AnimatePresence>
      {celebracao && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={abrirMetas}
        >
          <motion.div
            role="button"
            tabIndex={0}
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl cursor-pointer"
          >
            <div className={`bg-gradient-to-br ${estilo.gradiente} px-6 py-8 text-center text-white`}>
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.12, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30"
              >
                <Icone className="h-11 w-11" />
              </motion.div>
              <motion.h2
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.22 }}
                className="text-2xl font-extrabold uppercase leading-tight tracking-wide"
              >
                {estilo.titulo}
              </motion.h2>
              <motion.p
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-1 text-sm text-white/90"
              >
                {estilo.legenda}
              </motion.p>
            </div>

            <div className="space-y-4 px-6 py-6 text-center">
              {celebracao.tipo === 'categoria' && (
                <p className="text-lg font-bold text-slate-800">{celebracao.categoria}</p>
              )}

              {celebracao.tipo === 'progresso' ? (
                <>
                  <div className="flex items-center justify-center gap-2">
                    {[25, 50, 75].map((marco) => (
                      <div
                        key={marco}
                        className={`h-2.5 flex-1 rounded-full ${
                          marco <= celebracao.marco ? 'bg-orange-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-2xl font-extrabold text-orange-600">{celebracao.marco}% da meta!</p>
                  <p className="text-sm text-slate-600">{FRASES_MARCO[celebracao.marco]}</p>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  R$ {formatar(celebracao.valor)} de R$ {formatar(celebracao.meta)} — meta atingida!
                </p>
              )}

              <button
                type="button"
                onClick={abrirMetas}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ver análise das metas
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onFechar}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}