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

const path = ref(normalize(window.location.hash))

window.addEventListener('hashchange', () => {
  path.value = normalize(window.location.hash)
})

export function navigate(to) {
  window.location.hash = '#' + to
}

export function useRoute() {
  return { path, navigate }
}
