# SPEC 01 — Cuatro fantasmas con comportamientos distintos

> **Estado:** Borrador
> **Depende de:** Ninguna
> **Fecha:** 2026-10-28
> **Objetivo:** Añadir cuatro fantasmas con estrategias de persecución, emboscada, patrulla y evasión, salidas escalonadas e identificación visual por color.

## Alcance

**Incluido:**

- Sustituir los dos fantasmas actuales por cuatro fantasmas en el laberinto existente.
- Dar a cada fantasma una estrategia de movimiento distinta.
- Usar búsqueda de ruta más corta por celdas transitables para perseguir objetivos, teniendo en cuenta paredes y túneles.
- Colocar los cuatro fantasmas en la pen actual y liberarlos a los 0, 3, 6 y 9 segundos desde el inicio de cada partida.
- Mantener quietos y fuera de colisiones a los fantasmas que sigan dentro de la pen.
- Identificar los roles mediante los colores clásicos: rojo, rosa, cian y naranja.
- Mantener las reglas existentes de colisión, vidas, movimiento de Pac-Man y finalización de partida.

**Fuera de alcance (para futuras specs):**

- Power-ups, fantasmas asustados o vulnerables y modos clásicos de dispersión.
- Cambios al diseño del laberinto, las vidas, la puntuación o la dificultad general.
- Persistencia, nuevos niveles, multijugador o cambios de plataforma.

## Modelo de datos

Las posiciones iniciales se declaran en `src/js/maze.js`. Los cuatro fantasmas ocupan las celdas transitables `(12, 14)`, `(13, 14)`, `(14, 14)` y `(15, 14)` dentro de la pen.

Cada fantasma conserva sus coordenadas, dirección y velocidad actuales, y añade un rol, un retraso de salida y un indicador de actividad:

```js
{
  x: 12,
  y: 14,
  dir: 'up',
  speed: GHOST_SPEED,
  kind: 'hunter',
  releaseAt: 0,
  active: false,
}
```

Los valores de `kind` son `hunter`, `ambusher`, `patrol` y `evasive`, asociados respectivamente a los colores rojo, rosa, cian y naranja. `releaseAt` se expresa en segundos desde el inicio de la partida. Los retrasos son, respectivamente, `0`, `3`, `6` y `9`. El rojo queda activo al comenzar; los demás esperan hasta alcanzar su retraso.

El patrullero usa los puntos transitables `(1, 1)`, `(26, 1)`, `(26, 29)` y `(1, 29)`, que recorren los cuatro cuadrantes en sentido horario. El color se asocia al rol en `src/js/render.js`, no al índice del fantasma.

## Plan de implementación

1. Ampliar `GHOST_STARTS` en `src/js/maze.js` con cuatro posiciones y roles, y actualizar `createGame` y `resetPositions` en `src/js/game.js` para conservarlos. Comprobar que la partida sigue iniciando y reiniciando.
2. Asociar los cuatro colores por `kind` en `src/js/render.js`. Comprobar que cada fantasma mantiene el mismo color al reiniciar.
3. Añadir en `src/js/game.js` una búsqueda de ruta más corta que reutilice las reglas de movimiento de los fantasmas: respeta paredes, atraviesa la puerta de la pen y conecta los extremos del túnel. Usarla para que el fantasma rojo persiga la celda actual de Pac-Man.
4. Implementar el objetivo del emboscador rosa: cuatro celdas delante de Pac-Man; si la celda proyectada no es transitable, usar la celda transitable más cercana y buscar la ruta más corta hasta ella.
5. Implementar la patrulla cian como recorrido cíclico por los cuatro puntos de referencia indicados en el modelo de datos.
6. Implementar el comportamiento naranja: con distancia por pasillos de seis celdas o menos, elegir el movimiento legal que aumente al máximo la distancia; a mayor distancia, perseguir a Pac-Man por la ruta más corta.
7. Integrar los retrasos de salida en `src/js/main.js` y `src/js/game.js` usando el tiempo transcurrido desde el inicio de la partida. Los fantasmas no activos permanecen quietos y no participan en colisiones; al reiniciar, los tiempos vuelven a cero.

## Criterios de aceptación

- [ ] Iniciar la partida muestra cuatro fantasmas en la pen, con colores rojo, rosa, cian y naranja asignados a sus roles.
- [ ] El rojo persigue a Pac-Man por una ruta transitable más corta, incluso cuando hay paredes entre ambos o se usa el túnel.
- [ ] El rosa busca una celda cuatro posiciones delante de Pac-Man y usa una celda transitable cercana cuando la proyectada no lo es.
- [ ] El cian visita cíclicamente los cuatro puntos de patrulla en el orden especificado.
- [ ] El naranja huye cuando la distancia por pasillos es de seis celdas o menos y persigue a Pac-Man cuando es mayor.
- [ ] El rojo está activo al inicio; los otros fantasmas se activan a los 3, 6 y 9 segundos, respectivamente.
- [ ] Antes de su salida, cada fantasma permanece quieto y no reduce las vidas de Pac-Man al coincidir con él.
- [ ] Reiniciar la partida devuelve a los cuatro fantasmas a sus posiciones iniciales y reinicia los retrasos de salida.
- [ ] La partida sigue respondiendo a las flechas y conserva las reglas existentes de vidas, colisiones y fin de partida.
- [ ] La consola del navegador no muestra errores al iniciar o reiniciar la partida.

## Decisiones

- **Sí:** usar cuatro roles simples y distintos, en lugar de replicar toda la lógica clásica. Mantiene la IA acotada al MVP.
- **Sí:** buscar rutas por el laberinto para perseguir objetivos y medir distancias. La distancia geométrica por sí sola no representa paredes ni túneles.
- **Sí:** escalonar las salidas en intervalos fijos de tres segundos. Es observable y reiniciable sin añadir umbrales de puntos.
- **Sí:** mantener las colisiones y vidas actuales para limitar el cambio a la IA, las salidas y la representación visual.
- **No:** añadir power-ups o estados de vulnerabilidad. Esos mecanismos requieren reglas de juego adicionales y quedan fuera de esta spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La búsqueda de rutas puede ignorar el túnel o tratar como transitables celdas bloqueadas para un actor. | Reutilizar las reglas de movimiento existentes e incluir explícitamente el enlace del túnel en la búsqueda. |
| La celda proyectada del emboscador puede caer en una pared o fuera del laberinto. | Sustituirla por la celda transitable más cercana antes de calcular la ruta. |

## Lo que **no** incluye esta spec

- Power-ups ni fantasmas vulnerables.
- Modos de dispersión clásicos ni ajustes generales de dificultad.
- Rediseño del laberinto, nuevos niveles, persistencia o multijugador.

Cada uno de estos cambios requeriría su propia spec.
