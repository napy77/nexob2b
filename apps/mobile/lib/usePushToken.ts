/**
 * Solicita permisos de push, obtiene el Expo push token
 * y lo registra en el backend según el rol del usuario.
 */
import { useEffect } from "react"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import Constants from "expo-constants"
import { registrarPushTokenComercio, registrarPushTokenVendedor } from "./api"

// projectId explícito para que funcione tanto en build local como EAS
const PROJECT_ID =
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
  "f497576e-9275-4e83-8070-62a8acbc7a0b"

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function usePushToken(token: string | null, rol: "comercio" | "vendedor" | null) {
  useEffect(() => {
    if (!token || !rol) return

    let cancelado = false

    async function registrar() {
      try {
        // Verificar/pedir permisos
        const { status: existente } = await Notifications.getPermissionsAsync()
        let finalStatus = existente
        if (existente !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }
        if (finalStatus !== "granted") return

        // En Android hay que crear un canal
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Nexo B2B",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          })
        }

        const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
          projectId: PROJECT_ID,
        })
        if (!pushToken || cancelado) return

        console.log("[push] Token obtenido:", pushToken)

        if (rol === "comercio") {
          await registrarPushTokenComercio(token, pushToken)
        } else {
          await registrarPushTokenVendedor(token, pushToken)
        }
      } catch (err) {
        console.warn("[push] Error registrando token:", err)
      }
    }

    registrar()
    return () => { cancelado = true }
  }, [token, rol])
}
