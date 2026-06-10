<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { toast } from '../../store/toast.js'
import { navigate } from '../../lib/router.js'
import { isCloudConfigured } from '../../lib/cloudConfig.js'

// Works with any game store that exposes `room` + the room actions from
// attachRoom (hostRoom/joinRoom/claimSeat/leaveRoom/startSync/stopSync).
const props = defineProps({
  store: { type: Object, required: true },
  path: { type: String, required: true }, // game route, e.g. '/mex'
})

const configured = isCloudConfigured()
const room = props.store.room
const players = computed(() => props.store.state.players)
const seatName = computed(() => players.value.find(p => p.id === room.seatId)?.name ?? null)
const shareUrl = computed(() =>
  room.id ? `${location.origin}${location.pathname}#${props.path}?r=${room.id}` : '',
)

const hosting = ref(false)

onMounted(() => { if (room.connected) props.store.startSync() })
onUnmounted(() => props.store.stopSync())
watch(() => room.connected, c => { if (c) props.store.startSync() })

async function host() {
  hosting.value = true
  try {
    await props.store.hostRoom()
    await copy()
  } catch (e) {
    toast(e.message)
  } finally {
    hosting.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast('Link gekopieerd', 'success')
  } catch {
    toast('Kopiëren lukte niet — selecteer de link handmatig')
  }
}

function claim(id) {
  props.store.claimSeat(id)
}
function changeSeat() {
  props.store.claimSeat(null)
}
function leave() {
  props.store.leaveRoom()
  navigate(props.path)
}
</script>

<template>
  <div v-if="configured" class="rounded-2xl border-2 border-line bg-night-soft p-4 space-y-2">
    <!-- Offline: start an online room -->
    <template v-if="!room.connected">
      <button
        class="w-full min-h-12 rounded-xl font-display text-lg bg-beer text-night border-b-4 border-beer/60 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
        :disabled="hosting"
        @click="host"
      >
        {{ hosting ? 'Bezig…' : 'Speel online' }}
      </button>
      <p class="text-center text-xs text-foam/50">
        Maak een room en deel de link — iedereen speelt mee op zijn eigen gsm.
      </p>
    </template>

    <!-- Connected -->
    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <span class="font-display text-beer text-sm">● Online room</span>
        <span class="text-xs text-foam/50">
          <span v-if="room.syncing">synct…</span>
          <span v-else>live</span>
        </span>
      </div>

      <div class="flex gap-2">
        <input
          :value="shareUrl"
          readonly
          class="flex-1 min-w-0 min-h-10 rounded-xl bg-night border-2 border-line px-3 text-foam font-mono text-xs focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @focus="$event.target.select()"
        />
        <button
          class="min-h-10 px-3 rounded-xl font-display bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="copy"
        >Kopieer</button>
      </div>

      <!-- Seat -->
      <div v-if="!room.seatId">
        <p class="text-sm text-foam/70 mb-1">Wie ben jij?</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in players"
            :key="p.id"
            class="min-h-10 px-3 rounded-xl font-semibold bg-night text-foam border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
            @click="claim(p.id)"
          >{{ p.name }}</button>
        </div>
        <p v-if="!players.length" class="text-xs text-foam/40">Nog geen spelers — de host voegt ze toe.</p>
      </div>
      <p v-else class="text-sm text-foam/70">
        Jij speelt als <span class="font-display text-beer">{{ seatName }}</span>
        <button class="ml-2 text-xs text-foam/50 underline underline-offset-2" @click="changeSeat">wijzig</button>
      </p>

      <div class="flex items-center justify-between gap-2 pt-1">
        <button class="text-xs text-foam/50 underline underline-offset-2" @click="leave">Verlaat room</button>
        <span v-if="room.error" class="text-xs text-cup">{{ room.error }}</span>
      </div>
    </template>
  </div>
</template>
