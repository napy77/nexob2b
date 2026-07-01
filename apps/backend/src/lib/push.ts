/**
 * Push Notifications via Firebase Cloud Messaging (FCM v1 API).
 * Usa firebase-admin con service account para autenticación.
 */
import { initializeApp, cert, getApps, App } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"
import * as path from "path"

let _app: App | null = null

function getApp(): App {
  if (!_app) {
    if (getApps().length > 0) {
      _app = getApps()[0]
    } else {
      const saPath =
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.resolve(process.cwd(), "firebase-service-account.json")

      _app = initializeApp({ credential: cert(saPath) })
    }
  }
  return _app
}

export interface PushMessage {
  to: string | string[]
  title: string
  body: string
  data?: Record<string, string>
}

export async function sendPush(msg: PushMessage): Promise<void> {
  const tokens = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean)
  if (tokens.length === 0) return

  const messaging = getMessaging(getApp())

  for (const token of tokens) {
    try {
      await messaging.send({
        token,
        notification: { title: msg.title, body: msg.body },
        data: msg.data
          ? Object.fromEntries(Object.entries(msg.data).map(([k, v]) => [k, String(v)]))
          : {},
        android: {
          priority: "high",
          notification: { sound: "default" },
        },
      })
      console.log("[push] Enviado a", token.slice(0, 20) + "...")
    } catch (err: any) {
      console.error("[push] Error FCM:", err?.message || err)
    }
  }
}
