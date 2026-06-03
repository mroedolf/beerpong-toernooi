<script setup>
import { computed, ref } from 'vue'
import { useTournament } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'
import { fileToDataUrl, downscale, PLAYER_PHOTO_MAX } from '../../lib/images.js'
import PlayerAvatar from '../ui/PlayerAvatar.vue'

const t = useTournament()

const players = computed(() => t.state.players)
const count = computed(() => players.value.length)
const needed = computed(() => Math.max(0, 8 - count.value))
const ready = computed(() => count.value === 8)

// --- Add player ---
const nameInput = ref('')

function submitName() {
  const name = nameInput.value
  try {
    t.addPlayer(name)
    nameInput.value = ''
  } catch (e) {
    toast(e.message)
  }
}

function removePlayer(id) {
  t.removePlayer(id)
}

// --- Photo flow (one hidden input per player, keyed by id) ---
const fileInputs = ref({})
const uploading = ref(null) // player id currently processing a photo

function pickPhoto(id) {
  fileInputs.value[id]?.click()
}

async function onPhotoChange(event, id) {
  const file = event.target.files?.[0]
  event.target.value = '' // allow re-selecting the same file later
  if (!file) return
  uploading.value = id
  try {
    const dataUrl = await fileToDataUrl(file)
    const photo = await downscale(dataUrl, PLAYER_PHOTO_MAX)
    t.updatePlayer(id, { photo })
  } catch (e) {
    toast(e.message)
  } finally {
    uploading.value = null
  }
}

// --- AI key (collapsible) ---
const aiOpen = ref(false)
const apiKey = ref(t.getApiKey())

function saveApiKey() {
  try {
    t.setApiKey(apiKey.value)
    toast('API key opgeslagen 🔑', 'success')
  } catch (e) {
    toast(e.message)
  }
}

// --- CTA ---
function makeTeams() {
  try {
    t.buildTeams()
  } catch (e) {
    toast(e.message)
  }
}

// Signature moment: a row of 8 cup icons that fill red as players join.
const cups = computed(() =>
  Array.from({ length: 8 }, (_, i) => i < count.value),
)
const lastFilledIndex = computed(() => count.value - 1)
</script>

