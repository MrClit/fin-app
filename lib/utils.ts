import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge no conoce los tokens de tamaño custom del tema (#244) y clasifica
// `text-amount-*` como color de texto: al fusionarse con un `text-{color}` en el mismo
// cn() perdería frente a él y desaparecería (el importe caería al tamaño heredado).
// Los registramos en el grupo `font-size` para que solo entren en conflicto con otros
// tamaños. Los tipo t-shirt (text-2xs/3xs/md) ya se detectan solos y no hacen falta.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["amount-xs", "amount-sm", "amount-md", "amount-lg"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
