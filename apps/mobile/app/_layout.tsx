import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider, useAuth } from "../lib/auth"
import { CartProvider } from "../lib/cart"
import { VendedorProvider } from "../lib/vendedor"

function RootGuard() {
  const { token, rol, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === "(auth)"
    const inVendedor = segments[0] === "(vendedor)"
    const inTabs = segments[0] === "(tabs)"

    if (!token) {
      if (!inAuth) router.replace("/(auth)/login")
    } else if (rol === "vendedor") {
      if (!inVendedor) router.replace("/(vendedor)/clientes")
    } else {
      if (!inTabs) router.replace("/(tabs)/catalogo")
    }
  }, [token, rol, loading, segments])

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CartProvider>
            <VendedorProvider>
            <RootGuard />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(vendedor)" />
              <Stack.Screen name="catalogo/[id]" options={{ presentation: "card" }} />
            </Stack>
          </VendedorProvider>
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
