<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Network Configuration</h2>
      <p class="text-muted-foreground mt-1">
        Configure the VLAN topology and base networks that will be used for all lab devices.
      </p>
    </div>

    <!-- Network Settings -->
    <div class="space-y-6">
      <!-- Management Network -->
      <div class="space-y-2">
        <Label for="management-network" class="text-sm font-medium">
          Management Network <span class="text-destructive">*</span>
        </Label>
        <div class="flex items-center space-x-2">
          <Input
            id="management-network"
            v-model="localData.managementNetwork"
            placeholder="10.0.0.0"
            :class="{
              'border-destructive': hasError('managementNetwork'),
              'border-green-500': !hasError('managementNetwork') && isValidIP(localData.managementNetwork)
            }"
            @input="validateField('managementNetwork')"
            @blur="validateField('managementNetwork')"
          />
          <div class="text-lg font-mono text-muted-foreground">/</div>
          <Select v-model="localData.managementSubnetMask" @update:modelValue="validateField('managementSubnetMask')">
            <SelectTrigger class="w-20">
              <SelectValue placeholder="24" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="mask in subnetMaskOptions" :key="mask" :value="mask">
                {{ mask }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p v-if="hasError('managementNetwork')" class="text-sm text-destructive">
          {{ getError('managementNetwork') }}
        </p>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground">
          <Info class="w-3 h-3" />
          <span>Network for device management interfaces (e.g., 10.0.0.0/24)</span>
        </div>
      </div>


      <!-- Exempt IP Ranges -->
      <div class="space-y-2">
        <Label for="exempt-ip-ranges" class="text-sm font-medium">
          Exempt IP Ranges <span class="text-muted-foreground">(Optional)</span>
        </Label>
        <div class="space-y-3">
          <!-- Tags Display Area -->
          <div
            class="min-h-[80px] p-3 border-2 rounded-md bg-background"
            :class="{
              'border-destructive': exemptRangesError,
              'border-muted': !exemptRangesError
            }"
          >
            <!-- Existing Tags -->
            <div v-if="localData.exemptIpRanges && localData.exemptIpRanges.length > 0" class="flex flex-wrap gap-2 mb-2">
              <div
                v-for="(range, index) in localData.exemptIpRanges"
                :key="index"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border-2 transition-all"
                :class="{
                  'bg-green-50 border-green-300 text-green-800': !getRangeWarning(range),
                  'bg-yellow-50 border-yellow-300 text-yellow-800': getRangeWarning(range)
                }"
              >
                <span class="font-mono">{{ formatRangeDisplay(range) }}</span>
                <button
                  @click="removeExemptRange(index)"
                  type="button"
                  class="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>

            <!-- Input Field -->
            <div class="relative">
              <Input
                id="exempt-ip-ranges"
                v-model="exemptRangeInput"
                placeholder="Type IP or range (e.g., 10.0.0.1 or 10.0.0.1 - 10.0.0.10) and press Enter..."
                class="text-sm"
                @keydown.enter.prevent="addExemptRange"
                @blur="validateExemptRanges"
              />
            </div>
          </div>

          <!-- Error Message -->
          <p v-if="exemptRangesError" class="text-sm text-destructive flex items-start gap-1">
            <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{{ exemptRangesError }}</span>
          </p>

          <!-- Examples & Help -->
          <div class="flex items-start space-x-2 text-xs text-muted-foreground bg-accent/30 p-3 rounded border">
            <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div class="space-y-1">
              <p class="font-medium">IPs to exclude from Management IP assignment:</p>
              <ul class="list-disc list-inside space-y-0.5 ml-1">
                <li>Single IP: <code class="bg-muted px-1 py-0.5 rounded">10.0.0.1</code></li>
                <li>IP Range: <code class="bg-muted px-1 py-0.5 rounded">10.0.0.1 - 10.0.0.10</code></li>
                <li>Type each IP/range and press <kbd class="px-1.5 py-0.5 bg-muted rounded border">Enter</kbd></li>
                <li>Overlapping ranges will be automatically merged</li>
              </ul>
            </div>
          </div>

          <!-- Summary -->
          <div
            v-if="localData.exemptIpRanges && localData.exemptIpRanges.length > 0"
            class="flex items-center justify-between p-3 bg-primary/5 rounded border border-primary/20"
          >
            <div class="flex items-center gap-2 text-sm">
              <CheckCircle2 class="w-4 h-4 text-primary" />
              <span class="font-medium">
                {{ countTotalIps(localData.exemptIpRanges) }} IP{{ countTotalIps(localData.exemptIpRanges) !== 1 ? 's' : '' }} excluded
              </span>
              <span class="text-muted-foreground">
                ({{ localData.exemptIpRanges.length }} range{{ localData.exemptIpRanges.length !== 1 ? 's' : '' }}, max 20)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              @click="clearAllExemptRanges"
              class="text-xs h-7"
            >
              Clear All
            </Button>
          </div>

          <!-- Warnings -->
          <div v-if="exemptRangesWarnings.length > 0" class="space-y-2">
            <Alert variant="default" class="border-yellow-300 bg-yellow-50">
              <AlertTriangle class="h-4 w-4 text-yellow-600" />
              <AlertTitle class="text-yellow-800">Warnings</AlertTitle>
              <AlertDescription class="text-yellow-700">
                <ul class="list-disc list-inside space-y-1 text-sm">
                  <li v-for="(warning, index) in exemptRangesWarnings" :key="index">{{ warning }}</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      <!-- IPv6 Template Configuration -->
      <div class="space-y-3 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label class="text-sm font-medium flex items-center gap-2">
              <Globe class="w-4 h-4 text-primary" />
              IPv6 Configuration
            </Label>
            <p class="text-xs text-muted-foreground">
              Configure IPv6 address generation using templates or structured prefix
            </p>
          </div>
          <Switch v-model="ipv6Enabled" />
        </div>

        <!-- IPv6 Configuration Fields (when enabled) -->
        <div v-if="localData.ipv6Config?.enabled" class="space-y-4 pt-3 border-t border-primary/20">
          <!-- Prefix Mode Selection -->
          <div class="space-y-2">
            <Label class="text-sm font-medium">Addressing Mode</Label>
            <RadioGroup v-model="prefixMode" class="flex gap-4">
              <div class="flex items-center space-x-2">
                <RadioGroupItem value="template" id="mode-template" />
                <Label for="mode-template" class="font-normal cursor-pointer">Template Mode</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem value="structured" id="mode-structured" />
                <Label for="mode-structured" class="font-normal cursor-pointer">Structured Prefix</Label>
              </div>
            </RadioGroup>
          </div>

          <!-- Global Prefix Input (for structured mode) -->
          <div v-if="localData.ipv6Config?.prefixMode === 'structured'" class="space-y-2">
            <Label class="text-sm font-medium">Global Prefix</Label>
            <Input
              :model-value="localData.ipv6Config?.globalPrefix || ''"
              @update:model-value="updateGlobalPrefix"
              placeholder="2001:3c8:1106:4"
              class="font-mono text-sm"
            />
            <p class="text-xs text-muted-foreground">
              Format: [GlobalPrefix]:[X]:[Y]:[VLAN]::[offset]/64
            </p>
          </div>

          <!-- Template Mode Fields -->
          <template v-if="localData.ipv6Config?.prefixMode !== 'structured'">
            <!-- Preset Selection -->
            <div class="space-y-2">
              <Label class="text-sm font-medium">Template Preset</Label>
              <Select 
                :model-value="localData.ipv6Config?.presetName || 'standard_exam'"
                @update:model-value="(val) => selectIPv6Preset(String(val) as any)"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard_exam">
                    <div class="flex flex-col space-y-1">
                      <div class="font-medium">Standard Exam</div>
                      <div class="text-xs text-muted-foreground">2001:{X}:{Y}:{VLAN}::{offset}/64</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="university_network">
                    <div class="flex flex-col space-y-1">
                      <div class="font-medium">University Network</div>
                      <div class="text-xs text-muted-foreground">Fixed prefix with student variables</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="simple_lab">
                    <div class="flex flex-col space-y-1">
                      <div class="font-medium">Simple Lab</div>
                      <div class="text-xs text-muted-foreground">2001:db8:{X}:{VLAN}::{offset}/64</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div class="flex flex-col space-y-1">
                      <div class="font-medium">Custom Template</div>
                      <div class="text-xs text-muted-foreground">Define your own IPv6 template</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Template Input -->
            <div class="space-y-2">
              <Label class="text-sm font-medium">IPv6 Template</Label>
              <Input
                :model-value="localData.ipv6Config?.template || ''"
                @update:model-value="(val) => updateIPv6Template(String(val))"
                placeholder="2001:{X}:{Y}:{VLAN}::{offset}/64"
                class="font-mono text-sm"
                :class="{ 'border-primary': localData.ipv6Config?.presetName === 'custom' }"
              />
              <div class="flex flex-wrap gap-1 text-xs text-muted-foreground">
                <span>Variables:</span>
                <code class="bg-muted px-1 rounded">{X}</code>
                <code class="bg-muted px-1 rounded">{Y}</code>
                <code class="bg-muted px-1 rounded">{Z}</code>
                <code class="bg-muted px-1 rounded">{VLAN}</code>
                <code class="bg-muted px-1 rounded">{offset}</code>
                <code class="bg-muted px-1 rounded">{last3}</code>
              </div>
            </div>
          </template>

          <!-- Management Network Override Section -->
          <div class="space-y-3 p-3 border rounded-lg bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label class="text-sm font-medium flex items-center gap-2">
                  <Shield class="w-4 h-4 text-amber-600" />
                  Management Network Override
                </Label>
                <p class="text-xs text-muted-foreground">
                  Fixed prefix for firewall traversal (Internet access)
                </p>
              </div>
              <Switch v-model="managementOverrideEnabled" />
            </div>
            
            <div v-if="localData.ipv6Config?.managementOverride?.enabled" class="space-y-3 pt-2">
              <div class="space-y-2">
                <Label class="text-sm">Fixed Prefix</Label>
                <Input
                  :model-value="localData.ipv6Config?.managementOverride?.fixedPrefix || ''"
                  @update:model-value="updateManagementFixedPrefix"
                  placeholder="2001:3c8:1106:4306"
                  class="font-mono text-sm"
                />
              </div>
              <div class="flex items-center justify-between">
                <Label class="text-sm font-normal">Use Student ID (last 3 digits) as suffix</Label>
                <Switch v-model="useStudentIdSuffix" />
              </div>
              <div class="p-2 bg-white dark:bg-background rounded border text-xs font-mono">
                Preview: <span class="text-amber-700 dark:text-amber-400">{{ managementPreview }}</span>
              </div>
            </div>
          </div>

          <!-- Enhanced Live Preview -->
          <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border space-y-4">
            <div class="flex items-center gap-2 text-sm font-medium">
              <Eye class="w-4 h-4" />
              Live Preview (Student {{ previewStudentId }})
            </div>
            
            <!-- Student Variable Breakdown -->
            <div class="grid grid-cols-4 gap-2 text-xs">
              <div class="p-2 bg-white dark:bg-background rounded border text-center">
                <div class="font-semibold text-primary">X</div>
                <div class="font-mono">{{ studentVariables.X }}</div>
              </div>
              <div class="p-2 bg-white dark:bg-background rounded border text-center">
                <div class="font-semibold text-primary">Y</div>
                <div class="font-mono">{{ studentVariables.Y }}</div>
              </div>
              <div class="p-2 bg-white dark:bg-background rounded border text-center">
                <div class="font-semibold text-primary">last3</div>
                <div class="font-mono">{{ studentVariables.last3 }}</div>
              </div>
              <div class="p-2 bg-white dark:bg-background rounded border text-center">
                <div class="font-semibold text-primary">X (hex)</div>
                <div class="font-mono">{{ studentVariables.X_hex }}</div>
              </div>
            </div>
            
            <!-- VLAN Previews -->
            <div class="space-y-2">
              <div v-for="(vlan, index) in enabledIPv6Vlans.slice(0, 3)" :key="vlan.id || index" 
                   class="flex items-center gap-3 text-sm">
                <Badge variant="secondary" class="text-xs">VLAN {{ vlan.ipv6VlanAlphabet || getVlanAlphabet(index) }}</Badge>
                <code class="flex-1 text-xs font-mono text-primary break-all">{{ generateIPv6Preview(vlan, index) }}</code>
              </div>
              <div v-if="enabledIPv6Vlans.length === 0" class="text-xs text-muted-foreground">
                Enable IPv6 on at least one VLAN to see preview
              </div>
            </div>
            
            <!-- Management Network Preview -->
            <div v-if="localData.ipv6Config?.managementOverride?.enabled" 
                 class="pt-3 border-t">
              <div class="flex items-center gap-3 text-sm">
                <Badge variant="secondary" class="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">Management</Badge>
                <code class="flex-1 text-xs font-mono text-amber-700 dark:text-amber-400 break-all">{{ managementPreview }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VLAN Mode Selection -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">
          VLAN Configuration Mode <span class="text-destructive">*</span>
        </Label>
        <Select v-model="localData.mode" @update:modelValue="handleModeChange">
          <SelectTrigger
            :class="{
              'border-green-500': localData.mode,
              'border-muted': !localData.mode
            }"
          >
            <SelectValue placeholder="Select mode...">
              {{ getModeDisplayName(localData.mode) }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calculated_vlan">
              <div class="flex flex-col space-y-1">
                <div class="font-medium">Calculated VLAN (Examination)</div>
                <div class="text-xs text-muted-foreground">Algorithm-generated VLAN numbers based on student ID</div>
              </div>
            </SelectItem>
            <SelectItem value="large_subnet">
              <div class="flex flex-col space-y-1">
                <div class="font-medium">Large Subnet (Subnet Calculation)</div>
                <div class="text-xs text-muted-foreground">Students receive a large subnet to divide into smaller subnets</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground">
          <Info class="w-3 h-3" />
          <span v-if="localData.mode === 'calculated_vlan'">VLANs and IPs calculated from student ID automatically.</span>
          <span v-else-if="localData.mode === 'large_subnet'">Students must calculate sub-subnets from their assigned large network.</span>
          <span v-else>Select a mode to configure VLAN settings.</span>
        </div>
      </div>

      <!-- IP Allocation Strategy (Disabled - Forced to Student ID Based) -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">
          IP Allocation Strategy <span class="text-destructive">*</span>
        </Label>
        <Select v-model="localData.allocationStrategy" disabled>
          <SelectTrigger
            class="border-green-500 bg-muted/50"
          >
            <SelectValue>
              Student ID Based
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student_id_based">Student ID Based</SelectItem>
          </SelectContent>
        </Select>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground">
          <Info class="w-3 h-3" />
          <span>This strategy is currently locked to Student ID Based allocation.</span>
        </div>
      </div>

      <!-- Large Subnet Mode Configuration -->
      <div v-if="localData.mode === 'large_subnet'" class="space-y-4 p-4 border-2 border-purple-200 bg-purple-50/30 rounded-lg">
        <div class="flex items-center gap-2 mb-4">
          <Network class="w-5 h-5 text-purple-600" />
          <h3 class="font-semibold text-purple-800">Large Subnet Configuration</h3>
        </div>

        <!-- Private Network Pool Selection -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            Private Network Pool <span class="text-destructive">*</span>
          </Label>
          <Select v-model="localData.largeSubnetConfig!.privateNetworkPool">
            <SelectTrigger>
              <SelectValue placeholder="Select pool..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10.0.0.0/8">10.0.0.0/8 (Class A - 16M addresses)</SelectItem>
              <SelectItem value="172.16.0.0/12">172.16.0.0/12 (Class B - 1M addresses)</SelectItem>
              <SelectItem value="192.168.0.0/16">192.168.0.0/16 (Class C - 65K addresses)</SelectItem>
            </SelectContent>
          </Select>
          <div class="text-xs text-muted-foreground">
            Students will be assigned unique subnets from this pool
          </div>
        </div>

        <!-- Student Subnet Size -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            Student Subnet Size <span class="text-destructive">*</span>
          </Label>
          <Select v-model="localData.largeSubnetConfig!.studentSubnetSize">
            <SelectTrigger class="w-48">
              <SelectValue placeholder="Select size..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="size in availableStudentSubnetSizes" :key="size" :value="size">
                /{{ size }} ({{ getHostCount(size) }} hosts)
              </SelectItem>
            </SelectContent>
          </Select>
          <div class="text-xs text-muted-foreground">
            Each student receives a unique /{{ localData.largeSubnetConfig?.studentSubnetSize || 23 }} subnet from the pool
          </div>
        </div>

        <!-- Sub-VLANs Configuration -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">Sub-VLANs (within student subnet)</Label>
            <Button
              variant="outline"
              size="sm"
              @click="addSubVlan"
              v-if="localData.largeSubnetConfig && localData.largeSubnetConfig.subVlans.length < 10"
            >
              <Plus class="w-4 h-4 mr-2" />
              Add Sub-VLAN
            </Button>
          </div>

          <div class="grid gap-3">
            <Card
              v-for="(subVlan, index) in localData.largeSubnetConfig?.subVlans"
              :key="subVlan.id"
              class="border-2 border-purple-100 bg-purple-25/30"
            >
              <CardContent class="pt-4">
                <div class="flex items-center justify-between mb-3">
                  <span class="font-medium text-sm">Sub-VLAN {{ index + 1 }}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="removeSubVlan(index)"
                    v-if="localData.largeSubnetConfig && localData.largeSubnetConfig.subVlans.length > 1"
                  >
                    <Trash2 class="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <!-- Name -->
                  <div class="space-y-1">
                    <Label class="text-xs">Name</Label>
                    <Input v-model="subVlan.name" placeholder="e.g., Sales VLAN" />
                  </div>

                  <!-- Subnet Size -->
                  <div class="space-y-1">
                    <Label class="text-xs">Subnet Size</Label>
                    <Select v-model="subVlan.subnetSize">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="size in availableSubVlanSizes" :key="size" :value="size">
                          /{{ size }} ({{ getHostCount(size) }} hosts)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Subnet Index -->
                  <div class="space-y-1">
                    <Label class="text-xs">Subnet Index (1-based)</Label>
                    <Input v-model.number="subVlan.subnetIndex" type="number" :min="1" :max="255" />
                  </div>

                  <!-- VLAN ID Randomized -->
                  <div class="space-y-1">
                    <Label class="text-xs">VLAN ID</Label>
                    <div class="flex items-center gap-2">
                      <Switch v-model="subVlan.vlanIdRandomized" />
                      <span class="text-xs text-muted-foreground">
                        {{ subVlan.vlanIdRandomized ? 'Randomized (2-4094)' : 'Fixed' }}
                      </span>
                    </div>
                  </div>

                  <!-- Fixed VLAN ID (if not randomized) -->
                  <div v-if="!subVlan.vlanIdRandomized" class="space-y-1">
                    <Label class="text-xs">Fixed VLAN ID</Label>
                    <Input v-model.number="subVlan.fixedVlanId" type="number" :min="2" :max="4094" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert class="bg-amber-50 border-amber-200">
            <AlertTriangle class="w-4 h-4 text-amber-600" />
            <AlertDescription class="text-amber-800 text-sm">
              Students will see their allocated large subnet and VLAN IDs but NOT the calculated sub-subnets. They must perform the subnet calculations themselves.
            </AlertDescription>
          </Alert>

          <!-- Subnet Address Preview -->
          <div class="mt-4 space-y-3 p-4 border-2 border-blue-200 bg-blue-50/30 rounded-lg">
            <div class="flex items-center gap-2">
              <Calculator class="w-4 h-4 text-blue-600" />
              <h4 class="font-medium text-blue-800">Address Range Preview</h4>
            </div>

            <div class="flex items-center gap-3">
              <Label class="text-xs whitespace-nowrap">Preview Subnet Index:</Label>
              <Input
                v-model.number="previewSubnetIndex"
                type="number"
                :min="0"
                :max="getMaxSubnetIndex()"
                class="w-24 h-8 text-sm"
                placeholder="0"
              />
              <span class="text-xs text-muted-foreground">
                (0 - {{ getMaxSubnetIndex() }})
              </span>
            </div>

            <!-- Preview Result -->
            <div class="space-y-2">
              <!-- Large Subnet Preview -->
              <div class="p-3 bg-blue-100 rounded border border-blue-200">
                <div class="text-xs font-medium text-blue-700 mb-1">Student's Large Subnet:</div>
                <div class="font-mono text-sm text-blue-900">
                  {{ getPreviewLargeSubnetNetwork() }}/{{ localData.largeSubnetConfig?.studentSubnetSize }}
                </div>
              </div>

              <!-- Sub-VLAN Previews -->
              <div v-for="(subVlan, index) in localData.largeSubnetConfig?.subVlans" :key="subVlan.id" 
                class="p-3 bg-purple-50 rounded border border-purple-200">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-medium text-purple-700">{{ subVlan.name || `Sub-VLAN ${index + 1}` }}:</div>
                    <div class="font-mono text-sm text-purple-900">
                      {{ getPreviewSubVlanNetwork(subVlan.subnetIndex, subVlan.subnetSize) }}/{{ subVlan.subnetSize }}
                    </div>
                  </div>
                  <Badge variant="outline" class="text-xs bg-purple-100 border-purple-300 text-purple-700">
                    Block #{{ subVlan.subnetIndex }}
                  </Badge>
                </div>
              </div>
            </div>

            <p class="text-xs text-blue-600">
              💡 Try different subnet indices to see how addresses are calculated for students.
            </p>
          </div>
        </div>
      </div>

      <!-- VLAN Count Selection (only for non-large_subnet modes) -->
      <div v-if="localData.mode && localData.mode !== 'large_subnet'" class="space-y-2">
        <Label class="text-sm font-medium">
          Number of VLANs <span class="text-destructive">*</span>
        </Label>
        <Select v-model="localData.vlanCount" @update:modelValue="onVlanCountChange">
          <SelectTrigger class="w-32">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="count in vlanCountOptions" :key="count" :value="count">
              {{ count }} VLAN{{ count > 1 ? 's' : '' }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- VLAN Configuration Cards (only for non-large_subnet modes) -->
      <div v-if="localData.mode && localData.mode !== 'large_subnet' && localData.vlanCount" class="space-y-4">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium">VLAN Configuration</Label>
          <Button
            variant="outline"
            size="sm"
            @click="addVlan"
            v-if="localData.vlans.length < 10"
          >
            <Plus class="w-4 h-4 mr-2" />
            Add VLAN
          </Button>
        </div>

        <div class="grid gap-4">
          <Card
            v-for="(vlan, index) in localData.vlans"
            :key="vlan.id || index"
            class="border-2"
            :class="{
              'border-blue-200 bg-blue-50/30': localData.mode === 'fixed_vlan',
              'border-green-200 bg-green-50/30': localData.mode === 'lecturer_group',
              'border-purple-200 bg-purple-50/30': localData.mode === 'calculated_vlan'
            }"
          >
            <CardHeader class="pb-3">
              <div class="flex items-center justify-between">
                <CardTitle class="text-base flex items-center">
                  <component
                    :is="getModeIcon(localData.mode)"
                    class="w-4 h-4 mr-2"
                  />
                  VLAN {{ index + 1 }}
                  <span
                    v-if="localData.mode === 'fixed_vlan' && vlan.vlanId === 1"
                    class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                  >
                    Student Base Network
                  </span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="removeVlan(index)"
                  v-if="localData.vlans.length > 1"
                  class="text-destructive hover:text-destructive"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- VLAN ID (for fixed and lecturer modes) -->
              <div
                v-if="localData.mode === 'fixed_vlan' || localData.mode === 'lecturer_group'"
                class="space-y-2"
              >
                <Label class="text-sm font-medium">VLAN ID</Label>
                <Input
                  v-model.number="vlan.vlanId"
                  type="number"
                  min="1"
                  max="4094"
                  placeholder="1"
                  @input="validateVlan(index)"
                />
                <p
                  v-if="vlan.vlanId === 1"
                  class="text-xs text-blue-600 flex items-center"
                >
                  <Info class="w-3 h-3 mr-1" />
                  VLAN 1 will be used as student base network
                </p>
              </div>

              <!-- Calculation Multiplier (for calculated mode) -->
              <div v-if="localData.mode === 'calculated_vlan'" class="space-y-2">
                <Label class="text-sm font-medium">Calculation Multiplier</Label>
                <Input
                  v-model.number="vlan.calculationMultiplier"
                  type="number"
                  min="1"
                  placeholder="400"
                  @input="validateVlan(index)"
                />
                <p class="text-xs text-muted-foreground">
                  Used in formula: (student_id / 1000000 - 61) * multiplier + (student_id % 1000). Multiplier creates VLAN spacing and ensures different batches get non-overlapping VLAN ranges.
                </p>
              </div>

              <!-- Base Network -->
              <div class="space-y-2">
                <Label class="text-sm font-medium">Base Network</Label>
                <Input
                  v-model="vlan.baseNetwork"
                  placeholder="172.16.0.0"
                  @input="validateVlan(index)"
                />
                <p class="text-xs text-muted-foreground">
                  Algorithm will replace 2nd and 3rd octets based on student ID
                </p>
              </div>

              <!-- Subnet Mask -->
              <div class="space-y-2">
                <Label class="text-sm font-medium">Subnet Mask</Label>
                <Select v-model="vlan.subnetMask" @update:modelValue="validateVlan(index)">
                  <SelectTrigger>
                    <SelectValue placeholder="Select mask..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="mask in subnetMaskOptions" :key="mask" :value="mask">
                      /{{ mask }} ({{ getHostCount(mask) }} hosts)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <!-- Subnet Block Index (NEW) -->
              <div class="space-y-2">
                <Label class="text-sm font-medium">
                  Subnet Block <span class="text-destructive">*</span>
                </Label>
                <Input
                  v-model.number="vlan.subnetIndex"
                  type="number"
                  min="1"
                  placeholder="1"
                  @input="validateVlan(index)"
                  @blur="validateVlan(index)"
                  :class="{
                    'border-destructive': hasError(`vlan_${index}_subnetIndex`),
                    'border-green-500': !hasError(`vlan_${index}_subnetIndex`) && vlan.subnetIndex !== undefined
                  }"
                />
                <p class="text-xs text-muted-foreground flex items-start gap-1">
                  <Info class="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Subnet block to use (1 = first, 2 = second, etc.).
                    For /26: block 1 = .0-.63, block 2 = .64-.127, block 3 = .128-.191
                  </span>
                </p>
                <p v-if="hasError(`vlan_${index}_subnetIndex`)" class="text-sm text-destructive">
                  {{ getError(`vlan_${index}_subnetIndex`) }}
                </p>
              </div>

              <!-- Group Modifier (for lecturer_group mode) -->
              <div v-if="localData.mode === 'lecturer_group'" class="space-y-2">
                <Label class="text-sm font-medium">Group Modifier</Label>
                <Input
                  v-model.number="vlan.groupModifier"
                  type="number"
                  min="0"
                  placeholder="0"
                  @input="validateVlan(index)"
                />
                <p class="text-xs text-muted-foreground">
                  Added to VLAN ID based on student group (e.g., Group A = +0, Group B = +10)
                </p>
              </div>

              <!-- IPv6 Configuration -->
              <div class="space-y-3 pt-4 border-t border-slate-200">
                <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-200">
                  <div class="space-y-0.5">
                    <Label class="text-sm font-medium flex items-center gap-2">
                      <Globe class="w-4 h-4 text-blue-600" />
                      Enable IPv6
                    </Label>
                    <p class="text-xs text-slate-500">
                      Generate IPv6 addresses for this VLAN using algorithm
                    </p>
                  </div>
                  <Switch
                    v-model="vlan.ipv6Enabled"
                    @update:model-value="() => vlan.ipv6VlanAlphabet = getVlanAlphabet(index)"
                  />
                </div>

                <!-- IPv6 Preview (when enabled) -->
                <div v-if="vlan.ipv6Enabled" class="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3 transition-all duration-200">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Globe class="w-4 h-4 text-blue-600" />
                      <span class="text-sm font-medium text-blue-900">IPv6 VLAN Identifier</span>
                    </div>
                    <Badge variant="secondary" class="bg-blue-100 text-blue-800 font-mono text-sm px-3">
                      {{ vlan.ipv6VlanAlphabet || getVlanAlphabet(index) }}
                    </Badge>
                  </div>
                  <div class="p-3 bg-white/80 rounded border border-blue-100">
                    <p class="text-xs text-slate-600 mb-1">IPv6 Prefix Format:</p>
                    <code class="text-sm font-mono text-blue-700 break-all">{{ localData.ipv6Config?.template || '2001:{X}:{Y}:{VLAN}::{offset}/64' }}</code>
                    <p class="text-xs text-slate-500 mt-1">Example: {{ generateIPv6Preview(vlan, index) }}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Preview Section -->
      <div v-if="localData.vlans.length > 0 || (localData.mode === 'large_subnet' && localData.largeSubnetConfig?.subVlans?.length)" class="space-y-4">
        <Label class="text-sm font-medium">Student IP Preview</Label>
        <Card class="bg-accent/30">
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <CardTitle class="text-base flex items-center">
                <Eye class="w-4 h-4 mr-2" />
                Preview Student IP
              </CardTitle>
              <Badge v-if="localData.mode === 'large_subnet'" variant="outline" class="text-xs">Large Subnet Mode</Badge>
            </div>
            <div class="flex items-center gap-2 mt-3">
              <Label class="text-sm text-muted-foreground whitespace-nowrap">Student ID:</Label>
              <Input
                v-model.number="previewStudentId"
                type="number"
                class="w-32"
                placeholder="65070232"
                min="60000000"
                max="99999999"
              />
              <span class="text-xs text-muted-foreground">
                (Enter any 8-digit student ID)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <!-- Regular VLANs Preview -->
              <template v-if="localData.mode !== 'large_subnet'">
                <div
                  v-for="(vlan, index) in localData.vlans"
                  :key="index"
                  class="p-3 bg-background rounded border"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-sm">
                      VLAN {{ index + 1 }}
                    </span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-muted-foreground">
                        {{ getVlanDisplay(vlan, index) }}
                      </span>
                      <Badge v-if="vlan.subnetIndex !== undefined" variant="secondary" class="text-xs">
                        Block {{ vlan.subnetIndex }}
                      </Badge>
                    </div>
                  </div>
                  <code class="text-sm text-primary">
                    {{ generatePreviewIP(vlan) }}
                  </code>
                </div>
              </template>
              <!-- Large Subnet Mode Sub-VLANs Preview -->
              <template v-else-if="localData.largeSubnetConfig?.subVlans">
                <div class="p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800 mb-3">
                  <div class="flex items-center gap-2 mb-2">
                    <Info class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span class="text-sm font-medium text-blue-700 dark:text-blue-300">Large Subnet Assignment</span>
                  </div>
                  <div class="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <div>Private Network Pool: {{ localData.largeSubnetConfig.privateNetworkPool }}</div>
                    <div>Student Subnet Size: /{{ localData.largeSubnetConfig.studentSubnetSize }}</div>
                    <div>Student receives a unique large subnet based on their ID</div>
                  </div>
                </div>
                <div
                  v-for="(subVlan, index) in localData.largeSubnetConfig.subVlans"
                  :key="subVlan.id"
                  class="p-3 bg-background rounded border"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-sm">
                      {{ subVlan.name }}
                    </span>
                    <div class="flex items-center gap-2">
                      <Badge variant="secondary" class="text-xs">
                        /{{ subVlan.subnetSize }}
                      </Badge>
                      <Badge variant="outline" class="text-xs">
                        Block {{ subVlan.subnetIndex }}
                      </Badge>
                    </div>
                  </div>
                  <div class="text-xs text-muted-foreground">
                    Students must calculate this sub-subnet from their assigned large network
                  </div>
                </div>
              </template>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Validation Summary -->
    <div v-if="validation && validation.errors.length > 0" class="mt-6">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Please fix the following issues:</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="error in validation.errors" :key="error">{{ error }}</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick } from 'vue'
