<script setup>
import { computed } from 'vue'
import { useCod } from '../../store/cod.js'
import { toast } from '../../store/toast.js'
import { RULES } from '../../lib/cod.js'
import PlayingCard from '../ui/PlayingCard.vue'

const c = useCod()

const nextPlayer = computed(() => c.state.players[c.state.turnIndex % c.state.players.length])
const current = computed(() => c.state.current)
const drawer = computed(() => (current.value ? c.playerById(current.value.drawerId) : null))
const rule = computed(() => (current.value ? RULES[current.value.card.rank] : null))
const remaining = computed(() => c.state.deck.length)
const isKing = computed(() => current.value?.card.rank === 'K')

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

// A second tap in the same tick as the fourth king would toast a confusing
// error right before the finish screen swaps in — ignore it silently.
function draw() {
  if (c.state.phase !== 'playing') return
  act(() => c.drawCard())
}

function stop() {
  if (confirm('Spel stoppen en terug naar de lobby?')) act(() => c.stopGame())
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="text-center space-y-1 pour-in">
      <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">Aan de beurt</p>
      <h2 class="font-display text-4xl text-beer leading-tight">{{ nextPlayer.name }}</h2>
    </header>

    <!-- Kings cup + deck status -->
    <div class="flex items-center justify-center gap-6">
      <div class="text-center" aria-label="Koningen getrokken">
        <div class="text-lg tracking-wide">
          <span v-for="i in 4" :key="i" :class="i <= c.state.kingsDrawn ? '' : 'opacity-25 grayscale'">👑</span>
        </div>
        <p class="text-xs text-foam/50 font-semibold mt-0.5">koningen</p>
      </div>
      <div class="text-center text-4xl" aria-hidden="true">🍺</div>
      <div class="text-center">
        <p class="font-display text-lg text-beer tabular-nums">{{ remaining }}</p>
        <p class="text-xs text-foam/50 font-semibold mt-0.5">kaarten over</p>
      </div>
    </div>

    <!-- The drawn card -->
    <div class="flex justify-center min-h-64 items-center">
      <div
        v-if="current"
        :key="remaining"
        class="card-flip rounded-2xl"
        :class="isKing ? 'ring-4 ring-cup' : ''"
      >
        <PlayingCard :card="current.card" />
      </div>
      <div
        v-else
        class="w-44 h-64 rounded-2xl border-2 border-line bg-night-soft grid place-items-center shadow-[6px_6px_0_rgba(0,0,0,.55)]"
        aria-hidden="true"
      >
        <span class="font-display text-5xl text-line">🃏</span>
      </div>
    </div>

    <!-- Rule of the drawn card -->
    <div v-if="current" class="text-center space-y-1" role="status">
      <p class="text-xs text-foam/50 font-semibold">{{ drawer.name }} trok {{ current.card.rank }}{{ current.card.suit }}</p>
      <p class="font-display text-3xl" :class="isKing ? 'text-cup' : 'text-beer'">
        {{ rule.title }}<template v-if="isKing"> ({{ c.state.kingsDrawn }}/4)</template>
      </p>
      <p class="text-sm text-foam/80 max-w-xs mx-auto">{{ rule.text }}</p>
    </div>

    <div class="space-y-3">
      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="draw"
      >
        Trek een kaart 🃏
      </button>
      <button
        class="w-full min-h-11 rounded-xl font-display text-sm bg-night-soft text-foam/60 border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="stop"
      >
        Stop het spel
      </button>
    </div>
  </section>
</template>

<style scoped>
.card-flip {
  animation: card-flip 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
}
@keyframes card-flip {
  0% { transform: rotateY(90deg) scale(0.9); opacity: 0; }
  60% { transform: rotateY(-10deg) scale(1.03); opacity: 1; }
  100% { transform: rotateY(0deg) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .card-flip { animation: none; }
}
</style>
