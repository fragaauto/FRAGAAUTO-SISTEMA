import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function OfertasProgressivas({ produtos, renderProduto }) {
  const [visiveis, setVisiveis] = useState(4);
  const sentinela = useRef(null);
  const temMais = visiveis < produtos.length;

  useEffect(() => {
    const alvo = sentinela.current;
    if (!temMais || !alvo) return;
    let carregou = false;
    const carregar = () => {
      if (carregou) return;
      carregou = true;
      setVisiveis((quantidade) => Math.min(quantidade + 4, produtos.length));
    };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entrada]) => {
        if (entrada.isIntersecting) carregar();
      }, { rootMargin: '350px 0px' });
      observer.observe(alvo);
      return () => observer.disconnect();
    }
    const verificar = () => {
      if (alvo.getBoundingClientRect().top <= window.innerHeight + 350) carregar();
    };
    window.addEventListener('scroll', verificar, { passive: true });
    window.addEventListener('resize', verificar);
    verificar();
    return () => {
      window.removeEventListener('scroll', verificar);
      window.removeEventListener('resize', verificar);
    };
  }, [temMais, visiveis, produtos.length]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {produtos.slice(0, visiveis).map(renderProduto)}
      </div>
      {temMais && <div ref={sentinela} role="status" className="flex h-8 items-center justify-center text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        <span className="sr-only">Carregando mais ofertas</span>
      </div>}
    </>
  );
}