/* Generador de identificadores únicos para el estado en memoria.
   Combina el reloj con un contador para evitar colisiones en ráfaga. */
let counter = 0;
export function newId(): number {
  counter += 1;
  return Date.now() * 1000 + (counter % 1000);
}
