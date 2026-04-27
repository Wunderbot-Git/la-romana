# Apuestas La Romana 2026 — Guía Rápida

## Resumen

- **40 apuestas obligatorias por jugador**, $2 USD cada una = **$80 USD total**
- 4 apuestas **generales** (todo el torneo) + 36 apuestas **de partidos** (por ronda)
- **Sin banca**: todo lo apostado va a un pozo y se reparte entre los acertadores

---

## 1. Apuestas Generales — 4 (todo el torneo)

| # | Apuesta | Qué predices |
|:-:|---------|---------------|
| 1 | **Ganador del Torneo** | Piratas o Fantasmas |
| 2 | **Marcador Exacto** | Score final, ej. `20-16` (la suma debe dar 36) |
| 3 | **MVP** | Mejor jugador del torneo (mayor Stableford acumulado) |
| 4 | **Peor Jugador** | El que menos Stableford acumule |

> **Cierre:** las apuestas generales se cierran al primer hoyo del torneo (Round 1, Hoyo 1). Después ya no se puede registrar ni cambiar.

---

## 2. Apuestas de Partidos — 36 (3 rondas × 4 grupos × 3 partidos)

Cada ronda tiene **4 grupos**, cada grupo juega **3 partidos** simultáneamente:

- **Singles 1** — Red P1 vs Blue P1 (1:1)
- **Singles 2** — Red P2 vs Blue P2 (1:1)
- **Mejor Bola** — Red P1+P2 vs Blue P1+P2 (2:2)

Por cada partido eliges entre **3 outcomes**:

| Outcome | Significado |
|---------|-------------|
| **Piratas** | Gana el lado rojo |
| **Fantasmas** | Gana el lado azul |
| **A/S** | El partido termina empatado |

> **Cierre:** apenas se ingresa el primer score de un grupo en una ronda, **las 3 apuestas de ese grupo se cierran**. No se puede apostar después de empezar.

---

## 3. Cómo se reparte el pozo

**Sin multiplicadores. Sin bonos por timing.** Cada apuesta = $2 USD = 1 share.

### Por cada partido / pool

```
pozo total = (# apuestas) × $2
ganancia por acertador = pozo total / (# acertadores)
```

### Ejemplos

**Partido Manuela vs Philipp** — 12 apuestas registradas → pozo $24

- 7 personas apostaron a Manuela (Piratas)
- 4 personas apostaron a Philipp (Fantasmas)
- 1 persona apostó A/S

**Si gana Philipp:** los 4 que acertaron se reparten $24 → **$6 cada uno** (recuperan $2 + ganan $4)

**Si termina A/S:** la única persona que acertó A/S se lleva todo el pozo → **$24** (recupera $2 + gana $22)

**Si gana Manuela:** los 7 que acertaron se reparten $24 → **$3.43 cada uno** (recuperan $2 + ganan $1.43)

> **Edge case — nadie acertó:** se reembolsa el dinero a todos los apostadores.

---

## 4. Reembolso por torneo abandonado / partido suspendido

Si un partido **no termina** (suspensión, descalificación, etc.), las apuestas siguen abiertas hasta el final del torneo. Si al cierre del torneo no hay resolución, el partido se considera **A/S** automáticamente para fines de pago.

---

## 5. Liquidación

Al final del torneo el aplicativo:

1. Calcula la **balance neta** de cada jugador (lo ganado − lo perdido)
2. Genera la **lista mínima de transferencias** entre jugadores (algoritmo greedy)
3. Cada jugador ve cuánto debe pagar a quién, o cuánto le deben

> **Sistema de honor.** No hay banca, no hay intermediario. La app sólo sugiere las transferencias más eficientes — los jugadores se ponen al día por Bizum / efectivo / la cerveza del aeropuerto / lo que les convenga.

---

## 6. Tabs en la app `/apuestas`

| Tab | Qué muestra |
|-----|-------------|
| **General** | Las 4 apuestas generales con sus pools actuales |
| **Partidos** | Todas las apuestas de partidos por ronda (selector R1 / R2 / R3) |
| **Clasificación** | Ranking por balance neta — quién va ganando plata, quién está en negativo |
| **Liquidación** | Tras el torneo: lista de transferencias sugeridas |

Cada jugador ve además su **panel personal** arriba: total apostado, ganancia/pérdida realizada, potencial restante, % recuperado.

---

## Notas técnicas

- **Bet amount** se guarda en `events.bet_amount` (ahora = $2.00)
- **Match bets**: tabla `bets`, scoped por `(round_id, flight_id, segment_type, bettor_id)`
- **General bets**: tabla `general_bets`, scoped por `(event_id, bet_type, bettor_id)`
- **Lock**: ambos servicios chequean `hole_scores` para determinar si la ventana está cerrada
- **Adaptaciones vs Bogotá**: sin `scramble`, sin `timing_factor`/`risk_factor`/`partes` (siempre = 1), sin `is_additional`, USD en lugar de COP
