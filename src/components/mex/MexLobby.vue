<script setup>
import { ref, computed } from 'vue'
import { useMex } from '../../store/mex.js'
import { useTournament } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'
import { formatAdjes } from '../../lib/mex.js'
import { isMuted, toggleMuted } from '../../lib/sound.js'

const m = useMex()
const t = useTournament()

const newName = ref('')
const soundOn = ref(!isMuted())
const canImport = computed(() =>
  t.state.players.length > 0 &&
  t.state.players.some(p => !m.state.players.find(mp => mp.name === p.name)),
)
const canStart = computed(() => m.state.players.length >= 2)
const hasSips = computed(() => m.state.players.some(p => p.sips > 0 || p.adjes > 0))

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function resetTallies() {
  if (confirm('Alle slokkentellers op nul?')) act(() => m.newGame())
}

function add() {
  try {
    m.addPlayer(newName.value)
    newName.value = ''
  } catch (e) {
    toast(e.message)
  }
}

function toggleSound() {
  soundOn.value = !toggleMuted()
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="pour-in">
      <h2 class="font-display text-3xl text-beer">Mex</h2>
      <p class="text-sm text-foam/60">Laagste worp drinkt. Zo simpel is het leven.</p>
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
      v-if="canImport"
      class="w-full min-h-12 rounded-xl font-display bg-night-soft text-beer border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
      @click="act(() => m.importPlayers(t.state.players.map(p => p.name)))"
    >
      Neem toernooispelers over
    </button>

    <ul v-if="m.state.players.length" class="space-y-2">
      <li
        v-for="(p, i) in m.state.players"
        :key="p.id"
        class="flex items-center gap-3 rounded-2xl border-2 border-line bg-night-soft px-4 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        :class="i % 2 ? 'rotate-[1.2deg]' : '-rotate-1'"
      >
        <div class="flex flex-col -my-1">
          <button
            class="size-7 grid place-items-center rounded-md text-foam/60 hover:text-beer disabled:opacity-25 disabled:hover:text-foam/60 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="i === 0"
            aria-label="Speler omhoog"
            @click="act(() => m.movePlayer(p.id, -1))"
          >▲</button>
          <button
            class="size-7 grid place-items-center rounded-md text-foam/60 hover:text-beer disabled:opacity-25 disabled:hover:text-foam/60 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="i === m.state.players.length - 1"
            aria-label="Speler omlaag"
            @click="act(() => m.movePlayer(p.id, 1))"
          >▼</button>
        </div>
        <span class="flex-1 font-semibold">{{ p.name }}</span>
        <span v-if="p.sips > 0 || p.adjes > 0" class="font-display text-beer text-sm">
          {{ p.sips }} slokken<template v-if="p.adjes > 0"> · {{ formatAdjes(p.adjes) }} adje</template>
        </span>
        <button
          class="size-9 grid place-items-center rounded-lg text-foam/60 hover:text-cup focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          aria-label="Speler verwijderen"
          @click="act(() => m.removePlayer(p.id))"
        >✕</button>
      </li>
    </ul>
    <p v-else class="text-center text-sm text-foam/50">Nog niemand. Wie durft?</p>
    <p v-if="m.state.players.length > 1" class="text-center text-xs text-foam/40">
      Tik op ▲▼ om de gooivolgorde aan te passen.
    </p>

    <fieldset class="rounded-2xl border-2 border-line bg-night-soft p-4 space-y-4">
      <legend class="font-display text-beer px-2">Huisregels</legend>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold">Basis slokken</span>
        <div class="flex items-center gap-3">
          <button
            class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="m.state.settings.baseSips <= 1"
            aria-label="Minder slokken"
            @click="m.setBaseSips(m.state.settings.baseSips - 1)"
          >−</button>
          <span class="font-display text-2xl text-beer w-6 text-center">{{ m.state.settings.baseSips }}</span>
          <button
            class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="m.state.settings.baseSips >= 5"
            aria-label="Meer slokken"
            @click="m.setBaseSips(m.state.settings.baseSips + 1)"
          >+</button>
        </div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold">Per Mex in de pot</span>
        <div class="flex items-center gap-3">
          <button
            class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="m.state.settings.potPerMex <= 0.25"
            aria-label="Minder in de pot"
            @click="m.setPotPerMex(m.state.settings.potPerMex - 0.25)"
          >−</button>
          <span class="font-display text-2xl text-beer w-14 text-center">{{ formatAdjes(m.state.settings.potPerMex) }} adje</span>
          <button
            class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="m.state.settings.potPerMex >= 1"
            aria-label="Meer in de pot"
            @click="m.setPotPerMex(m.state.settings.potPerMex + 0.25)"
          >+</button>
        </div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold">Geluid bij speciale worpen</span>
        <button
          class="min-h-10 px-4 rounded-lg font-display bg-night border-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          :class="soundOn ? 'border-beer text-beer' : 'border-line text-foam/50'"
          :aria-pressed="soundOn"
          @click="toggleSound"
        >{{ soundOn ? 'Aan' : 'Uit' }}</button>
      </div>
    </fieldset>

    <details class="rounded-2xl border-2 border-line bg-night-soft p-4">
      <summary class="font-display text-beer cursor-pointer">Hoe werkt het?</summary>
      <ul class="mt-3 space-y-2 text-sm text-foam/80 list-disc pl-4">
        <li><strong>Mex</strong> (2 en 1) is de hoogste worp én gooit {{ formatAdjes(m.state.settings.potPerMex) }} adje in de pot.</li>
        <li>Dubbels zijn honderdtallen (6-6 = 600 … 1-1 = 100), kloppen alle gewone worpen, en je mag dat cijfer aan slokken uitdelen aan een speler naar keuze.</li>
        <li>Gewone worpen: hoogste steen ×10 + laagste (65 is de hoogste, 32 de laagste).</li>
        <li>Gooi je <strong>31</strong>? Deel 1 slok uit aan een speler naar keuze en je krijgt de worp terug.</li>
        <li>De voorgooier gooit max 3 keer en bepaalt zo hoe vaak de rest mag gooien.</li>
        <li>Je mag één dobbelsteen vasthouden tussen worpen.</li>
        <li>Laagste worp van de ronde drinkt de basis-slokken plus de pot.</li>
        <li>Gelijkstand onderaan? Roll-off: één worp, verliezer drinkt.</li>
        <li>De verliezer mag de volgende ronde voorgooien.</li>
      </ul>
    </details>

    <div class="space-y-2">
      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        :disabled="!canStart"
        @click="act(() => m.startGame())"
      >
        Gooi de eerste ronde →
      </button>
      <p v-if="!canStart" class="text-center text-xs text-foam/50">
        Minstens 2 spelers nodig — je hebt er nog {{ 2 - m.state.players.length }} te kort.
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