import {
  Network,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Eye,
  Router,
  Users,
  Calculator,
  X,
  Globe,
  Shield
} from 'lucide-vue-next'

// Import IP range utilities
import {
  parseIpInput,
  validateRangeInNetwork,
  autoMergeRanges,
  countTotalIps,
  countIpsInRange,
  formatRangeDisplay as formatRangeDisplayUtil,
  validateExemptRanges as validateExemptRangesUtil
} from '@/utils/ipRangeUtils'

// UI Components
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// Types
import type { ValidationResult, IpRange } from '@/types/wizard'

// VLAN Configuration Types
interface VlanConfig {
  id?: string
  vlanId?: number
  calculationMultiplier?: number
  baseNetwork: string
  subnetMask: number
  subnetIndex: number        // Which subnet block (0 = first, 1 = second, etc.)
  groupModifier?: number
  isStudentGenerated: boolean
  // IPv6 Configuration per VLAN
  ipv6Enabled?: boolean       // Whether IPv6 is enabled for this VLAN
  ipv6VlanAlphabet?: string   // A, B, C, etc. (auto-assigned based on VLAN index)
  ipv6SubnetId?: string       // Custom subnet ID for template (e.g., "141")
}

// Sub-VLAN Configuration for Large Subnet Mode
interface SubVlanConfig {
  id: string
  name: string
  subnetSize: number          // e.g., 26 for /26
  subnetIndex: number         // Which subnet block within the large subnet (1-based)
  vlanIdRandomized: boolean   // true = random 2-4096, false = fixed
  fixedVlanId?: number        // Only if vlanIdRandomized = false
}

