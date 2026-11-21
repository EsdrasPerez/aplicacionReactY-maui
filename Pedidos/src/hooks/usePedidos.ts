import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Orden } from '../types/pedido';
import { obtenerOrdenes } from '../services/pedidosService';

// Cada cuánto se consulta la API para ver los cambios de estado hechos en la App de Inventario
const INTERVALO_ACTUALIZACION_MS = 15_000;

interface EstadoOrdenes {
  ordenes: Orden[];
  /** Primera carga (aún no hay datos) */
  cargando: boolean;
  /** Recarga manual (pull-to-refresh) */
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
}

export function useOrdenes(): EstadoOrdenes {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);

  const cargar = useCallback(async (modo: 'auto' | 'manual') => {
    if (enCurso.current) return;
    enCurso.current = true;
    if (modo === 'manual') setRefrescando(true);
    try {
      setOrdenes(await obtenerOrdenes());
      setError(null);
    } catch (err) {
      // Si falla una actualización automática se conserva la lista anterior y solo se avisa
      setError(err instanceof Error ? err.message : 'Error al obtener órdenes');
    } finally {
      enCurso.current = false;
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  // Recarga al entrar/volver a la pantalla (p. ej. después de crear un pedido)
  // y periódicamente mientras está visible.
  useFocusEffect(
    useCallback(() => {
      cargar('auto');
      const id = setInterval(() => cargar('auto'), INTERVALO_ACTUALIZACION_MS);
      return () => clearInterval(id);
    }, [cargar]),
  );

  const recargar = useCallback(() => {
    cargar('manual');
  }, [cargar]);

  return { ordenes, cargando, refrescando, error, recargar };
}
