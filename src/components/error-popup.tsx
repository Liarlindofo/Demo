"use client";

import { useState } from "react";
import { X, AlertCircle, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPopupProps {
  error: {
    message: string;
    details?: string;
    stack?: string;
    url?: string;
    status?: number;
    timestamp: string;
  };
  onClose: () => void;
}

export function ErrorPopup({ error, onClose }: ErrorPopupProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const copyToClipboard = () => {
    const errorText = `
Erro: ${error.message}
${error.details ? `Detalhes: ${error.details}` : ''}
${error.url ? `URL: ${error.url}` : ''}
${error.status ? `Status: ${error.status}` : ''}
${error.stack ? `Stack: ${error.stack}` : ''}
Timestamp: ${error.timestamp}
    `.trim();

    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-red-500/50 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <h2 className="text-xl font-bold text-white">Erro Detectado</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error Message */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
              Mensagem de Erro
            </label>
            <p className="text-red-400 font-medium text-lg">{error.message}</p>
          </div>

          {/* Details */}
          {error.details && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
                Detalhes
              </label>
              <p className="text-gray-300 text-sm">{error.details}</p>
            </div>
          )}

          {/* URL */}
          {error.url && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
                URL
              </label>
              <p className="text-gray-300 text-sm break-all">{error.url}</p>
            </div>
          )}

          {/* Status */}
          {error.status && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
                Status HTTP
              </label>
              <p className="text-gray-300 text-sm">{error.status}</p>
            </div>
          )}

          {/* Stack Trace */}
          {error.stack && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-400 uppercase tracking-wide mb-1 block hover:text-gray-300 transition-colors"
              >
                {showDetails ? "Ocultar" : "Mostrar"} Stack Trace
              </button>
              {showDetails && (
                <pre className="bg-[#0f0f10] p-3 rounded text-xs text-gray-400 overflow-x-auto border border-gray-800">
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
              Timestamp
            </label>
            <p className="text-gray-300 text-sm">{error.timestamp}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-red-500/30 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copiar Erro</span>
              </>
            )}
          </Button>
          <Button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

