import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import type { Orden } from '../types/pedido';
import { obtenerConfigEstado, formatearMoneda, formatearFecha } from '../utils/ayudasPedido';

interface PropsTarjetaOrden {
  orden: Orden;
  alPresionar?: (orden: Orden) => void;
}

export function TarjetaOrden({ orden, alPresionar }: PropsTarjetaOrden) {
  const totalArticulos = orden.detalles?.reduce((suma, d) => suma + (d.cantidad || 0), 0) ?? 0;
  const configEstado = obtenerConfigEstado(orden.estado);
  const animEscala = useState(() => new Animated.Value(1))[0];

  const alPresionarEntrar = () => {
    Animated.spring(animEscala, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const alPresionarSalir = () => {
    Animated.spring(animEscala, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  // Nombres de los primeros productos incluidos para un toque visual
  const resumenProductos = orden.detalles
    ?.map((d) => d.producto?.nombre || `Ítem #${d.inventarioid}`)
    .slice(0, 2)
    .join(', ');

  return (
    <Animated.View style={{ transform: [{ scale: animEscala }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={alPresionarEntrar}
        onPressOut={alPresionarSalir}
        onPress={() => alPresionar?.(orden)}
        style={estilos.tarjeta}
      >
        {/* Encabezado */}
        <View style={estilos.encabezado}>
          <View>
            <Text style={estilos.numeroOrden}>{orden.numeroorden}</Text>
            <Text style={estilos.fecha}>{formatearFecha(orden.fechamod)}</Text>
          </View>
          <View style={[estilos.insigniaEstado, { backgroundColor: configEstado.colorFondo }]}>
            <View style={[estilos.puntoEstado, { backgroundColor: configEstado.colorPunto }]} />
            <Text style={[estilos.textoEstado, { color: configEstado.colorTexto }]}>
              {configEstado.etiqueta}
            </Text>
          </View>
        </View>

        {/* Separador */}
        <View style={estilos.separador} />

        {/* Cliente */}
        <View style={estilos.filaCliente}>
          <View style={estilos.circuloAvatar}>
            <Text style={estilos.letraAvatar}>
              {orden.cliente.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={estilos.infoCliente}>
            <Text style={estilos.nombreCliente}>{orden.cliente}</Text>
            {resumenProductos ? (
              <Text style={estilos.textoProductos} numberOfLines={1}>
                {resumenProductos}
              </Text>
            ) : (
              <Text style={estilos.idOrden}>Orden #{orden.ordenid}</Text>
            )}
          </View>
        </View>

        {/* Pie */}
        <View style={estilos.pie}>
          <View style={estilos.chipCantidad}>
            <Text style={estilos.etiquetaArticulos}>
              {totalArticulos} {totalArticulos === 1 ? 'artículo' : 'artículos'}
            </Text>
          </View>
          <Text style={estilos.total}>{formatearMoneda(orden.total)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  numeroOrden: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.2,
  },
  fecha: {
    fontSize: 12,
    color: '#8C8C9A',
    marginTop: 2,
  },
  insigniaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  textoEstado: {
    fontSize: 12,
    fontWeight: '700',
  },
  separador: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  filaCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  circuloAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letraAvatar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCliente: {
    flex: 1,
  },
  nombreCliente: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  textoProductos: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  idOrden: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipCantidad: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  etiquetaArticulos: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  total: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0284C7',
  },
});
