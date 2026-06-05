<script setup>
import { computed } from 'vue'
import { useHilo } from '../../store/hilo.js'
import HiloLobby from '../hilo/HiloLobby.vue'
import HiloTable from '../hilo/HiloTable.vue'

const h = useHilo()
const subviews = { lobby: HiloLobby, playing: HiloTable }
const current = computed(() => subviews[h.state.phase] ?? HiloLobby)
</script>

<template>
  <component :is="current" />
</template>
