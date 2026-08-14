// Aritmética monetaria en centavos para evitar errores de punto flotante.
// Toda función pública de este paquete recibe y devuelve pesos (number),
// pero opera internamente en centavos.

export function toCents(pesos: number): number {
  return Math.round(pesos * 100);
}

export function toPesos(cents: number): number {
  return Math.round(cents) / 100;
}
