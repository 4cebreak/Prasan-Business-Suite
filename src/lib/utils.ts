import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, options: { showSign?: boolean } = {}) {
  const absAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount)
  
  if (options.showSign && amount < 0) {
    return `-${formatted}`
  }
  if (options.showSign && amount > 0) {
    // Optional: could return `+${formatted}` if specifically wanted, 
    // but usually just the number is fine.
    return formatted 
  }
  return formatted
}

