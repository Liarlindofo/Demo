"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Card, CardContent } from "@/components/ui/card";
import { Camera, Save, X } from "lucide-react";
import { useApp } from "@/contexts/app-context";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { addToast } = useApp();
  const [formData, setFormData] = useState({
    name: "Usuário Demo",
    email: "usuario@demo.com",
    phone: "(11) 99999-9999",
    avatar: "/avatars/01.png"
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast("Perfil atualizado com sucesso!", "success");
      onClose();
    } catch {
      addToast("Erro ao atualizar perfil", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = () => {
    // Simular mudança de avatar
    addToast("Funcionalidade de upload de avatar em desenvolvimento", "info");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#141415] border-[#374151] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Editar Perfil
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Atualize suas informações pessoais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.avatar} alt="Avatar" />
                <AvatarFallback className="bg-[#001F05] text-white text-2xl">
                  {formData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-[#001F05] hover:bg-[#001F05]/80"
                onClick={handleAvatarChange}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-400 text-center">
              Clique no ícone da câmera para alterar sua foto
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white text-sm">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-white text-sm">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-white text-sm">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-[#001F05] hover:bg-[#001F05]/80 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#374151] text-white hover:bg-[#374151]"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}





