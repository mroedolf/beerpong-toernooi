<script setup>
import { computed, ref } from 'vue'
import { useTournament } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'
import MatchCard from '../ui/MatchCard.vue'
import ScoreDialog from '../ui/ScoreDialog.vue'
import TournamentShare from '../ui/TournamentShare.vue'

const t = useTournament()
const canEdit = computed(() => t.canEdit())

// Which match is open in the score dialog (the match object, or null).
const dialogMatch = ref(null)

const finalMatch = computed(() => t.state.finalMatch)
const losersMatch = computed(() => t.state.losersMatch)

// Mirror the store/schedule convention (isPlayed: winnerId !== null) rather than
// a plain truthiness check, so this stays correct under any non-truthy id scheme.
const finalPlayed = computed(() => (finalMatch.value?.winnerId ?? null) !== null)
const losersPlayed = computed(() => (losersMatch.value?.winnerId ?? null) !== null)
// The losers final is optional (setting / fewer than 4 teams) — only require
// the matches that actually exist.
const allPlayed = computed(() => finalPlayed.value && (!losersMatch.value || losersPlayed.value))

// Finalists for the big VS hero split (top two teams).
const teamA = computed(() => finalMatch.value && t.teamById(finalMatch.value.teamA))
const teamB = computed(() => finalMatch.value && t.teamById(finalMatch.value.teamB))

function openDialog(match) {
  if (!canEdit.value) return // viewers see the result on the card, read-only
  dialogMatch.value = match
}

function finish() {
  try {
    t.finishTournament()
  } catch (e) {
    toast(e.message)
  }
}
</script>

<template>
  <div class="max-w-md mx-auto px-4 pt-6 pb-28">
    <header class="mb-6 reveal" style="--i: 0">
      <p class="font-display text-beer text-sm tracking-wide uppercase">De ontknoping</p>
      <h1 class="font-display text-3xl text-foam leading-none">De grote finales</h1>
    </header>

    <TournamentShare class="mb-6" />

    <!-- BIG MOMENT: diagonal VS split between the two finalists -->
    <section
      v-if="teamA && teamB"
      class="relative overflow-hidden rounded-2xl border-2 border-line bg-night-soft shadow-[4px_4px_0_rgba(0,0,0,.55)] mb-6 reveal"
      style="--i: 1"
    >
      <!-- diagonal divider -->
      <div
        class="absolute inset-0 bg-cup/15"
        style="clip-path: polygon(0 0, 58% 0, 42% 100%, 0 100%)"
        aria-hidden="true"
      ></div>
      <div class="relative grid grid-cols-2 items-stretch min-h-32">
        <div class="flex flex-col justify-center p-4 pr-8">
          <p class="font-display text-beer/70 text-xs uppercase">Team 1</p>
          <p class="font-display text-foam text-xl leading-tight break-words">{{ teamA.name }}</p>
        </div>
        <div class="flex flex-col justify-center items-end p-4 pl-8 text-right">
          <p class="font-display text-beer/70 text-xs uppercase">Team 2</p>
          <p class="font-display text-foam text-xl leading-tight break-words">{{ teamB.name }}</p>
        </div>
      </div>
      <!-- the rotated VS sigil -->
      <span
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-cup text-5xl drop-shadow-[2px_2px_0_rgba(0,0,0,.6)] -rotate-6 select-none pointer-events-none"
        aria-hidden="true"
      >VS</span>
    </section>

    <!-- DE FINALE -->
    <section class="mb-8 reveal" style="--i: 2">
      <h2 class="font-display text-2xl text-foam mb-1">DE FINALE</h2>
      <p class="text-foam/50 text-sm mb-3">Wie pakt de gouden beker?</p>
      <MatchCard
        v-if="finalMatch"
        :match="finalMatch"
        :big="true"
        @open="openDialog(finalMatch)"
      />
    </section>

    <!-- VERLIEZERSFINALE (optional) -->
    <section v-if="losersMatch" class="mb-2 reveal" style="--i: 3">
      <h2 class="font-display text-2xl text-foam mb-1">Verliezersfinale</h2>
      <p class="text-foam/50 text-sm mb-3">om de eer (en de derde plaats)</p>
      <MatchCard
        :match="losersMatch"
        :big="true"
        @open="openDialog(losersMatch)"
      />
    </section>
    <p v-else class="text-foam/40 text-sm mb-2 reveal" style="--i: 3">
      Geen verliezersfinale dit toernooi — de rest mag supporteren.
    </p>

    <!-- CTA to podium (creator only) -->
    <div v-if="canEdit" class="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-night via-night to-transparent pt-8 pb-5 px-4">
      <div class="max-w-md mx-auto">
        <button
          class="w-full min-h-12 rounded-xl font-display text-lg text-foam bg-cup border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beer disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
          :disabled="!allPlayed"
          @click="finish"
        >
          Bekijk het podium
        </button>
        <p v-if="!allPlayed" class="text-foam/50 text-xs text-center mt-2">
          {{ losersMatch ? 'Speel eerst beide finales uit.' : 'Speel eerst de finale uit.' }}
        </p>
      </div>
    </div>

    <ScoreDialog
      v-if="dialogMatch"
      :match="dialogMatch"
      @close="dialogMatch = null"
    />
  </div>
</template>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
  animation: reveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  animation-delay: calc(var(--i, 0) * 60ms);
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
