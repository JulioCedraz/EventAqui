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

// Destino do link de confirmação de cadastro (somente no navegador).
// Resgate de convidado volta logado ao convite; os demais casos vão ao login.
// "confirmado=1" fica na query porque o Supabase apaga o hash da URL ao ler o token.
export function confirmationRedirectUrl(next?: string | null) {
  const origin = window.location.origin
  if (next?.startsWith('/resgatar/')) return `${origin}${next}`

  const params = new URLSearchParams({ confirmado: '1' })
  if (next) params.set('next', next)
  return `${origin}/login?${params.toString()}`
}
