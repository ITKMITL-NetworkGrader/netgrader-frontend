import { ref, nextTick } from 'vue'

/**
 * Enhanced animations and micro-interactions for the lab management system
 */
export const useAnimations = () => {
  // Animation state management
  const isAnimating = ref(false)
  const animationQueue = ref<(() => Promise<void>)[]>([])

  // Smooth transitions utility
  const withTransition = async (
    element: HTMLElement,
    styles: Partial<CSSStyleDeclaration>,
    duration = 300,
    easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
  ): Promise<void> => {
    return new Promise((resolve) => {
      const originalTransition = element.style.transition
      element.style.transition = `all ${duration}ms ${easing}`
      
      Object.assign(element.style, styles)
      
      setTimeout(() => {
        element.style.transition = originalTransition
        resolve()
      }, duration)
    })
  }

  // Stagger animation for lists
  const staggerAnimation = async (
    elements: HTMLElement[],
    animationClass: string,
    delay = 100
  ): Promise<void> => {
    for (let i = 0; i < elements.length; i++) {
      setTimeout(() => {
        elements[i].classList.add(animationClass)
      }, i * delay)
    }
  }

  // Ripple effect for buttons
  const createRipple = (event: MouseEvent, element: HTMLElement): void => {
    const ripple = document.createElement('span')
    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-animation 0.6s linear;
      pointer-events: none;
    `
    
    element.style.position = 'relative'
    element.style.overflow = 'hidden'
    element.appendChild(ripple)
    
    setTimeout(() => {
      ripple.remove()
    }, 600)
  }

  // Smooth height animation
  const animateHeight = async (
    element: HTMLElement,
    targetHeight: number | 'auto',
    duration = 300
  ): Promise<void> => {
    return new Promise((resolve) => {
      const startHeight = element.offsetHeight
      const endHeight = targetHeight === 'auto' 
        ? element.scrollHeight 
        : targetHeight
      
      element.style.height = `${startHeight}px`
      element.style.overflow = 'hidden'
      element.style.transition = `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
      
      requestAnimationFrame(() => {
        element.style.height = `${endHeight}px`
        
        setTimeout(() => {
          if (targetHeight === 'auto') {
            element.style.height = 'auto'
          }
          element.style.overflow = ''
          element.style.transition = ''
          resolve()
        }, duration)
      })
    })
  }

  // Fade transition
  const fadeTransition = async (
    element: HTMLElement,
    direction: 'in' | 'out',
    duration = 300
  ): Promise<void> => {
    return new Promise((resolve) => {
      const startOpacity = direction === 'in' ? 0 : 1
      const endOpacity = direction === 'in' ? 1 : 0
      
      element.style.opacity = startOpacity.toString()
      element.style.transition = `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
      
      requestAnimationFrame(() => {
        element.style.opacity = endOpacity.toString()
        
        setTimeout(() => {
          element.style.transition = ''
          resolve()
        }, duration)
      })
    })
  }

  // Scale animation
  const scaleAnimation = async (
    element: HTMLElement,
    scale: number,
    duration = 300
  ): Promise<void> => {
    return new Promise((resolve) => {
      element.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
      element.style.transform = `scale(${scale})`
      
      setTimeout(() => {
        element.style.transition = ''
        resolve()
      }, duration)
    })
  }

  // Slide animation
  const slideAnimation = async (
    element: HTMLElement,
    direction: 'up' | 'down' | 'left' | 'right',
    distance = 20,
    duration = 300
  ): Promise<void> => {
    return new Promise((resolve) => {
      const transforms = {
        up: `translateY(-${distance}px)`,
        down: `translateY(${distance}px)`,
        left: `translateX(-${distance}px)`,
        right: `translateX(${distance}px)`
      }
      
      element.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
      element.style.transform = transforms[direction]
      
      setTimeout(() => {
        element.style.transform = 'translateY(0) translateX(0)'
        
        setTimeout(() => {
          element.style.transition = ''
          element.style.transform = ''
          resolve()
        }, duration)
      }, 50)
    })
  }

  // Bounce animation for success states
  const bounceAnimation = (element: HTMLElement): void => {
    element.classList.add('bounce-in')
    setTimeout(() => {
      element.classList.remove('bounce-in')
    }, 600)
  }

  // Shake animation for errors
  const shakeAnimation = (element: HTMLElement): void => {
    element.style.animation = 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)'
    setTimeout(() => {
      element.style.animation = ''
    }, 500)
  }

  // Pulse animation
  const pulseAnimation = (element: HTMLElement, duration = 1000): void => {
    element.classList.add('pulse-soft')
    setTimeout(() => {
      element.classList.remove('pulse-soft')
    }, duration)
  }

  // Loading state animations
  const startLoadingAnimation = (element: HTMLElement): void => {
    element.classList.add('shimmer')
  }

  const stopLoadingAnimation = (element: HTMLElement): void => {
    element.classList.remove('shimmer')
  }

  // Queue animations to prevent conflicts
  const queueAnimation = (animationFn: () => Promise<void>): Promise<void> => {
    return new Promise((resolve) => {
      animationQueue.value.push(async () => {
        await animationFn()
        resolve()
      })
      
      if (!isAnimating.value) {
        processAnimationQueue()
      }
    })
  }

  const processAnimationQueue = async (): Promise<void> => {
    if (animationQueue.value.length === 0) {
      isAnimating.value = false
      return
    }
    
    isAnimating.value = true
    const nextAnimation = animationQueue.value.shift()
    
    if (nextAnimation) {
      await nextAnimation()
      await processAnimationQueue()
    }
  }

  // Intersection observer for scroll animations
  const useScrollAnimation = (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = { threshold: 0.1 }
  ) => {
    const observer = ref<IntersectionObserver | null>(null)
    
    const observe = (element: Element) => {
      if (!observer.value) {
        observer.value = new IntersectionObserver(callback, options)
      }
      observer.value.observe(element)
    }
    
    const unobserve = (element: Element) => {
      if (observer.value) {
        observer.value.unobserve(element)
      }
    }
    
    const disconnect = () => {
      if (observer.value) {
        observer.value.disconnect()
        observer.value = null
      }
    }
    
    onUnmounted(() => {
      disconnect()
    })
    
    return { observe, unobserve, disconnect }
  }

  // Animate on scroll
  const animateOnScroll = (
    elements: HTMLElement[],
    animationClass: string,
    threshold = 0.1
  ) => {
    const { observe } = useScrollAnimation((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement
          element.classList.add(animationClass)
        }
      })
    }, { threshold })
    
    elements.forEach(observe)
  }

  // Page transition animations
  const pageTransition = {
    enter: (element: HTMLElement) => {
      element.style.opacity = '0'
      element.style.transform = 'translateY(20px)'
      
      nextTick(() => {
        element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        element.style.opacity = '1'
        element.style.transform = 'translateY(0)'
      })
    },
    
    leave: (element: HTMLElement) => {
      element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      element.style.opacity = '0'
      element.style.transform = 'translateY(-20px)'
    }
  }

  // Modal animations
  const modalAnimations = {
    enter: (overlay: HTMLElement, content: HTMLElement) => {
      overlay.style.opacity = '0'
      content.style.opacity = '0'
      content.style.transform = 'scale(0.9) translateY(-20px)'
      
      nextTick(() => {
        overlay.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        content.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        
        overlay.style.opacity = '1'
        content.style.opacity = '1'
        content.style.transform = 'scale(1) translateY(0)'
      })
    },
    
    leave: (overlay: HTMLElement, content: HTMLElement) => {
      overlay.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      content.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      
      overlay.style.opacity = '0'
      content.style.opacity = '0'
      content.style.transform = 'scale(0.9) translateY(-20px)'
    }
  }

  // Success animation with checkmark
  const successAnimation = (element: HTMLElement) => {
    element.innerHTML = `
      <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path class="checkmark-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    `
    bounceAnimation(element)
  }

  // Error animation with X mark
  const errorAnimation = (element: HTMLElement) => {
    element.innerHTML = `
      <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `
    shakeAnimation(element)
  }

  return {
    // State
    isAnimating: readonly(isAnimating),
    
    // Basic animations
    withTransition,
    fadeTransition,
    scaleAnimation,
    slideAnimation,
    animateHeight,
    
    // Interactive animations
    createRipple,
    bounceAnimation,
    shakeAnimation,
    pulseAnimation,
    
    // Loading animations
    startLoadingAnimation,
    stopLoadingAnimation,
    
    // List animations
    staggerAnimation,
    animateOnScroll,
    
    // Queue management
    queueAnimation,
    
    // Scroll animations
    useScrollAnimation,
    
    // Page transitions
    pageTransition,
    modalAnimations,
    
    // Status animations
    successAnimation,
    errorAnimation
  }
}

// CSS injection for animations
if (process.client) {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes ripple-animation {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    @keyframes shake {
      10%, 90% {
        transform: translate3d(-1px, 0, 0);
      }
      20%, 80% {
        transform: translate3d(2px, 0, 0);
      }
      30%, 50%, 70% {
        transform: translate3d(-4px, 0, 0);
      }
      40%, 60% {
        transform: translate3d(4px, 0, 0);
      }
    }
  `
  document.head.appendChild(style)
}