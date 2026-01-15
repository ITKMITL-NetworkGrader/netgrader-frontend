import { ref, readonly } from 'vue'

export interface ProfileData {
    u_id: string
    fullName: string
    role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
    profilePicture: string | null
    bio: string
    createdAt?: string
    lastLogin?: string
}

export function useProfile() {
    const config = useRuntimeConfig()
    const backendURL = config.public.backendurl

    const profile = ref<ProfileData | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const isUpdating = ref(false)

    /**
     * Fetch current user's profile
     */
    const fetchProfile = async () => {
        isLoading.value = true
        error.value = null

        try {
            const response = await $fetch<{ success: boolean; data: ProfileData; error?: string }>(
                `${backendURL}/v0/profile`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            )

            if (response.success && response.data) {
                profile.value = response.data
            } else {
                error.value = response.error || 'Failed to fetch profile'
            }
        } catch (err: any) {
            console.error('Error fetching profile:', err)
            error.value = err.message || 'An error occurred while fetching profile'
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Fetch public profile by user ID
     */
    const fetchPublicProfile = async (userId: string) => {
        isLoading.value = true
        error.value = null

        try {
            const response = await $fetch<{ success: boolean; data: ProfileData; error?: string }>(
                `${backendURL}/v0/profile/${userId}`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            )

            if (response.success && response.data) {
                profile.value = response.data
            } else {
                error.value = response.error || 'User not found'
            }
        } catch (err: any) {
            console.error('Error fetching public profile:', err)
            error.value = err.message || 'An error occurred while fetching profile'
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Update user bio
     */
    const updateBio = async (bio: string) => {
        isUpdating.value = true
        error.value = null

        try {
            const response = await $fetch<{ success: boolean; message: string; data?: { bio: string }; error?: string }>(
                `${backendURL}/v0/profile/bio`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: { bio },
                }
            )

            if (response.success && response.data) {
                if (profile.value) {
                    profile.value.bio = response.data.bio
                }
                return { success: true, message: response.message }
            } else {
                error.value = response.error || 'Failed to update bio'
                return { success: false, message: error.value }
            }
        } catch (err: any) {
            console.error('Error updating bio:', err)
            error.value = err.message || 'An error occurred while updating bio'
            return { success: false, message: error.value }
        } finally {
            isUpdating.value = false
        }
    }

    /**
     * Upload profile picture
     */
    const uploadProfilePicture = async (file: File) => {
        isUpdating.value = true
        error.value = null

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await $fetch<{ message: string; data?: { url: string; objectName: string }; error?: string }>(
                `${backendURL}/v0/storage/profile`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                }
            )

            if (response.data?.url) {
                if (profile.value) {
                    profile.value.profilePicture = response.data.url
                }
                return { success: true, url: response.data.url }
            } else {
                error.value = response.error || 'Failed to upload profile picture'
                return { success: false, message: error.value }
            }
        } catch (err: any) {
            console.error('Error uploading profile picture:', err)
            error.value = err.message || 'An error occurred while uploading profile picture'
            return { success: false, message: error.value }
        } finally {
            isUpdating.value = false
        }
    }

    /**
     * Delete profile picture
     */
    const deleteProfilePicture = async () => {
        isUpdating.value = true
        error.value = null

        try {
            const response = await $fetch<{ message: string; error?: string }>(
                `${backendURL}/v0/storage/profile`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            )

            if (profile.value) {
                profile.value.profilePicture = null
            }
            return { success: true, message: response.message }
        } catch (err: any) {
            console.error('Error deleting profile picture:', err)
            error.value = err.message || 'An error occurred while deleting profile picture'
            return { success: false, message: error.value }
        } finally {
            isUpdating.value = false
        }
    }

    return {
        profile: readonly(profile),
        isLoading: readonly(isLoading),
        isUpdating: readonly(isUpdating),
        error: readonly(error),
        fetchProfile,
        fetchPublicProfile,
        updateBio,
        uploadProfilePicture,
        deleteProfilePicture,
    }
}
