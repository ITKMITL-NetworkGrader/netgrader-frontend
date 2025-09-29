<template>
  <div class="demo-container">
    <div class="demo-header">
      <h1 class="text-3xl font-bold mb-4">Student Generated Variables - Complete Workflow Demo</h1>
      <p class="text-gray-600 mb-6">
        This demo shows how instructors configure labs with Student Generated Variables,
        and how students see personalized IP addresses when they open the lab.
      </p>
    </div>

    <!-- Step Selector -->
    <div class="step-selector mb-8">
      <div class="bg-white border rounded-lg p-4">
        <h2 class="text-lg font-semibold mb-3">Demo Steps</h2>
        <div class="flex space-x-4">
          <button
            v-for="step in demoSteps"
            :key="step.id"
            @click="currentStep = step.id"
            :class="{
              'bg-blue-600 text-white': currentStep === step.id,
              'bg-gray-100 text-gray-700 hover:bg-gray-200': currentStep !== step.id
            }"
            class="px-4 py-2 rounded font-medium transition-colors"
          >
            {{ step.title }}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 1: Instructor Configuration -->
    <div v-if="currentStep === 'instructor'" class="demo-step">
      <div class="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-primary mb-4">👨‍🏫 Instructor View: Lab Creation Wizard - Step 3</h2>
        <p class="text-muted-foreground mb-4">
          Instructor configures which IP variables should be "Student Generated"
        </p>

        <!-- Mock Step 3 Interface -->
        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold mb-4">Device Configuration</h3>

          <!-- Device Example -->
          <div class="border rounded-lg p-4 mb-4">
            <div class="flex items-center mb-3">
              <span class="text-lg">🖥️</span>
              <h4 class="font-semibold ml-2">router1 (Cisco Router)</h4>
            </div>

            <div class="space-y-3">
              <div class="ip-variable-config">
                <div class="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded">
                  <div>
                    <label class="block text-xs font-medium mb-1">Variable Name</label>
                    <input type="text" value="loopback0" class="w-full p-2 border rounded text-sm" readonly />
                  </div>
                  <div>
                    <label class="block text-xs font-medium mb-1">IP Configuration</label>
                    <select v-model="exampleConfig.loopback0.type" class="w-full p-2 border rounded text-sm">
                      <option value="hostOffset">Host Offset</option>
                      <option value="fullIP">Full IP Address</option>
                      <option value="studentGenerated">Student Generated Variables</option>
                    </select>
                  </div>
                  <div>
                    <div v-if="exampleConfig.loopback0.type === 'studentGenerated'" class="bg-accent border border-border rounded p-3">
                      <div class="text-sm font-medium text-accent-foreground">Will auto-generate for each student</div>
                      <div class="text-xs text-muted-foreground">IP will be calculated when students open the lab</div>
                      <div class="mt-2">
                        <span class="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">Auto-generated</span>
                      </div>
                    </div>
                    <div v-else-if="exampleConfig.loopback0.type === 'hostOffset'">
                      <label class="block text-xs font-medium mb-1">Host Offset</label>
                      <input type="number" v-model="exampleConfig.loopback0.hostOffset" class="w-full p-2 border rounded text-sm" />
                    </div>
                    <div v-else>
                      <label class="block text-xs font-medium mb-1">Full IP Address</label>
                      <input type="text" v-model="exampleConfig.loopback0.fullIP" class="w-full p-2 border rounded text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="ip-variable-config">
                <div class="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded">
                  <div>
                    <label class="block text-xs font-medium mb-1">Variable Name</label>
                    <input type="text" value="gig0_0" class="w-full p-2 border rounded text-sm" readonly />
                  </div>
                  <div>
                    <label class="block text-xs font-medium mb-1">IP Configuration</label>
                    <select v-model="exampleConfig.gig0_0.type" class="w-full p-2 border rounded text-sm">
                      <option value="hostOffset">Host Offset</option>
                      <option value="fullIP">Full IP Address</option>
                      <option value="studentGenerated">Student Generated Variables</option>
                    </select>
                  </div>
                  <div>
                    <div v-if="exampleConfig.gig0_0.type === 'studentGenerated'" class="bg-accent border border-border rounded p-3">
                      <div class="text-sm font-medium text-accent-foreground">Will auto-generate for each student</div>
                      <div class="text-xs text-muted-foreground">IP will be calculated when students open the lab</div>
                      <div class="mt-2">
                        <span class="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">Auto-generated</span>
                      </div>
                    </div>
                    <div v-else-if="exampleConfig.gig0_0.type === 'hostOffset'">
                      <label class="block text-xs font-medium mb-1">Host Offset</label>
                      <input type="number" v-model="exampleConfig.gig0_0.hostOffset" class="w-full p-2 border rounded text-sm" />
                    </div>
                    <div v-else>
                      <label class="block text-xs font-medium mb-1">Full IP Address</label>
                      <input type="text" v-model="exampleConfig.gig0_0.fullIP" class="w-full p-2 border rounded text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Generated Lab Payload Preview -->
          <div class="mt-6">
            <h4 class="font-semibold mb-2">Generated Lab Creation Payload</h4>
            <details class="border rounded p-4">
              <summary class="cursor-pointer font-medium">View JSON Payload</summary>
              <pre class="mt-2 text-sm bg-gray-100 p-3 rounded overflow-x-auto">{{ JSON.stringify(generatedPayload, null, 2) }}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Student Views -->
    <div v-if="currentStep === 'students'" class="demo-step">
      <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-green-900 mb-4">👨‍🎓 Student Views: Personalized Lab Configurations</h2>
        <p class="text-green-700 mb-4">
          Each student sees different IP addresses based on their Student ID
        </p>

        <!-- Student Selector -->
        <div class="mb-6">
          <label class="block font-medium mb-2">Select Student:</label>
          <select v-model="selectedStudentId" class="p-2 border rounded">
            <option value="65070232">Student ID: 65070232 (John Doe)</option>
            <option value="65070233">Student ID: 65070233 (Jane Smith)</option>
            <option value="65070234">Student ID: 65070234 (Bob Wilson)</option>
            <option value="66070100">Student ID: 66070100 (Alice Johnson)</option>
          </select>
        </div>

        <!-- Student Lab View -->
        <div class="bg-white border rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">OSPF Routing Configuration Lab</h3>
            <div class="flex space-x-2">
              <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">Student ID: {{ selectedStudentId }}</span>
              <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">IT301</span>
            </div>
          </div>

          <!-- Personalized Network Config -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 class="font-semibold text-blue-900 mb-3">🌐 Your Personalized Network Configuration</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-white p-3 rounded border">
                <div class="text-sm font-medium text-gray-700 mb-1">Your Networks</div>
                <div class="space-y-1 text-sm">
                  <div>IPv4: <code class="bg-gray-100 px-1 rounded">{{ studentNetworks.ipv4_subnet }}</code></div>
                  <div>IPv6: <code class="bg-gray-100 px-1 rounded">{{ studentNetworks.ipv6_subnet }}</code></div>
                </div>
              </div>
              <div class="bg-white p-3 rounded border">
                <div class="text-sm font-medium text-gray-700 mb-1">VLANs</div>
                <div class="space-y-1 text-sm">
                  <div>VLAN 1: <code class="bg-gray-100 px-1 rounded">{{ studentNetworks.vlan1 }}</code></div>
                  <div>VLAN 2: <code class="bg-gray-100 px-1 rounded">{{ studentNetworks.vlan2 }}</code></div>
                </div>
              </div>
              <div class="bg-white p-3 rounded border">
                <div class="text-sm font-medium text-gray-700 mb-1">External Interface</div>
                <div class="space-y-1 text-sm">
                  <div>IPv4: <code class="bg-gray-100 px-1 rounded">{{ studentNetworks.router_external_ip }}</code></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Device Configuration Reference -->
          <div class="bg-gray-50 border rounded-lg p-4">
            <h4 class="font-semibold mb-3">Your Device Configuration Reference</h4>
            <div class="bg-white border rounded-lg p-4">
              <div class="flex items-center mb-3">
                <span class="text-blue-600">🖥️</span>
                <h5 class="font-semibold ml-2">router1</h5>
                <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs ml-2">Router</span>
              </div>
              <div class="space-y-2">
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span class="text-sm font-medium">router1.loopback0</span>
                  <div class="flex items-center space-x-2">
                    <code class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{{ studentIPs.loopback0 }}</code>
                    <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Auto-generated</span>
                  </div>
                </div>
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span class="text-sm font-medium">router1.gig0_0</span>
                  <div class="flex items-center space-x-2">
                    <code class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{{ studentIPs.gig0_0 }}</code>
                    <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Auto-generated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Algorithm Details -->
    <div v-if="currentStep === 'algorithm'" class="demo-step">
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-purple-900 mb-4">🔬 Algorithm Details</h2>
        <p class="text-purple-700 mb-4">
          How the student ID algorithm generates unique IP addresses
        </p>

        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold mb-4">Student ID: {{ selectedStudentId }}</h3>

          <div class="space-y-4">
            <div class="algorithm-step">
              <h4 class="font-medium text-gray-800">Step 1: Parse Student ID</h4>
              <div class="bg-gray-100 p-3 rounded text-sm font-mono">
                <div>Year: {{ algorithmSteps.yearPart }} ({{ algorithmSteps.yearPart + 543 }} Buddhist year)</div>
                <div>Faculty: {{ algorithmSteps.facultyPart }} (IT Faculty)</div>
                <div>Index: {{ algorithmSteps.indexPart }}</div>
              </div>
            </div>

            <div class="algorithm-step">
              <h4 class="font-medium text-gray-800">Step 2: Calculate dec2 and dec3</h4>
              <div class="bg-gray-100 p-3 rounded text-sm font-mono">
                <div>dec2_1 = ({{ selectedStudentId }} / 1000000 - 61) * 10 = {{ algorithmSteps.dec2_1 }}</div>
                <div>dec2_2 = ({{ selectedStudentId }} % 1000) / 250 = {{ algorithmSteps.dec2_2 }}</div>
                <div>dec2 = Math.floor({{ algorithmSteps.dec2_1 }} + {{ algorithmSteps.dec2_2 }}) = {{ algorithmSteps.dec2 }}</div>
                <div>dec3 = Math.floor(({{ selectedStudentId }} % 1000) % 250) = {{ algorithmSteps.dec3 }}</div>
              </div>
            </div>

            <div class="algorithm-step">
              <h4 class="font-medium text-gray-800">Step 3: Generate IP Addresses</h4>
              <div class="bg-gray-100 p-3 rounded text-sm font-mono">
                <div>Router VLAN1 IP: 172.{{ algorithmSteps.dec2 }}.{{ algorithmSteps.dec3 }}.65</div>
                <div>Router VLAN2 IP: 172.{{ algorithmSteps.dec2 }}.{{ algorithmSteps.dec3 }}.97</div>
                <div>Switch Mgmt IP: 172.{{ algorithmSteps.dec2 }}.{{ algorithmSteps.dec3 }}.70</div>
                <div>External IP: 10.30.6.{{ 190 + parseInt(selectedStudentId.slice(-2)) }}</div>
              </div>
            </div>

            <div class="algorithm-step">
              <h4 class="font-medium text-gray-800">Step 4: Calculate VLANs</h4>
              <div class="bg-gray-100 p-3 rounded text-sm font-mono">
                <div>VLAN1 = ({{ algorithmSteps.yearPart }} - 61) * 400 + {{ algorithmSteps.indexPart }} = {{ algorithmSteps.vlan1 }}</div>
                <div>VLAN2 = ({{ algorithmSteps.yearPart }} - 61) * 500 + {{ algorithmSteps.indexPart }} = {{ algorithmSteps.vlan2 }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comparison Table -->
    <div v-if="currentStep === 'comparison'" class="demo-step">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-yellow-900 mb-4">📊 Student Comparison</h2>
        <p class="text-yellow-700 mb-4">
          Compare how different students see different IP configurations
        </p>

        <div class="bg-white border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Student ID</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">router1.loopback0</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">router1.gig0_0</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">VLAN1</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">VLAN2</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">IPv4 Subnet</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="student in comparisonStudents" :key="student.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-mono">{{ student.id }}</td>
                <td class="px-4 py-3 text-sm font-mono">{{ student.networks.router_external_ip }}</td>
                <td class="px-4 py-3 text-sm font-mono">{{ student.networks.router_vlan1_ip }}</td>
                <td class="px-4 py-3 text-sm font-mono">{{ student.networks.vlan1 }}</td>
                <td class="px-4 py-3 text-sm font-mono">{{ student.networks.vlan2 }}</td>
                <td class="px-4 py-3 text-sm font-mono">{{ student.networks.ipv4_subnet }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import StudentIpGenerator from '@/utils/studentIpGenerator'

const currentStep = ref('instructor')
const selectedStudentId = ref('65070232')

const demoSteps = [
  { id: 'instructor', title: 'Instructor Config' },
  { id: 'students', title: 'Student Views' },
  { id: 'algorithm', title: 'Algorithm Details' },
  { id: 'comparison', title: 'Student Comparison' }
]

// Example configuration state
const exampleConfig = ref({
  loopback0: {
    type: 'studentGenerated',
    hostOffset: 1,
    fullIP: '10.0.0.1'
  },
  gig0_0: {
    type: 'studentGenerated',
    hostOffset: 2,
    fullIP: '192.168.1.1'
  }
})

// Generated lab payload
const generatedPayload = computed(() => {
  return {
    courseId: "aLg0B5jPrFW47ICP",
    name: "OSPF Routing Configuration Lab",
    description: "Students will configure OSPF routing protocol",
    network: {
      topology: {
        baseNetwork: "192.168.1.0",
        subnetMask: 24
      },
      devices: [
        {
          deviceId: "router1",
          templateId: "507f1f77bcf86cd799439012",
          deviceType: "router",
          ipVariables: [
            {
              name: "loopback0",
              inputType: exampleConfig.value.loopback0.type,
              isStudentGenerated: exampleConfig.value.loopback0.type === 'studentGenerated',
              readonly: exampleConfig.value.loopback0.type === 'studentGenerated',
              hostOffset: exampleConfig.value.loopback0.type === 'hostOffset' ? exampleConfig.value.loopback0.hostOffset : undefined,
              fullIP: exampleConfig.value.loopback0.type === 'fullIP' ? exampleConfig.value.loopback0.fullIP : undefined
            },
            {
              name: "gig0_0",
              inputType: exampleConfig.value.gig0_0.type,
              isStudentGenerated: exampleConfig.value.gig0_0.type === 'studentGenerated',
              readonly: exampleConfig.value.gig0_0.type === 'studentGenerated',
              hostOffset: exampleConfig.value.gig0_0.type === 'hostOffset' ? exampleConfig.value.gig0_0.hostOffset : undefined,
              fullIP: exampleConfig.value.gig0_0.type === 'fullIP' ? exampleConfig.value.gig0_0.fullIP : undefined
            }
          ]
        }
      ]
    },
    studentGeneration: {
      enabled: exampleConfig.value.loopback0.type === 'studentGenerated' || exampleConfig.value.gig0_0.type === 'studentGenerated',
      algorithm: 'default',
      baseConfiguration: {
        yearOffset: 61,
        facultyCode: '07',
        indexDigits: 4
      }
    }
  }
})

// Student network generator
const studentGenerator = computed(() => {
  return new StudentIpGenerator({
    student_id: selectedStudentId.value,
    baseNetwork: "192.168.1.0",
    subnetMask: 24
  })
})

// Student networks
const studentNetworks = computed(() => {
  const data = studentGenerator.value.generateStudentIpData()
  return {
    ipv4_subnet: data.generatedNetworks.ipv4_subnet,
    ipv6_subnet: data.generatedNetworks.ipv6_subnet,
    vlan1: data.calculatedValues.vlan1,
    vlan2: data.calculatedValues.vlan2,
    router_external_ip: data.commonIpAddresses.router_external_ip
  }
})

// Student IPs
const studentIPs = computed(() => {
  const data = studentGenerator.value.generateStudentIpData()
  return {
    loopback0: data.commonIpAddresses.router_external_ip,
    gig0_0: data.commonIpAddresses.router_vlan1_ip
  }
})

// Algorithm steps
const algorithmSteps = computed(() => {
  const studentId = Number(selectedStudentId.value)
  const yearPart = Math.floor(studentId / 1000000)
  const facultyPart = Math.floor((studentId % 1000000) / 10000)
  const indexPart = studentId % 10000

  const dec2_1 = (studentId / 1000000 - 61) * 10
  const dec2_2 = (studentId % 1000) / 250
  const dec2 = Math.floor(dec2_1 + dec2_2)
  const dec3 = Math.floor((studentId % 1000) % 250)

  const vlan1 = Math.floor((yearPart - 61) * 400 + indexPart)
  const vlan2 = Math.floor((yearPart - 61) * 500 + indexPart)

  return {
    yearPart,
    facultyPart,
    indexPart,
    dec2_1,
    dec2_2,
    dec2,
    dec3,
    vlan1,
    vlan2
  }
})

// Comparison students
const comparisonStudents = computed(() => {
  const studentIds = ['65070232', '65070233', '65070234', '66070100', '66070150']

  return studentIds.map(id => {
    const generator = new StudentIpGenerator({
      student_id: id,
      baseNetwork: "192.168.1.0",
      subnetMask: 24
    })
    const data = generator.generateStudentIpData()

    return {
      id,
      networks: {
        router_external_ip: data.commonIpAddresses.router_external_ip,
        router_vlan1_ip: data.commonIpAddresses.router_vlan1_ip,
        vlan1: data.calculatedValues.vlan1,
        vlan2: data.calculatedValues.vlan2,
        ipv4_subnet: data.generatedNetworks.ipv4_subnet
      }
    }
  })
})
</script>

<style scoped>
.demo-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.demo-header {
  text-align: center;
  margin-bottom: 2rem;
}

.step-selector {
  margin-bottom: 2rem;
}

.demo-step {
  margin-bottom: 2rem;
}

.ip-variable-config {
  margin-bottom: 1rem;
}

.algorithm-step {
  margin-bottom: 1.5rem;
}

.algorithm-step:last-child {
  margin-bottom: 0;
}

table {
  font-size: 0.875rem;
}

code {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}
</style>