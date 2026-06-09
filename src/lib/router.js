import { ref } from 'vue'

// Minimal hash router: '#/mex' → '/mex'; anything without a leading slash → '/'.
// Tolerates copy-paste mangling: '#/mex?x=1' and '#/beerpong/' resolve normally.
function normalize(hash) {
  const path = hash
    .replace(/^#/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
  return path.startsWith('/') || path === '' ? path || '/' : '/'
}

// Read a query param out of the hash (e.g. '#/toernooi?s=abc' → s=abc).
function queryParam(hash, key) {
  const m = hash.match(new RegExp(`[?&]${key}=([^&#]+)`))
  return m ? decodeURIComponent(m[1]) : null
}

const path = ref(normalize(window.location.hash))
const query = ref({ s: queryParam(window.location.hash, 's') })

window.addEventListener('hashchange', () => {
  path.value = normalize(window.location.hash)
  query.value = { s: queryParam(window.location.hash, 's') }
})

export function navigate(to) {
  window.location.hash = '#' + to
}

export function useRoute() {
  return { path, query, navigate }
}
