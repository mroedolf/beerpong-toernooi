<script setup>
import { ref, computed } from 'vue'
import { useHilo } from '../../store/hilo.js'
import { useTournament } from '../../store/tournament.js'
import { useMex } from '../../store/mex.js'
import { toast } from '../../store/toast.js'

const h = useHilo()
const t = useTournament()
const m = useMex()

const newName = ref('')

const importable = computed(() => {
  const here = new Set(h.state.players.map(p => p.name))
  const names = [...t.state.players.map(p => p.name), ...m.state.players.map(p => p.name)]
  return [...new Set(names)].filter(name => !here.has(name))
})
const canStart = computed(() => h.state.players.length >= 2)
const hasSips = computed(() => h.state.players.some(p => p.sips > 0))

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function resetTallies() {
  if (confirm('Alle slokkentellers op nul?')) act(() => h.newGame())
}

function add() {
  try {
    h.addPlayer(newName.value)
    newName.value = ''
  } catch (e) {
    toast(e.message)
  }
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="pour-in">
      <h2 class="font-display text-3xl text-beer">Hoger Lager 🎴</h2>
      <p class="text-sm text-foam/60">Hoe langer de reeks, hoe harder de straf.</p>
    </header>

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
      @click="act(() => h.importPlayers(importable))"
    >
      Neem spelers over 🍺
    </button>

    <ul v-if="h.state.players.length" class="space-y-2">
      <li
        v-for="(p, i) in h.state.players"
        :key="p.id"
        class="flex items-center gap-3 rounded-2xl border-2 border-line bg-night-soft px-4 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        :class="i % 2 ? 'rotate-[1.2deg]' : '-rotate-1'"
      >
        <span class="flex-1 font-semibold">{{ p.name }}</span>
        <span v-if="p.sips > 0" class="font-display text-beer text-sm">{{ p.sips }} 🍺</span>
        <button
          class="size-9 grid place-items-center rounded-lg text-foam/60 hover:text-cup focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          aria-label="Speler verwijderen"
          @click="act(() => h.removePlayer(p.id))"
        >✕</button>
      </li>
    </ul>
    <p v-else class="text-center text-sm text-foam/50">Nog niemand. Wie gokt er mee? 🎴</p>

    <details class="rounded-2xl border-2 border-line bg-night-soft p-4">
      <summary class="font-display text-beer cursor-pointer">Hoe werkt het? 🤔</summary>
      <ul class="mt-3 space-y-2 text-sm text-foam/80 list-disc pl-4">
        <li>Om de beurt: raad of de volgende kaart <strong>hoger</strong> of <strong>lager</strong> is.</li>
        <li>2 is de laagste, aas de hoogste. <strong>Gelijk telt als fout.</strong></li>
        <li>Goed geraden? De reeks groeit en de volgende speler is aan de beurt.</li>
        <li>Fout? Drink <strong>reeks + 1</strong> slokken. De reeks valt terug op nul.</li>
        <li>Stapel op? We schudden gewoon opnieuw.</li>
      </ul>
    </details>

    <div class="space-y-2">
      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        :disabled="!canStart"
        @click="act(() => h.startGame())"
      >
        Deel de eerste kaart →
      </button>
      <p v-if="!canStart" class="text-center text-xs text-foam/50">
        Minstens 2 spelers nodig — je hebt er nog {{ 2 - h.state.players.length }} te kort.
      </p>
      <button
        v-if="hasSips"
        class="w-full min-h-12 rounded-xl font-display bg-night-soft text-foam/70 border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="resetTallies"
      >
        Nieuw spel (tellers op nul)
      </button>
    </div>
  </section>
</template>
