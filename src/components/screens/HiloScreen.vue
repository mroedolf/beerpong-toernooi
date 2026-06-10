<script setup>
import { computed, watch } from 'vue'
import { useHilo } from '../../store/hilo.js'
import { useRoute } from '../../lib/router.js'
import { toast } from '../../store/toast.js'
import RoomBar from '../ui/RoomBar.vue'
import TurnLock from '../ui/TurnLock.vue'
import HiloLobby from '../hilo/HiloLobby.vue'
import HiloTable from '../hilo/HiloTable.vue'

const h = useHilo()
const { query } = useRoute()

watch(() => query.value.r, id => {
  if (id && id !== h.room.id) h.joinRoom(id).catch(e => toast(e.message))
}, { immediate: true })

const subviews = { lobby: HiloLobby, playing: HiloTable }
const current = computed(() => subviews[h.state.phase] ?? HiloLobby)
</script>

<template>
  <RoomBar :store="h" path="/hogerlager" class="mt-4" />
  <div class="relative">
    <TurnLock :store="h" />
    <component :is="current" />
  </div>
</template>
