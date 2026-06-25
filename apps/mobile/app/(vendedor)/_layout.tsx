import { Tabs } from "expo-router"
import { Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useCart } from "../../lib/cart"

// TODO: GPS deshabilitado hasta nuevo dev build con expo-location compilado
function GpsTracker() {
  return null
}

export default function VendedorLayout() {
  const insets = useSafeAreaInsets()
  const { totalItems } = useCart()
  return (
    <>
      <GpsTracker />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#059669",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            borderTopColor: "#f0f0f0",
            paddingBottom: insets.bottom + 4,
            height: 60 + insets.bottom,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="clientes"
          options={{
            title: "Mis Clientes",
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
          }}
        />
        <Tabs.Screen
          name="catalogo"
          options={{
            title: "Catálogo",
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏪</Text>,
          }}
        />
        <Tabs.Screen
          name="carrito"
          options={{
            title: "Pedido",
            tabBarBadge: totalItems > 0 ? totalItems : undefined,
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛒</Text>,
          }}
        />
        <Tabs.Screen
          name="pedidos"
          options={{
            title: "Historial",
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: "Perfil",
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
          }}
        />
      </Tabs>
    </>
  )
}
