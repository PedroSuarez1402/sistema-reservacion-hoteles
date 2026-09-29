import { useQuery } from '@tanstack/react-query';
import type { ApiErrorResponse, Paquete } from '../../types';
import packageService from '../../services/package.service';

export function usePackages() {
  return useQuery<Paquete[], ApiErrorResponse>({
    queryKey: ['packages', 'list'],
    queryFn: () => packageService.getAll(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePackage(id?: string) {
  return useQuery<Paquete, ApiErrorResponse>({
    queryKey: ['packages', 'detail', id],
    queryFn: () => packageService.getById(id!),
    enabled: Boolean(id),
  });
}

export default usePackages;
