"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface NotificationProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export function Notification({ 
  message, 
  type, 
  onClose, 
  duration = 5000 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";
  const Icon = type === "success" ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ease-in-out ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
      onClick={handleClick}
    >
      <div className={`${bgColor} text-white p-4 rounded-lg shadow-lg flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity`}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <X className="h-4 w-4 flex-shrink-0 opacity-70 hover:opacity-100" />
      </div>
    </div>
  );
}

// Hook para gerenciar notificações
export function useNotification() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: "success" | "error";
  }>>([]);

  const showNotification = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const NotificationContainer = () => (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );

  return {
    showNotification,
    NotificationContainer
  };
}













