/**
 * Expo Push Notifications via Expo Push API.
 * No requiere Firebase para desarrollo/testing.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = "https://exp.host/--/push/send"

export interface PushMessage {
  to: string | string[]   // ExpoPushToken(s)
  title: string
  body: string
  data?: Record<string, any>
  sound?: "default" | null
  badge?: number
}

export async function sendPush(msg: PushMessage): Promise<void> {
  const tokens = Array.isArray(msg.to) ? msg.to : [msg.to]
  const validos = tokens.filter((t) => t && t.startsWith("ExponentPushToken["))
  if (validos.length === 0) return

  const mensajes = validos.map((token) => ({
    to: token,
    title: msg.title,
    body: msg.body,
    data: msg.data || {},
    sound: msg.sound !== undefined ? msg.sound : "default",
    badge: msg.badge,
  }))

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(mensajes),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error("[push] Error Expo Push API:", res.status, text)
    }
  } catch (err) {
    console.error("[push] Error enviando push:", err)
  }
}
