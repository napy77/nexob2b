import { Tabs } from "expo-router"
import { Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useCart } from "../../lib/cart"

function CartIcon({ color }: { color: string }) {
  const { totalItems } = useCart()
  return (
    <Text style={{ fontSize: 20 }}>
      {totalItems > 0 ? "🛒" : "🛒"}
    </Text>
  )
}

export default function TabsLayout() {
  const { totalItems } = useCart()
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
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
        name="catalogo"
        options={{
          title: "Catálogo",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏪</Text>,
        }}
      />
      <Tabs.Screen
        name="carrito"
        options={{
          title: "Carrito",
          tabBarBadge: totalItems > 0 ? totalItems : undefined,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🛒</Text>,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="contactos"
        options={{
          title: "Contactos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🤝</Text>,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  )
}
