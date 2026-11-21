// Tipos que reflejan las tablas del esquema examen_final (Supabase / PostgreSQL)

export interface Producto {
  productoId: number;
  codigo: string; // NVARCHAR(20)
  nombre: string; // NVARCHAR(100)
  descripcion: string; // NVARCHAR(300)
  activo: boolean;
  fechaMod: string; // DATETIME (ISO)
}

export interface Inventario {
  inventarioId: number;
  existencia: number;
  precio: number; // DECIMAL(18,2)
  activo: boolean;
  fechaMod: string;
  productoId: number | null;
}

export interface Orden {
  ordenId: number;
  numeroOrden: string; // NVARCHAR(20)
  cliente: string; // NVARCHAR(100)
  total: number; // DECIMAL(18,2)
  estado: string; // NVARCHAR(25)
  activo: boolean;
  fechaMod: string;
}

export interface DetalleOrden {
  detalleOrdenId: number;
  cantidad: number;
  total: number; // DECIMAL(18,2) = cantidad * precio
  activo: boolean;
  fechaMod: string;
  inventarioId: number;
  ordenId: number;
}

/** Inventario con los datos de su Producto (JOIN Inventario -> Producto) */
export interface InventarioConProducto extends Inventario {
  producto: Producto | null;
}

/** Datos que la pantalla envía para crear una orden con sus detalles */
export interface NuevaOrden {
  numeroOrden: string;
  cliente: string;
  detalles: { inventarioId: number; cantidad: number }[];
}

export interface OrdenCreada {
  orden: Orden;
  detalles: DetalleOrden[];
}
