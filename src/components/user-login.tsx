"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/contexts/app-context";

export function UserLogin() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { userId, setUserId } = useApp();

  const handleLogin = () => {
    if (!username.trim()) return;
    
    // Para teste, vamos usar o username como userId
    const testUserId = `user-${username.toLowerCase().replace(/\s+/g, '-')}`;
    setUserId(testUserId);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUserId(null);
    setIsLoggedIn(false);
    setUsername("");
  };

  if (isLoggedIn && userId) {
    return (
      <Card className="bg-[#1a1a1a] border-[#374151] max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Usuário Logado</CardTitle>
          <CardDescription className="text-gray-400">
            Sistema de teste - Banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-gray-400">Usuário:</Label>
            <p className="text-white font-semibold">{username}</p>
          </div>
          <div>
            <Label className="text-gray-400">ID:</Label>
            <p className="text-white font-mono text-sm">{userId}</p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="w-full bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
          >
            Logout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1a1a] border-[#374151] max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-white">Login de Teste</CardTitle>
        <CardDescription className="text-gray-400">
          Sistema de teste para APIs no banco de dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="username" className="text-gray-400">Nome do Usuário</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu nome"
            className="bg-[#141415] border-[#374151] text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <Button 
          onClick={handleLogin}
          className="w-full bg-[#001F05] hover:bg-[#001F05]/80 text-white"
          disabled={!username.trim()}
        >
          Fazer Login
        </Button>
        <p className="text-xs text-gray-500 text-center">
          💡 Este é um sistema de teste. Use qualquer nome para testar as APIs.
        </p>
      </CardContent>
    </Card>
  );
}

