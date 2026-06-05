import { ref } from 'vue'

// Minimal hash router: '#/mex' → '/mex'; anything without a leading slash → '/'.
function normalize(hash) {
  const path = hash.replace(/^#/, '')
  return path.startsWith('/') ? path : '/'
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
