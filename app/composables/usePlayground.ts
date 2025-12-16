/**
 * Playground Composable
 * Handles GNS3 connectivity, project creation, and custom grading for lecturers/TAs
 * All state is ephemeral (not persisted)
 */

export interface GNS3Config {
    serverIp: string;
    serverPort: number;
    projectId?: string;
    projectName?: string;
    requiresAuth: boolean;
    username?: string;
    password?: string;
}

// Interface-level IP mapping
export interface DeviceInterfaceMapping {
    name: string;       // ipVariable name (e.g., "mgmt_interface")
    interfaceName: string;  // e.g., "GigabitEthernet0/0"
    ipAddress: string;  // User-provided IP
}

// Enhanced device mapping with interface-level IPs
export interface DeviceMapping {
    deviceId: string;
    displayName: string;
    templateId: string;
    gns3NodeName: string;
    interfaces: DeviceInterfaceMapping[];
}

// Lab device from backend (for device mapping UI)
export interface LabDevice {
    deviceId: string;
    displayName: string;
    templateId: string;
    interfaces: Array<{
        name: string;       // ipVariable name
        interfaceName: string;  // e.g., "GigabitEthernet0/0"
        inputType: string;
    }>;
    credentials: {
        username: string;
        password: string;
        enablePassword?: string;
    };
}

// Legacy: per-part device (kept for backward compatibility)
export interface PlaygroundDevice {
    deviceId: string;
    displayName: string;
    templateId: string;
    ipVariables: Array<{
        name: string;
        inputType: string;
        interface?: string;
    }>;
}

export interface PlaygroundState {
    step: 'idle' | 'connecting' | 'creating-project' | 'configuring' | 'grading' | 'complete';
    gns3Config: GNS3Config | null;
    deviceMappings: Record<string, DeviceMapping>;
    customIpMappings: Record<string, string>;
    customVlanMappings: Record<string, number>;
    gradingJobId: string | null;
    gradingResult: any | null;
    error: string | null;
}

