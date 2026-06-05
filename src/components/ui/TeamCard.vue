<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import PlayerAvatar from './PlayerAvatar.vue'
import { useTournament } from '../../store/tournament.js'
import { toast } from '../../store/toast.js'
import { generateTeamPhoto } from '../../lib/gemini.js'
import { downscale, AI_PHOTO_MAX } from '../../lib/images.js'
import { buildTeamPhotoPrompt } from '../../lib/names.js'

const props = defineProps({
  team: { type: Object, required: true },
})

const t = useTournament()
const generating = ref(false)

const members = computed(() => props.team.playerIds.map(id => t.playerById(id)).filter(Boolean))
const bothHavePhotos = computed(() => members.value.length === 2 && members.value.every(m => m?.photo))
const hasApiKey = computed(() => Boolean(t.getApiKey()))

// Funny Dutch status lines that rotate while the AI cooks up a photo.
const STATUS_LINES = [
  'De AI zoekt een flamingo…',
  'Bekers worden gestapeld…',
  'Heldenposes worden geoefend…',
  'Confetti wordt klaargezet…',
  'De fotograaf roept "kaas!"…',
]
const statusIndex = ref(0)
let statusTimer = null

function startStatusRotation() {
  statusIndex.value = 0
  statusTimer = setInterval(() => {
    statusIndex.value = (statusIndex.value + 1) % STATUS_LINES.length
  }, 1800)
}

function stopStatusRotation() {
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }
}

// Commit the team name on change/blur rather than every keystroke: the store
// trims and ignores empty values, so committing on input would freeze the
// underlying state the moment the user clears the field to retype.
function onNameChange(event) {
  t.renameTeam(props.team.id, event.target.value)
}

function rerollName() {
  t.rerollTeamName(props.team.id)
}

async function generate() {
  generating.value = true
  startStatusRotation()
  try {
    const [a, b] = props.team.playerIds.map(id => t.playerById(id))
    const prompt = buildTeamPhotoPrompt(props.team.name, props.team.scenario)
    const raw = await generateTeamPhoto({ apiKey: t.getApiKey(), prompt, photos: [a.photo, b.photo] })
    const small = await downscale(raw, AI_PHOTO_MAX)
    t.setTeamPhoto(props.team.id, small)
  } catch (e) {
    toast(e.message)
  } finally {
    generating.value = false
    stopStatusRotation()
  }
}

function regenerate() {
  t.rerollScenario(props.team.id)
  // generate() owns its own try/catch, so it never rejects; void marks the
  // fire-and-forget intent explicitly.
  void generate()
}

// Stop the status-line interval if this card unmounts mid-generation
// (e.g. "Herschud teams" re-keys the v-for and destroys an in-flight card).
onBeforeUnmount(stopStatusRotation)
</script>

<template>
  <article
    class="rounded-2xl border-2 border-line bg-night-soft p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
  >
    <!-- Team name: editable, styled as display text, with a dice reroll -->
    <div class="flex items-center gap-2">
      <input
        :value="team.name"
        @change="onNameChange"
        aria-label="Teamnaam"
        spellcheck="false"
        class="min-w-0 flex-1 rounded-lg border-2 border-transparent bg-transparent px-1 py-0.5 font-display text-2xl leading-tight text-foam focus:border-line focus:outline-none focus-visible:ring-2 focus-visible:ring-beer"
      />
      <button
        type="button"
        @click="rerollName"
        aria-label="Nieuwe teamnaam"
        class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-line bg-night text-xl transition active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beer"
      >
        🎲
      </button>
    </div>

    <!-- Members -->
    <div class="mt-3 flex items-center gap-3">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex min-w-0 items-center gap-2"
      >
        <PlayerAvatar :player="member" size="sm" />
        <span class="truncate font-display text-base text-foam/90">{{ member.name }}</span>
      </div>
    </div>

    <!-- Photo area (4:3) -->
    <div class="mt-4 overflow-hidden rounded-xl border-2 border-line bg-night">
      <div class="relative aspect-[4/3] w-full">
        <!-- Generating: pulsing placeholder + rotating status line -->
        <div
          v-if="generating"
          class="absolute inset-0 grid place-items-center bg-night-soft"
        >
          <div class="absolute inset-0 animate-pulse bg-cup/10"></div>
          <div class="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
            <span class="text-4xl">✨</span>
            <p class="font-display text-lg text-beer">{{ STATUS_LINES[statusIndex] }}</p>
          </div>
        </div>

        <!-- AI photo present -->
        <template v-else-if="team.aiPhoto">
          <img :src="team.aiPhoto" :alt="`Teamfoto van ${team.name}`" class="h-full w-full object-cover" />
          <div
            class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-night/90 to-transparent p-2"
          >
            <p class="line-clamp-2 max-w-[60%] font-sans text-xs text-foam/70">{{ team.scenario }}</p>
            <button
              type="button"
              @click="regenerate"
              class="inline-flex min-h-11 shrink-0 items-center rounded-lg border-b-2 border-cup-dark bg-cup px-4 font-display text-sm text-foam transition active:translate-y-0.5 active:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beer"
            >
              Opnieuw
            </button>
          </div>
        </template>

        <!-- No photo yet, but ready to generate -->
        <div
          v-else-if="bothHavePhotos && hasApiKey"
          class="absolute inset-0 grid place-items-center p-4"
        >
          <button
            type="button"
            @click="generate"
            class="rounded-xl border-b-4 border-cup-dark bg-cup px-5 py-3 font-display text-lg text-foam transition active:translate-y-0.5 active:border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beer"
          >
            Genereer teamfoto
          </button>
        </div>

        <!-- Both have photos but no API key: fallback collage -->
        <template v-else-if="bothHavePhotos">
          <div class="grid h-full w-full grid-cols-2">
            <img :src="members[0].photo" :alt="`Foto van ${members[0].name}`" class="h-full w-full object-cover" />
            <img :src="members[1].photo" :alt="`Foto van ${members[1].name}`" class="h-full w-full border-l-2 border-line object-cover" />
          </div>
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/90 to-transparent p-2">
            <p class="font-sans text-xs text-foam/70">Vul een API key in voor AI-foto's</p>
          </div>
        </template>

        <!-- Missing player photos -->
        <div v-else class="absolute inset-0 grid place-items-center p-4 text-center">
          <p class="font-sans text-sm text-foam/50">
            Voeg foto's van beide spelers toe voor een teamfoto
          </p>
        </div>
      </div>
    </div>
  </article>
</template>
