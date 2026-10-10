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
