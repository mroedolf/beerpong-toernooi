<script setup>
import { computed } from 'vue'
import { useTourney } from '../../store/tourney.js'
import TourneySetup from '../tourney/TourneySetup.vue'
import TourneyActive from '../tourney/TourneyActive.vue'
import TourneyDone from '../tourney/TourneyDone.vue'

const t = useTourney()
const subviews = { setup: TourneySetup, active: TourneyActive, done: TourneyDone }
const current = computed(() => subviews[t.state.phase] ?? TourneySetup)
</script>

<template>
  <component :is="current" />
</template>
