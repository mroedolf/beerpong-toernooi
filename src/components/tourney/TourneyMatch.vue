<script setup>
import { ref, computed, watch } from 'vue'
import { useTourney } from '../../store/tourney.js'
import { toast } from '../../store/toast.js'

const props = defineProps({ matchId: { type: String, required: true } })

const t = useTourney()

const match = computed(() => t.state.matches.find(m => m.id === props.matchId))
const useScores = computed(() => t.state.config.useScores)
const isBye = computed(() => match.value.teamB === null)
const played = computed(() => match.value.winnerId !== null)
const canEdit = computed(() => t.canEdit())

const nameA = computed(() => t.teamName(match.value.teamA))
const nameB = computed(() => (isBye.value ? null : t.teamName(match.value.teamB)))
const membersA = computed(() => t.teamMembers(match.value.teamA))
const membersB = computed(() => (isBye.value ? [] : t.teamMembers(match.value.teamB)))

const scoreA = ref('')
const scoreB = ref('')
watch(match, m => {
  scoreA.value = m.scoreA ?? ''
  scoreB.value = m.scoreB ?? ''
}, { immediate: true })

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function pick(winnerId) {
  act(() => t.recordResult(match.value.id, winnerId))
}

function confirmScores() {
  const a = Number(scoreA.value)
  const b = Number(scoreB.value)
  if (scoreA.value === '' || scoreB.value === '' || !Number.isFinite(a) || !Number.isFinite(b)) {
    return toast('Vul beide scores in')
  }
  if (a === b) return toast('Een gelijkspel kan niet — er moet een winnaar zijn')
  const winnerId = a > b ? match.value.teamA : match.value.teamB
  act(() => t.recordResult(match.value.id, winnerId, a, b))
}

function clear() {
  act(() => t.clearResult(match.value.id))
}

// shared button classes
const side = (id) =>
  played.value && match.value.winnerId === id
    ? 'border-beer bg-beer/15 text-beer'
    : 'border-line bg-night text-foam'
</script>

<template>
  <li class="rounded-2xl border-2 border-line bg-night-soft p-3 shadow-[4px_4px_0_rgba(0,0,0,.5)]">
    <!-- Bye -->
    <div v-if="isBye" class="flex items-center justify-between gap-2 px-1">
      <div class="min-w-0">
        <p class="font-semibold truncate">{{ nameA }}</p>
        <p v-if="membersA.length > 1" class="text-xs text-foam/50 truncate">{{ membersA.join(' & ') }}</p>
      </div>
      <span class="text-xs font-semibold text-foam/50 shrink-0">vrije ronde →</span>
    </div>

    <!-- Read-only (viewer) -->
    <template v-else-if="!canEdit">
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div class="min-w-0 text-left" :class="played && match.winnerId === match.teamA ? 'text-beer' : (played ? 'opacity-50' : '')">
          <span class="font-semibold block truncate">{{ nameA }}</span>
          <span v-if="membersA.length > 1" class="text-xs text-foam/50 block truncate">{{ membersA.join(' & ') }}</span>
        </div>
        <span class="font-display text-sm text-foam/40 tabular-nums">
          <template v-if="useScores && match.scoreA !== null">{{ match.scoreA }}–{{ match.scoreB }}</template>
          <template v-else>vs</template>
        </span>
        <div class="min-w-0 text-right" :class="played && match.winnerId === match.teamB ? 'text-beer' : (played ? 'opacity-50' : '')">
          <span class="font-semibold block truncate">{{ nameB }}</span>
          <span v-if="membersB.length > 1" class="text-xs text-foam/50 block truncate">{{ membersB.join(' & ') }}</span>
        </div>
      </div>
      <p v-if="!played" class="mt-1 text-center text-xs text-foam/40">Nog niet gespeeld</p>
    </template>

    <!-- Winner-only -->
    <template v-else-if="!useScores">
      <div class="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <button
          class="rounded-xl border-2 px-3 py-2 text-left active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          :class="side(match.teamA)"
          @click="pick(match.teamA)"
        >
          <span class="font-semibold block truncate">{{ nameA }}</span>
          <span v-if="membersA.length > 1" class="text-xs text-foam/50 block truncate">{{ membersA.join(' & ') }}</span>
        </button>
        <span class="self-center font-display text-foam/40 text-sm">vs</span>
        <button
          class="rounded-xl border-2 px-3 py-2 text-right active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          :class="side(match.teamB)"
          @click="pick(match.teamB)"
        >
          <span class="font-semibold block truncate">{{ nameB }}</span>
          <span v-if="membersB.length > 1" class="text-xs text-foam/50 block truncate">{{ membersB.join(' & ') }}</span>
        </button>
      </div>
      <button
        v-if="played"
        class="mt-2 w-full text-xs text-foam/50 hover:text-cup focus-visible:outline-none"
        @click="clear"
      >
        Uitslag wissen
      </button>
    </template>

    <!-- Winner + score -->
    <template v-else>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div class="min-w-0 text-left" :class="played && match.winnerId === match.teamA ? 'text-beer' : ''">
          <span class="font-semibold block truncate">{{ nameA }}</span>
        </div>
        <span class="font-display text-foam/40 text-sm">vs</span>
        <div class="min-w-0 text-right" :class="played && match.winnerId === match.teamB ? 'text-beer' : ''">
          <span class="font-semibold block truncate">{{ nameB }}</span>
        </div>
      </div>
      <div class="mt-2 flex items-center justify-center gap-3">
        <input
          v-model="scoreA"
          type="number"
          inputmode="numeric"
          min="0"
          aria-label="Score links"
          class="w-16 min-h-11 rounded-xl bg-night border-2 border-line text-center text-foam focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        />
        <span class="text-foam/40">–</span>
        <input
          v-model="scoreB"
          type="number"
          inputmode="numeric"
          min="0"
          aria-label="Score rechts"
          class="w-16 min-h-11 rounded-xl bg-night border-2 border-line text-center text-foam focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        />
        <button
          class="min-h-11 px-4 rounded-xl font-display bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="confirmScores"
        >
          {{ played ? 'Wijzig' : 'Klaar' }}
        </button>
      </div>
      <button
        v-if="played"
        class="mt-2 w-full text-xs text-foam/50 hover:text-cup focus-visible:outline-none"
        @click="clear"
      >
        Uitslag wissen
      </button>
    </template>
  </li>
</template>
