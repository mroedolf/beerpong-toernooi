<script setup>
import { computed } from 'vue'
import { useHilo } from '../../store/hilo.js'
import { toast } from '../../store/toast.js'
import PlayingCard from '../ui/PlayingCard.vue'

const h = useHilo()

const nextPlayer = computed(() => h.state.players[h.state.turnIndex % h.state.players.length])
const outcome = computed(() => h.state.lastOutcome)
const drinker = computed(() => (outcome.value?.drinkerId ? h.playerById(outcome.value.drinkerId) : null))
const tally = computed(() => [...h.state.players].sort((x, y) => y.sips - x.sips))

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function stop() {
  if (confirm('Spel stoppen en terug naar de lobby?')) act(() => h.stopGame())
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="text-center space-y-1 pour-in">
      <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">Aan de beurt</p>
      <h2 class="font-display text-4xl text-beer leading-tight">{{ nextPlayer.name }}</h2>
      <p class="text-sm text-foam/60">
        Reeks: <span class="font-display text-beer">{{ h.state.streak }}</span>
        · fout kost {{ h.state.streak + 1 }} slok{{ h.state.streak + 1 === 1 ? '' : 'ken' }}
      </p>
    </header>

    <div class="flex justify-center">
      <div :key="h.state.deck.length" class="card-pop">
        <PlayingCard :card="h.state.current" />
      </div>
    </div>

    <div v-if="outcome" class="text-center space-y-0.5" role="status">
      <p class="font-display text-2xl" :class="outcome.correct ? 'text-beer' : 'text-cup'">
        {{ outcome.correct ? 'Goed!' : 'Fout!' }}
      </p>
      <p class="text-sm text-foam/70">
        {{ outcome.prevCard.rank }}{{ outcome.prevCard.suit }} → {{ outcome.nextCard.rank }}{{ outcome.nextCard.suit }}
        <template v-if="!outcome.correct"> — {{ drinker?.name }} drinkt {{ outcome.sips }} slok{{ outcome.sips === 1 ? '' : 'ken' }}</template>
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        class="min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="act(() => h.guess('hoger'))"
      >
        Hoger
      </button>
      <button
        class="min-h-14 rounded-xl font-display text-2xl bg-beer text-night border-b-4 border-beer/60 active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
        @click="act(() => h.guess('lager'))"
      >
        Lager
      </button>
    </div>

    <div class="rounded-2xl border-2 border-line bg-night-soft p-4">
      <h3 class="font-display text-beer mb-2">Schandebord</h3>
      <ul class="space-y-1">
        <li v-for="p in tally" :key="p.id" class="flex justify-between text-sm">
          <span>{{ p.name }}</span>
          <span class="font-display text-beer">{{ p.sips }}</span>
        </li>
      </ul>
    </div>

    <button
      class="w-full min-h-11 rounded-xl font-display text-sm bg-night-soft text-foam/60 border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
      @click="stop"
    >
      Stop het spel
    </button>
  </section>
</template>

<style scoped>
.card-pop {
  animation: card-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes card-pop {
  0% { transform: translateY(10px) scale(0.92); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .card-pop { animation: none; }
}
</style>
