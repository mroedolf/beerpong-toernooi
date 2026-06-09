<script setup>
import { computed, watch } from 'vue'
import { useTourney } from '../../store/tourney.js'
import { useRoute } from '../../lib/router.js'
import { toast } from '../../store/toast.js'
import TourneySetup from '../tourney/TourneySetup.vue'
import TourneyActive from '../tourney/TourneyActive.vue'
import TourneyDone from '../tourney/TourneyDone.vue'

const t = useTourney()
const { query } = useRoute()

// Opening a share link (#/toernooi?s=<id>) loads that tournament.
watch(
  () => query.value.s,
  id => {
    if (id && id !== t.state.shareId) t.loadShared(id).catch(e => toast(e.message))
  },
  { immediate: true },
)

const subviews = { setup: TourneySetup, active: TourneyActive, done: TourneyDone }
const current = computed(() => subviews[t.state.phase] ?? TourneySetup)
</script>

<template>
  <component :is="current" />
</template>
