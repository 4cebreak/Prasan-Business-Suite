import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, options: { showSign?: boolean, showSymbol?: boolean } = { showSymbol: true }) {
  const absAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat("en-IN", {
    style: options.showSymbol ? "currency" : "decimal",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount)
  
  if (options.showSign && amount < 0) {
    return `-${formatted}`
  }
  return formatted
}

