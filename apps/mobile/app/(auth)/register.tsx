import { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native"
import { Link } from "expo-router"
import { useAuth } from "../../lib/auth"
import { registerComercio, ApiError } from "../../lib/api"

export default function RegisterScreen() {
  const { login } = useAuth()
  const [form, setForm] = useState({
    nombre: "", cuit: "", email: "", password: "",
    telefono: "", ciudad: "", provincia: "",
  })
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const handleRegister = async () => {
    if (!form.nombre || !form.cuit || !form.email || !form.password) {
      Alert.alert("Completá los campos obligatorios")
      return
    }
    setLoading(true)
    try {
      const data = await registerComercio({
        ...form,
        email: form.email.trim().toLowerCase(),
      })
      await login(data.token)
    } catch (e: any) {
      Alert.alert("Error", e instanceof ApiError ? e.message : "Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Nexo B2B</Text>
          <Text style={styles.subtitle}>Registrá tu comercio</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>

          {[
            { key: "nombre", label: "Nombre del comercio *", placeholder: "Mi Comercio S.A." },
            { key: "cuit", label: "CUIT *", placeholder: "20-12345678-9", keyboardType: "numeric" },
            { key: "email", label: "Email *", placeholder: "contacto@micomercio.com", keyboard: "email-address" },
            { key: "password", label: "Contraseña *", placeholder: "••••••••", secure: true },
            { key: "telefono", label: "Teléfono", placeholder: "+54 9 11 1234-5678" },
            { key: "ciudad", label: "Ciudad", placeholder: "Buenos Aires" },
            { key: "provincia", label: "Provincia", placeholder: "Buenos Aires" },
          ].map(({ key, label, placeholder, secure, keyboard, keyboardType }: any) => (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={form[key as keyof typeof form]}
                onChangeText={set(key as keyof typeof form)}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                secureTextEntry={!!secure}
                autoCapitalize={secure || keyboard === "email-address" ? "none" : "sentences"}
                keyboardType={keyboard || keyboardType || "default"}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Registrarme</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
            <Link href="/(auth)/login" style={styles.link}>Ingresá</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0f6ff" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 32, fontWeight: "800", color: "#2563eb", letterSpacing: -1 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
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
})
