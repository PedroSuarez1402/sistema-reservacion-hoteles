'use client';

import * as React from 'react';
import { CalendarDays, Sparkles, Maximize2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui';
import { ImageCarousel } from './ImageCarousel';
import {
  cn,
  enrichRoomWithMedia,
  formatCurrency,
  roomStatusStyles,
  roomTypeLabels,
} from '../lib/utils';
import type { Room } from '../types';

interface RoomCardProps {
  room: Room;
  displayActions?: 'booking' | 'admin' | 'none';
  onBook?: (room: Room) => void;
  onEdit?: (room: Room) => void;
  onDelete?: (room: Room) => void;
  onViewDetails?: (room: Room) => void;
  isLoading?: boolean;
}

const roomTypeIcon: Record<string, string> = {
  SENCILLA: '🛏️',
  DOBLE: '🛏️🛏️',
  SUITE: '🏠✨',
};

function RoomCard({
  room,
  displayActions = 'booking',
  onBook,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading,
}: RoomCardProps) {
  const statusMeta = roomStatusStyles[room.estado];
  const enhanced = React.useMemo(() => enrichRoomWithMedia(room), [room]);

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5">
      <div
        className={cn(
          'relative cursor-pointer',
          displayActions === 'admin' && !onViewDetails ? 'cursor-default' : ''
        )}
        onClick={() => onViewDetails?.(enhanced as unknown as Room)}
        role={onViewDetails ? 'button' : undefined}
        tabIndex={onViewDetails ? 0 : undefined}
        aria-label={
          onViewDetails ? `Ver detalles habitación ${room.numero}` : undefined
        }
        onKeyDown={(e) => {
          if (!onViewDetails) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewDetails(enhanced as unknown as Room);
          }
        }}
      >
        <div className="relative h-40 w-full overflow-hidden">
          {enhanced.imagenes && enhanced.imagenes.length > 0 ? (
            <>
              <ImageCarousel
                images={enhanced.imagenes}
                aspect="card"
                autoplay
                intervalMs={5500}
                rounded={false}
                altPrefix={`Habitación ${room.numero}`}
              />
              {onViewDetails ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Badge
                    variant="gray"
                    className="bg-black/55 text-white ring-0 backdrop-blur"
                  >
                    <Maximize2 className="mr-1 h-3 w-3" aria-hidden="true" />
                    Ver galería
                  </Badge>
                </div>
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 text-6xl transition-transform duration-300 group-hover:scale-110">
              {roomTypeIcon[room.tipo] ?? '🛏️'}
            </div>
          )}
          <div className="absolute right-3 top-3 z-10">
            <Badge
              className={cn('font-medium', statusMeta.className)}
            >
              {statusMeta.label}
            </Badge>
          </div>
          <div className="absolute left-3 top-3 z-10">
            <Badge variant="gray" className="font-medium">
              Habitación {room.numero}
            </Badge>
          </div>
        </div>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-600" />
          {roomTypeLabels[room.tipo] ?? room.tipo}
        </CardTitle>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-900">
            {formatCurrency(room.precio_noche)}
          </span>
          <span className="text-sm text-slate-500">/ noche</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span>
              Reserva para 1{room.tipo === 'DOBLE' ? ' o 2 ' : ' '}persona
              {room.tipo === 'DOBLE' ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
            {(enhanced.amenidades ?? []).slice(0, 4).map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5"
              >
                <span className="h-1 w-1 rounded-full bg-primary-500" aria-hidden="true" />
                {a}
              </span>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {displayActions === 'booking' ? (
          <div className="flex w-full gap-2">
            {onViewDetails ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(enhanced as unknown as Room)}
              >
                <Maximize2 className="h-4 w-4" />
                Detalles
              </Button>
            ) : null}
            <Button
              className="flex-1"
              onClick={() => onBook?.(enhanced as unknown as Room)}
              disabled={room.estado !== 'ACTIVA' || isLoading}
              loading={isLoading}
            >
              Reservar ahora
            </Button>
          </div>
        ) : displayActions === 'admin' ? (
          <div className="flex w-full gap-2">
            {onViewDetails ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(enhanced as unknown as Room)}
              >
                Ver
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit?.(room)}
            >
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => onDelete?.(room)}
            >
              Eliminar
            </Button>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}

export { RoomCard };
