// Utilidades de formato compartidas (precios COP, etiquetas legibles).

import type { OperationType, PropertyType } from './types';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return COP.format(value);
}

export const OPERATION_LABELS: Record<OperationType, string> = {
  venta: 'En venta',
  arriendo: 'En arriendo',
  venta_arriendo: 'Venta y arriendo',
};

export const TYPE_LABELS: Record<PropertyType, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  apartaestudio: 'Apartaestudio',
  local: 'Local',
  oficina: 'Oficina',
  bodega: 'Bodega',
  lote: 'Lote',
  finca: 'Finca',
  consultorio: 'Consultorio',
  edificio: 'Edificio',
  parqueadero: 'Parqueadero',
};
