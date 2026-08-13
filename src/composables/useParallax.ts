import { ref, onMounted, onUnmounted } from 'vue'

interface ParallaxOptions {
  speed?: number
  startOpacity?: number
  endOpacity?: number
  startScale?: number
  endScale?: number
}

/**
 * Scroll-based parallax effect for hero sections
 * Creates cinematic depth by fading and scaling based on scroll position
 */
export function useParallax(elementRef: HTMLElement | null, options: ParallaxOptions = {}) {
  const {
    speed = 100,
    startOpacity = 1,
    endOpacity = 0,
    startScale = 1,
    endScale = 0.95
  } = options

  const y = ref(0)
  const opacity = ref(startOpacity)
  const scale = ref(startScale)

  const handleScroll = () => {
    if (!elementRef) return

    const rect = elementRef.getBoundingClientRect()
    const windowHeight = window.innerHeight

    // Calculate progress based on how much the element has scrolled out of view
    let progress = 1 - (rect.bottom / (windowHeight + rect.height))
    progress = Math.max(0, Math.min(1, progress))

    y.value = progress * speed
    opacity.value = startOpacity - (startOpacity - endOpacity) * progress
    scale.value = startScale - (startScale - endScale) * progress
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  return {
    y,
    opacity,
    scale,
    style: {
      transform: `translateY(${y.value}px) scale(${scale.value})`,
      opacity: opacity.value
    }
  }
}
