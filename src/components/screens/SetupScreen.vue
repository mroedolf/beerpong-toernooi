<script setup>
import { computed, ref, watch } from 'vue'
import { useTournament } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'
import { fileToDataUrl, downscale, PLAYER_PHOTO_MAX } from '../../lib/images.js'
import { verifyApiKey } from '../../lib/gemini.js'
import PlayerAvatar from '../ui/PlayerAvatar.vue'

const t = useTournament()

const players = computed(() => t.state.players)
const count = computed(() => players.value.length)
const isEven = computed(() => count.value % 2 === 0)
const ready = computed(() => count.value >= 4 && isEven.value)
const full = computed(() => count.value >= 16)
const teamsCount = computed(() => Math.floor(count.value / 2))

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

const keyStatus = ref('idle') // idle | testing | ok | fail
const keyMessage = ref('')

// A fresh edit invalidates any earlier test result.
watch(apiKey, () => { keyStatus.value = 'idle'; keyMessage.value = '' })

function saveApiKey() {
  try {
    t.setApiKey(apiKey.value)
    toast('API key opgeslagen', 'success')
  } catch (e) {
    toast(e.message)
  }
}

async function testApiKey() {
  keyStatus.value = 'testing'
  keyMessage.value = ''
  try {
    await verifyApiKey(apiKey.value)
    t.setApiKey(apiKey.value) // a working key is worth keeping
    keyStatus.value = 'ok'
    keyMessage.value = 'De key werkt — opgeslagen.'
  } catch (e) {
    keyStatus.value = 'fail'
    keyMessage.value = e.message
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

// --- Tournament settings ---
function setCups(n) {
  try {
    t.setCupsPerGame(n)
  } catch (e) {
    toast(e.message)
  }
}

function toggleLosersFinal() {
  try {
    t.toggleLosersFinal()
  } catch (e) {
    toast(e.message)
  }
}

// Signature moment: a cup icon per player; an odd count shows one ghost cup —
// the missing teammate. At least four ghosts hint at the minimum.
const cups = computed(() => {
  const length = Math.max(4, count.value + (isEven.value ? 0 : 1))
  return Array.from({ length }, (_, i) => i < count.value)
})
const lastFilledIndex = computed(() => count.value - 1)
</script>

<template>
  <section class="pt-5">
    <!-- Header + progress -->
    <header class="pour-in">
      <h2 class="font-display text-3xl text-foam leading-tight">Wie speelt er mee?</h2>
      <p class="mt-1 font-display text-lg text-beer">
        {{ count }} <span class="text-foam/50 font-sans text-sm font-semibold align-middle">spelers (4–16, even)</span>
      </p>
      <p v-if="ready" class="mt-0.5 text-sm font-semibold text-foam/60">
        → {{ teamsCount }} teams · {{ teamsCount - 1 }} groepsgame{{ teamsCount - 1 === 1 ? '' : 's' }} per team + finale
      </p>

      <!-- cup icons fill red one-by-one; a ghost cup marks a missing teammate -->
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
        :disabled="full"
        placeholder="Naam van de speler"
        class="flex-1 min-h-12 rounded-xl border-2 border-line bg-night-soft px-4 text-foam placeholder:text-foam/40 font-semibold focus:outline-none focus-visible:ring-2 ring-beer disabled:opacity-40"
      />
      <button
        type="submit"
        :disabled="full"
        class="min-h-12 px-5 rounded-xl bg-cup border-b-4 border-cup-dark text-foam font-display text-lg active:translate-y-0.5 active:border-b-2 focus:outline-none focus-visible:ring-2 ring-beer disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
      >
        +
      </button>
    </form>
    <p v-if="full" class="mt-2 text-xs text-foam/50 font-semibold">
      Zestien is het maximum — meer wordt vechten om de tafel.
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
      Nog niemand. Voeg de eerste speler toe.
    </p>

    <!-- Tournament settings -->
    <fieldset class="mt-6 rounded-2xl border-2 border-line bg-night-soft shadow-[4px_4px_0_rgba(0,0,0,.55)] p-4 space-y-4">
      <legend class="font-display text-lg text-beer px-2">Toernooi-instellingen</legend>

      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold text-foam">Bekers per game</span>
        <div class="flex gap-2">
          <button
            v-for="n in [6, 10]"
            :key="n"
            type="button"
            class="min-h-10 min-w-12 px-3 rounded-xl font-display text-lg border-2 active:translate-y-0.5 focus:outline-none focus-visible:ring-2 ring-beer"
            :class="t.state.settings.cupsPerGame === n
              ? 'bg-cup border-cup-dark text-foam shadow-[3px_3px_0_rgba(0,0,0,.5)]'
              : 'bg-night border-line text-foam/70'"
            :aria-pressed="t.state.settings.cupsPerGame === n"
            @click="setCups(n)"
          >{{ n }}</button>
        </div>
      </div>

      <label class="flex items-center justify-between gap-3 cursor-pointer">
        <span class="text-sm font-semibold text-foam">
          Verliezersfinale
          <span v-if="teamsCount < 4" class="block text-xs text-foam/50 font-normal">
            speelt alleen vanaf 4 teams (8 spelers)
          </span>
        </span>
        <input
          type="checkbox"
          :checked="t.state.settings.losersFinal"
          class="size-6 accent-cup"
          @change="toggleLosersFinal"
        />
      </label>
    </fieldset>

    <!-- AI key (collapsible) -->
    <div class="mt-6 rounded-2xl border-2 border-line bg-night-soft shadow-[4px_4px_0_rgba(0,0,0,.55)] overflow-hidden">
      <button
        type="button"
        class="w-full min-h-12 px-4 flex items-center justify-between text-left font-display text-lg text-foam focus:outline-none focus-visible:ring-2 ring-beer"
        :aria-expanded="aiOpen"
        @click="aiOpen = !aiOpen"
      >
        <span>AI-teamfoto's <span class="text-foam/50 font-sans text-sm font-semibold">(optioneel)</span></span>
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
        <div class="mt-2 flex items-center gap-3">
          <button
            type="button"
            class="min-h-11 px-4 rounded-xl border-2 border-cup bg-cup/15 text-cup font-display disabled:opacity-50 active:translate-y-0.5 focus:outline-none focus-visible:ring-2 ring-beer"
            :disabled="!apiKey || keyStatus === 'testing'"
            @click="testApiKey"
          >
            {{ keyStatus === 'testing' ? 'Testen…' : 'Test de key' }}
          </button>
          <p
            v-if="keyMessage"
            class="text-sm font-semibold leading-snug"
            :class="keyStatus === 'ok' ? 'text-beer' : 'text-cup'"
            role="status"
          >
            <span aria-hidden="true">{{ keyStatus === 'ok' ? '✓' : '✗' }}</span> {{ keyMessage }}
          </p>
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
        Maak teams
      </button>
      <p class="mt-2 text-center text-sm font-semibold text-foam/50">
        <template v-if="ready">{{ count }} spelers, {{ teamsCount }} teams — we kunnen beginnen.</template>
        <template v-else-if="count < 4">Minstens 4 spelers (2 teams) nodig.</template>
        <template v-else>Oneven aantal — nog eentje erbij of eentje eruit.</template>
      </p>
    </div>
  </section>
</template>