// Large Subnet Configuration
interface LargeSubnetConfig {
  privateNetworkPool: '10.0.0.0/8' | '172.16.0.0/12' | '192.168.0.0/16'
  studentSubnetSize: number   // e.g., 23 for /23
  subVlans: SubVlanConfig[]
}

interface NetworkConfig {
  managementNetwork: string
  managementSubnetMask: number
  mode: 'fixed_vlan' | 'lecturer_group' | 'calculated_vlan' | 'large_subnet' | ''
  allocationStrategy: 'student_id_based' | 'group_based'
  vlanCount: number
  vlans: VlanConfig[]
  exemptIpRanges: IpRange[]
  // Large Subnet Mode Configuration
  largeSubnetConfig?: LargeSubnetConfig
  // IPv6 Template Configuration
  ipv6Config?: {
    enabled: boolean
    template: string
    managementTemplate?: string
    presetName?: 'standard_exam' | 'university_network' | 'simple_lab' | 'custom'
    // Enhanced configurable prefix support
    globalPrefix?: string
    prefixMode?: 'template' | 'structured'
    // Management Network Override
    managementOverride?: {
      enabled: boolean
      fixedPrefix: string
      useStudentIdSuffix: boolean
    }
  }
}

// Props
interface Props {
  modelValue: NetworkConfig
  validation?: ValidationResult
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: NetworkConfig): void
  (e: 'validate', result: ValidationResult): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state - default mode=calculated_vlan if not set, allocationStrategy=student_id_based
