<script setup>
import { ref, computed } from 'vue'
import { useTournament, shareStatus } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'
import { navigate } from '../../lib/router.js'
import { isCloudConfigured } from '../../lib/cloudConfig.js'

const t = useTournament()

const configured = isCloudConfigured()
const role = computed(() => t.role())
const shareUrl = computed(() =>
  t.state.shareId ? `${location.origin}${location.pathname}#/beerpong?s=${t.state.shareId}` : '',
)

const publishing = ref(false)

async function share() {
  publishing.value = true
  try {
    await t.publish()
    await copy()
  } catch (e) {
    toast(e.message)
  } finally {
    publishing.value = false
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

async function refresh() {
  try {
    await t.pull()
    toast('Bijgewerkt', 'success')
  } catch (e) {
    toast(e.message)
  }
}

function leave() {
  t.resetAll()
  navigate('/beerpong')
}
</script>

<template>
  <p v-if="!configured" class="rounded-2xl border-2 border-dashed border-line/70 px-4 py-3 text-center text-xs text-foam/45">
    Delen is in deze versie nog niet ingesteld.
  </p>

  <!-- Viewer: read-only, can refresh or leave -->
  <div v-else-if="role === 'viewer'" class="rounded-2xl border-2 border-line bg-night-soft p-4 space-y-2">
    <p class="text-sm text-foam/70">Je bekijkt een gedeeld toernooi. Alleen de maker past scores aan.</p>
    <div class="flex gap-2">
      <button
        class="flex-1 min-h-11 rounded-xl font-display bg-night text-foam border-2 border-line active:translate-y-0.5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        :disabled="shareStatus.syncing"
        @click="refresh"
      >{{ shareStatus.syncing ? 'Bijwerken…' : 'Ververs' }}</button>
      <button
        class="min-h-11 px-4 rounded-xl font-display text-foam/60 border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="leave"
      >Verlaat</button>
    </div>
    <p v-if="shareStatus.error" class="text-xs text-cup">{{ shareStatus.error }}</p>
  </div>

  <!-- Owner / not yet shared -->
  <div v-else class="rounded-2xl border-2 border-line bg-night-soft p-4 space-y-2">
    <template v-if="!t.state.shareId">
      <button
        class="w-full min-h-12 rounded-xl font-display text-lg bg-beer text-night border-b-4 border-beer/60 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cup focus-visible:outline-none"
        :disabled="publishing"
        @click="share"
      >{{ publishing ? 'Delen…' : 'Deel dit toernooi' }}</button>
      <p class="text-center text-xs text-foam/50">Vrienden kijken live mee via een link. Alleen jij past scores aan.</p>
    </template>
    <template v-else>
      <p class="text-sm font-semibold text-beer">Deellink</p>
      <div class="flex gap-2">
        <input
          :value="shareUrl"
          readonly
          class="flex-1 min-w-0 min-h-11 rounded-xl bg-night border-2 border-line px-3 text-foam font-mono text-xs focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @focus="$event.target.select()"
        />
        <button
          class="min-h-11 px-4 rounded-xl font-display bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="copy"
        >Kopieer</button>
      </div>
      <p class="text-xs text-foam/50">
        Iedereen met de link kijkt live mee; alleen jij past scores aan.
        <span v-if="shareStatus.syncing" class="text-beer">· synchroniseren…</span>
      </p>
      <p v-if="shareStatus.error" class="text-xs text-cup">{{ shareStatus.error }}</p>
    </template>
  </div>
</template>
