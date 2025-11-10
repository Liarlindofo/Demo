"use client";

import { useEffect, useState } from "react";
import { ErrorPopup } from "./error-popup";
import { setGlobalErrorHandler, initializeErrorHandling, ErrorInfo } from "@/lib/error-handler";

export function GlobalErrorHandler() {
  const [error, setError] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    // Configurar handler global
    setGlobalErrorHandler((errorInfo: ErrorInfo) => {
      setError(errorInfo);
    });

    // Inicializar interceptadores
    initializeErrorHandling();
  }, []);

  const handleClose = () => {
    setError(null);
  };

  return (
    <>
      {error && (
        <ErrorPopup
          error={error}
          onClose={handleClose}
        />
      )}
    </>
  );
}

