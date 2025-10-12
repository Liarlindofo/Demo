import React from 'react';

export function Logo() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Logo DRIN com estilo chalk-like exato da imagem */}
        <div className="text-white font-bold text-3xl tracking-wider relative">
          <span className="relative z-10" style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: '900',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.6)',
            filter: 'contrast(1.3) brightness(1.2)',
            letterSpacing: '0.1em'
          }}>
            DRIN
          </span>
          
          {/* Linha curva abaixo do texto - mais espessa e curva */}
          <div className="absolute -bottom-3 left-0 right-0 h-2 bg-white rounded-full opacity-90"
               style={{
                 transform: 'scaleY(0.4) scaleX(0.8)',
                 borderRadius: '50%',
                 filter: 'blur(0.3px)',
                 marginLeft: '10%',
                 marginRight: '10%'
               }}>
          </div>
        </div>
      </div>
    </div>
  );
}
