import { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native"
import { Link } from "expo-router"
import { useAuth } from "../../lib/auth"
import { loginComercio, loginVendedor, ApiError } from "../../lib/api"

type Rol = "comercio" | "vendedor"

export default function LoginScreen() {
  const { login } = useAuth()
  const [rol, setRol] = useState<Rol>("comercio")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Completá email y contraseña")
      return
    }
    setLoading(true)
    try {
      let data: any
      if (rol === "comercio") {
        data = await loginComercio(email.trim().toLowerCase(), password)
        await login(data.token, rol)
      } else {
        data = await loginVendedor(email.trim().toLowerCase(), password)
        await login(data.token, rol, data.vendedor?.mayorista_id)
      }
    } catch (e: any) {
      Alert.alert("Error", e instanceof ApiError ? e.message : `Error de conexión: ${e?.message || String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Nexo B2B</Text>
          <Text style={styles.subtitle}>
            {rol === "comercio" ? "Portal Comercio" : "Portal Vendedor"}
          </Text>
        </View>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, rol === "comercio" && styles.toggleActive]}
            onPress={() => setRol("comercio")}
          >
            <Text style={[styles.toggleText, rol === "comercio" && styles.toggleTextActive]}>
              🏪 Comercio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, rol === "vendedor" && styles.toggleActive]}
            onPress={() => setRol("vendedor")}
          >
            <Text style={[styles.toggleText, rol === "vendedor" && styles.toggleTextActive]}>
              🧑‍💼 Vendedor
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Iniciar sesión</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@email.com"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Ingresar</Text>
            }
          </TouchableOpacity>

          {rol === "comercio" && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>¿No tenés cuenta? </Text>
              <Link href="/(auth)/register" style={styles.link}>Registrate</Link>
            </View>
          )}

          {rol === "vendedor" && (
            <Text style={styles.vendedorHint}>
              Tu contraseña es asignada por el mayorista. Si no la tenés, contactalo.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0f6ff" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 24 },
  logo: { fontSize: 32, fontWeight: "800", color: "#2563eb", letterSpacing: -1 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#e0eaff",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  toggleTextActive: { color: "#2563eb" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: "#111827",
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: "#6b7280", fontSize: 14 },
  link: { color: "#2563eb", fontWeight: "600", fontSize: 14 },
  vendedorHint: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 16,
    lineHeight: 18,
  },
})
