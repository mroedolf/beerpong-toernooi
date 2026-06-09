<script setup>
import { ref, computed } from 'vue'
import { useMex } from '../../store/mex.js'
import { toast } from '../../store/toast.js'
import { playDouble, playReturn31 } from '../../lib/sound.js'
import MexDie from './MexDie.vue'

const m = useMex()

const claim = computed(() => m.state.round.claim)
const claimer = computed(() => m.playerById(claim.value.byId))
const target = computed(() => m.playerById(claim.value.targetId))
const dice = computed(() => m.state.round.rolls[claim.value.byId].dice)
const penalty = computed(() => 2 * m.state.settings.baseSips)
const challengers = computed(() => m.state.players.filter(p => p.id !== claim.value.byId))
const drinker = computed(() => (claim.value.revealed ? m.playerById(claim.value.drinkerId) : null))

const picking = ref(false)

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function challenge(id) {
  act(() => {
    const { wasReallyDouble } = m.challengeClaim(id)
    if (wasReallyDouble) playDouble()
    else playReturn31()
    picking.value = false
  })
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <!-- Decision: the phone is passed face-down, the table only sees the claim -->
    <template v-if="!claim.revealed">
      <header class="text-center space-y-1 pour-in">
        <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">Gsm doorgegeven</p>
        <h2 class="font-display text-3xl text-beer leading-tight">{{ claimer.name }} claimt een dubbel</h2>
        <p class="text-sm text-foam/60">Geloven jullie het, of dagen jullie uit?</p>
      </header>

      <div class="flex items-center justify-center gap-6">
        <div
          v-for="i in [0, 1]"
          :key="i"
          class="size-24 rounded-2xl border-2 border-line bg-night grid place-items-center shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        >
          <span class="font-display text-5xl text-foam/30">?</span>
        </div>
      </div>

      <p class="text-center font-display text-2xl text-beer">
        Dubbel {{ claim.value }} — {{ target.name }} drinkt {{ claim.value }}
      </p>

      <div v-if="!picking" class="space-y-3">
        <button
          class="w-full min-h-14 rounded-xl font-display text-2xl bg-beer text-night border-b-4 border-beer/60 active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
          @click="act(() => m.believeClaim())"
        >
          Geloof het
        </button>
        <button
          class="w-full min-h-12 rounded-xl font-display text-lg bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="picking = true"
        >
          Challenge!
        </button>
      </div>

      <div v-else class="space-y-2">
        <p class="text-center text-sm text-foam/70">Wie daagt {{ claimer.name }} uit?</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="p in challengers"
            :key="p.id"
            class="min-h-11 px-4 rounded-xl font-semibold bg-night-soft text-foam border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            @click="challenge(p.id)"
          >
            {{ p.name }}
          </button>
        </div>
        <button
          class="w-full min-h-10 rounded-xl font-display text-foam/60 border-2 border-line focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="picking = false"
        >
          Toch geloven
        </button>
      </div>
    </template>

    <!-- Reveal: the dice come out, the loser of the bet drinks -->
    <template v-else>
      <header class="text-center space-y-1 pour-in">
        <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">Onthuld</p>
        <h2 class="font-display text-4xl leading-tight" :class="claim.wasReallyDouble ? 'text-beer' : 'text-cup'">
          {{ claim.wasReallyDouble ? 'Echt een dubbel!' : 'Bluf betrapt!' }}
        </h2>
      </header>

      <div class="flex items-center justify-center gap-6">
        <MexDie v-for="i in [0, 1]" :key="i" :value="dice[i]" :spin="1" />
      </div>

      <p class="text-center font-display text-2xl text-cup">
        {{ drinker.name }} drinkt {{ penalty }} slokken
      </p>
      <p class="text-center text-sm text-foam/60">
        {{ claim.wasReallyDouble
          ? `${claimer.name} had het echt — de uitdager betaalt.`
          : `${claimer.name} blufte — en wordt gepakt.` }}
      </p>

      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-beer text-night border-b-4 border-beer/60 active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
        @click="act(() => m.ackChallenge())"
      >
        Verder
      </button>
    </template>
  </section>
</template>
