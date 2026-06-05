<script setup>
import { computed, ref } from 'vue'
import { useTournament } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'
import MatchCard from '../ui/MatchCard.vue'
import ScoreDialog from '../ui/ScoreDialog.vue'
import StandingsTable from '../ui/StandingsTable.vue'

const t = useTournament()

const matches = computed(() => t.state.groupMatches)
const playedCount = computed(() => matches.value.filter(m => m.winnerId !== null).length)
const allDone = computed(() => t.groupDone())

// The selected match drives the score dialog. Track by id so the dialog always
// reads the live store object (and re-renders if its result changes).
const selectedId = ref(null)
const selectedMatch = computed(() =>
  selectedId.value === null ? null : matches.value.find(m => m.id === selectedId.value) ?? null,
)

function open(id) {
  selectedId.value = id
}
function closeDialog() {
  selectedId.value = null
}

function goToFinals() {
  try {
    t.startFinals()
  } catch (e) {
    toast(e.message)
  }
}
</script>

<template>
  <section class="mx-auto max-w-md px-4 pb-28 pt-6">
    <header class="mb-5">
      <h1 class="font-display text-3xl text-foam">Groepsfase</h1>
      <p class="font-display mt-1 text-lg text-beer tabular-nums">{{ playedCount }} / {{ matches.length }} gespeeld</p>
      <p v-if="!allDone" class="mt-1 text-sm text-foam/50">De bekers staan klaar — speel ze allemaal af.</p>
      <p v-else class="mt-1 text-sm text-foam/50">Iedereen gespeeld. Tijd voor de finales!</p>
    </header>

    <ul class="space-y-3">
      <li
        v-for="(match, i) in matches"
        :key="match.id"
        class="reveal"
        :class="i % 2 === 0 ? '-rotate-1' : 'rotate-[1.2deg]'"
        :style="{ '--reveal-delay': `${i * 60}ms` }"
      >
        <MatchCard :match="match" :index="i" @open="open(match.id)" />
      </li>
    </ul>

    <h2 class="font-display mb-2 mt-8 text-2xl text-foam">Stand</h2>
    <StandingsTable />

    <ScoreDialog v-if="selectedMatch" :match="selectedMatch" @close="closeDialog" />

    <!-- Sticky CTA to the finals -->
    <div class="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-night/90 backdrop-blur">
      <div class="mx-auto max-w-md px-4 py-3">
        <button
          type="button"
          class="font-display min-h-12 w-full rounded-xl border-b-4 border-cup-dark bg-cup text-xl text-foam transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-beer active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:border-b-2 disabled:opacity-40"
          :disabled="!allDone"
          @click="goToFinals"
        >Naar de finales</button>
        <p v-if="!allDone" class="mt-1 text-center text-xs text-foam/50">
          Eerst alle {{ matches.length }} games afwerken ({{ matches.length - playedCount }} te gaan).
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reveal {
  animation: reveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: var(--reveal-delay, 0ms);
}
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97) rotate(0deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .reveal {
    animation: none;
  }
}
</style>
