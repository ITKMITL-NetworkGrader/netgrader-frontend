import { ref, computed, watch, nextTick, onMounted, onUnmounted, readonly, type Ref } from 'vue'

/**
 * Performance optimization utilities for lab management system
 */
export const usePerformanceOptimization = () => {
  // Debounce utility for expensive operations
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(...args), delay)
    }
  }

  // Throttle utility for frequent operations
  const throttle = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0
    return (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCall >= delay) {
        lastCall = now
        func(...args)
      }
    }
  }

  // Memoization utility for expensive computations
  const memoize = <T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T => {
    const cache = new Map<string, ReturnType<T>>()
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
      
      if (cache.has(key)) {
        return cache.get(key)!
      }
      
      const result = func(...args)
      cache.set(key, result)
      
      // Limit cache size to prevent memory leaks
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
      }
      
      return result
    }) as T
  }

  // Virtual scrolling for large lists
  const useVirtualScroll = (
    items: Ref<any[]>,
    itemHeight: number,
    containerHeight: number
  ) => {
    const scrollTop = ref(0)
    const startIndex = computed(() => Math.floor(scrollTop.value / itemHeight))
    const endIndex = computed(() => 
      Math.min(
        startIndex.value + Math.ceil(containerHeight / itemHeight) + 1,
        items.value.length
      )
    )
    
    const visibleItems = computed(() => 
      items.value.slice(startIndex.value, endIndex.value)
    )
    
    const totalHeight = computed(() => items.value.length * itemHeight)
    const offsetY = computed(() => startIndex.value * itemHeight)
    
    return {
      scrollTop,
      visibleItems,
      totalHeight,
      offsetY,
      startIndex,
      endIndex
    }
  }

  // Intersection observer for lazy loading
  const useIntersectionObserver = (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ) => {
    const observer = ref<IntersectionObserver | null>(null)
    const targets = ref<Set<Element>>(new Set())

    const observe = (element: Element) => {
      if (!observer.value) {
        observer.value = new IntersectionObserver(callback, options)
      }
      observer.value.observe(element)
      targets.value.add(element)
    }

    const unobserve = (element: Element) => {
      if (observer.value) {
        observer.value.unobserve(element)
        targets.value.delete(element)
      }
    }

    const disconnect = () => {
      if (observer.value) {
        observer.value.disconnect()
        targets.value.clear()
        observer.value = null
      }
    }

    onUnmounted(() => {
      disconnect()
    })

    return {
      observe,
      unobserve,
      disconnect
    }
  }

  // Image lazy loading
  const useLazyImage = () => {
    const { observe, unobserve } = useIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = img.dataset.src
            if (src) {
              img.src = src
              img.removeAttribute('data-src')
              unobserve(img)
            }
          }
        })
      },
      { threshold: 0.1 }
    )

    return { observe, unobserve }
  }

  // Component lazy loading
  const useLazyComponent = () => {
    const isVisible = ref(false)
    const elementRef = ref<HTMLElement>()

    const { observe } = useIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true
          }
        })
      },
      { threshold: 0.1 }
    )

    onMounted(() => {
      if (elementRef.value) {
        observe(elementRef.value)
      }
    })

    return {
      isVisible,
      elementRef
    }
  }

  // Batch DOM updates
  const useBatchUpdates = () => {
    const pendingUpdates = ref<(() => void)[]>([])
    const isScheduled = ref(false)

    const scheduleUpdate = (updateFn: () => void) => {
      pendingUpdates.value.push(updateFn)
      
      if (!isScheduled.value) {
        isScheduled.value = true
        nextTick(() => {
          const updates = [...pendingUpdates.value]
          pendingUpdates.value = []
          isScheduled.value = false
          
          updates.forEach(update => update())
        })
      }
    }

    return { scheduleUpdate }
  }

  // Memory usage monitoring
  const useMemoryMonitor = () => {
    const memoryUsage = ref<MemoryInfo | null>(null)
    
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        memoryUsage.value = (performance as any).memory
      }
    }

    const startMonitoring = (interval = 5000) => {
      updateMemoryUsage()
      const intervalId = setInterval(updateMemoryUsage, interval)
      
      onUnmounted(() => {
        clearInterval(intervalId)
      })
      
      return intervalId
    }

    return {
      memoryUsage: readonly(memoryUsage),
      updateMemoryUsage,
      startMonitoring
    }
  }

  // Performance timing
  const usePerformanceTiming = () => {
    const timings = ref<Map<string, number>>(new Map())
    
    const startTiming = (label: string) => {
      performance.mark(`${label}-start`)
    }
    
    const endTiming = (label: string) => {
      performance.mark(`${label}-end`)
      performance.measure(label, `${label}-start`, `${label}-end`)
      
      const measure = performance.getEntriesByName(label)[0]
      if (measure) {
        timings.value.set(label, measure.duration)
      }
      
      // Clean up marks
      performance.clearMarks(`${label}-start`)
      performance.clearMarks(`${label}-end`)
      performance.clearMeasures(label)
    }
    
    const getTimings = () => {
      return Object.fromEntries(timings.value)
    }
    
    return {
      startTiming,
      endTiming,
      getTimings,
      timings: readonly(timings)
    }
  }

  // Resource preloading
  const useResourcePreloader = () => {
    const preloadedResources = ref<Set<string>>(new Set())
    
    const preloadImage = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (preloadedResources.value.has(src)) {
          resolve()
          return
        }
        
        const img = new Image()
        img.onload = () => {
          preloadedResources.value.add(src)
          resolve()
        }
        img.onerror = reject
        img.src = src
      })
    }
    
    const preloadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (preloadedResources.value.has(src)) {
          resolve()
          return
        }
        
        const script = document.createElement('script')
        script.onload = () => {
          preloadedResources.value.add(src)
          resolve()
        }
        script.onerror = reject
        script.src = src
        document.head.appendChild(script)
      })
    }
    
    const preloadCSS = (href: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (preloadedResources.value.has(href)) {
          resolve()
          return
        }
        
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.onload = () => {
          preloadedResources.value.add(href)
          resolve()
        }
        link.onerror = reject
        link.href = href
        document.head.appendChild(link)
      })
    }
    
    return {
      preloadImage,
      preloadScript,
      preloadCSS,
      preloadedResources: readonly(preloadedResources)
    }
  }

  return {
    debounce,
    throttle,
    memoize,
    useVirtualScroll,
    useIntersectionObserver,
    useLazyImage,
    useLazyComponent,
    useBatchUpdates,
    useMemoryMonitor,
    usePerformanceTiming,
    useResourcePreloader
  }
}

// Type definitions for memory monitoring
interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}