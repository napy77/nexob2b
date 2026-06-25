import { useCallback, useRef, useState } from "react"
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Location from "expo-location"
import { useAuth } from "../../lib/auth"
import {
  getRutaActiva, iniciarRuta, finalizarRuta, accionarParada, enviarTrackRuta, ApiError
} from "../../lib/api"

const ESTADO_PARADA: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pendiente: { label: "Pendiente", color: "#92400e", bg: "#fef3c7", emoji: "⏳" },
  visitado:  { label: "Visitado",  color: "#065f46", bg: "#d1fae5", emoji: "✅" },
  omitido:   { label: "Omitido",   color: "#991b1b", bg: "#fee2e2", emoji: "⏭️" },
}

export default function RutaTab() {
  const { token, logout } = useAuth()
  const [ruta, setRuta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cargar = async () => {
    if (!token) return
    try {
      const data = await getRutaActiva(token)
      setRuta(data.ruta)
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => {
    setLoading(true)
    cargar()
  }, [token]))

  // GPS track automático mientras la ruta está en curso
  useFocusEffect(useCallback(() => {
    if (!ruta || ruta.estado !== "en_curso") return
    const sendTrack = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") return
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        if (token && ruta?.id) {
          await enviarTrackRuta(token, ruta.id, loc.coords.latitude, loc.coords.longitude)
        }
      } catch {}
    }
    sendTrack()
    trackingRef.current = setInterval(sendTrack, 2 * 60 * 1000) // cada 2 min
    return () => { if (trackingRef.current) clearInterval(trackingRef.current) }
  }, [ruta?.id, ruta?.estado, token]))

  const handleIniciar = async () => {
    if (!token || !ruta) return
    Alert.alert("Iniciar ruta", `¿Comenzás la ruta "${ruta.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Iniciar", onPress: async () => {
        setAccionando("iniciar")
        try {
          await iniciarRuta(token, ruta.id)
          await cargar()
        } catch (e: any) {
          Alert.alert("Error", e.message)
        } finally { setAccionando(null) }
      }},
    ])
  }

  const handleFinalizar = async () => {
    if (!token || !ruta) return
    Alert.alert("Finalizar ruta", "¿Confirmás que terminaste la ruta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Finalizar", style: "destructive", onPress: async () => {
        setAccionando("finalizar")
        try {
          await finalizarRuta(token, ruta.id)
          await cargar()
        } catch (e: any) {
          Alert.alert("Error", e.message)
        } finally { setAccionando(null) }
      }},
    ])
  }

  const handleParada = async (parada: any, accion: "visitar" | "omitir") => {
    if (!token || !ruta) return
    const label = accion === "visitar" ? "Marcar como visitado" : "Omitir parada"
    Alert.alert(label, `${parada.comercio_nombre}`, [
      { text: "Cancelar", style: "cancel" },
      { text: accion === "visitar" ? "✅ Llegué" : "⏭️ Omitir", onPress: async () => {
        setAccionando(parada.id)
        try {
          await accionarParada(token, ruta.id, parada.id, accion)
          await cargar()
        } catch (e: any) {
          Alert.alert("Error", e.message)
        } finally { setAccionando(null) }
      }},
    ])
  }

  const handleNavegar = (parada: any) => {
    if (!parada.comercio_lat || !parada.comercio_lng) {
      Alert.alert("Sin coordenadas", "Este comercio no tiene ubicación registrada.")
      return
    }
    const lat = parseFloat(parada.comercio_lat)
    const lng = parseFloat(parada.comercio_lng)
    const nombre = encodeURIComponent(parada.comercio_nombre)

    Alert.alert("Navegar", `Ir a ${parada.comercio_nombre}`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "🗺️ Waze",
        onPress: () => {
          const url = `waze://?ll=${lat},${lng}&navigate=yes`
          Linking.canOpenURL(url).then(can => {
            if (can) Linking.openURL(url)
            else Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`)
          })
        }
      },
      {
        text: "📍 Google Maps",
        onPress: () => Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${nombre}&travelmode=driving`
        )
      },
    ])
  }

  if (loading) return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}><Text style={styles.navTitle}>Mi Ruta</Text></View>
      <ActivityIndicator style={{ marginTop: 40 }} color="#059669" size="large" />
    </SafeAreaView>
  )

  if (!ruta) return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}><Text style={styles.navTitle}>Mi Ruta</Text></View>
      <View style={styles.empty}>
        <Text style={{ fontSize: 48 }}>🛣️</Text>
        <Text style={styles.emptyTitle}>Sin ruta asignada</Text>
        <Text style={styles.emptyText}>Tu mayorista te asignará una ruta de visitas</Text>
      </View>
    </SafeAreaView>
  )

  const paradas = ruta.paradas || []
  const visitadas = paradas.filter((p: any) => p.estado === "visitado").length
  const pct = paradas.length > 0 ? Math.round((visitadas / paradas.length) * 100) : 0
  const enCurso = ruta.estado === "en_curso"
  const pendiente = ruta.estado === "pendiente"
  const paradasPendientes = paradas.filter((p: any) => p.estado === "pendiente")

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Mi Ruta</Text>
        {enCurso && <Text style={styles.navLive}>🔴 En curso</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header ruta */}
        <View style={styles.header}>
          <Text style={styles.rutaNombre}>{ruta.nombre}</Text>
          <Text style={styles.rutaFecha}>
            📅 {new Date(ruta.fecha + "T12:00:00").toLocaleDateString("es-AR", {
              weekday: "long", day: "numeric", month: "long"
            })}
          </Text>
          {ruta.notas && <Text style={styles.rutaNotas}>📝 {ruta.notas}</Text>}

          {/* Progreso */}
          <View style={styles.progreso}>
            <View style={styles.progresoBar}>
              <View style={[styles.progresoFill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={styles.progresoText}>{visitadas}/{paradas.length} paradas visitadas</Text>
          </View>

          {/* Acciones principales */}
          {pendiente && (
            <TouchableOpacity style={styles.btnIniciar} onPress={handleIniciar}
              disabled={accionando === "iniciar"}>
              {accionando === "iniciar"
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnIniciarText}>▶ Iniciar ruta</Text>}
            </TouchableOpacity>
          )}
          {enCurso && paradasPendientes.length === 0 && (
            <TouchableOpacity style={styles.btnFinalizar} onPress={handleFinalizar}
              disabled={accionando === "finalizar"}>
              {accionando === "finalizar"
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnFinalizarText}>🏁 Finalizar ruta</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de paradas */}
        <Text style={styles.seccion}>PARADAS ({paradas.length})</Text>
        {paradas.map((p: any, idx: number) => {
          const ep = ESTADO_PARADA[p.estado] || ESTADO_PARADA.pendiente
          const esPendiente = p.estado === "pendiente"
          const esProxima = enCurso && esPendiente && idx === paradas.findIndex((x: any) => x.estado === "pendiente")

          return (
            <View key={p.id} style={[styles.parada, esProxima && styles.paradaProxima]}>
              <View style={styles.paradaHeader}>
                <View style={[styles.paradaNum, { backgroundColor: ep.bg }]}>
                  <Text style={[styles.paradaNumText, { color: ep.color }]}>{p.orden}</Text>
                </View>
                <View style={styles.paradaInfo}>
                  <Text style={styles.paradaNombre}>{p.comercio_nombre}</Text>
                  {p.comercio_direccion && (
                    <Text style={styles.paradaDireccion}>{p.comercio_direccion}</Text>
                  )}
                  {esProxima && <Text style={styles.paradaProximaLabel}>⬆ Próxima parada</Text>}
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: ep.bg }]}>
                  <Text style={{ fontSize: 14 }}>{ep.emoji}</Text>
                </View>
              </View>

              {p.hora_llegada && (
                <Text style={styles.horario}>
                  Llegada: {new Date(p.hora_llegada).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  {p.hora_salida && ` · Salida: ${new Date(p.hora_salida).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`}
                </Text>
              )}

              {enCurso && esPendiente && (
                <View style={styles.paradaBotones}>
                  <TouchableOpacity style={styles.btnNavegar} onPress={() => handleNavegar(p)}>
                    <Text style={styles.btnNavegarText}>🗺️ Navegar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnLlegue}
                    disabled={accionando === p.id}
                    onPress={() => handleParada(p, "visitar")}>
                    {accionando === p.id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.btnLlegueText}>✅ Llegué</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnOmitir}
                    disabled={accionando === p.id}
                    onPress={() => handleParada(p, "omitir")}>
                    <Text style={styles.btnOmitirText}>⏭️</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })}

        {ruta.estado === "completada" && (
          <View style={styles.completadaBanner}>
            <Text style={styles.completadaText}>🏁 Ruta completada</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0fdf4" },
  nav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  navTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  navLive: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
  rutaNombre: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 4 },
  rutaFecha: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  rutaNotas: { fontSize: 13, color: "#6b7280", fontStyle: "italic", marginBottom: 10 },
  progreso: { marginTop: 8 },
  progresoBar: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  progresoFill: { height: "100%", backgroundColor: "#059669", borderRadius: 3 },
  progresoText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  btnIniciar: { backgroundColor: "#059669", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 12 },
  btnIniciarText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  btnFinalizar: { backgroundColor: "#1e40af", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 12 },
  btnFinalizarText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  seccion: { fontSize: 11, fontWeight: "700", color: "#9ca3af", letterSpacing: 1, marginBottom: 8 },
  parada: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4,
    borderLeftWidth: 3, borderLeftColor: "#e5e7eb",
  },
  paradaProxima: { borderLeftColor: "#059669", backgroundColor: "#f0fdf4" },
  paradaHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  paradaNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  paradaNumText: { fontSize: 13, fontWeight: "800" },
  paradaInfo: { flex: 1 },
  paradaNombre: { fontSize: 14, fontWeight: "700", color: "#111827" },
  paradaDireccion: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  paradaProximaLabel: { fontSize: 11, fontWeight: "700", color: "#059669", marginTop: 4 },
  estadoBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  horario: { fontSize: 11, color: "#9ca3af", marginTop: 8 },
  paradaBotones: { flexDirection: "row", gap: 8, marginTop: 12 },
  btnNavegar: {
    flex: 1, backgroundColor: "#eff6ff", borderRadius: 10, padding: 10,
    alignItems: "center", borderWidth: 1, borderColor: "#bfdbfe",
  },
  btnNavegarText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  btnLlegue: { flex: 1.2, backgroundColor: "#059669", borderRadius: 10, padding: 10, alignItems: "center" },
  btnLlegueText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnOmitir: { backgroundColor: "#fef2f2", borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 14 },
  btnOmitirText: { fontSize: 16 },
  completadaBanner: { backgroundColor: "#d1fae5", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  completadaText: { color: "#065f46", fontWeight: "800", fontSize: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af", textAlign: "center", paddingHorizontal: 32 },
})
