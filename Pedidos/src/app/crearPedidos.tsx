import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";

import {
  crearOrden,
  generarNumeroOrden,
  obtenerInventario,
} from "../services/pedidosService";
import type { InventarioConProducto } from "../types/tienda";
import { moneda } from "../utils/formato";

// Todo pedido nace "Pendiente"; la App de Inventario lo despacha o rechaza.
const ESTADO_INICIAL = "Pendiente";

export default function CrearPedidos() {
  // Inventario (con su Producto) obtenido de la API externa
  const [inventario, setInventario] = useState<InventarioConProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  // Evita enviar el mismo pedido dos veces por toques rápidos
  const enviando = useRef(false);

  // Encabezado: tabla Orden
  const [numeroOrden, setNumeroOrden] = useState(generarNumeroOrden);
  const [cliente, setCliente] = useState("");

  // Detalles: inventarioId -> cantidad (cada uno será un DetalleOrden)
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [busqueda, setBusqueda] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargarInventario = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setInventario(await obtenerInventario());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el inventario.");
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial del inventario desde la API externa
  useEffect(() => {
    let activo = true;
    obtenerInventario()
      .then((datos) => {
        if (activo) setInventario(datos);
      })
      .catch((e) => {
        if (activo) setError(e instanceof Error ? e.message : "No se pudo cargar el inventario.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const inventarioFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return inventario;
    return inventario.filter(
      (i) =>
        i.producto?.nombre.toLowerCase().includes(q) ||
        i.producto?.codigo.toLowerCase().includes(q),
    );
  }, [inventario, busqueda]);

  // Detalles del pedido: Cantidad y Total = Cantidad * Precio
  const detalles = useMemo(
    () =>
      inventario
        .filter((i) => (cantidades[i.inventarioId] ?? 0) > 0)
        .map((i) => {
          const cantidad = cantidades[i.inventarioId];
          return { inv: i, cantidad, total: Math.round(cantidad * i.precio * 100) / 100 };
        }),
    [inventario, cantidades],
  );

  const totalOrden = detalles.reduce((s, d) => s + d.total, 0);

  const cambiarCantidad = (inv: InventarioConProducto, delta: number) => {
    setExito(null);
    setCantidades((prev) => {
      const actual = prev[inv.inventarioId] ?? 0;
      const nueva = Math.max(0, Math.min(inv.existencia, actual + delta));
      return { ...prev, [inv.inventarioId]: nueva };
    });
  };

  const fijarCantidad = (inv: InventarioConProducto, texto: string) => {
    setExito(null);
    const n = parseInt(texto.replace(/[^0-9]/g, ""), 10);
    const nueva = Number.isNaN(n) ? 0 : Math.min(inv.existencia, n);
    setCantidades((prev) => ({ ...prev, [inv.inventarioId]: nueva }));
  };

  const quitarDetalle = (inventarioId: number) =>
    setCantidades((prev) => ({ ...prev, [inventarioId]: 0 }));

  const limpiar = () => {
    setNumeroOrden(generarNumeroOrden());
    setCliente("");
    setCantidades({});
    setBusqueda("");
    setError(null);
  };

  const guardar = async () => {
    setError(null);
    setExito(null);

    if (!cliente.trim()) return setError("Ingresa el nombre del cliente.");
    if (detalles.length === 0) return setError("Agrega al menos un producto al pedido.");

    if (enviando.current) return;
    enviando.current = true;
    setGuardando(true);
    try {
      const { orden } = await crearOrden(
        {
          numeroOrden,
          cliente,
          detalles: detalles.map((d) => ({
            inventarioId: d.inv.inventarioId,
            cantidad: d.cantidad,
          })),
        },
        inventario,
      );
      limpiar();
      setExito(
        `Pedido ${orden.numeroOrden} creado para ${orden.cliente} por ${moneda(orden.total)}.`,
      );
      // Regresa al listado (se recarga al enfocarse) mostrando el pedido nuevo como "Pendiente".
      setTimeout(() => (router.canGoBack() ? router.back() : router.replace("/")), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el pedido.");
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Nuevo pedido",
          headerBackTitle: "Pedidos",
          headerTintColor: AZUL,
        }}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------- Orden ---------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos del pedido</Text>

          <Text style={styles.label}>Número de orden</Text>
          <TextInput
            style={styles.input}
            value={numeroOrden}
            onChangeText={setNumeroOrden}
            maxLength={20}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Cliente *</Text>
          <TextInput
            style={styles.input}
            value={cliente}
            onChangeText={(t) => {
              setCliente(t);
              setExito(null);
            }}
            placeholder="Nombre del cliente"
            maxLength={100}
          />

          <Text style={styles.label}>Estado</Text>
          <Text style={styles.estadoFijo}>{ESTADO_INICIAL}</Text>
        </View>

        {/* ---------- Productos del inventario (API) ---------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Productos en inventario</Text>
          <TextInput
            style={styles.input}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre o código"
          />

          {cargando ? (
            <ActivityIndicator style={{ marginVertical: 24 }} />
          ) : inventarioFiltrado.length === 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.vacio}>
                {inventario.length === 0
                  ? "No hay productos en inventario. Regístralos desde la App de Inventario."
                  : "Ningún producto coincide con la búsqueda."}
              </Text>
              <Pressable onPress={cargarInventario}>
                <Text style={styles.botonSecundarioTexto}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            inventarioFiltrado.map((inv) => {
              const cantidad = cantidades[inv.inventarioId] ?? 0;
              const agotado = inv.existencia === 0;
              return (
                <View key={inv.inventarioId} style={[styles.item, agotado && styles.itemAgotado]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemNombre}>{inv.producto?.nombre}</Text>
                    <Text style={styles.itemSub}>
                      {inv.producto?.codigo} · {moneda(inv.precio)}
                    </Text>
                    <Text style={[styles.itemSub, agotado && { color: "#c62828" }]}>
                      {agotado ? "Agotado" : `Existencia: ${inv.existencia}`}
                    </Text>
                  </View>

                  <View style={styles.stepper}>
                    <Pressable
                      style={[styles.stepBtn, cantidad === 0 && styles.stepBtnOff]}
                      disabled={cantidad === 0}
                      onPress={() => cambiarCantidad(inv, -1)}
                    >
                      <Text style={styles.stepBtnTexto}>−</Text>
                    </Pressable>
                    <TextInput
                      style={styles.stepInput}
                      value={String(cantidad)}
                      onChangeText={(t) => fijarCantidad(inv, t)}
                      keyboardType="number-pad"
                      editable={!agotado}
                      selectTextOnFocus
                    />
                    <Pressable
                      style={[styles.stepBtn, cantidad >= inv.existencia && styles.stepBtnOff]}
                      disabled={cantidad >= inv.existencia}
                      onPress={() => cambiarCantidad(inv, 1)}
                    >
                      <Text style={styles.stepBtnTexto}>+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ---------- DetalleOrden ---------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles del pedido ({detalles.length})</Text>
          {detalles.length === 0 ? (
            <Text style={styles.vacio}>Aún no has agregado productos.</Text>
          ) : (
            detalles.map((d) => (
              <View key={d.inv.inventarioId} style={styles.filaResumen}>
                <View style={{ flex: 1 }}>
                  <Text>{d.inv.producto?.nombre}</Text>
                  <Text style={styles.itemSub}>
                    {d.cantidad} × {moneda(d.inv.precio)}
                  </Text>
                </View>
                <Text style={{ fontWeight: "600" }}>{moneda(d.total)}</Text>
                <Pressable onPress={() => quitarDetalle(d.inv.inventarioId)} hitSlop={8}>
                  <Text style={styles.quitar}>✕</Text>
                </Pressable>
              </View>
            ))
          )}
          <View style={[styles.filaResumen, styles.filaTotal]}>
            <Text style={styles.totalTexto}>Total</Text>
            <Text style={styles.totalTexto}>{moneda(totalOrden)}</Text>
          </View>
        </View>

        {error && <Text style={[styles.mensaje, styles.mensajeError]}>{error}</Text>}
        {exito && <Text style={[styles.mensaje, styles.mensajeExito]}>{exito}</Text>}

        <Pressable
          style={[styles.boton, guardando && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botonTexto}>Crear pedido</Text>
          )}
        </Pressable>

        <Pressable style={styles.botonSecundario} onPress={limpiar} disabled={guardando}>
          <Text style={styles.botonSecundarioTexto}>Limpiar</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const AZUL = "#0284C7"; // mismo color que la pantalla principal

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f4f7" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  label: { fontSize: 13, color: "#555", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  estadoFijo: { fontSize: 16, fontWeight: "600", color: "#8d6e00" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e4e7ec",
    gap: 8,
  },
  itemAgotado: { opacity: 0.5 },
  itemNombre: { fontSize: 16, fontWeight: "600" },
  itemSub: { fontSize: 13, color: "#666" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AZUL,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnOff: { backgroundColor: "#b0bec5" },
  stepBtnTexto: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 22 },
  stepInput: {
    width: 48,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 6,
    paddingVertical: 4,
    fontSize: 16,
  },
  vacio: { color: "#888", fontStyle: "italic", paddingVertical: 8 },
  filaResumen: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 12,
  },
  filaTotal: { borderTopWidth: 1, borderTopColor: "#e4e7ec", marginTop: 6, paddingTop: 10 },
  totalTexto: { fontSize: 18, fontWeight: "700" },
  quitar: { color: "#c62828", fontSize: 16, fontWeight: "700" },
  mensaje: { padding: 12, borderRadius: 8, fontSize: 15 },
  mensajeError: { backgroundColor: "#fdecea", color: "#b71c1c" },
  mensajeExito: { backgroundColor: "#e8f5e9", color: "#1b5e20" },
  boton: {
    backgroundColor: AZUL,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  botonTexto: { color: "#fff", fontSize: 17, fontWeight: "700" },
  botonSecundario: { paddingVertical: 12, alignItems: "center" },
  botonSecundarioTexto: { color: AZUL, fontSize: 16, fontWeight: "600" },
});
