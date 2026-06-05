<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import TeamCard from '../ui/TeamCard.vue'
import { useTournament } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'

const t = useTournament()
const teams = computed(() => t.state.teams)

// Reveal animation: each card lands ~400ms after the previous one.
// `revealed` holds the count of cards currently shown.
const REVEAL_STEP = 400
const revealed = ref(0)
const timers = []

function clearTimers() {
  while (timers.length) clearTimeout(timers.pop())
}

function playReveal() {
  clearTimers()
  revealed.value = 0
  const count = teams.value.length
  for (let i = 0; i < count; i++) {
    timers.push(
      setTimeout(() => {
        revealed.value = i + 1
      }, i * REVEAL_STEP),
    )
  }
}

onMounted(playReveal)
onBeforeUnmount(clearTimers)

function reroll() {
  try {
    t.rerollTeams()
    playReveal()
  } catch (e) {
    toast(e.message)
  }
}

function start() {
  try {
    t.startGroup()
  } catch (e) {
    toast(e.message)
  }
}
</script>

<template>
  <section class="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-8">
    <header class="mb-6">
      <h1 class="font-display text-4xl leading-none text-foam">De teams!</h1>
      <p class="mt-2 font-sans text-foam/60">{{ teams.length }} teams, één winnaar. De bekers staan klaar.</p>
    </header>

    <div class="flex flex-col gap-5">
      <div
        v-for="(team, i) in teams"
        :key="team.id"
        :class="revealed > i ? 'pour-in' : 'opacity-0'"
      >
        <!-- Inner wrapper carries the sticker tilt so the entrance animation's
             transform doesn't clobber the rotation. -->
        <div :class="i % 2 === 0 ? '-rotate-1' : 'rotate-[1.2deg]'">
          <TeamCard :team="team" />
        </div>
      </div>
    </div>

    <!-- Sticky footer actions -->
    <div
      class="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-night/95 backdrop-blur"
    >
      <div class="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
        <button
          type="button"
          @click="reroll"
          class="min-h-12 flex-1 rounded-xl border-2 border-line bg-night-soft px-4 font-display text-lg text-foam transition active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beer"
        >
          Herschud teams
        </button>
        <button
          type="button"
          @click="start"
          class="min-h-12 flex-[1.4] rounded-xl border-b-4 border-cup-dark bg-cup px-4 font-display text-lg text-foam transition active:translate-y-0.5 active:border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beer"
        >
          Start de groepsfase →
        </button>
      </div>
    </div>
  </section>
</template>
