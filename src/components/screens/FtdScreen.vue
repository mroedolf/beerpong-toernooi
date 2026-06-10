<script setup>
import { computed, watch } from 'vue'
import { useFtd } from '../../store/ftd.js'
import { useRoute } from '../../lib/router.js'
import { toast } from '../../store/toast.js'
import RoomBar from '../ui/RoomBar.vue'
import TurnLock from '../ui/TurnLock.vue'
import FtdLobby from '../ftd/FtdLobby.vue'
import FtdTable from '../ftd/FtdTable.vue'

const d = useFtd()
const { query } = useRoute()

watch(() => query.value.r, id => {
  if (id && id !== d.room.id) d.joinRoom(id).catch(e => toast(e.message))
}, { immediate: true })

const subviews = { lobby: FtdLobby, playing: FtdTable }
const current = computed(() => subviews[d.state.phase] ?? FtdLobby)
</script>

<template>
  <RoomBar :store="d" path="/dealer" class="mt-4" />
  <div class="relative">
    <TurnLock :store="d" />
    <component :is="current" />
  </div>
</template>
