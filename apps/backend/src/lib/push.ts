/**
 * Push Notifications via Firebase Cloud Messaging (FCM v1 API).
 * Usa firebase-admin con service account para autenticación.
 */
import * as admin from "firebase-admin"
import * as path from "path"

let _app: admin.app.App | null = null

function getApp(): admin.app.App {
  if (!_app) {
    const saPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      path.resolve(process.cwd(), "firebase-service-account.json")

    _app = admin.initializeApp({
      credential: admin.credential.cert(saPath),
    })
  }
  return _app
}

export interface PushMessage {
  to: string | string[]
  title: string
  body: string
  data?: Record<string, string>
  sound?: "default" | null
  badge?: number
}

export async function sendPush(msg: PushMessage): Promise<void> {
  const tokens = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean)
  if (tokens.length === 0) return

  const messaging = admin.messaging(getApp())

  for (const token of tokens) {
    try {
      await messaging.send({
        token,
        notification: {
          title: msg.title,
          body: msg.body,
        },
        data: msg.data
          ? Object.fromEntries(
              Object.entries(msg.data).map(([k, v]) => [k, String(v)])
            )
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
