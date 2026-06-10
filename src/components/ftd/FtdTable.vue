<script setup>
import { computed } from 'vue'
import { useFtd } from '../../store/ftd.js'
import { toast } from '../../store/toast.js'
import { GUESS_RANKS, RANK_VALUE } from '../../lib/ftd.js'
import PlayingCard from '../ui/PlayingCard.vue'

const d = useFtd()

const dealer = computed(() => d.state.players[d.state.dealerIndex])
const guesser = computed(() => d.state.players[d.state.turnIndex])
const remaining = computed(() => d.state.deck.length)
const result = computed(() => d.state.result)
const drinker = computed(() => (result.value ? d.playerById(result.value.drinkerId) : null))

// After a wrong first guess, ranks that contradict the hint are off the table.
function disabled(rank) {
  if (d.state.firstGuess === null) return false
  const g = RANK_VALUE[d.state.firstGuess]
  const r = RANK_VALUE[rank]
  if (r === g) return true
  return d.state.hint === 'hoger' ? r < g : r > g
}

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function guess(rank) {
  if (d.state.step !== 'guess') return
  act(() => d.guess(rank))
}

function next() {
  act(() => d.next())
}

function passDeck() {
  if (confirm('De stapel doorgeven aan de volgende deler? De tafel wordt leeggemaakt.')) {
    act(() => d.passDeck())
  }
}

function stop() {
  if (confirm('Spel stoppen en terug naar de lobby?')) act(() => d.stopGame())
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="text-center space-y-1 pour-in">
      <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">Deler: {{ dealer.name }}</p>
      <h2 class="font-display text-4xl text-beer leading-tight">{{ guesser.name }} raadt</h2>
      <p class="text-xs text-foam/50 font-semibold">{{ remaining }} kaarten op de stapel</p>
    </header>

    <!-- Guess in progress: hidden card + the rank pad -->
    <template v-if="d.state.step === 'guess'">
      <div class="flex justify-center min-h-44 items-center">
        <div class="w-32 h-44 rounded-2xl border-2 border-line bg-night-soft grid place-items-center shadow-[6px_6px_0_rgba(0,0,0,.55)]">
          <span class="font-display text-5xl text-line">?</span>
        </div>
      </div>

      <div
        v-if="d.state.firstGuess"
        class="text-center text-sm text-foam/80"
        role="status"
      >
        Je gokte <strong class="text-beer">{{ d.state.firstGuess }}</strong> — de kaart is
        <strong :class="d.state.hint === 'hoger' ? 'text-beer' : 'text-cup'">{{ d.state.hint }}</strong>. Nog één gok.
      </div>
      <p v-else class="text-center text-sm text-foam/60">Raad de rang van de bovenste kaart.</p>

      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="rank in GUESS_RANKS"
          :key="rank"
          class="min-h-12 rounded-xl font-display text-xl bg-night-soft text-foam border-2 border-line active:translate-y-0.5 disabled:opacity-25 disabled:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          :disabled="disabled(rank)"
          @click="guess(rank)"
        >
          {{ rank }}
        </button>
      </div>
    </template>

    <!-- Resolved: reveal the card and who drinks -->
    <template v-else>
      <div class="flex justify-center min-h-64 items-center">
        <div
          :key="d.state.table.length"
          class="card-flip rounded-2xl"
          :class="result.won ? 'ring-4 ring-beer' : 'ring-4 ring-cup'"
        >
          <PlayingCard :card="result.card" />
        </div>
      </div>

      <div class="text-center space-y-1" role="status">
        <p v-if="result.won" class="font-display text-3xl text-beer">
          {{ drinker.name }} drinkt {{ result.sips }}!
        </p>
        <p v-else class="font-display text-3xl text-cup">
          {{ drinker.name }} drinkt {{ result.sips }}!
        </p>
        <p class="text-sm text-foam/70">
          <template v-if="result.won">
            {{ guesser.name }} raadde {{ result.onFirst ? 'meteen' : 'op de tweede gok' }} juist — de deler betaalt.
          </template>
          <template v-else>
            De kaart was {{ result.card.rank }}{{ result.card.suit }}. Twee keer mis, dus {{ drinker.name }} drinkt het verschil.
          </template>
        </p>
      </div>

      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="next"
      >
        Volgende kaart →
      </button>
    </template>

    <!-- Visual table overview: every card laid face-up this round -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-foam/50">Op tafel</p>
        <p class="text-xs text-foam/40">{{ d.state.table.length }} kaarten</p>
      </div>
      <div
        v-if="d.state.table.length"
        class="flex flex-wrap gap-2 rounded-2xl border-2 border-line bg-night-soft/60 p-3"
      >
        <PlayingCard
          v-for="(c, i) in d.state.table"
          :key="i"
          :card="c"
          size="sm"
          class="rounded-lg"
          :class="c.won ? 'ring-2 ring-beer' : 'ring-2 ring-cup'"
          :title="c.won ? 'De deler dronk ' + c.sips : 'De rater dronk ' + c.sips"
        />
      </div>
      <p v-else class="text-center text-sm text-foam/40 py-2">Nog geen kaarten op tafel.</p>
      <div class="flex items-center justify-center gap-4 text-xs text-foam/50">
        <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm ring-2 ring-beer" /> deler dronk</span>
        <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm ring-2 ring-cup" /> rater dronk</span>
      </div>
    </div>

    <div class="space-y-2 pt-2">
      <button
        class="w-full min-h-11 rounded-xl font-display text-sm bg-night-soft text-beer border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="passDeck"
      >
        Geef de stapel door
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
