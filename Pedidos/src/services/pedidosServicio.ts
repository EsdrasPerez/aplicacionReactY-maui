import type { Orden } from '../types/pedido';
import { ORDENES_INICIALES } from '../data/pedidos';

// Almacenamiento local en memoria
let ordenesLocales: Orden[] = [...ORDENES_INICIALES];

export async function obtenerOrdenes(): Promise<Orden[]> {
  // Simulación de delay de red para que se sienta realista la carga y el pull-to-refresh
  await new Promise((resolver) => setTimeout(resolver, 350));
  return [...ordenesLocales];
}

export async function despacharOrden(ordenid: number): Promise<void> {
  await new Promise((resolver) => setTimeout(resolver, 200));
  ordenesLocales = ordenesLocales.map((o) =>
    o.ordenid === ordenid
      ? { ...o, estado: 'Despachada', fechamod: new Date().toISOString() }
      : o
  );
}

export async function rechazarOrden(ordenid: number): Promise<void> {
  await new Promise((resolver) => setTimeout(resolver, 200));
  ordenesLocales = ordenesLocales.map((o) =>
    o.ordenid === ordenid
      ? { ...o, estado: 'Rechazada', fechamod: new Date().toISOString() }
      : o
  );
}
