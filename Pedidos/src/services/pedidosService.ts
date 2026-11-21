import type {
  DetalleOrden as DetalleOrdenApi,
  Inventario,
  InventarioConProducto,
  NuevaOrden,
  Orden as OrdenApi,
  OrdenCreada,
  Producto,
} from "../types/tienda";
import type { DetalleOrden, EstadoOrden, Orden, ProductoInfo } from "../types/pedido";

/*
 * Cliente de la API de Inventario y Pedidos (Node + Supabase, desplegada en Render).
 *
 * La URL base se puede cambiar con EXPO_PUBLIC_API_URL (archivo .env.local);
 * si no está definida se usa la API publicada en Render.
 *
 * Endpoints usados:
 *   GET  /inventario  -> inventario activo con su producto anidado
 *   GET  /productos   -> productos activos
 *   GET  /ordenes     -> órdenes con detalleorden -> inventario -> producto
 *   POST /ordenes     -> { cliente, numeroorden, detalles: [{ inventarioid, cantidad }] }
 *
 * El despacho/rechazo de órdenes lo hace la App de Inventario (.NET MAUI).
 */

const API_POR_DEFECTO = "https://api-inventario-wqfm.onrender.com/api";
const TIEMPO_LIMITE_MS = 60_000; // Render (plan gratis) tarda ~1 min en "despertar"
const MAX_TAM_RESPUESTA = 2_000_000; // 2 MB

const LIMITES = { numeroOrden: 20, cliente: 100, cantidadMax: 100_000 };

/** Valida la URL base: solo HTTPS (HTTP únicamente a la red local en desarrollo). */
function urlBase(): string {
  const cruda = process.env.EXPO_PUBLIC_API_URL?.trim() || API_POR_DEFECTO;
  let url: URL;
  try {
    url = new URL(cruda);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL no es una URL válida.");
  }
  const local = /^(localhost|127\.0\.0\.1|10\.|192\.168\.)/.test(url.hostname);
  if (url.protocol !== "https:" && !(__DEV__ && url.protocol === "http:" && local)) {
    throw new Error("La API debe usar HTTPS.");
  }
  return cruda.replace(/\/+$/, "");
}

const API_URL = urlBase();

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function mensajePorEstado(status: number, detalle?: string): string {
  // Las validaciones de la API (400/404/409) traen un mensaje claro en español
  if (detalle && (status === 400 || status === 404 || status === 409)) return detalle;
  if (status === 400) return "Los datos enviados no son válidos.";
  if (status === 401 || status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 404) return "El recurso solicitado no existe en la API.";
  if (status === 429) return "Demasiadas solicitudes. Intenta de nuevo en un momento.";
  if (status >= 500) return "El servidor tuvo un problema. Intenta más tarde.";
  return `Error inesperado (${status}).`;
}

async function pedirJson(ruta: string, init?: RequestInit): Promise<unknown> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      ...init,
      signal: controlador.signal,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch (e) {
    clearTimeout(temporizador);
    if (__DEV__) console.warn(`[API] ${init?.method ?? "GET"} ${ruta}`, e);
    throw new ApiError(
      controlador.signal.aborted
        ? "La API tardó demasiado en responder. Intenta de nuevo."
        : "No se pudo conectar con la API. Revisa tu conexión a internet.",
    );
  }

  try {
    const cuerpoTexto = await res.text();
    if (cuerpoTexto.length > MAX_TAM_RESPUESTA) throw new ApiError("Respuesta demasiado grande.");

    let cuerpo: unknown = null;
    if (cuerpoTexto) {
      try {
        cuerpo = JSON.parse(cuerpoTexto);
      } catch {
        throw new ApiError("La API respondió con un formato inesperado.", res.status);
      }
    }

    if (!res.ok) {
      const err = campo(cuerpo, "error");
      const detalle = typeof err === "string" ? err.slice(0, 200) : undefined;
      if (__DEV__) console.warn(`[API] ${res.status} ${ruta}`, detalle);
      throw new ApiError(mensajePorEstado(res.status, detalle), res.status);
    }
    return cuerpo;
  } finally {
    clearTimeout(temporizador);
  }
}

// ---------------------------------------------------------------------------
// Lectura tolerante de la respuesta (la API devuelve columnas en minúsculas)
// ---------------------------------------------------------------------------

