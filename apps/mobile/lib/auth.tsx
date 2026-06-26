import React, { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

type Rol = "comercio" | "vendedor"

type AuthContextType = {
  token: string | null
  rol: Rol | null
  mayorista_id: string | null
  loading: boolean
  login: (token: string, rol: Rol, mayorista_id?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [mayorista_id, setMayoristaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("nexo_token"),
      AsyncStorage.getItem("nexo_rol"),
      AsyncStorage.getItem("nexo_mayorista_id"),
    ]).then(([t, r, m]) => {
      setToken(t)
      setRol((r as Rol) || null)
      setMayoristaId(m || null)
      setLoading(false)
    })
  }, [])

  const login = async (t: string, r: Rol, mid?: string) => {
    await AsyncStorage.setItem("nexo_token", t)
    await AsyncStorage.setItem("nexo_rol", r)
    if (mid) await AsyncStorage.setItem("nexo_mayorista_id", mid)
    else await AsyncStorage.removeItem("nexo_mayorista_id")
    setToken(t)
    setRol(r)
    setMayoristaId(mid || null)
  }

  const logout = async () => {
    await AsyncStorage.multiRemove(["nexo_token", "nexo_rol", "nexo_mayorista_id"])
    setToken(null)
    setRol(null)
    setMayoristaId(null)
  }

  return (
    <AuthContext.Provider value={{ token, rol, mayorista_id, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
