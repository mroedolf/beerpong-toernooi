<script setup>
import { computed } from 'vue'
import { GAMES } from '../../games.js'
import { navigate } from '../../lib/router.js'
import { useTournament } from '../../store/tournament.js'
import { useMex } from '../../store/mex.js'
import { useCod } from '../../store/cod.js'
import { isPlayed } from '../../lib/schedule.js'

const t = useTournament()
const m = useMex()
const c = useCod()

const beerpongStatus = computed(() => {
  switch (t.state.phase) {
    case 'teams':
      return 'Teams gemaakt — klaar voor de groepsfase'
    case 'group':
      return `Groepsfase — ${t.state.groupMatches.filter(isPlayed).length}/${t.state.groupMatches.length} gespeeld`
    case 'finals':
      return 'Finales bezig 🔥'
    case 'podium':
      return 'Afgelopen — kampioen bekend 🏆'
    default:
      return t.state.players.length > 0 ? `${t.state.players.length} spelers ingevuld` : null
  }
})

const mexStatus = computed(() => {
  if (m.state.phase !== 'lobby' && m.state.round) return `Ronde ${m.state.round.number} bezig`
  return m.state.players.length > 0 ? `${m.state.players.length} spelers klaar` : null
})

const codStatus = computed(() => {
  if (c.state.phase === 'finished') return 'Koningsbeker gedronken 💀'
  if (c.state.phase === 'playing') {
    return `${52 - c.state.deck.length}/52 kaarten · ${c.state.kingsDrawn}/4 koningen`
  }
  return c.state.players.length > 0 ? `${c.state.players.length} spelers klaar` : null
})

const statusFor = { beerpong: beerpongStatus, mex: mexStatus, cod: codStatus }
</script>

<template>
  <section class="pt-8 space-y-6">
    <header class="text-center pour-in">
      <h2 class="font-display text-4xl text-beer leading-tight">Kies je spel</h2>
      <p class="text-sm text-foam/60 mt-1">Eén toog, veel manieren om te verliezen.</p>
    </header>

    <ul class="space-y-4">
      <li v-for="(g, i) in GAMES" :key="g.id" :class="i % 2 ? 'rotate-[1.2deg]' : '-rotate-1'">
        <button
          class="w-full text-left flex items-center gap-4 rounded-2xl border-2 border-line bg-night-soft px-5 py-5 shadow-[4px_4px_0_rgba(0,0,0,.55)] transition-transform active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="navigate(g.path)"
        >
          <span class="text-4xl" aria-hidden="true">{{ g.emoji }}</span>
          <span class="flex-1 min-w-0">
            <span class="font-display text-2xl text-foam block leading-tight">{{ g.name }}</span>
            <span class="text-sm text-foam/60 block">{{ g.tagline }}</span>
            <span class="text-xs text-foam/40 block mt-1">{{ g.players }}</span>
            <span
              v-if="statusFor[g.id].value"
              class="inline-block mt-2 rounded-full bg-beer/15 border border-beer/40 px-2.5 py-0.5 text-xs font-semibold text-beer"
            >
              ● {{ statusFor[g.id].value }}
            </span>
          </span>
          <span class="font-display text-2xl text-cup" aria-hidden="true">→</span>
        </button>
      </li>
      <li class="rotate-[0.6deg]">
        <div
          class="flex items-center gap-4 rounded-2xl border-2 border-dashed border-line/70 px-5 py-5 opacity-60"
          aria-hidden="true"
        >
          <span class="text-4xl">🤫</span>
          <span>
            <span class="font-display text-2xl text-foam/70 block leading-tight">Binnenkort…</span>
            <span class="text-sm text-foam/50 block">Nog meer manieren om te verliezen.</span>
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>
