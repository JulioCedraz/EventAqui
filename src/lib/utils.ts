import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Aceita apenas caminhos internos ("/tickets"); bloqueia "//site.com", "/\site.com" e URLs absolutas.
export function safeNextPath(next?: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

// Erros do Supabase são objetos com "message", não instâncias de Error
export function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message: unknown }
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

// Usa window: só no navegador. "confirmado=1" vai na query porque o Supabase apaga o hash da URL ao ler o token.
export function confirmationRedirectUrl(next?: string | null) {
  const origin = window.location.origin
  if (next?.startsWith('/resgatar/')) return `${origin}${next}`

  const params = new URLSearchParams({ confirmado: '1' })
  if (next) params.set('next', next)
  return `${origin}/login?${params.toString()}`
}
