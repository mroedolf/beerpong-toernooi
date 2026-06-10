<script setup>
import { computed, watch } from 'vue'
import { useMex } from '../../store/mex.js'
import { useRoute } from '../../lib/router.js'
import { toast } from '../../store/toast.js'
import RoomBar from '../ui/RoomBar.vue'
import TurnLock from '../ui/TurnLock.vue'
import MexLobby from '../mex/MexLobby.vue'
import MexTurn from '../mex/MexTurn.vue'
import MexResult from '../mex/MexResult.vue'

const m = useMex()
const { query } = useRoute()

watch(() => query.value.r, id => {
  if (id && id !== m.room.id) m.joinRoom(id).catch(e => toast(e.message))
}, { immediate: true })

const subviews = { lobby: MexLobby, playing: MexTurn, result: MexResult }
const current = computed(() => subviews[m.state.phase] ?? MexLobby)
</script>

<template>
  <RoomBar :store="m" path="/mex" class="mt-4" />
  <div class="relative">
    <TurnLock :store="m" />
    <component :is="current" />
  </div>
</template>
