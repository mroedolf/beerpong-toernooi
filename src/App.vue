<script setup>
import { computed } from 'vue'
import { useTournament } from './store/tournament.js'
import ToastHost from './components/ToastHost.vue'
import SetupScreen from './components/screens/SetupScreen.vue'
import TeamsScreen from './components/screens/TeamsScreen.vue'
import MatchesScreen from './components/screens/MatchesScreen.vue'
import FinalsScreen from './components/screens/FinalsScreen.vue'
import PodiumScreen from './components/screens/PodiumScreen.vue'

const t = useTournament()
const screens = {
  setup: SetupScreen,
  teams: TeamsScreen,
  group: MatchesScreen,
  finals: FinalsScreen,
  podium: PodiumScreen,
}
const current = computed(() => screens[t.state.phase])
const phaseLabels = [
  ['setup', 'Spelers'],
  ['teams', 'Teams'],
  ['group', 'Groepsfase'],
  ['finals', 'Finales'],
  ['podium', 'Podium'],
]
const activeIndex = computed(() =>
  phaseLabels.findIndex(([phase]) => phase === t.state.phase),
)
</script>

<template>
  <div class="app-backdrop" aria-hidden="true" />

  <div class="min-h-dvh flex flex-col">
    <header
      class="sticky top-0 z-40 border-b-2 border-line bg-night/85 backdrop-blur-md"
    >
      <div class="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="font-display text-2xl tracking-wide text-beer leading-none">
          <span class="text-cup">🍺</span> BEERPONG
        </h1>
        <nav class="flex items-center gap-1.5" aria-label="Toernooifase">
          <span
            v-for="([phase, label], i) in phaseLabels"
            :key="phase"
            class="h-2.5 rounded-full transition-all duration-300"
            :class="
              i === activeIndex
                ? 'w-6 bg-cup'
                : i < activeIndex
                  ? 'w-2.5 bg-beer/70'
                  : 'w-2.5 bg-line'
            "
            :title="label"
            :aria-current="i === activeIndex ? 'step' : undefined"
          />
        </nav>
      </div>
    </header>

    <main class="max-w-md mx-auto w-full px-4 pb-24 flex-1">
      <component :is="current" />
    </main>
  </div>

  <ToastHost />
</template>
