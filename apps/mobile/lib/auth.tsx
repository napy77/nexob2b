import React, { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

type Rol = "comercio" | "vendedor"

type AuthContextType = {
  token: string | null
  rol: Rol | null
  loading: boolean
  login: (token: string, rol: Rol) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("nexo_token"),
      AsyncStorage.getItem("nexo_rol"),
    ]).then(([t, r]) => {
      setToken(t)
      setRol((r as Rol) || null)
      setLoading(false)
    })
  }, [])

  const login = async (t: string, r: Rol) => {
    await AsyncStorage.setItem("nexo_token", t)
    await AsyncStorage.setItem("nexo_rol", r)
    setToken(t)
    setRol(r)
  }

  const logout = async () => {
    await AsyncStorage.multiRemove(["nexo_token", "nexo_rol"])
    setToken(null)
    setRol(null)
  }

  return (
    <AuthContext.Provider value={{ token, rol, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