const localData = ref<NetworkConfig>({
  ...props.modelValue,
  managementNetwork: props.modelValue.managementNetwork || '10.0.0.0',
  managementSubnetMask: props.modelValue.managementSubnetMask || 24,
  mode: props.modelValue.mode || 'calculated_vlan', // Default to calculated_vlan if not specified
  allocationStrategy: 'student_id_based', // FORCED: Only Student ID Based allocation is currently supported
  vlanCount: props.modelValue.vlanCount || 1,
  vlans: props.modelValue.vlans || [],
  exemptIpRanges: props.modelValue.exemptIpRanges || [],
  ipv6Config: props.modelValue.ipv6Config || {
    enabled: false,
    template: '2001:{X}:{Y}:{VLAN}::{offset}/64',
    managementTemplate: '2001:{X}:{Y}:306::{offset}/64',
    presetName: 'standard_exam'
  }
})
const fieldErrors = ref<Record<string, string>>({})
const isUpdatingFromProps = ref(false)

// Preview student ID state
const previewStudentId = ref(65070232)

// Preview subnet index for Large Subnet Mode
const previewSubnetIndex = ref(0)

/**
 * Normalize largeSubnetConfig to handle both old and new field names
 * Old format: { baseNetwork, cidr, studentSubnetCidr, subVlans: [{ name, cidr }] }
 * New format: { privateNetworkPool, studentSubnetSize, subVlans: [{ id, name, subnetSize }] }
 */
