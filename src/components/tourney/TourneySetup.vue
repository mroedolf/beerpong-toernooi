<script setup>
import { ref, computed } from 'vue'
import { useTourney } from '../../store/tourney.js'
import { toast } from '../../store/toast.js'

const t = useTourney()
const c = computed(() => t.state.config)

const newName = ref('')

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}
function add() {
  try {
    t.addPlayer(newName.value)
    newName.value = ''
  } catch (e) {
    toast(e.message)
  }
}

// How many teams the current grouping will produce.
const teamCount = computed(() => {
  const n = t.state.players.length
  if (n === 0) return 0
  if (c.value.grouping === 'individual') return n
  if (c.value.grouping === 'size') return Math.ceil(n / c.value.teamSize)
  return Math.min(c.value.teamCount, n)
})
const canStart = computed(() => teamCount.value >= 2)

const groupings = [
  { id: 'individual', label: 'Individueel' },
  { id: 'size', label: 'Spelers per team' },
  { id: 'count', label: 'Aantal teams' },
]
const formats = [
  { id: 'roundrobin', label: 'Iedereen tegen iedereen', hint: 'Elk team speelt één keer tegen elk ander.' },
  { id: 'swiss', label: 'Zwitsers', hint: 'Vast aantal rondes, telkens gepaard op stand.' },
  { id: 'knockout', label: 'Knockout', hint: 'Directe uitschakeling tot één kampioen.' },
  { id: 'groupknockout', label: 'Groepsfase + knockout', hint: 'Eerst poules, de besten gaan door.' },
]

function start() {
  act(() => t.start())
}

const chip = (active) =>
  active ? 'border-cup bg-cup/15 text-cup' : 'border-line bg-night text-foam/70'
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="pour-in">
      <h2 class="font-display text-3xl text-beer">Toernooi</h2>
      <p class="text-sm text-foam/60">Elk spel, elk format. Stel samen en speel.</p>
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

    <ul v-if="t.state.players.length" class="space-y-2">
      <li
        v-for="(p, i) in t.state.players"
        :key="p.id"
        class="flex items-center gap-3 rounded-2xl border-2 border-line bg-night-soft px-4 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        :class="i % 2 ? 'rotate-[1.2deg]' : '-rotate-1'"
      >
        <span class="flex-1 font-semibold">{{ p.name }}</span>
        <button
          class="size-9 grid place-items-center rounded-lg text-foam/60 hover:text-cup focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          aria-label="Speler verwijderen"
          @click="act(() => t.removePlayer(p.id))"
        >✕</button>
      </li>
    </ul>
    <p v-else class="text-center text-sm text-foam/50">Voeg spelers toe om te beginnen.</p>

    <!-- Indeling -->
    <fieldset class="rounded-2xl border-2 border-line bg-night-soft p-4 space-y-3">
      <legend class="font-display text-beer px-2">Indeling</legend>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="g in groupings"
          :key="g.id"
          class="min-h-11 rounded-xl border-2 px-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          :class="chip(c.grouping === g.id)"
          @click="t.setGrouping(g.id)"
        >{{ g.label }}</button>
      </div>
      <div v-if="c.grouping === 'size'" class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold">Spelers per team</span>
        <div class="flex items-center gap-3">
          <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="c.teamSize <= 1" aria-label="Minder" @click="t.setTeamSize(c.teamSize - 1)">−</button>
          <span class="font-display text-2xl text-beer w-6 text-center">{{ c.teamSize }}</span>
          <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            aria-label="Meer" @click="t.setTeamSize(c.teamSize + 1)">+</button>
        </div>
      </div>
      <div v-if="c.grouping === 'count'" class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold">Aantal teams</span>
        <div class="flex items-center gap-3">
          <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="c.teamCount <= 2" aria-label="Minder" @click="t.setTeamCount(c.teamCount - 1)">−</button>
          <span class="font-display text-2xl text-beer w-6 text-center">{{ c.teamCount }}</span>
          <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            aria-label="Meer" @click="t.setTeamCount(c.teamCount + 1)">+</button>
        </div>
      </div>
      <p class="text-center text-xs text-foam/50">→ {{ teamCount }} {{ teamCount === 1 ? 'team' : 'teams' }}</p>
    </fieldset>

    <!-- Format -->
    <fieldset class="rounded-2xl border-2 border-line bg-night-soft p-4 space-y-3">
      <legend class="font-display text-beer px-2">Format</legend>
      <div class="space-y-2">
        <button
          v-for="f in formats"
          :key="f.id"
          class="w-full text-left rounded-xl border-2 px-4 py-3 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          :class="chip(c.format === f.id)"
          @click="t.setFormat(f.id)"
        >
          <span class="font-display block">{{ f.label }}</span>
          <span class="text-xs text-foam/50 block">{{ f.hint }}</span>
        </button>
      </div>

      <div v-if="c.format === 'swiss'" class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold">Aantal rondes</span>
        <div class="flex items-center gap-3">
          <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            :disabled="c.swissRounds <= 1" aria-label="Minder" @click="t.setSwissRounds(c.swissRounds - 1)">−</button>
          <span class="font-display text-2xl text-beer w-6 text-center">{{ c.swissRounds }}</span>
          <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            aria-label="Meer" @click="t.setSwissRounds(c.swissRounds + 1)">+</button>
        </div>
      </div>

      <template v-if="c.format === 'groupknockout'">
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-semibold">Aantal groepen</span>
          <div class="flex items-center gap-3">
            <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
              :disabled="c.groupCount <= 1" aria-label="Minder" @click="t.setGroupCount(c.groupCount - 1)">−</button>
            <span class="font-display text-2xl text-beer w-6 text-center">{{ c.groupCount }}</span>
            <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
              aria-label="Meer" @click="t.setGroupCount(c.groupCount + 1)">+</button>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-semibold">Door per groep</span>
          <div class="flex items-center gap-3">
            <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
              :disabled="c.advancePerGroup <= 1" aria-label="Minder" @click="t.setAdvancePerGroup(c.advancePerGroup - 1)">−</button>
            <span class="font-display text-2xl text-beer w-6 text-center">{{ c.advancePerGroup }}</span>
            <button class="size-10 rounded-lg font-display text-xl bg-night border-2 border-line focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
              aria-label="Meer" @click="t.setAdvancePerGroup(c.advancePerGroup + 1)">+</button>
          </div>
        </div>
      </template>
    </fieldset>

    <!-- Scores -->
    <div class="flex items-center justify-between gap-3 rounded-2xl border-2 border-line bg-night-soft px-4 py-3">
      <span class="text-sm font-semibold">Scores bijhouden</span>
      <button
        class="min-h-10 px-4 rounded-lg font-display bg-night border-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        :class="c.useScores ? 'border-cup text-cup' : 'border-line text-foam/50'"
        :aria-pressed="c.useScores"
        @click="t.setUseScores(!c.useScores)"
      >{{ c.useScores ? 'Aan' : 'Uit' }}</button>
    </div>

    <div class="space-y-2">
      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        :disabled="!canStart"
        @click="start"
      >
        Start het toernooi →
      </button>
      <p v-if="!canStart" class="text-center text-xs text-foam/50">
        Je hebt minstens 2 teams nodig.
      </p>
    </div>
  </section>
</template>
