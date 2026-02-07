import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 ERROR BOUNDARY:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Erro ao Carregar Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">
                Não foi possível carregar os dados do checklist. Isso pode acontecer com atendimentos antigos ou corrompidos.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Recarregar Página
                </Button>
                <Button 
                  onClick={() => window.history.back()} 
                  variant="outline"
                  className="w-full"
                >
                  Voltar
                </Button>
              </div>
              {this.state.error && (
                <details className="text-xs text-slate-500 mt-4">
                  <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
                  <pre className="mt-2 p-2 bg-slate-100 rounded overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;