import { ref, onMounted, onUnmounted } from 'vue'

interface ScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

/**
 * Scroll-triggered entrance animation
 * Fades in elements when they enter the viewport
 */
export function useScrollReveal(
  elementRef: HTMLElement | null,
  options: ScrollRevealOptions = {}
) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -10% 0px',
    once = true
  } = options

  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!('IntersectionObserver' in window) || !elementRef) {
      isVisible.value = true
      return
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          isVisible.value = true
          if (once && observer) {
            observer.unobserve(entry.target)
          }
        } else if (!once) {
          isVisible.value = false
        }
      })
    }, {
      threshold,
      rootMargin
    })

    observer.observe(elementRef)
  })

  onUnmounted(() => {
    if (observer && elementRef) {
      observer.unobserve(elementRef)
    }
  })

  return {
    isVisible,
    style: {
      opacity: isVisible.value ? 1 : 0,
      transform: isVisible.value ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
      transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)'
    }
  }
}