<template>
  <section class="pt-5">
    <!-- Header + progress -->
    <header class="pour-in">
      <h2 class="font-display text-3xl text-foam leading-tight">Wie speelt er mee?</h2>
      <p class="mt-1 font-display text-lg text-beer">
        {{ count }} / 8 <span class="text-foam/50 font-sans text-sm font-semibold align-middle">spelers</span>
      </p>

      <!-- 8 cup icons fill red one-by-one; the 8th wiggles -->
      <div class="mt-3 flex items-end gap-1.5" aria-hidden="true">
        <span
          v-for="(filled, i) in cups"
          :key="i"
          class="text-2xl leading-none transition-all duration-300"
          :class="[
            filled ? 'opacity-100 saturate-100' : 'opacity-25 grayscale',
            ready && i === lastFilledIndex ? 'cup-wiggle' : '',
          ]"
        >🥤</span>
      </div>
    </header>

    <!-- Add player -->
    <form class="mt-5 flex gap-2 pour-in" @submit.prevent="submitName">
      <input
        v-model="nameInput"
        type="text"
        autocomplete="off"
        :disabled="ready"
        placeholder="Naam van de speler"
        class="flex-1 min-h-12 rounded-xl border-2 border-line bg-night-soft px-4 text-foam placeholder:text-foam/40 font-semibold focus:outline-none focus-visible:ring-2 ring-beer disabled:opacity-40"
      />
      <button
        type="submit"
        :disabled="ready"
        class="min-h-12 px-5 rounded-xl bg-cup border-b-4 border-cup-dark text-foam font-display text-lg active:translate-y-0.5 active:border-b-2 focus:outline-none focus-visible:ring-2 ring-beer disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
      >
        +
      </button>
    </form>
    <p v-if="ready" class="mt-2 text-xs text-foam/50 font-semibold">
      Acht is genoeg — de bekers staan klaar. Verwijder iemand om te wisselen.
    </p>

    <!-- Player list -->
    <ul class="mt-5 space-y-2.5">
      <li
        v-for="(player, i) in players"
        :key="player.id"
        class="pour-in flex items-center gap-3 rounded-2xl border-2 border-line bg-night-soft p-2.5 pr-3 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        :class="i % 2 === 0 ? '-rotate-1' : 'rotate-[1.2deg]'"
        :style="{ animationDelay: `${i * 60}ms` }"
      >
        <PlayerAvatar :player="player" size="md" />
        <span class="flex-1 font-display text-lg text-foam truncate">{{ player.name }}</span>

        <input
          :ref="el => { if (el) fileInputs[player.id] = el }"
          type="file"
          accept="image/*"
          capture="user"
          class="hidden"
          @change="(e) => onPhotoChange(e, player.id)"
        />
        <button
          type="button"
          :disabled="uploading === player.id"
          class="min-h-11 min-w-11 grid place-items-center rounded-xl border-2 border-line text-lg text-beer active:translate-y-0.5 focus:outline-none focus-visible:ring-2 ring-beer disabled:opacity-40"
          :title="player.photo ? 'Foto wijzigen' : 'Foto toevoegen'"
          :aria-label="player.photo ? 'Foto wijzigen' : 'Foto toevoegen'"
          @click="pickPhoto(player.id)"
        >
          <span v-if="uploading === player.id" class="animate-pulse">⏳</span>
          <span v-else>📸</span>
        </button>
        <button
          type="button"
          class="min-h-11 min-w-11 grid place-items-center rounded-xl border-2 border-line text-lg text-foam/60 active:translate-y-0.5 focus:outline-none focus-visible:ring-2 ring-cup hover:text-cup"
          aria-label="Speler verwijderen"
          @click="removePlayer(player.id)"
        >
          ✕
        </button>
      </li>
    </ul>

    <p v-if="count === 0" class="mt-4 text-center text-sm text-foam/50 font-semibold">
      Nog niemand. Gooi de eerste naam erin 🍻
    </p>

    <!-- AI key (collapsible) -->
    <div class="mt-6 rounded-2xl border-2 border-line bg-night-soft shadow-[4px_4px_0_rgba(0,0,0,.55)] overflow-hidden">
      <button
        type="button"
        class="w-full min-h-12 px-4 flex items-center justify-between text-left font-display text-lg text-foam focus:outline-none focus-visible:ring-2 ring-beer"
        :aria-expanded="aiOpen"
        @click="aiOpen = !aiOpen"
      >
        <span>🤖 AI-teamfoto's <span class="text-foam/50 font-sans text-sm font-semibold">(optioneel)</span></span>
        <span class="text-beer transition-transform duration-200" :class="aiOpen ? 'rotate-180' : ''">▾</span>
      </button>

      <div v-if="aiOpen" class="px-4 pb-4 pt-1 border-t-2 border-line">
        <p class="text-sm text-foam/70 leading-snug">
          Plak je Gemini API key om straks belachelijke teamfoto's te genereren.
        </p>
        <div class="mt-3 flex gap-2">
          <input
            v-model="apiKey"
            type="password"
            autocomplete="off"
            placeholder="AIza…"
            class="flex-1 min-h-12 rounded-xl border-2 border-line bg-night px-4 text-foam placeholder:text-foam/40 font-mono text-sm focus:outline-none focus-visible:ring-2 ring-beer"
          />
          <button
            type="button"
            class="min-h-12 px-4 rounded-xl border-2 border-line bg-night-soft text-foam font-display active:translate-y-0.5 focus:outline-none focus-visible:ring-2 ring-beer"
            @click="saveApiKey"
          >
            Bewaar
          </button>
        </div>
        <p class="mt-2 text-xs text-foam/50 leading-snug">
          Geen key?
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            class="text-beer underline underline-offset-2"
          >Haal er gratis één bij Google AI Studio</a>. Je key blijft op dit toestel.
        </p>
      </div>
    </div>

    <!-- CTA -->
    <div class="mt-8">
      <button
        type="button"
        :disabled="!ready"
        class="w-full min-h-14 rounded-xl bg-cup border-b-4 border-cup-dark text-foam font-display text-2xl active:translate-y-0.5 active:border-b-2 focus:outline-none focus-visible:ring-2 ring-beer disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
        @click="makeTeams"
      >
        Maak teams 🎲
      </button>
      <p class="mt-2 text-center text-sm font-semibold text-foam/50">
        <template v-if="ready">Acht spelers, vier teams — tijd om te knallen!</template>
        <template v-else-if="needed === 1">Nog 1 speler en we kunnen knallen 🍺</template>
        <template v-else>Nog {{ needed }} spelers en we kunnen knallen 🍺</template>
      </p>
    </div>
  </section>
</template>
