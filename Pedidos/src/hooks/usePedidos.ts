import { useState, useEffect, useCallback } from 'react';
import type { Orden } from '../types/pedido';
import { obtenerOrdenes } from '../services/pedidosServicio';

interface EstadoOrdenes {
  ordenes: Orden[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

export function useOrdenes(): EstadoOrdenes {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerOrdenes();
      setOrdenes(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener órdenes');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { ordenes, cargando, error, recargar: cargar };
}
