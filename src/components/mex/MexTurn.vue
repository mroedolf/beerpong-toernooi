<script setup>
import { computed } from 'vue'
import { useMex } from '../../store/mex.js'
import { scoreRoll, formatAdjes } from '../../lib/mex.js'
import { toast } from '../../store/toast.js'
import MexDie from './MexDie.vue'

const m = useMex()

const round = computed(() => m.state.round)
const inRolloff = computed(() => round.value.rolloffIds !== null)
const activeIds = computed(() => round.value.rolloffIds ?? round.value.order)
const currentId = computed(() => activeIds.value[round.value.turnIndex])
const player = computed(() => m.playerById(currentId.value))
const roll = computed(() => round.value.rolls[currentId.value])
const cap = computed(() => (inRolloff.value ? 1 : round.value.maxThrows))
// Score of the dice on the table — a returned 31 leaves throwsUsed at 0 but the
// dice visible, so derive from dice presence rather than the throw counter.
const score = computed(() =>
  roll.value.dice[0] !== null ? scoreRoll(roll.value.dice[0], roll.value.dice[1]) : null,
)
const isReturned31 = computed(() => score.value?.rank === 31)
const potAdjes = computed(() => round.value.mexCount * m.state.settings.potPerMex)
const isLastThrower = computed(() => round.value.turnIndex === activeIds.value.length - 1)
const canThrow = computed(() => !roll.value.committed && roll.value.throwsUsed < cap.value)
const canStay = computed(() => !roll.value.committed && roll.value.throwsUsed >= 1 && !isReturned31.value)
const canHold = computed(() =>
  !inRolloff.value && !roll.value.committed && roll.value.throwsUsed >= 1 && roll.value.throwsUsed < cap.value,
)

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="text-center space-y-1 pour-in">
      <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">
        {{ inRolloff ? 'Roll-off!' : `Ronde ${round.number}` }}
      </p>
      <h2 class="font-display text-4xl text-beer leading-tight">{{ player.name }}</h2>
      <p class="text-sm text-foam/60">
        <template v-if="inRolloff">Eén worp. Geen genade.</template>
        <template v-else>
          Worp {{ Math.min(roll.throwsUsed + 1, cap) }} van {{ cap }}
          <span aria-hidden="true">
            {{ '●'.repeat(roll.throwsUsed) }}{{ '○'.repeat(Math.max(0, cap - roll.throwsUsed)) }}
          </span>
        </template>
      </p>
    </header>

    <p v-if="potAdjes > 0" class="text-center text-sm font-display text-beer">
      In de pot: {{ formatAdjes(potAdjes) }} adje
    </p>

    <!-- MEX stamp -->
    <div v-if="score?.isMex" class="mex-stamp text-center space-y-1" role="status">
      <span class="font-display text-6xl text-cup drop-shadow-[4px_4px_0_rgba(0,0,0,.6)] block">MEX!!!</span>
      <span class="text-sm text-foam/80 block">+{{ formatAdjes(m.state.settings.potPerMex) }} adje in de pot</span>
    </div>

    <!-- Dubbel: uitdelen -->
    <p v-if="score?.isDouble" class="mex-stamp text-center font-display text-xl text-beer" role="status">
      Dubbel! Deel {{ roll.dice[0] }} slokken uit
    </p>

    <!-- 31: worp terug -->
    <p v-if="isReturned31" class="mex-stamp text-center font-display text-xl text-beer" role="status">
      31! Deel 1 slok uit en gooi opnieuw
    </p>

    <div class="flex items-center justify-center gap-6">
      <MexDie
        v-for="i in [0, 1]"
        :key="i"
        :value="roll.dice[i]"
        :held="roll.held[i]"
        :holdable="canHold"
        :spin="roll.throwsUsed"
        @toggle-hold="act(() => m.toggleHold(i))"
      />
    </div>

    <p v-if="score && !score.isMex && !isReturned31" class="text-center font-display text-5xl text-beer">
      {{ score.label }}
    </p>
    <p v-if="canHold" class="text-center text-xs text-foam/50">
      Tik op een dobbelsteen om hem vast te houden (max één).
    </p>

    <div class="space-y-3">
      <button
        v-if="canThrow"
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="act(() => m.throwDice())"
      >
        Gooi
      </button>
      <button
        v-if="canStay && canThrow"
        class="w-full min-h-12 rounded-xl font-display text-lg bg-night-soft text-foam border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="act(() => m.stay())"
      >
        Blijven staan
      </button>
      <button
        v-if="roll.committed"
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-beer text-night border-b-4 border-beer/60 active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
        @click="act(() => m.passTurn())"
      >
        {{ isLastThrower ? 'Bekijk het resultaat' : 'Geef door' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.mex-stamp {
  animation: stamp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes stamp {
  0% { transform: scale(3) rotate(-12deg); opacity: 0; }
  70% { transform: scale(0.95) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(-3deg); }
}
@media (prefers-reduced-motion: reduce) {
  .mex-stamp { animation: none; }
}
</style>
