<script setup>
import { ref, computed } from 'vue'
import { useMex } from '../../store/mex.js'
import { scoreRoll, formatAdjes, dealableSips } from '../../lib/mex.js'
import { toast } from '../../store/toast.js'
import { playMex, playDouble, playReturn31 } from '../../lib/sound.js'
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
// Sips this throw lets the player hand out, and to whom (everyone but the thrower).
const dealAmount = computed(() =>
  roll.value.dice[0] !== null ? dealableSips(roll.value.dice[0], roll.value.dice[1]) : 0,
)
const bluff = computed(() => m.state.settings.bluffMode)
// In bluff mode a double is handed out via a claim (so it can be challenged),
// not the open picker; a returned 31 still deals openly.
const canDeal = computed(
  () => dealAmount.value > 0 && !roll.value.dealt && !(bluff.value && score.value?.isDouble),
)
const dealTargets = computed(() => m.state.players.filter(p => p.id !== currentId.value))
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

// Roll the dice and give special outcomes their own sound cue.
function throwDice() {
  resetClaim()
  act(() => {
    m.throwDice()
    const s = score.value
    if (!s) return
    if (s.isMex) playMex()
    else if (s.isDouble) playDouble()
    else if (s.rank === 31) playReturn31()
  })
}

// Bluff-mode claim — available on every throw. Steps: pick a double value
// (skipped for a real double), pick a player, then say whether they challenged.
const claimStep = ref('idle') // idle | amount | target | challenge
const claimKind = ref('bluff')
const claimAmount = ref(6)
const claimTargetId = ref(null)

const canClaim = computed(() => bluff.value && roll.value.dice[0] !== null && !roll.value.dealt)
const realDouble = computed(() => bluff.value && score.value?.isDouble && !roll.value.dealt)
const claimTargetName = computed(() => m.playerById(claimTargetId.value)?.name ?? '')

function resetClaim() {
  claimStep.value = 'idle'
  claimTargetId.value = null
}
function startReal() {
  claimKind.value = 'real'
  claimAmount.value = roll.value.dice[0]
  claimStep.value = 'target'
}
function startBluff() {
  claimKind.value = 'bluff'
  claimAmount.value = 6
  claimStep.value = 'amount'
}
function chooseTarget(id) {
  claimTargetId.value = id
  claimStep.value = 'challenge'
}
function resolve(challenged) {
  act(() => {
    const outcome = m.resolveClaim(claimTargetId.value, claimAmount.value, challenged)
    const name = m.playerById(outcome.drinkerId)?.name ?? ''
    const sips = `${outcome.amount} ${outcome.amount === 1 ? 'slok' : 'slokken'}`
    if (outcome.kind === 'dealt') toast(`${name} drinkt ${sips}.`)
    else if (outcome.kind === 'wrongChallenge') { playDouble(); toast(`${name} daagde fout uit en drinkt ${sips}.`) }
    else { playReturn31(); toast(`${name} blufte en drinkt ${sips}.`) }
    resetClaim()
  })
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

    <!-- Dubbel: uitdelen (in blufmodus via de claim, niet open) -->
    <p v-if="score?.isDouble" class="mex-stamp text-center font-display text-xl text-beer" role="status">
      Dubbel!<template v-if="!bluff"> Deel {{ roll.dice[0] }} slokken uit</template>
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

    <!-- Uitdelen: kies wie de slokken van een dubbel of 31 drinkt -->
    <div v-if="canDeal" class="space-y-2">
      <p class="text-center text-sm text-foam/70">
        Wie drinkt {{ dealAmount }} {{ dealAmount === 1 ? 'slok' : 'slokken' }}?
      </p>
      <div class="flex flex-wrap justify-center gap-2">
        <button
          v-for="p in dealTargets"
          :key="p.id"
          class="min-h-11 px-4 rounded-xl font-semibold bg-night-soft text-foam border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="act(() => m.dealSips(p.id))"
        >
          {{ p.name }}
        </button>
      </div>
    </div>
    <p v-else-if="dealAmount > 0 && roll.dealt" class="text-center text-sm font-display text-beer" role="status">
      {{ dealAmount }} {{ dealAmount === 1 ? 'slok' : 'slokken' }} uitgedeeld.
    </p>

    <div v-if="claimStep === 'idle'" class="space-y-3">
      <button
        v-if="canThrow"
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="throwDice"
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
      <!-- Bluf kan op elke worp; bij een echt dubbel kun je het ook eerlijk uitdelen -->
      <button
        v-if="realDouble"
        class="w-full min-h-12 rounded-xl font-display text-lg bg-beer text-night border-2 border-beer/60 active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
        @click="startReal"
      >
        Deel dubbel {{ roll.dice[0] }} uit
      </button>
      <button
        v-if="canClaim"
        class="w-full min-h-12 rounded-xl font-display text-lg bg-cup text-foam border-2 border-cup-dark active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="startBluff"
      >
        Bluf een dubbel
      </button>
      <button
        v-if="roll.committed"
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-beer text-night border-b-4 border-beer/60 active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
        @click="act(() => m.passTurn())"
      >
        {{ isLastThrower ? 'Bekijk het resultaat' : 'Geef door' }}
      </button>
    </div>

    <!-- Bluf-flow: (aantal →) speler → gechallenged of niet -->
    <div v-else class="space-y-3 rounded-2xl border-2 border-cup bg-night-soft p-4">
      <template v-if="claimStep === 'amount'">
        <p class="text-center text-sm text-foam/70">Welk dubbel claim je?</p>
        <div class="flex items-center justify-center gap-3">
          <button
            class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="claimAmount <= 1"
            aria-label="Lager dubbel"
            @click="claimAmount = Math.max(1, claimAmount - 1)"
          >−</button>
          <span class="font-display text-3xl text-beer w-10 text-center">{{ claimAmount }}</span>
          <button
            class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="claimAmount >= 6"
            aria-label="Hoger dubbel"
            @click="claimAmount = Math.min(6, claimAmount + 1)"
          >+</button>
        </div>
        <button
          class="w-full min-h-12 rounded-xl font-display text-lg bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="claimStep = 'target'"
        >
          Verder
        </button>
      </template>

      <template v-else-if="claimStep === 'target'">
        <p class="text-center text-sm text-foam/70">
          Dubbel {{ claimAmount }} — wie betreft het?
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="p in dealTargets"
            :key="p.id"
            class="min-h-11 px-4 rounded-xl font-semibold bg-night text-foam border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            @click="chooseTarget(p.id)"
          >
            {{ p.name }}
          </button>
        </div>
      </template>

      <template v-else>
        <p class="text-center text-sm text-foam/70">Heeft {{ claimTargetName }} de dubbel gechallenged?</p>
        <button
          class="w-full min-h-12 rounded-xl font-display text-lg bg-beer text-night border-2 border-beer/60 active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
          @click="resolve(false)"
        >
          Geloofd — drinkt {{ claimAmount }}
        </button>
        <button
          class="w-full min-h-12 rounded-xl font-display text-lg bg-cup text-foam border-2 border-cup-dark active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="resolve(true)"
        >
          Gechallenged!
        </button>
      </template>

      <button
        class="w-full min-h-10 rounded-xl font-display text-foam/60 border-2 border-line focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="resetClaim"
      >
        Annuleren
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
