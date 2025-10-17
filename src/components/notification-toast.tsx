"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Info } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Aguarda a animação de saída
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-400" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-900/20 border-green-500/30";
      case "error":
        return "bg-red-900/20 border-red-500/30";
      case "info":
        return "bg-blue-900/20 border-blue-500/30";
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg border backdrop-blur-sm transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      } ${getBgColor()}`}
    >
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className="text-white text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

interface ToastManagerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: "success" | "error" | "info";
  }>;
  onRemoveToast: (id: string) => void;
}

export function ToastManager({ toasts, onRemoveToast }: ToastManagerProps) {
  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemoveToast(toast.id)}
        />
      ))}
    </>
  );
}





