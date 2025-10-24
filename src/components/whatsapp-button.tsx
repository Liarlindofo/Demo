"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";

export function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleWhatsAppClick = () => {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') {
      return;
    }

    // Número do WhatsApp (substitua pelo número real)
    const phoneNumber = "5511999999999";
    const message = "Olá! Preciso de ajuda com a plataforma Drin.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 bg-[#141415] border border-[#374151] rounded-lg p-4 shadow-lg min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium text-sm">Suporte</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-gray-400 text-xs mb-3">
            Precisa de ajuda? Entre em contato conosco via WhatsApp
          </p>
          <Button
            onClick={handleWhatsAppClick}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Abrir WhatsApp
          </Button>
        </div>
      )}
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}








