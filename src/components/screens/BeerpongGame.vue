<script setup>
import { computed } from 'vue'
import { useTournament } from '../../store/tournament.js'
import SetupScreen from './SetupScreen.vue'
import TeamsScreen from './TeamsScreen.vue'
import MatchesScreen from './MatchesScreen.vue'
import FinalsScreen from './FinalsScreen.vue'
import PodiumScreen from './PodiumScreen.vue'

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
  <div>
    <nav class="flex items-center justify-center gap-1.5 pt-4 -mb-1" aria-label="Toernooifase">
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
    <component :is="current" />
  </div>
</template>
