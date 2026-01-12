import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ClipboardCheck, 
  FileText, 
  Package, 
  Users, 
  Car,
  ArrowRight,
  Wrench,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon: Icon, title, description, href, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
  >
    <Link to={href}>
      <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-orange-200 h-full cursor-pointer">
        <CardContent className="p-6">
          <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
          <div className="flex items-center gap-2 mt-4 text-orange-600 font-medium text-sm group-hover:gap-3 transition-all">
            Acessar <ArrowRight className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

export default function Home() {
  const features = [
    {
      icon: ClipboardCheck,
      title: 'Novo Atendimento',
      description: 'Iniciar checklist técnico completo do veículo e gerar orçamento.',
      href: createPageUrl('NovoAtendimento'),
      color: 'bg-orange-500'
    },
    {
      icon: FileText,
      title: 'Atendimentos',
      description: 'Visualizar histórico de atendimentos e orçamentos gerados.',
      href: createPageUrl('Atendimentos'),
      color: 'bg-blue-500'
    },
    {
      icon: Package,
      title: 'Produtos e Serviços',
      description: 'Gerenciar catálogo de produtos e serviços disponíveis.',
      href: createPageUrl('Produtos'),
      color: 'bg-green-500'
    },
    {
      icon: Users,
      title: 'Clientes',
      description: 'Cadastro e histórico de clientes atendidos.',
      href: createPageUrl('Clientes'),
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center gap-8"
          >
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <img src="/logo.png" alt="Fraga Auto" className="w-12 h-12 rounded-xl object-cover" onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }} />
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center" style={{display: 'none'}}>
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <span className="text-orange-400 font-semibold tracking-wider text-sm">SISTEMA DE GESTÃO</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Fraga Auto Portas
              </h1>
              <p className="text-slate-300 text-lg md:text-xl max-w-xl">
                Sistema profissional de checklist técnico e geração de orçamentos para manutenção automotiva.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-8">
                <Link to={createPageUrl('NovoAtendimento')}>
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-6 text-base">
                    <ClipboardCheck className="w-5 h-5 mr-2" />
                    Novo Atendimento
                  </Button>
                </Link>
                <Link to={createPageUrl('Atendimentos')}>
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-6 text-base">
                    Ver Atendimentos
                  </Button>
                </Link>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="hidden md:flex items-center justify-center"
            >
              <div className="relative">
                <div className="w-64 h-64 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full absolute blur-3xl" />
                <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                  <Car className="w-32 h-32 text-orange-400" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
            Acesso Rápido
          </h2>
          <p className="text-slate-600">
            Selecione uma opção para começar
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={0.1 * index}
            />
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800">100%</p>
                <p className="text-sm text-slate-500">Seguro</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800">33</p>
                <p className="text-sm text-slate-500">Itens no Checklist</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800">PDF</p>
                <p className="text-sm text-slate-500">Profissional</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}