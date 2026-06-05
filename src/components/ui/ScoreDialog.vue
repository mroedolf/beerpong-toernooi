<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTournament } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'

const props = defineProps({
  match: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const t = useTournament()

const teamA = computed(() => t.teamById(props.match.teamA))
const teamB = computed(() => t.teamById(props.match.teamB))

const alreadyPlayed = props.match.winnerId !== null

const maxCups = computed(() => t.state.settings.cupsPerGame)

// Prefill from an existing result (clamped to the configured max), else defaults.
const winnerId = ref(props.match.winnerId)
const cups = ref(Math.min(props.match.cupsLeft ?? 1, t.state.settings.cupsPerGame))

function dec() {
  if (cups.value > 1) cups.value -= 1
}
function inc() {
  if (cups.value < maxCups.value) cups.value += 1
}

function save() {
  if (!winnerId.value) {
    toast('Kies eerst de winnaar')
    return
  }
  try {
    t.recordResult(props.match.id, winnerId.value, cups.value)
    emit('close')
  } catch (e) {
    toast(e.message)
  }
}

function clear() {
  try {
    t.clearResult(props.match.id)
    emit('close')
  } catch (e) {
    toast(e.message)
  }
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="score-dialog-title"
    @click.self="emit('close')"
  >
    <div
      class="dialog-pop w-full max-w-md rounded-2xl border-2 border-line bg-night-soft p-5 shadow-[6px_6px_0_rgba(0,0,0,.6)]"
    >
      <div class="flex items-start justify-between">
        <h2 id="score-dialog-title" class="font-display text-2xl text-foam">Wie won?</h2>
        <button
          type="button"
          class="font-display -mr-1 -mt-1 grid h-11 w-11 place-items-center rounded-xl text-2xl text-foam/60 hover:text-foam focus:outline-none focus-visible:ring-2 focus-visible:ring-beer"
          aria-label="Sluiten"
          @click="emit('close')"
        >×</button>
      </div>

      <!-- Winner picker -->
      <div class="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          class="font-display min-h-12 rounded-xl border-2 p-3 text-lg leading-tight transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-beer active:translate-y-0.5"
          :class="winnerId === match.teamA
            ? 'border-cup-dark bg-cup text-foam shadow-[3px_3px_0_rgba(0,0,0,.5)]'
            : 'border-line bg-night text-foam/80'"
          @click="winnerId = match.teamA"
        >
          <span class="line-clamp-2 block">{{ teamA?.name ?? '???' }}</span>
        </button>
        <button
          type="button"
          class="font-display min-h-12 rounded-xl border-2 p-3 text-lg leading-tight transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-beer active:translate-y-0.5"
          :class="winnerId === match.teamB
            ? 'border-cup-dark bg-cup text-foam shadow-[3px_3px_0_rgba(0,0,0,.5)]'
            : 'border-line bg-night text-foam/80'"
          @click="winnerId = match.teamB"
        >
          <span class="line-clamp-2 block">{{ teamB?.name ?? '???' }}</span>
        </button>
      </div>

      <!-- Cup stepper -->
      <p class="font-display mt-5 text-lg text-foam">Hoeveel bekers had de winnaar nog?</p>
      <div class="mt-2 flex items-center justify-center gap-4">
        <button
          type="button"
          class="font-display grid h-12 w-12 place-items-center rounded-xl border-2 border-line bg-night text-3xl text-foam transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-beer active:translate-y-0.5 disabled:opacity-40"
          :disabled="cups <= 1"
          aria-label="Minder bekers"
          @click="dec"
        >−</button>
        <span class="font-display w-16 text-center text-5xl text-beer tabular-nums" aria-live="polite">{{ cups }}</span>
        <button
          type="button"
          class="font-display grid h-12 w-12 place-items-center rounded-xl border-2 border-line bg-night text-3xl text-foam transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-beer active:translate-y-0.5 disabled:opacity-40"
          :disabled="cups >= maxCups"
          aria-label="Meer bekers"
          @click="inc"
        >+</button>
      </div>

      <!-- Actions -->
      <button
        type="button"
        class="font-display mt-6 min-h-12 w-full rounded-xl border-b-4 border-cup-dark bg-cup text-xl text-foam transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-beer active:translate-y-0.5 active:border-b-2"
        @click="save"
      >Opslaan 🍺</button>

      <button
        v-if="alreadyPlayed"
        type="button"
        class="font-display mt-2 min-h-12 w-full rounded-xl border-2 border-line bg-night-soft text-base text-foam/70 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-beer active:translate-y-0.5"
        @click="clear"
      >Wis resultaat</button>
    </div>
  </div>
</template>

<style scoped>
.dialog-pop {
  animation: dialog-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes dialog-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .dialog-pop {
    animation: none;
  }
}
</style>
