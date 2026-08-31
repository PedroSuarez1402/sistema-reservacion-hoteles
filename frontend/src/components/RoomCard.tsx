'use client';

import * as React from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui';
import {
  cn,
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
  isLoading,
}: RoomCardProps) {
  const statusMeta = roomStatusStyles[room.estado];

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5">
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200">
        <div className="absolute inset-0 flex items-center justify-center text-6xl transition-transform duration-300 group-hover:scale-110">
          {roomTypeIcon[room.tipo] ?? '🛏️'}
        </div>
        <div className="absolute right-3 top-3">
          <Badge
            className={cn('font-medium', statusMeta.className)}
          >
            {statusMeta.label}
          </Badge>
        </div>
        <div className="absolute left-3 top-3">
          <Badge variant="gray" className="font-medium">
            Habitación {room.numero}
          </Badge>
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
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-500" />
            <span>Wi-Fi gratuito · TV · Aire acondicionado</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {displayActions === 'booking' ? (
          <Button
            className="w-full"
            onClick={() => onBook?.(room)}
            disabled={room.estado !== 'ACTIVA' || isLoading}
            loading={isLoading}
          >
            Reservar ahora
          </Button>
        ) : displayActions === 'admin' ? (
          <div className="flex w-full gap-2">
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
