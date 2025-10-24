"use client";

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/contexts/app-context";

interface Store {
  id: string;
  name: string;
  avatar: string;
  status: "connected" | "disconnected";
  lastSync?: string;
}

const mockStores: Store[] = [
  {
    id: "1",
    name: "Restaurante Central",
    avatar: "/avatars/store-1.png",
    status: "connected",
    lastSync: "2 min atrás"
  },
  {
    id: "2", 
    name: "Pizzaria do João",
    avatar: "/avatars/store-2.png",
    status: "connected",
    lastSync: "5 min atrás"
  },
  {
    id: "3",
    name: "Lanchonete Express",
    avatar: "/avatars/store-3.png",
    status: "disconnected"
  },
  {
    id: "4",
    name: "Café & Cia",
    avatar: "/avatars/store-4.png",
    status: "connected",
    lastSync: "1 min atrás"
  }
];

export function StoreCarousel() {
  const { selectedStore, setSelectedStore, addToast, connectedAPIs } = useApp();

  // Filtrar lojas conectadas baseado nas APIs conectadas
  const connectedStores = mockStores.filter(store => store.status === "connected");
  
  // Se há apenas 1 API conectada, mostrar apenas 1 loja
  const shouldShowCarousel = connectedStores.length > 1;
  const storesToShow = connectedAPIs.length <= 1 ? connectedStores.slice(0, 1) : connectedStores;

  const handleStoreSelect = (store: Store) => {
    if (store.status === "connected") {
      setSelectedStore(store);
      addToast(`Loja ${store.name} selecionada!`, "success");
    } else {
      addToast("Esta loja está desconectada", "error");
    }
  };

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








