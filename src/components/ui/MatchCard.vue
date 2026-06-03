<script setup>
import { computed } from 'vue'
import { useTournament } from '../../store/tournament.js'

const props = defineProps({
  match: { type: Object, required: true },
  index: { type: Number, default: null },
  big: { type: Boolean, default: false },
})

const emit = defineEmits(['open'])

const t = useTournament()

const teamA = computed(() => t.teamById(props.match.teamA))
const teamB = computed(() => t.teamById(props.match.teamB))

const played = computed(() => props.match.winnerId !== null)
const winnerIsA = computed(() => played.value && props.match.winnerId === props.match.teamA)
const winnerIsB = computed(() => played.value && props.match.winnerId === props.match.teamB)

// Group matches carry tidy ids like "g3"; fall back to the 1-based index.
// Finals stubs ('final'/'losers') have no game number — name them instead of
// emitting a dangling "Game". (Task 9 owns finals presentation; this is a
// graceful fallback only.)
const gameLabel = computed(() => {
  if (props.match.id?.startsWith?.('g')) return `Game ${props.match.id.slice(1)}`
  if (props.index !== null) return `Game ${props.index + 1}`
  if (props.match.id === 'final') return 'Finale'
  if (props.match.id === 'losers') return 'Troostfinale'
  return 'Game'
})
</script>

<template>
  <button
    type="button"
    class="match-card group relative block w-full overflow-hidden rounded-2xl border-2 border-line bg-night-soft text-left shadow-[4px_4px_0_rgba(0,0,0,.55)] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-beer active:translate-y-0.5"
    :class="big ? 'p-5' : 'p-4'"
    @click="emit('open')"
  >
    <!-- Ticket stub: a punched-hole notch on the left, with a dashed
         perforation line just inside it (the line the stub tears along). -->
    <span aria-hidden="true" class="pointer-events-none absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-night ring-2 ring-line"></span>
    <span aria-hidden="true" class="ticket-perforation pointer-events-none absolute inset-y-2 left-3"></span>

    <!-- Diagonal "GESPEELD" stamp over a played ticket stub -->
    <span
      v-if="played"
      aria-hidden="true"
      class="gespeeld-stamp font-display pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-2xl uppercase tracking-widest text-beer"
    >Gespeeld</span>

    <div class="flex items-center justify-between pl-2">
      <span class="font-display text-sm uppercase tracking-wide text-foam/50">{{ gameLabel }}</span>
      <span
        v-if="played"
        class="font-display rounded-md border border-cup-dark/60 bg-cup/15 px-2 py-0.5 text-xs text-beer"
      >🏆 +{{ match.cupsLeft }} bekers</span>
      <span
        v-else
        class="font-display text-xs uppercase tracking-wide text-cup"
      >Speel deze game →</span>
    </div>

    <div class="mt-3 flex items-center gap-2 pl-2">
      <!-- Team A -->
      <div
        class="flex min-w-0 flex-1 items-center gap-2"
        :class="played && !winnerIsA ? 'opacity-40' : ''"
      >
        <img
          v-if="teamA?.aiPhoto"
          :src="teamA.aiPhoto"
          alt=""
          class="h-9 w-9 shrink-0 rounded-lg border border-line object-cover"
        />
        <span
          class="font-display truncate text-lg leading-tight"
          :class="winnerIsA ? 'text-beer' : 'text-foam'"
        >{{ teamA?.name ?? '???' }}</span>
      </div>

      <span class="font-display shrink-0 text-sm text-foam/40">vs</span>

      <!-- Team B -->
      <div
        class="flex min-w-0 flex-1 items-center justify-end gap-2 text-right"
        :class="played && !winnerIsB ? 'opacity-40' : ''"
      >
        <span
          class="font-display truncate text-lg leading-tight"
          :class="winnerIsB ? 'text-beer' : 'text-foam'"
        >{{ teamB?.name ?? '???' }}</span>
        <img
          v-if="teamB?.aiPhoto"
          :src="teamB.aiPhoto"
          alt=""
          class="h-9 w-9 shrink-0 rounded-lg border border-line object-cover"
        />
      </div>
    </div>
  </button>
</template>

<style scoped>
/* Ticket perforation: the dashed tear-line just inside the punched notch, so the
   card reads as a torn-off stub rather than a price tag. Decorative only. */
.ticket-perforation {
  width: 0;
  border-left: 2px dashed color-mix(in srgb, var(--color-line) 70%, transparent);
}

/* Diagonal "GESPEELD" stamp: a rotated, ink-stamped ticket flourish in beer amber.
   Decorative only — the winner highlight + badge carry the binding "played" state. */
.gespeeld-stamp {
  border: 3px solid var(--color-beer);
  border-radius: 6px;
  padding: 2px 10px;
  opacity: 0.5;
  transform: translateY(-50%) rotate(-12deg);
  transform-origin: center;
  /* Stamped-in look: text and border share the beer tint, slightly blurred edges. */
  text-shadow: 0 0 1px rgba(246, 166, 35, 0.4);
  box-shadow: inset 0 0 0 1px rgba(246, 166, 35, 0.25);
}
</style>
