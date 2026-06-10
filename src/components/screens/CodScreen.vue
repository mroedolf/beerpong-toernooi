<script setup>
import { computed, watch } from 'vue'
import { useCod } from '../../store/cod.js'
import { useRoute } from '../../lib/router.js'
import { toast } from '../../store/toast.js'
import RoomBar from '../ui/RoomBar.vue'
import TurnLock from '../ui/TurnLock.vue'
import CodLobby from '../cod/CodLobby.vue'
import CodTable from '../cod/CodTable.vue'
import CodFinished from '../cod/CodFinished.vue'

const c = useCod()
const { query } = useRoute()

watch(() => query.value.r, id => {
  if (id && id !== c.room.id) c.joinRoom(id).catch(e => toast(e.message))
}, { immediate: true })

const subviews = { lobby: CodLobby, playing: CodTable, finished: CodFinished }
const current = computed(() => subviews[c.state.phase] ?? CodLobby)
</script>

<template>
  <RoomBar :store="c" path="/circle" class="mt-4" />
  <div class="relative">
    <TurnLock :store="c" />
    <component :is="current" />
  </div>
</template>
