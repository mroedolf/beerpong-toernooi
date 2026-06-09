<script setup>
import { computed } from 'vue'
import { useTourney } from '../../store/tourney.js'
import { toast } from '../../store/toast.js'
import TourneyMatch from './TourneyMatch.vue'

const t = useTourney()

const stage = computed(() => t.state.stage)
const round = computed(() => t.state.round)
const useScores = computed(() => t.state.config.useScores)

const koTitle = computed(() => {
  const n = t.currentMatches().length
  return { 1: 'Finale', 2: 'Halve finale', 4: 'Kwartfinale', 8: 'Achtste finale' }[n] ?? `Knockoutronde ${round.value}`
})

const heading = computed(() => {
  switch (stage.value) {
    case 'league': return 'Iedereen tegen iedereen'
    case 'swiss': return `Zwitsers — ronde ${round.value} van ${t.state.config.swissRounds}`
    case 'group': return 'Groepsfase'
    case 'knockout': return koTitle.value
    default: return 'Toernooi'
  }
})

const groupLabel = g => `Groep ${String.fromCharCode(65 + g)}`

// Current matches, split per group during the group stage.
const blocks = computed(() => {
  const cur = t.currentMatches()
  if (stage.value !== 'group') return [{ label: null, matches: cur }]
  const byGroup = {}
  for (const m of cur) (byGroup[m.group] ??= []).push(m)
  return Object.keys(byGroup)
    .map(Number)
    .sort((a, b) => a - b)
    .map(g => ({ label: groupLabel(g), matches: byGroup[g] }))
})

const tables = computed(() => (stage.value === 'knockout' ? [] : t.standings()))

const progress = computed(() => {
  const cur = t.currentMatches().filter(m => m.teamB !== null)
  return { done: cur.filter(m => m.winnerId !== null).length, total: cur.length }
})

const label = computed(() => t.advanceLabel())

function advance() {
  try {
    t.advance()
  } catch (e) {
    toast(e.message)
  }
}

function backToSetup() {
  if (confirm('Terug naar de instellingen? De huidige wedstrijden gaan verloren.')) t.backToSetup()
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="text-center space-y-1 pour-in">
      <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">{{ t.state.teams.length }} teams</p>
      <h2 class="font-display text-3xl text-beer leading-tight">{{ heading }}</h2>
      <p class="text-sm text-foam/60">{{ progress.done }}/{{ progress.total }} gespeeld</p>
    </header>

    <div v-for="block in blocks" :key="block.label ?? 'all'" class="space-y-2">
      <h3 v-if="block.label" class="font-display text-beer">{{ block.label }}</h3>
      <ul class="space-y-2">
        <TourneyMatch v-for="m in block.matches" :key="m.id" :match-id="m.id" />
      </ul>
    </div>

    <button
      v-if="label"
      class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
      @click="advance"
    >
      {{ label }} →
    </button>

    <div v-for="table in tables" :key="table.group ?? 'league'" class="rounded-2xl border-2 border-line bg-night-soft p-4">
      <h3 class="font-display text-beer mb-2">
        {{ table.group === null ? 'Stand' : groupLabel(table.group) }}
      </h3>
      <ol class="space-y-1">
        <li v-for="(row, i) in table.rows" :key="row.teamId" class="flex items-center gap-3 text-sm">
          <span class="font-display text-foam/50 w-5">{{ i + 1 }}</span>
          <span class="flex-1 truncate">{{ t.teamName(row.teamId) }}</span>
          <span class="font-display text-beer">{{ row.wins }}W</span>
          <span v-if="useScores" class="text-foam/50 w-12 text-right">{{ row.saldo > 0 ? '+' : '' }}{{ row.saldo }}</span>
        </li>
      </ol>
    </div>

    <button
      class="w-full min-h-10 rounded-xl font-display text-foam/60 border-2 border-line focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
      @click="backToSetup"
    >
      Terug naar instellingen
    </button>
  </section>
</template>
