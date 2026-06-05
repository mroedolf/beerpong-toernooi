<script setup>
import { ref, computed } from 'vue'
import { useFles } from '../../store/fles.js'
import { useTournament } from '../../store/tournament.js'
import { useMex } from '../../store/mex.js'
import { toast } from '../../store/toast.js'

const f = useFles()
const t = useTournament()
const m = useMex()

const newName = ref('')
const rotation = ref(0)
const spinning = ref(false)
const result = ref(null)

const players = computed(() => f.state.players)
const canSpin = computed(() => players.value.length >= 2 && !spinning.value)

const importable = computed(() => {
  const here = new Set(players.value.map(p => p.name))
  const names = [...t.state.players.map(p => p.name), ...m.state.players.map(p => p.name)]
  return [...new Set(names)].filter(name => !here.has(name))
})

// Chip position on the ring: angle 0 = top, clockwise.
function chipStyle(i) {
  const angle = (i / players.value.length) * 2 * Math.PI
  const radius = 42 // % of the ring box
  const x = 50 + radius * Math.sin(angle)
  const y = 50 - radius * Math.cos(angle)
  return { left: `${x}%`, top: `${y}%` }
}

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function add() {
  try {
    f.addPlayer(newName.value)
    newName.value = ''
  } catch (e) {
    toast(e.message)
  }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function doSpin() {
  if (spinning.value) return
  let picked
  try {
    picked = f.spin()
  } catch (e) {
    toast(e.message)
    return
  }
  result.value = null
  const n = players.value.length
  const index = players.value.findIndex(p => p.id === picked.id)
  const target = index * (360 / n)
  const delta = (target - (rotation.value % 360) + 360) % 360
  if (reducedMotion()) {
    rotation.value += delta
    result.value = picked
    return
  }
  spinning.value = true
  rotation.value += 3 * 360 + delta
}

function onSpinEnd() {
  if (!spinning.value) return
  spinning.value = false
  result.value = f.playerById(f.state.lastPickedId)
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="text-center pour-in">
      <h2 class="font-display text-3xl text-beer">De Fles 🍾</h2>
      <p class="text-sm text-foam/60">Wie de fles aanwijst, is de pineut.</p>
    </header>

    <!-- The ring -->
    <div class="relative mx-auto aspect-square max-w-xs select-none">
      <span
        v-for="(p, i) in players"
        :key="p.id"
        class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-2.5 py-1 text-xs font-semibold max-w-24 truncate transition-colors"
        :class="result?.id === p.id
          ? 'bg-cup border-cup-dark text-foam'
          : 'bg-night-soft border-line text-foam/80'"
        :style="chipStyle(i)"
      >{{ p.name }}</span>

      <div class="absolute inset-0 grid place-items-center">
        <div
          class="bottle text-7xl"
          :class="spinning ? 'is-spinning' : ''"
          :style="{ transform: `rotate(${rotation}deg)` }"
          aria-hidden="true"
          @transitionend="onSpinEnd"
        >
          <span class="inline-block -rotate-45">🍾</span>
        </div>
      </div>

      <p v-if="players.length < 2" class="absolute inset-0 grid place-items-center text-center text-sm text-foam/40 px-10">
        Zet minstens 2 spelers in de cirkel
      </p>
    </div>

    <p v-if="result" class="text-center font-display text-3xl text-cup" role="status">
      🍾 wijst naar {{ result.name }}!
    </p>

    <button
      class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
      :disabled="!canSpin"
      @click="doSpin"
    >
      {{ spinning ? 'Daar gaat ie…' : 'Draai! 🍾' }}
    </button>

    <form class="flex gap-2" @submit.prevent="add">
      <input
        v-model="newName"
        type="text"
        placeholder="Naam van de speler"
        class="flex-1 min-h-12 rounded-xl bg-night-soft border-2 border-line px-4 text-foam placeholder:text-foam/40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
      />
      <button
        type="submit"
        class="min-h-12 px-5 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        aria-label="Speler toevoegen"
      >+</button>
    </form>

    <button
      v-if="importable.length"
      class="w-full min-h-12 rounded-xl font-display bg-night-soft text-beer border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
      @click="act(() => f.importPlayers(importable))"
    >
      Neem spelers over 🍺
    </button>

    <ul v-if="players.length" class="flex flex-wrap gap-2 justify-center">
      <li
        v-for="p in players"
        :key="p.id"
        class="flex items-center gap-1.5 rounded-full border-2 border-line bg-night-soft pl-3 pr-1.5 py-1 text-sm font-semibold"
      >
        {{ p.name }}
        <button
          class="size-7 grid place-items-center rounded-full text-foam/60 hover:text-cup focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          :aria-label="`${p.name} verwijderen`"
          @click="act(() => f.removePlayer(p.id))"
        >✕</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bottle.is-spinning {
  transition: transform 3.2s cubic-bezier(0.12, 0.8, 0.2, 1);
}
</style>
