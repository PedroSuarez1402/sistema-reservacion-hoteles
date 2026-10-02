'use client';

import * as React from 'react';
import { MessageCircle } from 'lucide-react';
import {
  buildWhatsAppUrl,
  buildGeneralWhatsAppMessage,
  DEFAULT_RECEPTION_WHATSAPP,
} from '../lib/whatsapp';
import { cn } from '../lib/utils';

export interface WhatsAppButtonProps {
  phone?: string;
  message?: string;
  floating?: boolean;
  className?: string;
  label?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Ícono oficial de WhatsApp en formato SVG vectorial
 */
export function WhatsAppIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Componente Botón de WhatsApp para comunicación directa con recepción.
 * Puede funcionar como botón flotante en la esquina inferior derecha o inline.
 */
export function WhatsAppButton({
  phone,
  message,
  floating = true,
  className = '',
  label = 'Chatear con Recepción',
  showTooltip = true,
  tooltipText = '¿Tienes dudas? ¡Escríbenos a WhatsApp!',
  size = 'md',
}: WhatsAppButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const defaultMsg = message || buildGeneralWhatsAppMessage();
  const url = buildWhatsAppUrl(defaultMsg, phone);

  if (floating) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {showTooltip && (
          <div
            className={cn(
              'pointer-events-none hidden sm:flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-white shadow-xl transition-all duration-300',
              isHovered
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-2'
            )}
          >
            <span>{tooltipText}</span>
            <span className="h-2 w-2 rotate-45 bg-slate-900/90 -mr-2" />
          </div>
        )}

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar a recepción por WhatsApp"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-emerald-600/40 transition-all duration-300 hover:scale-110 hover:bg-[#20ba59] hover:shadow-emerald-600/60 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 active:scale-95',
            className
          )}
        >
          {/* Pulso de fondo animado */}
          <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-[#25D366] opacity-30 duration-1000" />

          {/* Ícono de WhatsApp */}
          <WhatsAppIcon className="h-8 w-8 drop-shadow-sm transition-transform duration-200 group-hover:scale-105" />

          {/* Badge indicador online */}
          <span className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
          </span>
        </a>
      </div>
    );
  }

  // Versión Inline para Cards o Secciones
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 shadow-sm active:scale-95',
        'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-emerald-600/20 hover:shadow-emerald-600/30',
        sizeClasses[size],
        className
      )}
    >
      <WhatsAppIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      <span>{label}</span>
    </a>
  );
}

export default WhatsAppButton;