const normalizeLargeSubnetConfig = (config: any): LargeSubnetConfig | undefined => {
  if (!config) return undefined

  // Check if already normalized (has new fields)
  if (config.privateNetworkPool && config.studentSubnetSize) {
    // Normalize subVlans
    const subVlans = (config.subVlans || []).map((sv: any, idx: number) => ({
      id: sv.id || `subvlan-${idx}`,
      name: sv.name || `Sub-VLAN ${idx + 1}`,
      subnetSize: sv.subnetSize ?? sv.cidr ?? 26,
      subnetIndex: sv.subnetIndex ?? (idx + 1),
      vlanIdRandomized: sv.vlanIdRandomized ?? true,
      fixedVlanId: sv.fixedVlanId
    }))
    return { ...config, subVlans }
  }

  // Infer privateNetworkPool from baseNetwork
  let privateNetworkPool: '10.0.0.0/8' | '172.16.0.0/12' | '192.168.0.0/16' | undefined
  if (config.baseNetwork) {
    const baseNetwork = String(config.baseNetwork).toLowerCase()
    if (baseNetwork.startsWith('10.')) {
      privateNetworkPool = '10.0.0.0/8'
    } else if (baseNetwork.startsWith('172.')) {
      privateNetworkPool = '172.16.0.0/12'
    } else if (baseNetwork.startsWith('192.168.')) {
      privateNetworkPool = '192.168.0.0/16'
    }
  }

  if (!privateNetworkPool) {
    // Default to 172.16.0.0/12 if cannot determine
    privateNetworkPool = '172.16.0.0/12'
  }

  const studentSubnetSize = config.studentSubnetSize ?? config.studentSubnetCidr ?? config.cidr ?? 22

  const subVlans = (config.subVlans || []).map((sv: any, idx: number) => ({
    id: sv.id || `subvlan-${idx}`,
    name: sv.name || `Sub-VLAN ${idx + 1}`,
    subnetSize: sv.subnetSize ?? sv.cidr ?? 26,
    subnetIndex: sv.subnetIndex ?? (idx + 1),
    vlanIdRandomized: sv.vlanIdRandomized ?? true,
    fixedVlanId: sv.fixedVlanId
  }))

  return {
    privateNetworkPool,
    studentSubnetSize,
    subVlans
  }
}

// On mounted, normalize largeSubnetConfig if present with old field names
onMounted(() => {
  if (localData.value.mode === 'large_subnet' && localData.value.largeSubnetConfig) {
    const normalized = normalizeLargeSubnetConfig(localData.value.largeSubnetConfig)
    if (normalized) {
      localData.value.largeSubnetConfig = normalized
      console.log('[LabWizardStep2] Normalized largeSubnetConfig:', normalized)
    }
  }
})

// Get max subnet index based on pool and student subnet size
const getMaxSubnetIndex = (): number => {
  const config = localData.value.largeSubnetConfig
  if (!config) return 0
  
  const poolPrefixes: Record<string, number> = {
    '10.0.0.0/8': 8,
    '172.16.0.0/12': 12,
    '192.168.0.0/16': 16
  }
  
  const poolPrefix = poolPrefixes[config.privateNetworkPool] || 8
  const studentSubnetSize = config.studentSubnetSize || 23
  
  // Number of possible student subnets = 2^(studentSubnetSize - poolPrefix)
  const totalSubnets = Math.pow(2, studentSubnetSize - poolPrefix)
  return totalSubnets - 1
}

// Get pool base address as number
const getPoolBaseAddress = (pool: string): number => {
  const bases: Record<string, number> = {
    '10.0.0.0/8': 0x0A000000,      // 10.0.0.0
    '172.16.0.0/12': 0xAC100000,   // 172.16.0.0
    '192.168.0.0/16': 0xC0A80000   // 192.168.0.0
  }
  return bases[pool] || 0x0A000000
}

// Convert number to IP string
const numberToIp = (num: number): string => {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ].join('.')
}

// Calculate network address for the student's large subnet
const getPreviewLargeSubnetNetwork = (): string => {
  const config = localData.value.largeSubnetConfig
  if (!config) return '0.0.0.0'
  
  const baseAddress = getPoolBaseAddress(config.privateNetworkPool)
  const studentSubnetSize = config.studentSubnetSize || 23
  const subnetSize = Math.pow(2, 32 - studentSubnetSize)
  
  const index = previewSubnetIndex.value || 0
  const networkNum = baseAddress + (index * subnetSize)
  
  return numberToIp(networkNum)
}

// Calculate network address for a sub-VLAN within the student's large subnet
const getPreviewSubVlanNetwork = (subVlanIndex: number, subVlanSize: number): string => {
  const config = localData.value.largeSubnetConfig
  if (!config) return '0.0.0.0'
  
  // First get the student's large subnet network address
  const baseAddress = getPoolBaseAddress(config.privateNetworkPool)
  const studentSubnetSize = config.studentSubnetSize || 23
  const studentSubnetBlockSize = Math.pow(2, 32 - studentSubnetSize)
  
  const index = previewSubnetIndex.value || 0
  const studentNetworkNum = baseAddress + (index * studentSubnetBlockSize)
  
  // Calculate sub-VLAN block size and offset
  const subVlanBlockSize = Math.pow(2, 32 - subVlanSize)
  const subVlanOffset = (subVlanIndex - 1) * subVlanBlockSize
  
  const subVlanNetworkNum = studentNetworkNum + subVlanOffset
  
  return numberToIp(subVlanNetworkNum)
}

// Handle mode change side effects (called after v-model updates)
const handleModeChange = () => {
  const newMode = localData.value.mode
  console.log('[LabWizardStep2] Mode changed to', newMode)
  
  if (newMode === 'large_subnet') {
    // Initialize Large Subnet Mode configuration
    if (!localData.value.largeSubnetConfig) {
      localData.value.largeSubnetConfig = {
        privateNetworkPool: '10.0.0.0/8',
        studentSubnetSize: 23,
        subVlans: [{
          id: generateSubVlanId(),
          name: 'VLAN 1',
          subnetSize: 26,
          subnetIndex: 1,
          vlanIdRandomized: true
        }]
      }
    }
    // Clear regular VLANs when switching to large_subnet mode
    localData.value.vlans = []
    localData.value.vlanCount = 0
  } else {
    // Clear Large Subnet config when switching to other modes
    localData.value.largeSubnetConfig = undefined
    // Only initialize VLANs if empty
    if (localData.value.vlans.length === 0) {
      localData.value.vlanCount = 1
      localData.value.vlans = [createDefaultVlan(newMode, 0)]
    }
  }
  validateAllFields()
}

// IPv6 enabled computed property for v-model binding (Switch component)
const ipv6Enabled = computed({
  get: () => localData.value.ipv6Config?.enabled ?? false,
  set: (val: boolean) => {
    console.log('ipv6Enabled setter called with:', val)
    if (val) {
      localData.value.ipv6Config = {
        enabled: true,
        template: '2001:{X}:{Y}:{VLAN}::{offset}/64',
        managementTemplate: '2001:{X}:{Y}:306::{offset}/64',
        presetName: 'standard_exam',
        prefixMode: 'template',
        globalPrefix: '',
        managementOverride: {
          enabled: false,
          fixedPrefix: '2001:3c8:1106:4306',
          useStudentIdSuffix: true
        }
      }
    } else {
      localData.value.ipv6Config = {
        enabled: false,
        template: '',
        managementTemplate: '',
        presetName: undefined,
        prefixMode: undefined,
        globalPrefix: undefined,
        managementOverride: undefined
      }
    }
    console.log('ipv6Config after toggle:', localData.value.ipv6Config)
  }
})

// Management Override enabled - for v-model binding
const managementOverrideEnabled = computed({
  get: () => localData.value.ipv6Config?.managementOverride?.enabled ?? false,
  set: (val: boolean) => {
    if (!localData.value.ipv6Config) return
    localData.value.ipv6Config.managementOverride = {
      enabled: val,
      fixedPrefix: val ? '2001:3c8:1106:4306' : '',
      useStudentIdSuffix: true
    }
  }
})

