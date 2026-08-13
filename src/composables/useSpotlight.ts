import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Mouse-tracking spotlight effect for Linear Design cards
 * Creates a radial gradient glow that follows the cursor on hover
 */
export function useSpotlight(elementRef: HTMLElement | null) {
  const x = ref(0)
  const y = ref(0)
  const isActive = ref(false)

  const handleMouseMove = (e: MouseEvent) => {
    if (!elementRef) return

    const rect = elementRef.getBoundingClientRect()
    x.value = e.clientX - rect.left
    y.value = e.clientY - rect.top
  }

  const handleMouseEnter = () => {
    isActive.value = true
  }

  const handleMouseLeave = () => {
    isActive.value = false
  }

  onMounted(() => {
    if (!elementRef) return

    elementRef.addEventListener('mousemove', handleMouseMove)
    elementRef.addEventListener('mouseenter', handleMouseEnter)
    elementRef.addEventListener('mouseleave', handleMouseLeave)
  })

  onUnmounted(() => {
    if (!elementRef) return

    elementRef.removeEventListener('mousemove', handleMouseMove)
    elementRef.removeEventListener('mouseenter', handleMouseEnter)
    elementRef.removeEventListener('mouseleave', handleMouseLeave)
  })

  return {
    x,
    y,
    isActive
  }
}
