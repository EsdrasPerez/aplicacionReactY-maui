import type { EstadoOrden } from '../types/pedido';

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

export function formatearMoneda(monto: number): string {
  const valor = Number(monto) || 0;
  return `$${valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatearFecha(isoString?: string): string {
  if (!isoString) return 'Sin fecha';
  const fecha = new Date(isoString);
  if (isNaN(fecha.getTime())) return isoString;
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
