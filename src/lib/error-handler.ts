// Sistema global de captura e tratamento de erros

export interface ErrorInfo {
  message: string;
  details?: string;
  stack?: string;
  url?: string;
  status?: number;
  timestamp: string;
  type: 'api' | 'javascript' | 'promise' | 'react';
}

type ErrorHandler = (error: ErrorInfo) => void;

let globalErrorHandler: ErrorHandler | null = null;

export function setGlobalErrorHandler(handler: ErrorHandler) {
  globalErrorHandler = handler;
}

export function handleError(error: ErrorInfo) {
  console.error('🚨 Erro capturado:', error);
  
  if (globalErrorHandler) {
    globalErrorHandler(error);
  }
}

// Interceptar erros de API (fetch)
export function interceptFetchErrors() {
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      
      // Se a resposta não for OK, capturar como erro
      if (!response.ok) {
        // Extrair URL de forma segura
        let url: string = '';
        const firstArg = args[0];
        if (typeof firstArg === 'string') {
          url = firstArg;
        } else if (firstArg instanceof URL) {
          url = firstArg.toString();
        } else if (firstArg instanceof Request) {
          url = firstArg.url;
        }
        
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.clone().json().catch(() => null);
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
          if (errorData?.message) {
            errorDetails = errorData.message;
          }
        } catch {
          // Ignorar erro ao parsear JSON
        }
        
        handleError({
          message: errorMessage,
          details: errorDetails || `Erro HTTP ${response.status}`,
          url: url,
          status: response.status,
          timestamp: new Date().toISOString(),
          type: 'api',
        });
      }
      
      return response;
    } catch (error) {
      // Extrair URL de forma segura
      let url: string = '';
      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        url = firstArg;
      } else if (firstArg instanceof URL) {
        url = firstArg.toString();
      } else if (firstArg instanceof Request) {
        url = firstArg.url;
      }
      
      handleError({
        message: error instanceof Error ? error.message : 'Erro desconhecido na requisição',
        details: error instanceof Error ? error.stack : String(error),
        url: url,
        timestamp: new Date().toISOString(),
        type: 'api',
      });
      
      throw error;
    }
  };
}

// Interceptar erros JavaScript globais
export function interceptGlobalErrors() {
  // Erros não tratados
  window.addEventListener('error', (event) => {
    handleError({
      message: event.message || 'Erro JavaScript não tratado',
      details: `Arquivo: ${event.filename} (linha ${event.lineno}:${event.colno})`,
      stack: event.error?.stack,
      url: event.filename,
      timestamp: new Date().toISOString(),
      type: 'javascript',
    });
  });

  // Promises rejeitadas não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    handleError({
      message: error?.message || 'Promise rejeitada não tratada',
      details: error?.stack || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      type: 'promise',
    });
  });
}

// Inicializar interceptadores
export function initializeErrorHandling() {
  if (typeof window !== 'undefined') {
    interceptFetchErrors();
    interceptGlobalErrors();
  }
}