/** Lee un campo aceptando camelCase, PascalCase o minúsculas (Postgres). */
function campo(obj: unknown, nombre: string): unknown {
  if (obj == null || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  const variantes = [nombre, nombre.charAt(0).toUpperCase() + nombre.slice(1), nombre.toLowerCase()];
  for (const v of variantes) if (v in o) return o[v];
  return undefined;
}

function comoArreglo(x: unknown): unknown[] {
  if (Array.isArray(x)) return x;
  for (const k of ["data", "items", "$values"]) {
    const v = campo(x, k);
    if (Array.isArray(v)) return v;
  }
  return [];
}

const entero = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};
const decimal = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const texto = (v: unknown, max: number) => (v == null ? "" : String(v).slice(0, max));
const booleano = (v: unknown) => (v == null ? true : v === true || v === 1 || v === "1" || v === "true");

/** Postgres devuelve "timestamp" sin zona; la API guarda la hora en UTC. */
function fechaIso(v: unknown): string {
  const s = texto(v, 40);
  if (!s) return "";
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
}

function normalizarEstado(v: unknown): EstadoOrden {
  const e = texto(v, 25).trim().toLowerCase();
  if (e.startsWith("despach")) return "Despachada";
  if (e.startsWith("rechaz")) return "Rechazada";
  return "Pendiente";
}

function mapearProducto(p: unknown): Producto | null {
  const id = entero(campo(p, "productoId"));
  if (id == null) return null;
  return {
    productoId: id,
    codigo: texto(campo(p, "codigo"), 20),
    nombre: texto(campo(p, "nombre"), 100),
    descripcion: texto(campo(p, "descripcion"), 300),
    activo: booleano(campo(p, "activo")),
    fechaMod: fechaIso(campo(p, "fechaMod")),
  };
}

function mapearInventario(i: unknown): (Inventario & { _producto: Producto | null }) | null {
  const id = entero(campo(i, "inventarioId"));
  const existencia = entero(campo(i, "existencia"));
  const precio = decimal(campo(i, "precio"));
  if (id == null || existencia == null || precio == null || precio < 0) return null;
  return {
    inventarioId: id,
    existencia: Math.max(0, existencia),
    precio,
    activo: booleano(campo(i, "activo")),
    fechaMod: fechaIso(campo(i, "fechaMod")),
    productoId: entero(campo(i, "productoId")),
    _producto: mapearProducto(campo(i, "producto")),
  };
}

// ---------------------------------------------------------------------------
// Inventario (pantalla Crear pedido)
// ---------------------------------------------------------------------------

/** Inventario activo con su producto activo, listo para armar los detalles. */
export async function obtenerInventario(): Promise<InventarioConProducto[]> {
  const inventario = comoArreglo(await pedirJson("/inventario"))
    .map(mapearInventario)
    .filter((i): i is NonNullable<typeof i> => i !== null);

  // Si el inventario no trae el producto anidado, se consultan los productos y se unen por productoid.
  let productos = new Map<number, Producto>();
  if (inventario.some((i) => !i._producto && i.productoId != null)) {
    productos = new Map(
      comoArreglo(await pedirJson("/productos"))
        .map(mapearProducto)
        .filter((p): p is Producto => p !== null)
        .map((p) => [p.productoId, p]),
    );
  }

  return inventario
    .map(({ _producto, ...inv }) => ({
      ...inv,
      producto: _producto ?? (inv.productoId != null ? productos.get(inv.productoId) ?? null : null),
    }))
    .filter((i) => i.activo && i.producto != null && i.producto.activo);
}

// ---------------------------------------------------------------------------
// Órdenes (pantalla principal)
// ---------------------------------------------------------------------------

function mapearDetalle(d: unknown, ordenid: number): DetalleOrden {
  const inv = campo(d, "inventario");
  const p = campo(inv, "producto");
  const producto: ProductoInfo | undefined =
    entero(campo(p, "productoId")) != null
      ? {
          productoid: entero(campo(p, "productoId")) ?? 0,
          codigo: texto(campo(p, "codigo"), 20),
          nombre: texto(campo(p, "nombre"), 100),
          descripcion: texto(campo(p, "descripcion"), 300),
        }
      : undefined;
  return {
    detalleordenid: entero(campo(d, "detalleOrdenId")) ?? 0,
    inventarioid: entero(campo(d, "inventarioId")) ?? 0,
    ordenid: entero(campo(d, "ordenId")) ?? ordenid,
    cantidad: entero(campo(d, "cantidad")) ?? 0,
    total: decimal(campo(d, "total")) ?? 0,
    activo: booleano(campo(d, "activo")),
    fechamod: fechaIso(campo(d, "fechaMod")),
    producto,
  };
}

