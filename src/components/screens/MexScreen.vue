<script setup>
import { computed } from 'vue'
import { useMex } from '../../store/mex.js'
import MexLobby from '../mex/MexLobby.vue'
import MexTurn from '../mex/MexTurn.vue'
import MexResult from '../mex/MexResult.vue'

const m = useMex()
const subviews = { lobby: MexLobby, playing: MexTurn, result: MexResult }
const current = computed(() => subviews[m.state.phase] ?? MexLobby)
</script>

<template>
  <component :is="current" />
</template>
