<template>
  <div class="lab-creation-demo">
    <div class="demo-header">
      <h2>Lab Creation Wizard - IP Variable System Demo</h2>
      <p>Student ID: 65070232 | Course: Network Administration</p>
    </div>

    <!-- Debug Toggle -->
    <div class="debug-controls">
      <label class="debug-toggle">
        <input type="checkbox" v-model="showDebugInfo" />
        Show Debug Information
      </label>
      <button @click="downloadDebugInfo" class="debug-button">
        Download Debug Info
      </button>
    </div>

    <!-- Step 1: Basic Lab Information -->
    <div v-if="currentStep === 1" class="wizard-step">
      <h3>Step 1: Basic Lab Information</h3>
      <div class="form-group">
        <label>Lab Name:</label>
        <input v-model="labData.name" placeholder="OSPF Routing Configuration" />
      </div>
      <div class="form-group">
        <label>Instructions:</label>
        <textarea v-model="labData.instructions" placeholder="Configure OSPF routing protocol..."></textarea>
      </div>
    </div>

    <!-- Step 2: Network Configuration -->
    <div v-if="currentStep === 2" class="wizard-step">
      <h3>Step 2: Network Configuration</h3>
      <div class="form-group">
        <label>Base Network:</label>
        <input v-model="networkConfig.baseNetwork" placeholder="192.168.1.0" />
      </div>
      <div class="form-group">
        <label>Subnet Mask:</label>
        <input type="number" v-model="networkConfig.subnetMask" min="8" max="30" />
      </div>
    </div>

    <!-- Step 3: Device Configuration -->
    <div v-if="currentStep === 3" class="wizard-step">
      <h3>Step 3: Device Configuration</h3>

      <!-- Add Device Form -->
      <div class="add-device-form">
        <h4>Add Device</h4>
        <input v-model="newDevice.deviceId" placeholder="Device ID (e.g., router1)" />
        <select v-model="newDevice.deviceType">
          <option value="">Select device type...</option>
          <option value="router">Router</option>
          <option value="switch">Switch</option>
          <option value="pc">PC</option>
        </select>
        <button @click="addNewDevice" :disabled="!newDevice.deviceId || !newDevice.deviceType">
          Add Device
        </button>
      </div>

      <!-- Device List -->
      <div class="devices-list">
        <div v-for="device in devices" :key="device.deviceId" class="device-card">
          <h4>{{ device.deviceId }} ({{ device.deviceType }})</h4>

          <!-- IP Variables -->
          <div class="ip-variables">
            <h5>IP Variables</h5>
            <div v-for="variable in device.ipVariables" :key="variable.name" class="ip-variable">
              <div class="variable-info">
                <span class="variable-name">{{ variable.name }}</span>
                <span class="variable-type" :class="variable.type">{{ variable.type }}</span>
                <span class="variable-value">{{ variable.value }}</span>
                <span v-if="variable.readonly" class="readonly-badge">Read-only</span>
              </div>
            </div>

            <!-- Add Custom IP Variable -->
            <div class="add-variable-form">
              <input
                v-model="customVariable.name"
                placeholder="Variable name"
              />
              <select v-model="customVariable.type">
                <option value="host_offset">Host Offset</option>
                <option value="full_ip">Full IP</option>
              </select>
              <input
                v-model="customVariable.value"
                :placeholder="customVariable.type === 'host_offset' ? 'e.g., 10' : 'e.g., 192.168.1.10'"
              />
              <button
                @click="addCustomVariable(device.deviceId)"
                :disabled="!customVariable.name || !customVariable.value"
              >
                Add Variable
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Available IP Variables Summary -->
      <div v-if="availableIpVariables.length > 0" class="ip-variables-summary">
        <h4>Available IP Variables for Task Parameters</h4>
        <div class="variables-grid">
          <div v-for="variable in availableIpVariables" :key="variable.displayName" class="variable-ref">
            <span class="ref-name">{{ variable.displayName }}</span>
            <span class="ref-ip">{{ variable.ipAddress }}</span>
            <span class="ref-type" :class="variable.type">{{ variable.type }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 4: Task Configuration with IP Parameters -->
    <div v-if="currentStep === 4" class="wizard-step">
      <h3>Step 4: Task Configuration</h3>

      <!-- Mock Task Template Selection -->
      <div class="task-template-demo">
        <h4>Sample Task: Configure Router Interface</h4>
        <p>Template: cisco_interface_config</p>

        <!-- Regular Parameter -->
        <div class="parameter-group">
          <label>Interface Name:</label>
          <input v-model="sampleTask.interfaceName" placeholder="GigabitEthernet0/0" />
        </div>

        <!-- IP Address Parameter with Variable Selection -->
        <div class="parameter-group">
          <label>IP Address:</label>
          <IpParameterSelector
            parameter-name="ipAddress"
            :parameter-schema="{
              name: 'IP Address',
              type: 'ip_address',
              description: 'Interface IP address',
              required: true
            }"
            :available-ip-variables="availableIpVariables"
            v-model="sampleTask.ipAddress"
            :show-debug-info="showDebugInfo"
            :student-id="studentId"
            :base-network="networkConfig.baseNetwork"
            :subnet-mask="networkConfig.subnetMask"
            @validation-error="onParameterValidationError"
          />
        </div>

        <!-- Another IP Parameter -->
        <div class="parameter-group">
          <label>Gateway IP:</label>
          <IpParameterSelector
            parameter-name="gateway"
            :parameter-schema="{
              name: 'Gateway IP',
              type: 'ip_address',
              description: 'Default gateway IP address',
              required: false
            }"
            :available-ip-variables="availableIpVariables"
            v-model="sampleTask.gateway"
            :show-debug-info="showDebugInfo"
            :student-id="studentId"
            :base-network="networkConfig.baseNetwork"
            :subnet-mask="networkConfig.subnetMask"
            @validation-error="onParameterValidationError"
          />
        </div>

        <!-- Task Parameter Validation Summary -->
        <div v-if="parameterErrors.length > 0" class="validation-errors">
          <h5>Parameter Validation Errors:</h5>
          <ul>
            <li v-for="error in parameterErrors" :key="error">{{ error }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="wizard-navigation">
      <button @click="previousStep" :disabled="currentStep <= 1">Previous</button>
      <span class="step-indicator">Step {{ currentStep }} of {{ totalSteps }}</span>
      <button @click="nextStep" :disabled="!canProceedToNextStep">Next</button>
    </div>

    <!-- Debug Information -->
    <div v-if="showDebugInfo" class="debug-panel">
      <h3>Debug Information</h3>

      <!-- Debug Summary -->
      <div class="debug-summary">
        <h4>Summary</h4>
        <ul>
          <li>Steps Recorded: {{ debugSummary?.steps || 0 }}</li>
          <li>Devices: {{ debugSummary?.devices || 0 }}</li>
          <li>IP Variables: {{ debugSummary?.ipVariables || 0 }}</li>
          <li>Parts: {{ debugSummary?.parts || 0 }}</li>
        </ul>
      </div>

      <!-- Generated Student Values -->
      <div v-if="studentIpData" class="student-ip-data">
        <h4>Generated Student IP Data</h4>
        <details>
          <summary>Student ID {{ studentId }} Algorithm Results</summary>
          <pre>{{ JSON.stringify(studentIpData, null, 2) }}</pre>
        </details>
      </div>

      <!-- Lab Payload -->
      <div class="payload-section">
        <h4>Lab Creation Payload</h4>
        <details>
          <summary>Lab Payload (JSON)</summary>
          <pre class="payload-code">{{ formattedLabPayload }}</pre>
        </details>
      </div>

      <!-- Current Task Parameter Values -->
      <div v-if="currentStep === 4" class="current-task-debug">
        <h4>Current Task Parameters</h4>
        <pre>{{ JSON.stringify(sampleTask, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLabCreationWizard } from '~/composables/useLabCreationWizard'
import IpParameterSelector from './IpParameterSelector.vue'
import StudentIpGenerator from '~/utils/studentIpGenerator'

// Use the lab creation wizard composable
const {
  currentStep,
  totalSteps,
  labData,
  networkConfig,
  devices,
  studentId,
  availableIpVariables,
  debugSummary,
  canProceedToNextStep,
  addDevice,
  addIpVariableToDevice,
  downloadDebugInfo,
  getFormattedLabPayload
} = useLabCreationWizard()

// Demo setup
studentId.value = '65070232'
labData.value.courseId = 'aLg0B5jPrFW47ICP'
labData.value.name = 'OSPF Routing Configuration Lab'
labData.value.instructions = '## Lab Objectives\n- Configure OSPF areas\n- Verify neighbor relationships'

// UI state
const showDebugInfo = ref(true)
const parameterErrors = ref<string[]>([])

// New device form
const newDevice = ref({
  deviceId: '',
  deviceType: '' as 'router' | 'switch' | 'pc' | ''
})

// Custom variable form
const customVariable = ref({
  name: '',
  type: 'host_offset' as 'host_offset' | 'full_ip',
  value: ''
})

// Sample task for demonstration
const sampleTask = ref({
  interfaceName: 'GigabitEthernet0/0',
  ipAddress: '',
  gateway: ''
})

// Student IP data for debugging
const studentIpData = computed(() => {
  const generator = new StudentIpGenerator({
    student_id: studentId.value,
    baseNetwork: networkConfig.value.baseNetwork,
    subnetMask: networkConfig.value.subnetMask
  })
  return generator.generateStudentIpData()
})

// Formatted lab payload for debugging
const formattedLabPayload = computed(() => {
  return getFormattedLabPayload()
})

// Methods
function addNewDevice() {
  if (!newDevice.value.deviceId || !newDevice.value.deviceType) return

  addDevice(
    newDevice.value.deviceId,
    '507f1f77bcf86cd799439012', // Mock template ID
    newDevice.value.deviceType
  )

  // Reset form
  newDevice.value.deviceId = ''
  newDevice.value.deviceType = ''
}

function addCustomVariable(deviceId: string) {
  if (!customVariable.value.name || !customVariable.value.value) return

  const value = customVariable.value.type === 'host_offset'
    ? Number(customVariable.value.value)
    : customVariable.value.value

  addIpVariableToDevice(
    deviceId,
    customVariable.value.name,
    customVariable.value.type,
    value
  )

  // Reset form
  customVariable.value.name = ''
  customVariable.value.value = ''
}

function onParameterValidationError(error: string | null) {
  if (error) {
    if (!parameterErrors.value.includes(error)) {
      parameterErrors.value.push(error)
    }
  } else {
    // Remove errors for this parameter
    parameterErrors.value = parameterErrors.value.filter(e => e !== error)
  }
}

function nextStep() {
  if (canProceedToNextStep.value && currentStep.value < totalSteps.value) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// Add some demo devices automatically
watch(studentId, () => {
  if (devices.value.length === 0) {
    setTimeout(() => {
      addDevice('router1', '507f1f77bcf86cd799439012', 'router')
      addDevice('switch1', '507f1f77bcf86cd799439013', 'switch')
      addDevice('pc1', '507f1f77bcf86cd799439014', 'pc')
    }, 100)
  }
}, { immediate: true })
</script>

<style scoped>
.lab-creation-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid hsl(var(--border));
}

.demo-header h2 {
  color: hsl(var(--foreground));
  margin-bottom: 0.5rem;
}

.debug-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: hsl(var(--muted));
  border-radius: 0.5rem;
}

.debug-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.debug-button {
  padding: 0.5rem 1rem;
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.debug-button:hover {
  background-color: hsl(var(--primary) / 0.9);
}

.wizard-step {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  min-height: 400px;
}

.wizard-step h3 {
  color: hsl(var(--foreground));
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: hsl(var(--foreground));
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.add-device-form {
  display: flex;
  gap: 1rem;
  align-items: end;
  padding: 1rem;
  background-color: hsl(var(--muted) / 0.5);
  border-radius: 0.375rem;
  margin-bottom: 1.5rem;
}

.add-device-form h4 {
  margin: 0;
  white-space: nowrap;
}

.add-device-form input,
.add-device-form select {
  flex: 1;
}

.add-device-form button {
  padding: 0.5rem 1rem;
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  white-space: nowrap;
}

.add-device-form button:disabled {
  background-color: hsl(var(--muted));
  cursor: not-allowed;
}

.devices-list {
  display: grid;
  gap: 1rem;
}

.device-card {
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  padding: 1rem;
  background-color: hsl(var(--muted) / 0.3);
}

.device-card h4 {
  margin: 0 0 1rem 0;
  color: hsl(var(--foreground));
}

.ip-variables h5 {
  margin: 0 0 0.5rem 0;
  color: hsl(var(--muted-foreground));
}

.ip-variable {
  margin-bottom: 0.5rem;
}

.variable-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.variable-name {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.variable-type {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.variable-type.student_generated {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.variable-type.host_offset {
  background-color: hsl(var(--accent) / 0.3);
  color: hsl(var(--primary));
}

.variable-type.full_ip {
  background-color: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
}

.variable-value {
  font-family: 'Monaco', 'Menlo', monospace;
  color: hsl(var(--primary));
  font-weight: 600;
}

.readonly-badge {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.add-variable-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid hsl(var(--border));
}

.add-variable-form input,
.add-variable-form select {
  flex: 1;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.add-variable-form button {
  padding: 0.25rem 0.5rem;
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.75rem;
  white-space: nowrap;
}

.ip-variables-summary {
  margin-top: 2rem;
  padding: 1rem;
  background-color: hsl(var(--primary) / 0.05);
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 0.375rem;
}

.ip-variables-summary h4 {
  margin: 0 0 1rem 0;
  color: hsl(var(--primary));
}

.variables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.5rem;
}

.variable-ref {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.ref-name {
  font-weight: 600;
  color: hsl(var(--primary));
}

.ref-ip {
  font-family: 'Monaco', 'Menlo', monospace;
  color: hsl(var(--primary));
}

.ref-type {
  font-size: 0.75rem;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

.ref-type.student_generated {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.ref-type.custom {
  background-color: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.task-template-demo {
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  padding: 1.5rem;
  background-color: hsl(var(--muted) / 0.3);
}

.task-template-demo h4 {
  margin: 0 0 0.5rem 0;
  color: hsl(var(--foreground));
}

.parameter-group {
  margin-bottom: 1.5rem;
}

.parameter-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.validation-errors {
  margin-top: 1rem;
  padding: 1rem;
  background-color: hsl(var(--destructive) / 0.1);
  border: 1px solid hsl(var(--destructive) / 0.3);
  border-radius: 0.375rem;
}

.validation-errors h5 {
  margin: 0 0 0.5rem 0;
  color: hsl(var(--destructive));
}

.validation-errors ul {
  margin: 0;
  padding-left: 1.5rem;
  color: hsl(var(--destructive));
}

.wizard-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: hsl(var(--muted) / 0.5);
  border-radius: 0.5rem;
  margin-bottom: 2rem;
}

.wizard-navigation button {
  padding: 0.5rem 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  background-color: hsl(var(--card));
  cursor: pointer;
  font-weight: 500;
}

.wizard-navigation button:hover:not(:disabled) {
  background-color: hsl(var(--muted));
}

.wizard-navigation button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-indicator {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.debug-panel {
  background-color: hsl(var(--muted));
  color: hsl(var(--foreground));
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-top: 2rem;
}

.debug-panel h3,
.debug-panel h4 {
  color: hsl(var(--foreground));
  margin-bottom: 1rem;
}

.debug-summary ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.debug-summary li {
  padding: 0.25rem 0;
  border-bottom: 1px solid hsl(var(--border));
}

.debug-panel details {
  margin: 1rem 0;
}

.debug-panel summary {
  cursor: pointer;
  font-weight: 600;
  padding: 0.5rem;
  background-color: hsl(var(--accent));
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
}

.debug-panel pre {
  background-color: hsl(var(--card));
  padding: 1rem;
  border-radius: 0.25rem;
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0;
}

.payload-code {
  max-height: 400px;
  overflow-y: auto;
}
</style>