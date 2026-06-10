<script setup>
import { computed } from 'vue'
import { useFtd } from '../../store/ftd.js'
import FtdLobby from '../ftd/FtdLobby.vue'
import FtdTable from '../ftd/FtdTable.vue'

const d = useFtd()
const subviews = { lobby: FtdLobby, playing: FtdTable }
const current = computed(() => subviews[d.state.phase] ?? FtdLobby)
</script>

<template>
  <component :is="current" />
</template>
