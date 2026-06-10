<script setup>
import { ref, computed } from 'vue'
import { useFtd } from '../../store/ftd.js'
import { useTournament } from '../../store/tournament.js'
import { useMex } from '../../store/mex.js'
import { useCod } from '../../store/cod.js'
import { useHilo } from '../../store/hilo.js'
import { toast } from '../../store/toast.js'

const d = useFtd()
const t = useTournament()
const m = useMex()
const c = useCod()
const h = useHilo()

const newName = ref('')

// Union of names known to the other games, minus the ones already here.
const importable = computed(() => {
  const here = new Set(d.state.players.map(p => p.name))
  const names = [
    ...t.state.players.map(p => p.name),
    ...m.state.players.map(p => p.name),
    ...c.state.players.map(p => p.name),
    ...h.state.players.map(p => p.name),
  ]
  return [...new Set(names)].filter(name => !here.has(name))
})
const canStart = computed(() => d.state.players.length >= 2)

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function add() {
  try {
    d.addPlayer(newName.value)
    newName.value = ''
  } catch (e) {
    toast(e.message)
  }
}

const RULES = [
  { title: 'De deler houdt de stapel', text: 'De rest raadt om de beurt de rang van de bovenste kaart.' },
  { title: 'Twee gokken', text: 'Na je eerste gok hoor je "hoger" of "lager". Daarna nog één kans.' },
  { title: 'Juist? De deler drinkt', text: 'Meteen raak: 3 slokken. Met de tweede gok: 2 slokken.' },
  { title: 'Mis? Jij drinkt', text: 'Twee keer fout: je drinkt het verschil tussen je laatste gok en de echte kaart.' },
  { title: 'Stapel leeg', text: 'De deler schuift de stapel door naar links; een verse stapel, een schone tafel.' },
]
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="pour-in">
      <h2 class="font-display text-3xl text-beer">Fuck the Dealer</h2>
      <p class="text-sm text-foam/60">Raad de kaart juist en de deler drinkt.</p>
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
      @click="act(() => d.importPlayers(importable))"
    >
      Neem spelers over
    </button>

    <ul v-if="d.state.players.length" class="space-y-2">
      <li
        v-for="(p, i) in d.state.players"
        :key="p.id"
        class="flex items-center gap-3 rounded-2xl border-2 border-line bg-night-soft px-4 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        :class="i % 2 ? 'rotate-[1.2deg]' : '-rotate-1'"
      >
        <span class="flex-1 font-semibold">{{ p.name }}</span>
        <span v-if="i === 0" class="text-xs font-semibold text-beer/80">eerste deler</span>
        <button
          class="size-9 grid place-items-center rounded-lg text-foam/60 hover:text-cup focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          aria-label="Speler verwijderen"
          @click="act(() => d.removePlayer(p.id))"
        >✕</button>
      </li>
    </ul>
    <p v-else class="text-center text-sm text-foam/50">Nog niemand. Wie durft de deler?</p>

    <details class="rounded-2xl border-2 border-line bg-night-soft p-4">
      <summary class="font-display text-beer cursor-pointer">De regels</summary>
      <ul class="mt-3 space-y-2 text-sm text-foam/80">
        <li v-for="rule in RULES" :key="rule.title" class="flex gap-2">
          <span class="text-cup shrink-0">•</span>
          <span><strong>{{ rule.title }}</strong> — {{ rule.text }}</span>
        </li>
      </ul>
    </details>

    <div class="space-y-2">
      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        :disabled="!canStart"
        @click="act(() => d.startGame())"
      >
        Schud de kaarten →
      </button>
      <p v-if="!canStart" class="text-center text-xs text-foam/50">
        Minstens 2 spelers nodig — je hebt er nog {{ 2 - d.state.players.length }} te kort.
      </p>
    </div>
  </section>
</template>