function mapearOrden(o: unknown): Orden | null {
  const ordenid = entero(campo(o, "ordenId"));
  if (ordenid == null) return null;
  const crudos = campo(o, "detalleOrden") ?? campo(o, "detalles");
  return {
    ordenid,
    numeroorden: texto(campo(o, "numeroOrden"), 20),
    cliente: texto(campo(o, "cliente"), 100),
    total: decimal(campo(o, "total")) ?? 0,
    estado: normalizarEstado(campo(o, "estado")),
    activo: booleano(campo(o, "activo")),
    fechamod: fechaIso(campo(o, "fechaMod")),
    detalles: comoArreglo(crudos)
      .map((d) => mapearDetalle(d, ordenid))
      .filter((d) => d.activo),
  };
}

/** Órdenes activas, de la más nueva a la más antigua. */
export async function obtenerOrdenes(): Promise<Orden[]> {
  return comoArreglo(await pedirJson("/ordenes"))
    .map(mapearOrden)
    .filter((o): o is Orden => o !== null && o.activo)
    .sort((a, b) => b.ordenid - a.ordenid);
}

// ---------------------------------------------------------------------------
// Crear Orden + DetalleOrden
// ---------------------------------------------------------------------------

/** Genera un número de orden (máx. 20 caracteres). */
export function generarNumeroOrden(): string {
  const d = new Date();
  const fecha = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const sufijo = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `ORD-${fecha}-${sufijo}`; // 18 caracteres
}

/** Limpia caracteres de control y espacios extra. */
const limpiarTexto = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();

function validar(nueva: NuevaOrden) {
  const numeroOrden = limpiarTexto(nueva.numeroOrden);
  const cliente = limpiarTexto(nueva.cliente);

  if (!numeroOrden || numeroOrden.length > LIMITES.numeroOrden) {
    throw new ApiError(`El número de orden es obligatorio (máx. ${LIMITES.numeroOrden} caracteres).`);
  }
  if (!cliente || cliente.length > LIMITES.cliente) {
    throw new ApiError(`El cliente es obligatorio (máx. ${LIMITES.cliente} caracteres).`);
  }
  if (nueva.detalles.length === 0) throw new ApiError("Agrega al menos un detalle al pedido.");

  const ids = new Set<number>();
  for (const d of nueva.detalles) {
    if (!Number.isInteger(d.cantidad) || d.cantidad <= 0 || d.cantidad > LIMITES.cantidadMax) {
      throw new ApiError("Las cantidades deben ser números enteros mayores a 0.");
    }
    if (ids.has(d.inventarioId)) throw new ApiError("Hay productos repetidos en el pedido.");
    ids.add(d.inventarioId);
  }
  return { numeroOrden, cliente };
}

/**
 * Crea la Orden (estado Pendiente) con sus DetalleOrden.
 * La API recalcula precios y totales con los datos del inventario.
 */
export async function crearOrden(
  nueva: NuevaOrden,
  inventario: InventarioConProducto[],
): Promise<OrdenCreada> {
  const { numeroOrden, cliente } = validar(nueva);

  for (const d of nueva.detalles) {
    const inv = inventario.find((i) => i.inventarioId === d.inventarioId);
    if (!inv) throw new ApiError("Uno de los productos ya no está disponible. Recarga el inventario.");
    if (d.cantidad > inv.existencia) {
      throw new ApiError(`Existencia insuficiente de ${inv.producto?.nombre ?? "producto"}.`);
    }
  }

  // La API espera los nombres de columna en minúsculas
  const cuerpo = {
    numeroorden: numeroOrden,
    cliente,
    detalles: nueva.detalles.map((d) => ({ inventarioid: d.inventarioId, cantidad: d.cantidad })),
  };
  const resp = await pedirJson("/ordenes", { method: "POST", body: JSON.stringify(cuerpo) });

  const orden: OrdenApi = {
    ordenId: entero(campo(resp, "ordenId")) ?? 0,
    numeroOrden: texto(campo(resp, "numeroOrden") ?? numeroOrden, 20),
    cliente: texto(campo(resp, "cliente") ?? cliente, 100),
    total: decimal(campo(resp, "total")) ?? 0,
    estado: normalizarEstado(campo(resp, "estado")),
    activo: booleano(campo(resp, "activo")),
    fechaMod: fechaIso(campo(resp, "fechaMod")),
  };
  const detalles: DetalleOrdenApi[] = comoArreglo(campo(resp, "detalleOrden") ?? campo(resp, "detalles")).map(
    (d) => ({
      detalleOrdenId: entero(campo(d, "detalleOrdenId")) ?? 0,
      cantidad: entero(campo(d, "cantidad")) ?? 0,
      total: decimal(campo(d, "total")) ?? 0,
      activo: booleano(campo(d, "activo")),
      fechaMod: fechaIso(campo(d, "fechaMod")),
      inventarioId: entero(campo(d, "inventarioId")) ?? 0,
      ordenId: orden.ordenId,
    }),
  );

  return { orden, detalles };
}