export function usePlayground() {
    const config = useRuntimeConfig();
    const apiBaseUrl = config.public.backendurl + '/v0';

    // Ephemeral state - not persisted
    const state = ref<PlaygroundState>({
        step: 'idle',
        gns3Config: null,
        deviceMappings: {},
        customIpMappings: {},
        customVlanMappings: {},
        gradingJobId: null,
        gradingResult: null,
        error: null,
    });

    const isLoading = ref(false);

    /**
     * Test connectivity to GNS3 server
     */
    async function testConnectivity(config: GNS3Config): Promise<{ success: boolean; version?: string; error?: string }> {
        isLoading.value = true;
        state.value.error = null;
        state.value.step = 'connecting';

        try {
            const response = await $fetch<{
                success: boolean;
                version?: string;
                error?: string;
                message?: string;
            }>(`${apiBaseUrl}/playground/gns3/test-connectivity`, {
                method: 'POST',
                credentials: 'include',
                body: {
                    serverIp: config.serverIp,
                    serverPort: config.serverPort,
                    requiresAuth: config.requiresAuth,
                    username: config.username,
                    password: config.password,
                },
            });

            if (response.success) {
                state.value.gns3Config = { ...config };
                return { success: true, version: response.version };
            } else {
                state.value.error = response.error || 'Connection failed';
                state.value.step = 'idle';
                return { success: false, error: response.error };
            }
        } catch (error: any) {
            const errorMsg = error.data?.error || error.message || 'Connection failed';
            state.value.error = errorMsg;
            state.value.step = 'idle';
            return { success: false, error: errorMsg };
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Create a new project on GNS3 server (or use existing)
     */
    async function createProject(projectName: string): Promise<{ success: boolean; projectId?: string; isExisting?: boolean; error?: string }> {
        if (!state.value.gns3Config) {
            return { success: false, error: 'Not connected to GNS3 server' };
        }

        isLoading.value = true;
        state.value.error = null;
        state.value.step = 'creating-project';

        try {
            const response = await $fetch<{
                success: boolean;
                projectId?: string;
                projectName?: string;
                isExisting?: boolean;
                error?: string;
            }>(`${apiBaseUrl}/playground/gns3/create-project`, {
                method: 'POST',
                credentials: 'include',
                body: {
                    serverIp: state.value.gns3Config.serverIp,
                    serverPort: state.value.gns3Config.serverPort,
                    projectName,
                    requiresAuth: state.value.gns3Config.requiresAuth,
                    username: state.value.gns3Config.username,
                    password: state.value.gns3Config.password,
                },
            });

            if (response.success && response.projectId) {
                state.value.gns3Config.projectId = response.projectId;
                state.value.gns3Config.projectName = response.projectName;
                state.value.step = 'configuring';
                return { success: true, projectId: response.projectId, isExisting: response.isExisting || false };
            } else {
                state.value.error = response.error || 'Failed to create project';
                return { success: false, error: response.error };
            }
        } catch (error: any) {
            const errorMsg = error.data?.error || error.message || 'Failed to create project';
            state.value.error = errorMsg;
            return { success: false, error: errorMsg };
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Get required devices for a lab part
     */
    async function getRequiredDevices(labId: string, partId: string): Promise<{
        success: boolean;
        devices?: PlaygroundDevice[];
        error?: string;
    }> {
        try {
            const response = await $fetch<{
                success: boolean;
                devices?: PlaygroundDevice[];
                error?: string;
            }>(`${apiBaseUrl}/playground/devices/${labId}/${partId}`, {
                credentials: 'include',
            });

            if (response.success) {
                return { success: true, devices: response.devices };
            }
            return { success: false, error: response.error };
        } catch (error: any) {
            return { success: false, error: error.data?.error || error.message };
        }
    }

    /**
     * Get ALL devices for a lab (lab-level mapping)
     */
    async function getLabDevices(labId: string): Promise<{
        success: boolean;
        devices?: LabDevice[];
        error?: string;
    }> {
        try {
            const response = await $fetch<{
                success: boolean;
                devices?: LabDevice[];
                error?: string;
            }>(`${apiBaseUrl}/playground/devices/${labId}`, {
                credentials: 'include',
            });

            if (response.success) {
                return { success: true, devices: response.devices };
            }
            return { success: false, error: response.error };
        } catch (error: any) {
            return { success: false, error: error.data?.error || error.message };
        }
    }

    /**
     * Check which devices from a part are not yet mapped
     */
    function getUnmappedDevices(partDevices: PlaygroundDevice[]): PlaygroundDevice[] {
        return partDevices.filter(device => !state.value.deviceMappings[device.deviceId]);
    }

    /**
     * Update device mapping (with interface-level IPs)
     */
    function setDeviceMapping(deviceId: string, mapping: Partial<DeviceMapping>) {
        const existing = state.value.deviceMappings[deviceId] || {
            deviceId,
            displayName: '',
            templateId: '',
            gns3NodeName: '',
            interfaces: [],
        };
        state.value.deviceMappings[deviceId] = { ...existing, ...mapping };
    }

    /**
     * Update custom IP mapping
     */
    function setCustomIpMapping(key: string, value: string) {
        state.value.customIpMappings[key] = value;
    }

    /**
     * Update custom VLAN mapping
     */
    function setCustomVlanMapping(key: string, value: number) {
        state.value.customVlanMappings[key] = value;
    }

    /**
     * Start playground grading
     * @param labId - Lab ID to grade
     * @param partId - Part ID to grade
     * @param externalConfig - Optional external config (overrides internal state)
     */
    async function startGrading(
        labId: string,
        partId: string,
        externalConfig?: {
            gns3Config: GNS3Config;
            deviceMappings: DeviceMapping[];
            customIpMappings: Record<string, string>;
            customVlanMappings: Record<string, number>;
        }
    ): Promise<{
        success: boolean;
        jobId?: string;
        error?: string;
    }> {
        // Use external config if provided, otherwise use internal state
        const gns3Config = externalConfig?.gns3Config || state.value.gns3Config;
        const deviceMappings = externalConfig?.deviceMappings || Object.values(state.value.deviceMappings);
        const customIpMappings = externalConfig?.customIpMappings || state.value.customIpMappings;
        const customVlanMappings = externalConfig?.customVlanMappings || state.value.customVlanMappings;

        if (!gns3Config?.projectId) {
            return { success: false, error: 'GNS3 project not configured' };
        }

        isLoading.value = true;
        state.value.error = null;
        state.value.step = 'grading';

        try {
            const response = await $fetch<{
                success: boolean;
                jobId?: string;
                error?: string;
                jobPayload?: any;
            }>(`${apiBaseUrl}/playground/grade`, {
                method: 'POST',
                credentials: 'include',
                body: {
                    labId,
                    partId,
                    gns3Config: {
                        serverIp: gns3Config.serverIp,
                        serverPort: gns3Config.serverPort,
                        projectId: gns3Config.projectId,
                        requiresAuth: gns3Config.requiresAuth,
                        username: gns3Config.username,
                        password: gns3Config.password,
                    },
                    deviceMappings,
                    customIpMappings,
                    customVlanMappings,
                },
            });

            if (response.success && response.jobId) {
                state.value.gradingJobId = response.jobId;
                return { success: true, jobId: response.jobId };
            } else {
                state.value.error = response.error || 'Failed to start grading';
                state.value.step = 'configuring';
                return { success: false, error: response.error };
            }
        } catch (error: any) {
            const errorMsg = error.data?.error || error.message || 'Failed to start grading';
            state.value.error = errorMsg;
            state.value.step = 'configuring';
            return { success: false, error: errorMsg };
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Reset playground state
     */
    function reset() {
        state.value = {
            step: 'idle',
            gns3Config: null,
            deviceMappings: {},
            customIpMappings: {},
            customVlanMappings: {},
            gradingJobId: null,
            gradingResult: null,
            error: null,
        };
    }

    /**
     * Check if playground is configured
     */
    const isConfigured = computed(() => {
        return state.value.gns3Config !== null &&
            state.value.gns3Config.projectId !== undefined;
    });

    return {
        state,
        isLoading,
        isConfigured,
        testConnectivity,
        createProject,
        getLabDevices,
        getRequiredDevices,
        getUnmappedDevices,
        setDeviceMapping,
        setCustomIpMapping,
        setCustomVlanMapping,
        startGrading,
        reset,
    };
}
