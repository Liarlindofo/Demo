"use client";

import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/contexts/app-context";
import { SaiposAPIService, SaiposStore } from "@/lib/saipos-api";

interface Store {
  id: string;
  name: string;
  avatar: string;
  status: "connected" | "disconnected";
  lastSync?: string;
  apiId?: string; // ID da API conectada
}

// Dados mockados removidos - apenas dados reais da API Saipos

export function StoreCarousel() {
  const [isClient, setIsClient] = useState(false);
  const [saiposStores, setSaiposStores] = useState<SaiposStore[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const { selectedStore, setSelectedStore, addToast, connectedAPIs } = useApp();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Carregar lojas da API Saipos (suporta até 4 APIs conectadas)
  useEffect(() => {
    const loadStores = async () => {
      try {
        setIsLoadingStores(true);
        console.log('🏪 Carregando lojas da API Saipos...');
        
        // Verificar se há APIs conectadas (até 4)
        const connectedSaiposAPIs = connectedAPIs
          .filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey)
          .slice(0, 4);

        if (connectedSaiposAPIs.length === 0) {
          console.log('⚠️ Nenhuma API Saipos conectada');
          setSaiposStores([]);
          return;
        }

        // Buscar lojas de todas as APIs conectadas e agregar
        const allStores: SaiposStore[] = [];
        for (const apiConfig of connectedSaiposAPIs) {
          console.log(`🔗 Usando API: ${apiConfig.name}`);
          const userSaiposAPI = new SaiposAPIService({
            apiKey: apiConfig.apiKey!,
            baseUrl: apiConfig.baseUrl || 'https://data.saipos.io/v1'
          });
          const stores = await userSaiposAPI.getStores();
          // Anotar apiId de origem
          stores.forEach(s => (s.apiId = apiConfig.id));
          allStores.push(...stores);
        }

        setSaiposStores(allStores);
        console.log(`✅ ${allStores.length} lojas carregadas da Saipos (somando todas as APIs)`);
        addToast(`${allStores.length} lojas carregadas da Saipos!`, "success");
      } catch (error) {
        console.error('❌ Erro ao carregar lojas:', error);
        addToast("Erro ao carregar lojas da Saipos", "error");
        // Em caso de erro, manter array vazio
        setSaiposStores([]);
      } finally {
        setIsLoadingStores(false);
      }
    };

    if (isClient) {
      loadStores();
    }
  }, [isClient, addToast, connectedAPIs]);

  // Converter dados da Saipos para o formato do componente
  const convertedStores: Store[] = saiposStores.map(saiposStore => ({
    id: saiposStore.id,
    name: saiposStore.name,
    avatar: `/avatars/store-${saiposStore.id}.png`,
    status: saiposStore.status === 'active' ? 'connected' : 'disconnected',
    lastSync: saiposStore.lastSync ? 
      `${Math.floor((Date.now() - new Date(saiposStore.lastSync).getTime()) / (1000 * 60))} min atrás` : 
      undefined,
    apiId: saiposStore.apiId
  }));

  // As lojas exibidas já vêm apenas de APIs conectadas
  const connectedStores = convertedStores;

  // Lógica de exibição baseada no número de lojas conectadas
  const shouldShowCarousel = connectedStores.length > 1;
  const storesToShow = connectedStores;

  console.log('🔍 APIs conectadas:', connectedAPIs);
  console.log('🏪 Lojas da Saipos:', saiposStores);
  console.log('🏪 Lojas convertidas:', convertedStores);
  console.log('🏪 Lojas filtradas:', connectedStores);
  console.log('🎠 Deve mostrar carrossel:', shouldShowCarousel);

  // Selecionar automaticamente a primeira loja se nenhuma estiver selecionada
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (connectedStores.length > 0 && !selectedStore) {
      setSelectedStore(connectedStores[0]);
      addToast(`Loja ${connectedStores[0].name} selecionada automaticamente!`, "info");
    }
  }, [connectedStores, selectedStore, setSelectedStore, addToast]);

  const handleStoreSelect = (store: Store) => {
    if (store.status === "connected") {
      setSelectedStore(store);
      addToast(`Loja ${store.name} selecionada!`, "success");
    } else {
      addToast("Esta loja está desconectada", "error");
    }
  };

  if (!isClient || isLoadingStores) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white mb-2">Suas Lojas</h2>
          <p className="text-gray-400 text-sm">
            {isLoadingStores ? "Carregando lojas da Saipos..." : "Carregando..."}
          </p>
        </div>
        <div className="flex gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-48 h-32 bg-[#141415] border border-[#374151] rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">Suas Lojas</h2>
        <p className="text-gray-400 text-sm">
          {selectedStore 
            ? `Loja selecionada: ${selectedStore.name}` 
            : storesToShow.length > 0 
              ? "Selecione uma loja para visualizar os relatórios"
              : "Conecte uma API para visualizar suas lojas"
          }
        </p>
      </div>
      
      {storesToShow.length > 0 ? (
        shouldShowCarousel ? (
          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {storesToShow.map((store) => (
                <CarouselItem key={store.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/4">
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  store.status === "connected" 
                    ? selectedStore?.id === store.id
                      ? "bg-[#001F05]/30 border-[#001F05] ring-2 ring-[#001F05]/50"
                      : "bg-[#141415] border-[#001F05] hover:border-[#001F05]/50"
                    : "bg-[#141415] border-[#374151] opacity-60 cursor-not-allowed"
                }`}
                onClick={() => handleStoreSelect(store)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={store.avatar} alt={store.name} />
                        <AvatarFallback className="bg-[#001F05] text-white text-lg">
                          {store.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#141415] ${
                        store.status === "connected" ? "bg-green-500" : "bg-red-500"
                      }`} />
                      {/* Indicador de API conectada */}
                      {store.apiId && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#001F05] rounded-full border border-[#141415] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <h3 className="font-medium text-white text-sm">{store.name}</h3>
                      {store.status === "connected" && store.lastSync && (
                        <p className="text-xs text-gray-400 mt-1">
                          Sincronizado {store.lastSync}
                        </p>
                      )}
                      {store.status === "disconnected" && (
                        <p className="text-xs text-red-400 mt-1">
                          Desconectado
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="bg-[#141415] border-[#374151] text-white hover:bg-[#374151]" />
            <CarouselNext className="bg-[#141415] border-[#374151] text-white hover:bg-[#374151]" />
          </Carousel>
        ) : (
          // Card único quando há apenas 1 loja
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              {storesToShow.map((store) => (
                <Card 
                  key={store.id} 
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                    store.status === "connected" 
                      ? selectedStore?.id === store.id
                        ? "bg-[#001F05]/30 border-[#001F05] ring-2 ring-[#001F05]/50"
                        : "bg-[#141415] border-[#001F05] hover:border-[#001F05]/50"
                      : "bg-[#141415] border-[#374151] opacity-60 cursor-not-allowed"
                  }`}
                  onClick={() => handleStoreSelect(store)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={store.avatar} alt={store.name} />
                          <AvatarFallback className="bg-[#001F05] text-white text-xl">
                            {store.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#141415] ${
                          store.status === "connected" ? "bg-green-500" : "bg-red-500"
                        }`} />
                        {/* Indicador de API conectada */}
                        {store.apiId && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#001F05] rounded-full border border-[#141415] flex items-center justify-center">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-center">
                        <h3 className="font-semibold text-white text-lg">{store.name}</h3>
                        {store.status === "connected" && store.lastSync && (
                          <p className="text-sm text-gray-400 mt-2">
                            Sincronizado {store.lastSync}
                          </p>
                        )}
                        {store.status === "disconnected" && (
                          <p className="text-sm text-red-400 mt-2">
                            Desconectado
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      ) : (
        // Estado vazio quando não há lojas conectadas
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[#374151] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏪</span>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma loja conectada</h3>
          <p className="text-gray-400 text-sm mb-4">
            Conecte uma API para visualizar suas lojas aqui
          </p>
        </div>
      )}
    </div>
  );
}








