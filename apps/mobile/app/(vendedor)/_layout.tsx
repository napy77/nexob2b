import { useEffect, useRef } from "react"
import { Tabs } from "expo-router"
import { Text, AppState } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Location from "expo-location"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { actualizarUbicacion } from "../../lib/api"

const GPS_INTERVAL_MS = 5 * 60 * 1000

function GpsTracker() {
  const { token } = useAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sendingRef = useRef(false)

  const sendLocation = async () => {
    if (!token || sendingRef.current) return
    sendingRef.current = true
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      await actualizarUbicacion(token, loc.coords.latitude, loc.coords.longitude)
    } catch {}
    finally { sendingRef.current = false }
  }

  useEffect(() => {
    sendLocation()
    intervalRef.current = setInterval(sendLocation, GPS_INTERVAL_MS)
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") sendLocation()
    })
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      sub.remove()
    }
  }, [token])

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
