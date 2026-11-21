import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Orden } from '../types/pedido';
import { TarjetaOrden } from '../components/TarjetaPedido';
import { obtenerConfigEstado, formatearMoneda } from '../utils/ayudasPedido';
import { useOrdenes } from '../hooks/usePedidos';

type FiltroEstado = 'Todos' | 'Pendiente' | 'Despachada' | 'Rechazada';

const OPCIONES_FILTRO: { clave: FiltroEstado; etiqueta: string }[] = [
  { clave: 'Todos', etiqueta: 'Todos' },
  { clave: 'Pendiente', etiqueta: 'Pendiente' },
  { clave: 'Despachada', etiqueta: 'Despachada' },
  { clave: 'Rechazada', etiqueta: 'Rechazada' },
];

export default function PantallaOrdenes() {
  const { ordenes, cargando, refrescando, error, recargar } = useOrdenes();
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<FiltroEstado>('Todos');

  const ordenesFiltradas = useMemo<Orden[]>(() => {
    let resultado = ordenes;

    if (filtroActivo !== 'Todos') {
      resultado = resultado.filter(
        (o) => o.estado.toLowerCase() === filtroActivo.toLowerCase()
      );
    }

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      resultado = resultado.filter((o) => {
        const id = String(o.ordenid);
        const num = o.numeroorden.toLowerCase();
        const cliente = o.cliente.toLowerCase();
        const productos = o.detalles
          .map((d) => d.producto?.nombre?.toLowerCase() || '')
          .join(' ');
        return id.includes(q) || num.includes(q) || cliente.includes(q) || productos.includes(q);
      });
    }

    return resultado;
  }, [ordenes, busqueda, filtroActivo]);

  const totalIngresos = useMemo(
    () => ordenesFiltradas.reduce((suma, o) => suma + o.total, 0),
    [ordenesFiltradas],
  );

  if (cargando) {
    return (
      <SafeAreaView style={estilos.areaSegura} edges={['top']}>
        <StatusBar style="dark" />
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={estilos.textoCargando}>Cargando órdenes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && ordenes.length === 0) {
    return (
      <SafeAreaView style={estilos.areaSegura} edges={['top']}>
        <StatusBar style="dark" />
        <View style={estilos.centrado}>
          <Text style={estilos.iconoError}>⚠️</Text>
          <Text style={estilos.tituloError}>Algo salió mal</Text>
          <Text style={estilos.mensajeError}>{error}</Text>
          <TouchableOpacity style={estilos.botonReintentar} onPress={recargar}>
            <Text style={estilos.textoBotonReintentar}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderizarVacio = () => (
    <View style={estilos.contenedorVacio}>
      <Text style={estilos.iconoVacio}>📦</Text>
      <Text style={estilos.tituloVacio}>Sin órdenes</Text>
      <Text style={estilos.subtituloVacio}>
        {ordenes.length === 0
          ? 'Aún no hay pedidos. Crea el primero con el botón de abajo.'
          : 'No se encontraron órdenes con ese criterio.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={estilos.areaSegura} edges={['top']}>
      <StatusBar style="dark" />

      {/* ── Encabezado ── */}
      <View style={estilos.encabezado}>
        <View>
          <Text style={estilos.tituloEncabezado}>Órdenes</Text>
          <Text style={estilos.subtituloEncabezado}>
            {ordenesFiltradas.length}{' '}
            {ordenesFiltradas.length === 1 ? 'orden registrada' : 'órdenes registradas'}
          </Text>
        </View>
        <View style={estilos.cajaTotal}>
          <Text style={estilos.etiquetaTotal}>Total Generado</Text>
          <Text style={estilos.montoTotal}>{formatearMoneda(totalIngresos)}</Text>
        </View>
      </View>

      {/* ── Barra de Búsqueda ── */}
      <View style={estilos.contenedorBusqueda}>
        <Text style={estilos.iconoBusqueda}>🔍</Text>
        <TextInput
          style={estilos.campoBusqueda}
          placeholder="Buscar por orden, cliente, producto..."
          placeholderTextColor="#9CA3AF"
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Filtros por Estado ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.contenidoFiltros}
        style={estilos.scrollFiltros}
      >
        {OPCIONES_FILTRO.map((filtro) => {
          const estaActivo = filtroActivo === filtro.clave;
          const cfgEstado = filtro.clave !== 'Todos'
            ? obtenerConfigEstado(filtro.clave)
            : null;
          return (
            <TouchableOpacity
              key={filtro.clave}
              activeOpacity={0.7}
              onPress={() => setFiltroActivo(filtro.clave)}
              style={[
                estilos.chip,
                estaActivo && {
                  backgroundColor: cfgEstado ? cfgEstado.colorFondo : '#0284C7',
                  borderColor: cfgEstado ? cfgEstado.colorPunto : '#0284C7',
                },
              ]}
            >
              {cfgEstado && estaActivo && (
                <View style={[estilos.puntoChip, { backgroundColor: cfgEstado.colorPunto }]} />
              )}
              <Text
                style={[
                  estilos.textoChip,
                  estaActivo && {
                    color: cfgEstado ? cfgEstado.colorTexto : '#FFFFFF',
                    fontWeight: '700',
                  },
                ]}
              >
                {filtro.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error && (
        <TouchableOpacity style={estilos.avisoError} onPress={recargar}>
          <Text style={estilos.textoAvisoError}>{error} Toca para reintentar.</Text>
        </TouchableOpacity>
      )}

      {/* ── Listado de Órdenes ── */}
      <FlatList
        data={ordenesFiltradas}
        keyExtractor={(item) => String(item.ordenid)}
        renderItem={({ item }) => <TarjetaOrden orden={item} />}
        ListEmptyComponent={renderizarVacio}
        onRefresh={recargar}
        refreshing={refrescando}
        contentContainerStyle={[
          estilos.contenidoLista,
          ordenesFiltradas.length === 0 && estilos.contenidoListaVacia,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Botón para crear un pedido ── */}
      <Link href="/crearPedidos" asChild>
        <TouchableOpacity style={estilos.botonNuevo} activeOpacity={0.85} accessibilityLabel="Crear pedido">
          <Text style={estilos.textoBotonNuevo}>＋ Nuevo pedido</Text>
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  areaSegura: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  textoCargando: {
    fontSize: 15,
    color: '#64748B',
  },
  iconoError: { fontSize: 48, marginBottom: 4 },
  tituloError: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  mensajeError: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  botonReintentar: {
    marginTop: 8,
    backgroundColor: '#0284C7',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  textoBotonReintentar: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  tituloEncabezado: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtituloEncabezado: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cajaTotal: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'flex-end',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  etiquetaTotal: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  montoTotal: { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },
  contenedorBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconoBusqueda: { fontSize: 16, marginRight: 8 },
  campoBusqueda: { flex: 1, fontSize: 15, color: '#0F172A' },
  scrollFiltros: { maxHeight: 46, marginBottom: 8 },
  contenidoFiltros: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  puntoChip: { width: 6, height: 6, borderRadius: 3 },
  textoChip: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  contenidoLista: { paddingBottom: 100, paddingTop: 4 },
  avisoError: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
  },
  textoAvisoError: { color: '#B71C1C', fontSize: 13 },
  botonNuevo: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 28,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  textoBotonNuevo: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  contenidoListaVacia: { flexGrow: 1 },
  contenedorVacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  iconoVacio: { fontSize: 52, marginBottom: 8 },
  tituloVacio: { fontSize: 18, fontWeight: '700', color: '#334155' },
  subtituloVacio: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