// Use Student ID Suffix - for v-model binding
const useStudentIdSuffix = computed({
  get: () => localData.value.ipv6Config?.managementOverride?.useStudentIdSuffix ?? true,
  set: (val: boolean) => {
    if (localData.value.ipv6Config?.managementOverride) {
      localData.value.ipv6Config.managementOverride.useStudentIdSuffix = val
    }
  }
})

// Current prefix mode - for RadioGroup v-model binding
const prefixMode = computed({
  get: () => localData.value.ipv6Config?.prefixMode || 'template',
  set: (val: 'template' | 'structured') => {
    if (localData.value.ipv6Config) {
      localData.value.ipv6Config.prefixMode = val
    }
  }
})

// Management Preview computed
const managementPreview = computed(() => {
  const config = localData.value.ipv6Config?.managementOverride
  if (!config?.enabled) return ''
  const prefix = config.fixedPrefix || '2001:3c8:1106:4306'
  const suffix = config.useStudentIdSuffix 
    ? String(previewStudentId.value).slice(-3) 
    : '1'
  return `${prefix}::${parseInt(suffix, 10)}/64`
})

// Student variables computed for preview
const studentVariables = computed(() => {
  const studentId = String(previewStudentId.value)
  const year = parseInt(studentId.substring(0, 2), 10)
  const faculty = parseInt(studentId.substring(2, 4), 10)
  const sequence = parseInt(studentId.substring(4), 10)
  const X = year * 100 + faculty
  const Y = sequence
  const last3 = studentId.slice(-3)
  return {
    X,
    Y,
    last3,
    X_hex: X.toString(16).toUpperCase()
  }
})

// Enabled IPv6 VLANs for preview
const enabledIPv6Vlans = computed(() => 
  localData.value.vlans.filter(v => v.ipv6Enabled)
)

// Methods to update config
function updateGlobalPrefix(prefix: string | number) {
  if (localData.value.ipv6Config) {
    localData.value.ipv6Config.globalPrefix = String(prefix)
  }
}

function updateManagementFixedPrefix(prefix: string | number) {
  if (localData.value.ipv6Config?.managementOverride) {
    localData.value.ipv6Config.managementOverride.fixedPrefix = String(prefix)
  }
}

// Exempt IP Ranges state
const exemptRangeInput = ref('')
const exemptRangesError = ref('')
const exemptRangesWarnings = ref<string[]>([])

// Constants
const subnetMaskOptions = Array.from({ length: 23 }, (_, i) => 8 + i) // 8-30
const vlanCountOptions = Array.from({ length: 10 }, (_, i) => i + 1) // 1-10

// Methods
const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

const hasError = (field: string): boolean => {
  return !!fieldErrors.value[field]
}

const getError = (field: string): string => {
  return fieldErrors.value[field] || ''
}

const getHostCount = (mask: number): number => {
  return Math.pow(2, 32 - mask) - 2
}

const getModeIcon = (mode: string) => {
  switch (mode) {
    case 'fixed_vlan': return Router
    case 'lecturer_group': return Users
    case 'calculated_vlan': return Calculator
    default: return Network
  }
}

const getModeDisplayText = (mode: string) => {
  switch (mode) {
    case 'fixed_vlan': return 'Fixed VLAN (Beginning Course)'
    case 'lecturer_group': return 'Lecturer VLAN + Group (Advanced Course)'
    case 'calculated_vlan': return 'Calculated VLAN (Examination)'
    case 'large_subnet': return 'Large Subnet (Subnet Calculation)'
    default: return ''
  }
}

// Mode display name for selector (compact version)
const getModeDisplayName = (mode: string): string => {
  switch (mode) {
    case 'fixed_vlan': return 'Fixed VLAN'
    case 'lecturer_group': return 'Lecturer Group VLAN'
    case 'calculated_vlan': return 'Calculated VLAN (Examination)'
    case 'large_subnet': return 'Large Subnet (Subnet Calculation)'
    default: return 'Select mode...'
  }
}

