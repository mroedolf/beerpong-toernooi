<script setup>
import { computed } from 'vue'
import { useCod } from '../../store/cod.js'
import CodLobby from '../cod/CodLobby.vue'
import CodTable from '../cod/CodTable.vue'
import CodFinished from '../cod/CodFinished.vue'

const c = useCod()
const subviews = { lobby: CodLobby, playing: CodTable, finished: CodFinished }
const current = computed(() => subviews[c.state.phase] ?? CodLobby)
</script>

<template>
  <component :is="current" />
</template>
