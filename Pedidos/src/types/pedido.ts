export type EstadoOrden = 'Pendiente' | 'Despachada' | 'Rechazada';

export interface ProductoInfo {
  productoid: number;
  codigo: string;
  nombre: string;
  descripcion: string;
}

export interface DetalleOrden {
  detalleordenid: number;
  inventarioid: number;
  ordenid: number;
  cantidad: number;
  total: number;
  activo: boolean;
  fechamod: string;
  producto?: ProductoInfo;
}

export interface Orden {
  ordenid: number;
  numeroorden: string;
  cliente: string;
  total: number;
  estado: EstadoOrden;
  activo: boolean;
  fechamod: string;
  detalles: DetalleOrden[];
}
