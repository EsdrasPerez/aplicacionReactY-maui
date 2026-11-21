import type { EstadoOrden } from '../types/pedido';
import { moneda } from './formato';

export interface ConfigEstado {
  etiqueta: string;
  colorFondo: string;
  colorTexto: string;
  colorPunto: string;
}

export const CONFIG_ESTADO: Record<string, ConfigEstado> = {
  pendiente: {
    etiqueta: 'Pendiente',
    colorFondo: '#FFF8E1',
    colorTexto: '#F57F17',
    colorPunto: '#FFC107',
  },
  despachada: {
    etiqueta: 'Despachada',
    colorFondo: '#E8F5E9',
    colorTexto: '#1B5E20',
    colorPunto: '#4CAF50',
  },
  rechazada: {
    etiqueta: 'Rechazada',
    colorFondo: '#FFEBEE',
    colorTexto: '#B71C1C',
    colorPunto: '#F44336',
  },
};

export function obtenerConfigEstado(estado: EstadoOrden): ConfigEstado {
  const clave = (estado || '').toLowerCase().trim();
  return CONFIG_ESTADO[clave] || {
    etiqueta: estado || 'Desconocido',
    colorFondo: '#F5F5F5',
    colorTexto: '#616161',
    colorPunto: '#9E9E9E',
  };
}

/** Monto en quetzales (Q1,234.50) */
export const formatearMoneda = moneda;

export function formatearFecha(isoString?: string): string {
  if (!isoString) return 'Sin fecha';
  const fecha = new Date(isoString);
  if (isNaN(fecha.getTime())) return isoString;
  return fecha.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
