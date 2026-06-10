<script setup>
import { computed } from 'vue'

// Absolute overlay placed over a game's interactive area. When the room is
// connected and it isn't this device's turn, it blocks taps and says who we're
// waiting for. Wrap the game content in a `relative` container and drop this in.
const props = defineProps({ store: { type: Object, required: true } })

const room = props.store.room
const locked = computed(() => room.connected && !props.store.isMyTurn())
const waitingName = computed(() => {
  const id = props.store.currentActorId()
  if (id == null) return 'de host'
  return props.store.state.players.find(p => p.id === id)?.name ?? 'de volgende speler'
})
</script>

<template>
  <div
    v-if="locked"
    class="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-night/75 backdrop-blur-[1px]"
    role="status"
  >
    <div class="text-center px-6">
      <p class="font-display text-2xl text-beer">Wachten op {{ waitingName }}…</p>
      <p class="mt-1 text-sm text-foam/60">Je ziet live mee. Straks ben jij aan de beurt.</p>
    </div>
  </div>
</template>