// Generate unique Sub-VLAN ID
const generateSubVlanId = (): string => {
  return `subvlan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Available subnet sizes for student subnet (based on pool)
const availableStudentSubnetSizes = computed(() => {
  const pool = localData.value.largeSubnetConfig?.privateNetworkPool
  const minPrefix = pool === '10.0.0.0/8' ? 9 : pool === '172.16.0.0/12' ? 13 : 17
  return Array.from({ length: 31 - minPrefix }, (_, i) => minPrefix + i) // e.g., 9-30 for /8 pool
})

// Available sub-VLAN sizes (must be smaller than student subnet)
const availableSubVlanSizes = computed(() => {
  const studentSize = localData.value.largeSubnetConfig?.studentSubnetSize || 23
  return Array.from({ length: 31 - studentSize }, (_, i) => studentSize + 1 + i) // studentSize+1 to 30
})

// Add sub-VLAN to Large Subnet config
const addSubVlan = () => {
  if (!localData.value.largeSubnetConfig) return
  const index = localData.value.largeSubnetConfig.subVlans.length
  localData.value.largeSubnetConfig.subVlans.push({
    id: generateSubVlanId(),
    name: `VLAN ${index + 1}`,
    subnetSize: 26,
    subnetIndex: index + 1,
    vlanIdRandomized: true
  })
}

// Remove sub-VLAN from Large Subnet config
const removeSubVlan = (index: number) => {
  if (!localData.value.largeSubnetConfig || localData.value.largeSubnetConfig.subVlans.length <= 1) return
  localData.value.largeSubnetConfig.subVlans.splice(index, 1)
}

const generateVlanId = (): string => {
  return `vlan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get VLAN alphabet letter from index (A=0, B=1, C=2, etc.)
const getVlanAlphabet = (index: number): string => {
  if (index < 0 || index > 25) return 'A'
  return String.fromCharCode(65 + index) // 65 = 'A'
}

const createDefaultVlan = (mode: string, index: number): VlanConfig => {
  // Use consistent base network since IP generation algorithm replaces second and third octets
  // This allows multiple VLANs to use the same base network without conflicts
  const baseNetwork = `172.16.0.0`

  const baseConfig: VlanConfig = {
    id: generateVlanId(),
    baseNetwork: baseNetwork,
    subnetMask: 24,
    subnetIndex: 1,          // NEW: Default to first subnet block (1-indexed for UI)
    isStudentGenerated: true,
    // IPv6 defaults
    ipv6Enabled: false,
    ipv6VlanAlphabet: getVlanAlphabet(index)
  }

  switch (mode) {
    case 'fixed_vlan':
      return {
        ...baseConfig,
        vlanId: 1
      }
    case 'lecturer_group':
      return {
        ...baseConfig,
        vlanId: (index + 1) * 10,
        groupModifier: index * 10
      }
    case 'calculated_vlan':
      return {
        ...baseConfig,
        calculationMultiplier: 400 + (index * 100)
      }
    default:
      return baseConfig
  }
}

const onModeChange = (newMode?: typeof localData.value.mode) => {
  const mode = newMode || localData.value.mode
  
  if (mode === 'large_subnet') {
    // Initialize Large Subnet Mode configuration
    if (!localData.value.largeSubnetConfig) {
      localData.value.largeSubnetConfig = {
        privateNetworkPool: '10.0.0.0/8',
        studentSubnetSize: 23,
        subVlans: [{
          id: generateSubVlanId(),
          name: 'VLAN 1',
          subnetSize: 26,
          subnetIndex: 1,
          vlanIdRandomized: true
        }]
      }
    }
    // Clear regular VLANs when switching to large_subnet mode
    localData.value.vlans = []
    localData.value.vlanCount = 0
  } else {
    // Clear Large Subnet config when switching away
    localData.value.largeSubnetConfig = undefined
    // Reset VLANs when mode changes
    localData.value.vlans = []
    localData.value.vlanCount = 1
    addVlan()
  }
  validateAllFields()
}

const onVlanCountChange = () => {
  const currentCount = localData.value.vlans.length
  const targetCount = localData.value.vlanCount

  if (targetCount > currentCount) {
    // Add VLANs (base network duplication is allowed)
    for (let i = currentCount; i < targetCount; i++) {
      localData.value.vlans.push(createDefaultVlan(localData.value.mode, i))
    }
  } else if (targetCount < currentCount) {
    // Remove VLANs
    localData.value.vlans = localData.value.vlans.slice(0, targetCount)
  }

  validateAllFields()
}

const addVlan = () => {
  if (localData.value.vlans.length < 10) {
    // Create new VLAN (base network duplication is allowed)
    const newVlan = createDefaultVlan(localData.value.mode, localData.value.vlans.length)
    localData.value.vlans.push(newVlan)
    localData.value.vlanCount = localData.value.vlans.length
  }
}

const removeVlan = (index: number) => {
  if (localData.value.vlans.length > 1) {
    localData.value.vlans.splice(index, 1)
    localData.value.vlanCount = localData.value.vlans.length
    validateAllFields()
  }
}


const getVlanDisplay = (vlan: VlanConfig, index: number): string => {
  if (localData.value.mode === 'calculated_vlan') {
    return `Multiplier: ${vlan.calculationMultiplier}`
  } else {
    return `VLAN ${vlan.vlanId || index + 1}`
  }
}

const generatePreviewIP = (vlan: VlanConfig): string => {
  // Use preview student ID from input
  const studentId = previewStudentId.value || 65070232

  if (!vlan.baseNetwork || !isValidIP(vlan.baseNetwork)) {
    return 'Invalid base network'
  }

  // Validate student ID
  if (!studentId || studentId < 60000000 || studentId > 99999999) {
    return 'Invalid student ID (must be 8 digits)'
  }

  const dec2_1 = (studentId / 1000000 - 61) * 10 // 4 * 10 = 40
  const dec2_2 = (studentId % 1000) / 250 // 232 / 250 = 0.928
  const dec2 = Math.floor(dec2_1 + dec2_2) // 40
  let dec3 = Math.floor((studentId % 1000) % 250) // 232

  // For calculated VLANs, incorporate the calculated VLAN ID into the IP generation
  if (vlan.calculationMultiplier !== undefined) {
    // Calculate the actual VLAN ID for this student
    const calculatedVlanId = Math.floor((studentId / 1000000 - 61) * vlan.calculationMultiplier + (studentId % 1000))

    // Use the calculated VLAN ID to modify the third octet for uniqueness
    // This ensures different multipliers produce different IP ranges
    dec3 = Math.floor((dec3 + calculatedVlanId) % 250)
  }

  // Calculate fourth octet (last octet) based on subnet block
  // subnetIndex is 1-indexed in UI, so convert to 0-indexed for calculation
  // Formula: lastOctet = (subnetBlock - 1) * blockSize
  // Examples:
  //   /24, Block 1: blockSize = 256, lastOctet = 0
  //   /25, Block 1: blockSize = 128, lastOctet = 0
  //   /25, Block 2: blockSize = 128, lastOctet = 128
  //   /26, Block 1: blockSize = 64, lastOctet = 0
  //   /26, Block 2: blockSize = 64, lastOctet = 64
  //   /26, Block 3: blockSize = 64, lastOctet = 128
  //   /26, Block 4: blockSize = 64, lastOctet = 192
  const subnetIndexZeroBased = (vlan.subnetIndex || 1) - 1
  const blockSize = Math.pow(2, 32 - vlan.subnetMask)
  const dec4 = subnetIndexZeroBased * blockSize  // This is the starting address of the subnet block

  const [baseOct1] = vlan.baseNetwork.split('.').map(Number)
  return `${baseOct1}.${dec2}.${dec3}.${dec4}/${vlan.subnetMask}`
}

// IPv6 Helper Functions
// Note: getVlanAlphabet is defined above at line ~773

const IPv6_PRESETS: Record<string, { template: string; managementTemplate: string }> = {
  standard_exam: {
    template: '2001:{X}:{Y}:{VLAN}::{offset}/64',
    managementTemplate: '2001:{X}:{Y}:306::{offset}/64'
  },
  university_network: {
    template: '2001:3c8:1106:4{last3}:{VLAN}::{offset}/64',
    managementTemplate: '2001:3c8:1106:4306::{last3}/64'
  },
  simple_lab: {
    template: '2001:db8:{X}:{VLAN}::{offset}/64',
    managementTemplate: '2001:db8:{X}:mgmt::{offset}/64'
  },
  custom: {
    template: '2001:{X}:{Y}:{VLAN}::{offset}/64',
    managementTemplate: ''
  }
}

const toggleIPv6Config = (enabled: boolean) => {
  console.log('toggleIPv6Config called with:', enabled)
  if (enabled) {
    const preset = IPv6_PRESETS['standard_exam']!
    localData.value.ipv6Config = {
      enabled: true,
      template: preset.template,
      managementTemplate: preset.managementTemplate,
      presetName: 'standard_exam'
    }
  } else {
    localData.value.ipv6Config = {
      enabled: false,
      template: '',
      managementTemplate: '',
      presetName: undefined
    }
  }
  console.log('ipv6Config after toggle:', localData.value.ipv6Config)
}

const selectIPv6Preset = (presetName: 'standard_exam' | 'university_network' | 'simple_lab' | 'custom') => {
  const preset = IPv6_PRESETS[presetName]
  if (preset && localData.value.ipv6Config) {
    localData.value.ipv6Config.presetName = presetName
    localData.value.ipv6Config.template = preset.template
    localData.value.ipv6Config.managementTemplate = preset.managementTemplate
  }
}

const updateIPv6Template = (template: string) => {
  if (localData.value.ipv6Config) {
    localData.value.ipv6Config.template = template
    localData.value.ipv6Config.presetName = 'custom'
  }
}

const updateManagementTemplate = (template: string) => {
  if (localData.value.ipv6Config) {
    localData.value.ipv6Config.managementTemplate = template
  }
}

const calculateStudentVariables = (studentId: number) => {
  const sidStr = studentId.toString()
  if (sidStr.length !== 8) return { X: 0, Y: 0, Z: 0, last3: '000' }
  
  const year = parseInt(sidStr.substring(0, 2), 10)
  const faculty = parseInt(sidStr.substring(2, 4), 10)
  const seq = parseInt(sidStr.substring(4, 8), 10)
  
  return {
    X: year * 100 + faculty,
    Y: seq,
    Z: seq % 1000,
    last3: sidStr.slice(-3)
  }
}

const generateIPv6Preview = (vlan: VlanConfig, vlanIndex: number): string => {
  const template = localData.value.ipv6Config?.template || '2001:{X}:{Y}:{VLAN}::{offset}/64'
  const studentId = previewStudentId.value || 65070232
  const vars = calculateStudentVariables(studentId)
  
  // VLAN can be alphabet or numeric
  const vlanId = vlan.ipv6SubnetId || vlan.ipv6VlanAlphabet || getVlanAlphabet(vlanIndex)
  
  return template
    .replace(/\{X\}/g, vars.X.toString())
    .replace(/\{Y\}/g, vars.Y.toString())
    .replace(/\{Z\}/g, vars.Z.toString())
    .replace(/\{VLAN\}/g, vlanId)
    .replace(/\{offset\}/g, '1')
    .replace(/\{last3\}/g, vars.last3)
}

const validateVlan = (index: number) => {
  const vlan = localData.value.vlans[index]
  if (!vlan) return

  // Validate base network
  if (!vlan.baseNetwork || !isValidIP(vlan.baseNetwork)) {
    fieldErrors.value[`vlan_${index}_baseNetwork`] = 'Valid base network is required'
  } else {
    // Base network duplication is allowed since the IP generation algorithm
    // replaces the second and third octets anyway, making duplication irrelevant
    delete fieldErrors.value[`vlan_${index}_baseNetwork`]
  }

  // Validate subnet mask
  if (!vlan.subnetMask || vlan.subnetMask < 8 || vlan.subnetMask > 30) {
    fieldErrors.value[`vlan_${index}_subnetMask`] = 'Subnet mask must be between 8 and 30'
  } else {
    delete fieldErrors.value[`vlan_${index}_subnetMask`]
  }

  // Validate subnet index (NEW)
  // NOTE: UI uses 1-indexed (1 = first block), but backend uses 0-indexed
  // We will convert to 0-indexed when submitting to backend (subnetIndex - 1)
  if (vlan.subnetIndex === undefined || vlan.subnetIndex === null) {
    fieldErrors.value[`vlan_${index}_subnetIndex`] = 'Subnet index is required'
  } else if (vlan.subnetIndex < 1) {
    fieldErrors.value[`vlan_${index}_subnetIndex`] = 'Subnet index must be >= 1'
  } else {
    // Calculate if this subnet index would exceed the valid IP range
    // Convert to 0-indexed for calculation
    const blockSize = Math.pow(2, 32 - vlan.subnetMask)
    const startAddress = (vlan.subnetIndex - 1) * blockSize

    // Check if the starting address of this subnet block exceeds 254 (last usable octet)
    if (startAddress > 254) {
      fieldErrors.value[`vlan_${index}_subnetIndex`] =
        `Subnet block ${vlan.subnetIndex} with /${vlan.subnetMask} would start at .${startAddress} (exceeds .254)`
    } else {
      delete fieldErrors.value[`vlan_${index}_subnetIndex`]
    }
  }

  // Mode-specific validation
  if (localData.value.mode === 'fixed_vlan' || localData.value.mode === 'lecturer_group') {
    if (!vlan.vlanId || vlan.vlanId < 1 || vlan.vlanId > 4094) {
      fieldErrors.value[`vlan_${index}_vlanId`] = 'VLAN ID must be between 1 and 4094'
    } else {
      delete fieldErrors.value[`vlan_${index}_vlanId`]
    }
  }

  if (localData.value.mode === 'calculated_vlan') {
    if (!vlan.calculationMultiplier || vlan.calculationMultiplier < 1) {
      fieldErrors.value[`vlan_${index}_multiplier`] = 'Calculation multiplier must be greater than 0'
    } else {
      delete fieldErrors.value[`vlan_${index}_multiplier`]
    }
  }

  emitValidation()
}

const validateField = (field: string) => {
  switch (field) {
    case 'managementNetwork':
      if (!localData.value.managementNetwork.trim()) {
        fieldErrors.value.managementNetwork = 'Management network is required'
      } else if (!isValidIP(localData.value.managementNetwork)) {
        fieldErrors.value.managementNetwork = 'Please enter a valid IP address'
      } else {
        delete fieldErrors.value.managementNetwork
      }
      break

    case 'managementSubnetMask':
      if (!localData.value.managementSubnetMask) {
        fieldErrors.value.managementSubnetMask = 'Management subnet mask is required'
      } else if (localData.value.managementSubnetMask < 8 || localData.value.managementSubnetMask > 30) {
        fieldErrors.value.managementSubnetMask = 'Subnet mask must be between 8 and 30'
      } else {
        delete fieldErrors.value.managementSubnetMask
      }
      break

    case 'mode':
      if (!localData.value.mode) {
        fieldErrors.value.mode = 'VLAN configuration mode is required'
      } else {
        delete fieldErrors.value.mode
      }
      break

    case 'allocationStrategy':
      if (!localData.value.allocationStrategy) {
        fieldErrors.value.allocationStrategy = 'IP allocation strategy is required'
      } else if (!['student_id_based', 'group_based'].includes(localData.value.allocationStrategy)) {
        fieldErrors.value.allocationStrategy = 'Invalid allocation strategy'
      } else {
        delete fieldErrors.value.allocationStrategy
      }
      break
  }

  emitValidation()
}

const validateAllFields = () => {
  // Clear all previous errors
  fieldErrors.value = {}

  // Validate management network
  if (!localData.value.managementNetwork.trim()) {
    fieldErrors.value.managementNetwork = 'Management network is required'
  } else if (!isValidIP(localData.value.managementNetwork)) {
    fieldErrors.value.managementNetwork = 'Please enter a valid IP address'
  }

  // Validate management subnet mask
  if (!localData.value.managementSubnetMask) {
    fieldErrors.value.managementSubnetMask = 'Management subnet mask is required'
  } else if (localData.value.managementSubnetMask < 8 || localData.value.managementSubnetMask > 30) {
    fieldErrors.value.managementSubnetMask = 'Subnet mask must be between 8 and 30'
  }

  // Validate mode
  if (!localData.value.mode) {
    fieldErrors.value.mode = 'VLAN configuration mode is required'
  }

  // Validate allocation strategy
  if (!localData.value.allocationStrategy) {
    fieldErrors.value.allocationStrategy = 'IP allocation strategy is required'
  } else if (!['student_id_based', 'group_based'].includes(localData.value.allocationStrategy)) {
    fieldErrors.value.allocationStrategy = 'Invalid allocation strategy'
  }

  // Validate VLANs (mode-specific)
  if (localData.value.mode === 'large_subnet') {
    // For large_subnet mode, validate subVlans in largeSubnetConfig
    if (!localData.value.largeSubnetConfig) {
      fieldErrors.value.vlans = 'Large subnet configuration is required'
    } else if (!localData.value.largeSubnetConfig.privateNetworkPool) {
      fieldErrors.value.vlans = 'Private network pool is required for large subnet mode'
    } else if (!localData.value.largeSubnetConfig.studentSubnetSize) {
      fieldErrors.value.vlans = 'Student subnet size is required for large subnet mode'
    } else if (!localData.value.largeSubnetConfig.subVlans || 
               localData.value.largeSubnetConfig.subVlans.length === 0) {
      fieldErrors.value.vlans = 'At least one sub-VLAN is required'
    } else {
      delete fieldErrors.value.vlans
      // Validate each sub-VLAN
      localData.value.largeSubnetConfig.subVlans.forEach((subVlan, index) => {
        // Validate sub-VLAN name
        if (!subVlan.name || !subVlan.name.trim()) {
          fieldErrors.value[`subvlan_${index}_name`] = 'Sub-VLAN name is required'
        } else {
          delete fieldErrors.value[`subvlan_${index}_name`]
        }
        // Validate subnet size
        if (!subVlan.subnetSize || subVlan.subnetSize < 1 || subVlan.subnetSize > 32) {
          fieldErrors.value[`subvlan_${index}_subnetSize`] = 'Invalid subnet size (1-32)'
        } else {
          delete fieldErrors.value[`subvlan_${index}_subnetSize`]
        }
        // Validate subnet index
        if (!subVlan.subnetIndex || subVlan.subnetIndex < 1) {
          fieldErrors.value[`subvlan_${index}_subnetIndex`] = 'Subnet index must be >= 1'
        } else {
          delete fieldErrors.value[`subvlan_${index}_subnetIndex`]
        }
      })
    }
  } else if (localData.value.mode && localData.value.vlans.length === 0) {
    fieldErrors.value.vlans = 'At least one VLAN is required'
  } else {
    delete fieldErrors.value.vlans
    localData.value.vlans.forEach((_, index) => {
      validateVlan(index)
    })
  }
}

const emitValidation = () => {
  const errors = Object.values(fieldErrors.value).filter(Boolean)
  const isValid = errors.length === 0

  const validationResult: ValidationResult = {
    isValid,
    errors
  }

  emit('validate', validationResult)
}

const validateStep = () => {
  validateAllFields()
  // Only emit validation if not updating from props to prevent loops
  if (!isUpdatingFromProps.value) {
    emitValidation()
  }
}

// Exempt IP Ranges Methods
const addExemptRange = () => {
  const input = exemptRangeInput.value.trim()

  if (!input) {
    return
  }

  // Parse the input
  const { range, error } = parseIpInput(input)

  if (error || !range) {
    exemptRangesError.value = error || 'Invalid IP range format'
    return
  }

  // Validate against management network
  const validation = validateRangeInNetwork(
    range,
    localData.value.managementNetwork,
    localData.value.managementSubnetMask
  )

  if (!validation.isValid) {
    exemptRangesError.value = validation.error || 'IP range validation failed'
    return
  }

  // Check max ranges limit (20)
  if (localData.value.exemptIpRanges.length >= 20) {
    exemptRangesError.value = 'Maximum 20 exempt ranges allowed'
    return
  }

  // Add to ranges and auto-merge
  const updatedRanges = [...localData.value.exemptIpRanges, range]
  localData.value.exemptIpRanges = autoMergeRanges(updatedRanges)

  // Clear input and errors
  exemptRangeInput.value = ''
  exemptRangesError.value = ''

  // Validate all ranges
  validateExemptRanges()
}

const removeExemptRange = (index: number) => {
  localData.value.exemptIpRanges.splice(index, 1)
  validateExemptRanges()
}

const clearAllExemptRanges = () => {
  localData.value.exemptIpRanges = []
  exemptRangesError.value = ''
  exemptRangesWarnings.value = []
}

const validateExemptRanges = () => {
  if (localData.value.exemptIpRanges.length === 0) {
    exemptRangesError.value = ''
    exemptRangesWarnings.value = []
    return
  }

  const validation = validateExemptRangesUtil(
    localData.value.exemptIpRanges,
    localData.value.managementNetwork,
    localData.value.managementSubnetMask,
    20 // max ranges
  )

  if (!validation.isValid) {
    exemptRangesError.value = validation.errors[0] || 'Validation failed'
  } else {
    exemptRangesError.value = ''
  }

  exemptRangesWarnings.value = validation.warnings
}

const getRangeWarning = (range: IpRange): boolean => {
  // Show warning for large ranges (>100 IPs)
  return countIpsInRange(range) > 100
}

const formatRangeDisplay = (range: IpRange): string => {
  return formatRangeDisplayUtil(range)
}

// Watchers
watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('update:modelValue', newValue)
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    isUpdatingFromProps.value = true
    localData.value = {
      ...newValue,
      // Use mode from props or default to calculated_vlan
      mode: newValue.mode || 'calculated_vlan',
      allocationStrategy: 'student_id_based',
      // Preserve ipv6Config with fallback for edit mode
      ipv6Config: newValue.ipv6Config || {
        enabled: false,
        template: '2001:{X}:{Y}:{VLAN}::{offset}/64',
        managementTemplate: '2001:{X}:{Y}:306::{offset}/64',
        presetName: 'standard_exam'
      }
    }
    nextTick(() => {
      isUpdatingFromProps.value = false
      // Trigger validation after props update
      validateStep()
    })
  },
  { deep: true }
)

// Lifecycle
onMounted(() => {
  // Use mode from props or default to calculated_vlan if empty
  if (!localData.value.mode) {
    localData.value.mode = 'calculated_vlan'
  }
  // Force allocationStrategy to student_id_based if not already set
  if (localData.value.allocationStrategy !== 'student_id_based') {
    localData.value.allocationStrategy = 'student_id_based'
  }
  // Initialize with default VLAN if empty
  if (localData.value.vlans.length === 0 && localData.value.mode) {
    addVlan()
  }
  validateStep()
})
</script>

<style scoped>
</style>