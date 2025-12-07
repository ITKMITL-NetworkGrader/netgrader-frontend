import { useCourseRoleState } from "~/composables/states";

interface Course {
  _id: string
  title: string
  description: string
  instructor: string
  createdAt: string
  updatedAt: string
  visibility: 'public' | 'private'
  requiresPassword: boolean
  bannerUrl?: string
  bannerImage?: string
}

interface CourseResponse {
  courses: Course[]
}

interface SingleCourseResponse {
  course: Course
  enrollment: {
    isEnrolled: boolean
    role?: "STUDENT" | "INSTRUCTOR" | "TA"
    enrollmentDate?: string
  }
}

export const useCourse = () => {
  const courses = ref<Course[]>([])
  const currentCourse = ref<Course | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const config = useRuntimeConfig()
  const backendURL = config.public.backendurl
  const courseRoleState = useCourseRoleState()

  // Get course role information from global state
  const currentCourseEnrollment = computed(() => {
    return courseRoleState.value || {
      isEnrolled: false,
      role: undefined,
      courseId: '',
      enrollmentDate: ''
    }
  })

  const fetchCourses = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $fetch<CourseResponse>(`${backendURL}/v0/courses`)
      courses.value = response.courses
    } catch (err) {
      error.value = 'Failed to fetch courses'
      console.error('Error fetching courses:', err)
    } finally {
      isLoading.value = false
    }
  }

  const fetchCourse = async (courseId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $fetch<SingleCourseResponse>(`${backendURL}/v0/courses/${courseId}`, {
        method: 'GET',
        credentials: 'include'
      })
      currentCourse.value = response.course
      return response.course
    } catch (err) {
      error.value = 'Failed to fetch course'
      console.error('Error fetching course:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  const getCourseById = (courseId: string): Course | undefined => {
    return courses.value.find(course => course._id === courseId)
  }

  return {
    courses: readonly(courses),
    currentCourse: readonly(currentCourse),
    currentCourseEnrollment: readonly(currentCourseEnrollment),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchCourses,
    fetchCourse,
    getCourseById
  }
}
