<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Parts & Tasks Management</h2>
      <p class="text-muted-foreground mt-1">
        Create lab parts and define tasks for each part. This is where you structure the learning objectives and grading criteria.
      </p>
    </div>

    <!-- Parts Management Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <Label class="text-sm font-medium">
          Lab Parts <span class="text-destructive">*</span>
          <span class="text-muted-foreground font-normal">(Minimum 1 part required)</span>
        </Label>
        <Button @click="addPart" :disabled="isLoadingTemplates">
          <Plus class="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingTemplates" class="flex items-center justify-center p-8">
        <Loader2 class="w-6 h-6 animate-spin mr-2" />
        <span>Loading task templates...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="localData.length === 0" class="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <BookOpen class="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 class="text-lg font-medium mb-2">No lab parts configured</h3>
        <p class="text-muted-foreground mb-4">
          Add your first lab part to define the structure and tasks
        </p>
        <Button @click="addPart">
          <Plus class="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </div>

      <!-- Parts List -->
      <div v-else class="space-y-6">
        <TransitionGroup name="part" tag="div" class="space-y-6">
          <Card
            v-for="(part, partIndex) in localData"
            :key="part.tempId"
            :class="{
              'border-destructive': hasPartErrors(partIndex),
              'border-blue-500': !hasPartErrors(partIndex) && isPartValid(part)
            }"
          >
            <CardHeader class="pb-4">
              <div class="flex items-center justify-between">
                <CardTitle class="text-lg flex items-center">
                  <BookOpen class="w-5 h-5 mr-2 text-blue-600" />
                  Part {{ partIndex + 1 }}
                  <Badge v-if="part.partId" variant="secondary" class="ml-2">
                    {{ part.partId }}
                  </Badge>
                  <Badge v-if="part.totalPoints > 0" variant="outline" class="ml-2">
                    {{ part.totalPoints }} pts
                  </Badge>
                </CardTitle>
                <div class="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="togglePartExpansion(partIndex)"
                  >
                    <ChevronDown
                      :class="{ 'transform rotate-180': part.isExpanded }"
                      class="w-4 h-4 transition-transform"
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="movePart(partIndex, -1)"
                    :disabled="partIndex === 0"
                  >
                    <MoveUp class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="movePart(partIndex, 1)"
                    :disabled="partIndex === localData.length - 1"
                  >
                    <MoveDown class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="removePart(partIndex)"
                    class="text-destructive hover:text-destructive"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <Collapsible v-model:open="part.isExpanded">
              <CollapsibleContent>
                <CardContent class="space-y-6">
                  <!-- Part Basic Information -->
                  <div class="space-y-4">
                    <!-- Part Title -->
                    <div class="space-y-2">
                      <Label :for="`part-title-${partIndex}`" class="text-sm font-medium">
                        Part Title <span class="text-destructive">*</span>
                      </Label>
                      <Input
                        :id="`part-title-${partIndex}`"
                        v-model="part.title"
                        placeholder="Basic Configuration, OSPF Setup, etc."
                        :class="{
                          'border-destructive': hasPartFieldError(partIndex, 'title'),
                          'border-green-500': !hasPartFieldError(partIndex, 'title') && part.title.length > 0
                        }"
                        @input="handlePartTitleChange(partIndex, $event.target.value)"
                        @blur="validatePart(partIndex, 'title')"
                      />
                      <div v-if="part.partId" class="text-xs text-muted-foreground">
                        Part ID will be: <code class="bg-muted px-1 py-0.5 rounded text-xs">{{ part.partId }}</code>
                      </div>
                      <p v-if="hasPartFieldError(partIndex, 'title')" class="text-sm text-destructive">
                        {{ getPartFieldError(partIndex, 'title') }}
                      </p>
                    </div>

                    <!-- Part Type Selection (NEW) -->
                    <div class="space-y-2">
                      <Label class="text-sm font-medium">
                        Part Type <span class="text-destructive">*</span>
                      </Label>
                      <RadioGroup v-model="part.partType" @update:modelValue="onPartTypeChange(partIndex)">
                        <!-- Fill-in-the-Blank -->
                        <div class="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                          <RadioGroupItem value="fill_in_blank" :id="`fill-blank-${partIndex}`" />
                          <Label :for="`fill-blank-${partIndex}`" class="flex items-center gap-3 cursor-pointer flex-1">
                            <FileQuestion class="w-5 h-5 text-primary" />
                            <div>
                              <div class="font-medium">Fill-in-the-Blank Questions</div>
                              <div class="text-xs text-muted-foreground">IP calculation, subnetting questions with auto schema mapping</div>
                            </div>
                          </Label>
                        </div>

                        <!-- DHCP Configuration -->
                        <div class="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                          <RadioGroupItem value="dhcp_config" :id="`dhcp-config-${partIndex}`" />
                          <Label :for="`dhcp-config-${partIndex}`" class="flex items-center gap-3 cursor-pointer flex-1">
                            <Server class="w-5 h-5 text-secondary" />
                            <div>
                              <div class="font-medium">DHCP Configuration</div>
                              <div class="text-xs text-muted-foreground">Configure DHCP with lecturer-defined pool ranges</div>
                            </div>
                          </Label>
                        </div>

                        <!-- Network Configuration -->
                        <div class="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                          <RadioGroupItem value="network_config" :id="`network-config-${partIndex}`" />
                          <Label :for="`network-config-${partIndex}`" class="flex items-center gap-3 cursor-pointer flex-1">
                            <Network class="w-5 h-5 text-accent-foreground" />
                            <div>
                              <div class="font-medium">Network Configuration</div>
                              <div class="text-xs text-muted-foreground">Hands-on device configuration tasks with automated grading</div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                      <p v-if="hasPartFieldError(partIndex, 'partType')" class="text-sm text-destructive">
                        {{ getPartFieldError(partIndex, 'partType') }}
                      </p>
                    </div>

                    <!-- Question Editor (Fill-in-Blank Type) -->
                    <div v-if="part.partType === 'fill_in_blank'" class="border-t pt-6 mt-6 space-y-4">
                      <div class="flex items-center justify-between">
                        <div>
                          <h4 class="text-sm font-semibold flex items-center gap-2">
                            <FileQuestion class="w-4 h-4 text-primary" />
                            Questions Configuration
                          </h4>
                          <p class="text-xs text-muted-foreground mt-1">
                            Add IP calculation and subnetting questions
                          </p>
                        </div>
                        <Button
                          @click="addQuestion(partIndex)"
                          size="sm"
                          variant="outline"
                        >
                          <Plus class="w-4 h-4 mr-1" />
                          Add Question
                        </Button>
                      </div>

                      <!-- Questions List -->
                      <div v-if="part.questions && part.questions.length > 0" class="space-y-4">
                        <Card
                          v-for="(question, qIndex) in part.questions"
                          :key="question.questionId"
                          class="border-l-4 border-l-blue-500"
                        >
                          <CardHeader class="pb-3">
                            <div class="flex items-center justify-between">
                              <CardTitle class="text-sm flex items-center gap-2">
                                Question {{ qIndex + 1 }}
                                <Badge variant="outline">{{ question.points || 0 }} pts</Badge>
                                <Badge v-if="question.schemaMapping?.autoDetected" variant="secondary" class="text-xs">
                                  🤖 Auto-detected
                                </Badge>
                              </CardTitle>
                              <div class="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  @click="moveQuestion(partIndex, qIndex, -1)"
                                  :disabled="qIndex === 0"
                                >
                                  <MoveUp class="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  @click="moveQuestion(partIndex, qIndex, 1)"
                                  :disabled="qIndex === part.questions!.length - 1"
                                >
                                  <MoveDown class="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  @click="removeQuestion(partIndex, qIndex)"
                                  class="text-destructive hover:text-destructive"
                                >
                                  <Trash2 class="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent class="space-y-4">
                            <!-- Question Text -->
                            <div class="space-y-2">
                              <Label class="text-sm font-medium">
                                Question Text <span class="text-destructive">*</span>
                              </Label>
                              <Textarea
                                v-model="question.questionText"
                                placeholder="e.g., Calculate your network address for VLAN 1: ___"
                                rows="2"
                                @input="onQuestionTextChange(partIndex, qIndex)"
                              />
                              <p v-if="question.questionType !== 'custom_text'" class="text-xs text-muted-foreground">
                                💡 Tip: Include "VLAN X" in your question for automatic VLAN detection
                              </p>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                              <!-- Question Type -->
                              <div class="space-y-2">
                                <Label class="text-sm font-medium">
                                  Question Type <span class="text-destructive">*</span>
                                </Label>
                                <Select v-model="question.questionType" @update:modelValue="onQuestionTypeChange(partIndex, qIndex)">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="network_address">Network Address</SelectItem>
                                    <SelectItem value="first_usable_ip">First Usable IP</SelectItem>
                                    <SelectItem value="last_usable_ip">Last Usable IP</SelectItem>
                                    <SelectItem value="broadcast_address">Broadcast Address</SelectItem>
                                    <SelectItem value="subnet_mask">Subnet Mask (CIDR)</SelectItem>
                                    <SelectItem value="ip_address">IP Address</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="custom_text">Custom Text Match</SelectItem>
                                    <SelectItem value="ip_table_questionnaire">Advanced IP Table Questionnaire</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <!-- Points -->
                              <div class="space-y-2">
                                <Label class="text-sm font-medium">
                                  Points <span class="text-destructive">*</span>
                                </Label>
                                <Input
                                  v-model.number="question.points"
                                  type="number"
                                  min="1"
                                  placeholder="5"
                                  @input="onQuestionPointsChange(partIndex)"
                                />
                              </div>
                            </div>

                            <!-- VLAN Index (Hybrid: Auto-detect + Manual Override) -->
                            <div v-if="question.questionType !== 'custom_text' && question.schemaMapping" class="space-y-2">
                              <Label class="text-sm font-medium">
                                Target VLAN <span class="text-destructive">*</span>
                              </Label>
                              <div class="flex items-center gap-2">
                                <Select
                                  v-model="question.schemaMapping.vlanIndex"
                                  @update:modelValue="value => onVlanIndexChange(partIndex, qIndex, value)"
                                >
                                  <SelectTrigger class="flex-1">
                                    <SelectValue placeholder="Select VLAN..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem v-for="(vlan, vlanIdx) in vlans" :key="vlanIdx" :value="vlanIdx">
                                      VLAN {{ vlanIdx + 1 }} ({{ vlan.baseNetwork }}/{{ vlan.subnetMask }})
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p v-if="question.schemaMapping?.autoDetected" class="text-xs text-muted-foreground">
                                VLAN was auto-detected from question text. You can change it above.
                              </p>
                            </div>

                            <!-- Schema Mapping Preview -->
                            <Alert v-if="question.questionType !== 'custom_text' && question.schemaMapping" class="bg-blue-50 border-blue-200">
                              <Info class="w-4 h-4 text-blue-600" />
                              <AlertDescription class="text-xs text-blue-800">
                                <strong>This answer will be stored in:</strong><br>
                                <code class="text-xs bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
                                  schema.vlans[{{ question.schemaMapping.vlanIndex }}].{{ getFieldName(question.questionType) }}
                                </code>
                              </AlertDescription>
                            </Alert>

                            <!-- IP Table Questionnaire Configuration -->
                            <div v-else-if="question.questionType === 'ip_table_questionnaire'" class="space-y-4">
                              <Alert class="bg-purple-50 border-purple-200">
                                <Table2 class="w-4 h-4 text-purple-600" />
                                <AlertDescription class="text-xs text-purple-800">
                                  <strong>Advanced IP Table Questionnaire:</strong> Create a comprehensive table where students fill in network configuration details across multiple devices and interfaces.
                                </AlertDescription>
                              </Alert>

                              <!-- Create/Edit Table Button -->
                              <div v-if="!question.ipTableQuestionnaire" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50/30 hover:bg-purple-50/50 transition-colors">
                                <Table2 class="w-12 h-12 text-purple-400 mb-4" />
                                <h4 class="text-lg font-semibold text-purple-900 mb-2">No Table Created Yet</h4>
                                <p class="text-sm text-purple-700 mb-4 text-center max-w-md">
                                  Click the button below to configure your IP table questionnaire with custom rows and columns
                                </p>
                                <Button
                                  @click="openIpTableDimensionModal(partIndex, qIndex)"
                                  variant="default"
                                  class="bg-purple-600 hover:bg-purple-700"
                                >
                                  <Plus class="w-4 h-4 mr-2" />
                                  Create Questionnaire Table
                                </Button>
                              </div>

                              <!-- Table Summary (if created) -->
                              <div v-else class="space-y-4">
                                <Alert class="bg-green-50 border-green-200">
                                  <Check class="w-4 h-4 text-green-600" />
                                  <AlertDescription class="text-sm text-green-800">
                                    <div class="space-y-2">
                                      <div><strong>Table configured:</strong> {{ question.ipTableQuestionnaire.rowCount }} rows × {{ question.ipTableQuestionnaire.columnCount }} columns</div>
                                      <div><strong>Total cells:</strong> {{ question.ipTableQuestionnaire.rowCount * question.ipTableQuestionnaire.columnCount }}</div>
                                      <div><strong>Total points:</strong> {{ calculateTablePoints(question.ipTableQuestionnaire) }}</div>
                                    </div>
                                  </AlertDescription>
                                </Alert>

                                <!-- Action Buttons -->
                                <div class="flex items-center gap-2">
                                  <Button
                                    @click="editIpTable(partIndex, qIndex)"
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Edit class="w-4 h-4 mr-2" />
                                    Edit Table
                                  </Button>
                                  <Button
                                    @click="previewIpTable(partIndex, qIndex)"
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Eye class="w-4 h-4 mr-2" />
                                    Preview
                                  </Button>
                                  <Button
                                    @click="deleteIpTable(partIndex, qIndex)"
                                    variant="outline"
                                    size="sm"
                                    class="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 class="w-4 h-4 mr-2" />
                                    Delete Table
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <!-- Custom Text Question Configuration -->
                            <div v-else-if="question.questionType === 'custom_text'" class="space-y-4">
                              <div class="space-y-2">
                                <Label class="text-sm font-medium">
                                  Expected Answer <span class="text-destructive">*</span>
                                </Label>
                                <Input
                                  v-model="question.expectedAnswer"
                                  placeholder="e.g., chicken"
                                  @input="onExpectedAnswerChange(partIndex, qIndex)"
                                />
                                <p class="text-xs text-muted-foreground">
                                  Students must enter a response that matches this answer {{ question.caseSensitive ? 'with' : 'ignoring' }} letter casing.
                                </p>
                              </div>

                              <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                  <Label class="text-sm font-medium flex items-center justify-between">
                                    Case Sensitive
                                    <Switch
                                      :checked="question.caseSensitive"
                                      @update:checked="value => onCaseSensitiveToggle(partIndex, qIndex, value)"
                                    />
                                  </Label>
                                  <p class="text-xs text-muted-foreground">
                                    Toggle on to require exact casing (e.g., "Router" ≠ "router").
                                  </p>
                                </div>

                                <div class="space-y-2">
                                  <Label class="text-sm font-medium flex items-center justify-between">
                                    Trim Whitespace
                                    <Switch
                                      :checked="question.trimWhitespace !== false"
                                      @update:checked="value => onTrimWhitespaceToggle(partIndex, qIndex, value)"
                                    />
                                  </Label>
                                  <p class="text-xs text-muted-foreground">
                                    When enabled, leading and trailing spaces are removed before comparison.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <!-- Optional Fields -->
                            <div class="grid grid-cols-2 gap-4">
                              <!-- Placeholder -->
                              <div class="space-y-2">
                                <Label class="text-sm font-medium">Placeholder Text</Label>
                                <Input
                                  v-model="question.placeholder"
                                  placeholder="e.g., 192.168.1.0"
                                />
                              </div>

                              <!-- Input Format -->
                              <div class="space-y-2">
                                <Label class="text-sm font-medium">Input Format</Label>
                                <Select v-model="question.inputFormat">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Auto-detect" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ip">IP Address (xxx.xxx.xxx.xxx)</SelectItem>
                                    <SelectItem value="cidr">CIDR Number (/24)</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="text">Text</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <!-- Empty State -->
                      <Alert v-else class="border-dashed">
                        <AlertCircle class="w-4 h-4" />
                        <AlertTitle>No questions added yet</AlertTitle>
                        <AlertDescription>
                          Click "Add Question" to create your first fill-in-the-blank question.
                        </AlertDescription>
                      </Alert>
                    </div>

                    <!-- DHCP Configuration Editor (DHCP Config Type) -->
                    <div v-if="part.partType === 'dhcp_config'" class="border-t pt-6 mt-6 space-y-4">
                      <div>
                        <h4 class="text-sm font-semibold flex items-center gap-2">
                          <Server class="w-4 h-4 text-secondary" />
                          DHCP Configuration
                        </h4>
                        <p class="text-xs text-muted-foreground mt-1">
                          Define the dynamic IP range and device responsible for serving DHCP.
                        </p>
                      </div>

                      <Alert class="bg-amber-50 border-amber-200">
                        <Info class="w-4 h-4 text-amber-600" />
                        <AlertDescription class="text-xs text-amber-800">
                          <strong>Important:</strong> Devices will be validated against this IP range. Any IP outside this range will fail grading.
                        </AlertDescription>
                      </Alert>

                      <div v-if="part.dhcpConfiguration" class="space-y-4">
                        <div class="space-y-2">
                          <Label class="text-sm font-medium">
                            VLAN Index <span class="text-destructive">*</span>
                          </Label>
                          <Select
                            :model-value="String(part.dhcpConfiguration.vlanIndex)"
                            @update:model-value="value => handleDhcpVlanChange(partIndex, Number(value))"
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select VLAN..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem v-for="(vlan, vlanIdx) in vlans" :key="vlanIdx" :value="String(vlanIdx)">
                                VLAN {{ vlanIdx + 1 }} ({{ vlan.baseNetwork }}/{{ vlan.subnetMask }})
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="space-y-2">
                            <Label class="text-sm font-medium">
                              Start Offset (Last Octet) <span class="text-destructive">*</span>
                            </Label>
                            <Input
                              v-model.number="part.dhcpConfiguration.startOffset"
                              type="number"
                              :min="getDhcpOffsetBounds(part.dhcpConfiguration.vlanIndex).min"
                              :max="getDhcpOffsetBounds(part.dhcpConfiguration.vlanIndex).max"
                              :placeholder="`Within ${formatDhcpOffsetRange(part.dhcpConfiguration.vlanIndex)}`"
                              @input="requestValidation()"
                              @blur="validateDhcpOffsetRange(partIndex)"
                            />
                            <p class="text-xs text-muted-foreground">
                              Offset value for the last octet ({{ formatDhcpOffsetRange(part.dhcpConfiguration.vlanIndex) }})
                            </p>
                          </div>

                          <div class="space-y-2">
                            <Label class="text-sm font-medium">
                              End Offset (Last Octet) <span class="text-destructive">*</span>
                            </Label>
                            <Input
                              v-model.number="part.dhcpConfiguration.endOffset"
                              type="number"
                              :min="getDhcpOffsetBounds(part.dhcpConfiguration.vlanIndex).min"
                              :max="getDhcpOffsetBounds(part.dhcpConfiguration.vlanIndex).max"
                              :placeholder="`Within ${formatDhcpOffsetRange(part.dhcpConfiguration.vlanIndex)}`"
                              @input="requestValidation()"
                              @blur="validateDhcpOffsetRange(partIndex)"
                            />
                            <p class="text-xs text-muted-foreground">
                              Offset value for the last octet ({{ formatDhcpOffsetRange(part.dhcpConfiguration.vlanIndex) }})
                            </p>
                          </div>
                        </div>

                        <!-- IP Range Calculation Helper -->
                        <div v-if="part.dhcpConfiguration.vlanIndex !== undefined && part.dhcpConfiguration.startOffset && part.dhcpConfiguration.endOffset" class="mt-2">
                          <Alert class="bg-blue-50 border-blue-200">
                            <Info class="w-4 h-4 text-blue-600" />
                            <AlertTitle class="text-blue-800">IP Range Preview</AlertTitle>
                            <AlertDescription class="text-xs text-blue-700">
                              <div class="space-y-1 mt-2">
                                <div><strong>Base Network:</strong> {{ getVlanBaseNetwork(part.dhcpConfiguration.vlanIndex) }}</div>
                                <div><strong>Start IP:</strong> {{ calculateIpFromOffset(part.dhcpConfiguration.vlanIndex, part.dhcpConfiguration.startOffset) }}</div>
                                <div><strong>End IP:</strong> {{ calculateIpFromOffset(part.dhcpConfiguration.vlanIndex, part.dhcpConfiguration.endOffset) }}</div>
                                <div><strong>Available IPs:</strong> {{ calculateDhcpPoolSizeFromOffsets(part.dhcpConfiguration.startOffset, part.dhcpConfiguration.endOffset) }}</div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </div>

                        <!-- DHCP Server Device -->
                        <div class="space-y-2">
                          <Label class="text-sm font-medium">
                            DHCP Server Device <span class="text-destructive">*</span>
                          </Label>
                          <Select v-model="part.dhcpConfiguration.dhcpServerDevice" @update:modelValue="() => requestValidation()">
                            <SelectTrigger>
                              <SelectValue placeholder="Select device..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                v-for="device in devices"
                                :key="device.deviceId"
                                :value="device.deviceId"
                              >
                                {{ device.deviceId }}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p class="text-xs text-muted-foreground">
                            Select the device students must configure as the DHCP server.
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>

                  <!-- Description -->
                  <div class="space-y-2">
                    <Label :for="`part-description-${partIndex}`" class="text-sm font-medium">
                      Description <span class="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Textarea
                      :id="`part-description-${partIndex}`"
                      v-model="part.description"
                      placeholder="Optional description for this part..."
                      rows="2"
                      @input="validatePart(partIndex, 'description')"
                    />
                  </div>

                  <!-- Instructions -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label class="text-sm font-medium">
                        Student Instructions <span class="text-destructive">*</span>
                      </Label>
                      <div class="flex items-center space-x-2">
                        <Button
                          v-if="part.instructions.length > 0"
                          variant="ghost"
                          size="sm"
                          @click="toggleInstructionsPreview(partIndex)"
                        >
                          <Eye v-if="!part.showInstructionsPreview" class="w-4 h-4 mr-1" />
                          <Edit3 v-else class="w-4 h-4 mr-1" />
                          {{ part.showInstructionsPreview ? 'Hide Preview' : 'Preview' }}
                        </Button>
                      </div>
                    </div>

                    <!-- Rich Text Editor Button -->
                    <div class="space-y-4">
                      <Button
                        @click="openInstructionsEditor(partIndex)"
                        variant="outline"
                        size="lg"
                        class="w-full h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-solid transition-all"
                        :class="{
                          'border-destructive text-destructive': hasPartFieldError(partIndex, 'instructions'),
                          'border-green-500 text-green-700 bg-green-50 hover:bg-green-100': !hasPartFieldError(partIndex, 'instructions') && part.instructions.length > 0,
                          'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100': !hasPartFieldError(partIndex, 'instructions') && part.instructions.length === 0
                        }"
                      >
                        <div class="flex items-center gap-2">
                          <Icon name="lucide:file-text" class="w-5 h-5" />
                          <span class="font-medium">
                            {{ part.instructions.length > 0 ? 'Edit Instructions' : 'Create Instructions' }}
                          </span>
                        </div>
                        <div class="text-xs text-muted-foreground">
                          {{ part.instructions.length > 0
                            ? `${getInstructionsStats(part.instructions).words} words, ${getInstructionsStats(part.instructions).characters} characters`
                            : 'Click to open the rich text editor with image support, formatting, and more'
                          }}
                        </div>
                      </Button>

                      <!-- Instructions Preview -->
                      <div
                        v-if="part.showInstructionsPreview && part.instructions.length > 0"
                        class="min-h-[150px] p-4 border rounded-md bg-background prose prose-sm max-w-none"
                      >
                        <div v-html="renderMarkdown(part.instructions)"></div>
                      </div>

                      <!-- Validation Error -->
                      <p v-if="hasPartFieldError(partIndex, 'instructions')" class="text-sm text-destructive">
                        {{ getPartFieldError(partIndex, 'instructions') }}
                      </p>
                    </div>
                  </div>

                  <!-- Prerequisites -->
                  <div class="space-y-2">
                    <Label class="text-sm font-medium">
                      Prerequisites <span class="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Select v-model="part.prerequisites" multiple>
                      <SelectTrigger>
                        <SelectValue>
                          <template v-if="part.prerequisites.length > 0">
                            {{ getPrerequisitesDisplayText(part.prerequisites) }}
                          </template>
                          <template v-else>
                            Select prerequisite parts
                          </template>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="(otherPart, otherIndex) in localData"
                          :key="otherPart.tempId"
                          :value="otherPart.partId || otherPart.tempId"
                          :disabled="otherIndex === partIndex || !otherPart.partId"
                        >
                          {{ otherPart.partId || `Part ${otherIndex + 1}` }} - {{ otherPart.title || 'Untitled Part' }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Tasks Management (Only for Network Configuration) -->
                  <div v-if="part.partType === 'network_config'" class="border-t pt-6">
                    <TasksManager
                      v-model="part.tasks"
                      :task-templates="taskTemplates"
                      :devices="devices"
                      :part-index="partIndex"
                      :task-groups="part.task_groups"
                      :enable-task-groups="true"
                      @update-total-points="updatePartTotalPoints(partIndex, $event)"
                      @update:task-groups="updatePartTaskGroups(partIndex, $event)"
                      @validate="handleTasksValidation(partIndex, $event)"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </TransitionGroup>
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

    <!-- Rich Text Editor Modal -->
    <ClientOnly>
      <FullScreenEditor
        v-model="showInstructionsEditor"
        v-model:content="currentInstructionsContent"
        :title="getCurrentEditorTitle()"
        :subtitle="getCurrentEditorSubtitle()"
        placeholder="Write student instructions here. Use markdown: **bold**, *italic*, headings, lists, links..."
        :auto-save-enabled="false"
        @save="handleInstructionsSave"
        @close="handleInstructionsClose"
      />
    </ClientOnly>

    <!-- IP Table Dimension Modal -->
    <IpTableDimensionModal
      v-model:open="showIpTableDimensionModal"
      @create="handleIpTableDimensionCreate"
    />

    <!-- IP Table Builder Modal -->
    <IpTableBuilderModal
      v-model:open="showIpTableBuilderModal"
      :initial-data="currentEditingIpTable"
      :row-count="currentTableDimensions.rowCount"
      :column-count="currentTableDimensions.columnCount"
      :devices="devices"
      :vlans="vlans"
      @save="handleIpTableSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'
import { toast } from 'vue-sonner'
import {
  BookOpen,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  ChevronDown,
  Eye,
  Edit3,
  AlertCircle,
  Loader2,
  FileQuestion,
  Server,
  Network,
  Info,
  Table2,
  Check,
  Edit
} from 'lucide-vue-next'

// UI Components
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'

// Local Components
import TasksManager from './TasksManager.vue'
import FullScreenEditor from '@/components/editor/FullScreenEditor.vue'
import IpTableDimensionModal from './IpTableDimensionModal.vue'
import IpTableBuilderModal from './IpTableBuilderModal.vue'

// Types
import type { WizardLabPart, WizardTaskGroup, Device, TaskTemplate, ValidationResult, PartType, Question, IpTableQuestionnaire } from '@/types/wizard'

// Props
interface Props {
  modelValue: WizardLabPart[]
  devices: Device[]
  vlans: Array<{
    id?: string
    vlanId?: number
    calculationMultiplier?: number
    baseNetwork: string
    subnetMask: number
    subnetIndex: number
    groupModifier?: number
    isStudentGenerated: boolean
  }>
  validation?: ValidationResult
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: WizardLabPart[]): void
  (e: 'validate', result: ValidationResult): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localData = ref<WizardLabPart[]>([])
const taskTemplates = ref<TaskTemplate[]>([])
const isLoadingTemplates = ref(false)
const partFieldErrors = ref<Record<string, Record<string, string>>>({})
const taskValidationErrors = ref<Record<string, string[]>>({})
const isUpdatingFromProps = ref(false)
const isValidating = ref(false)
const isChangingPartType = ref(false) // NEW: Flag to prevent validation during part type change
const validationDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Rich Text Editor state
const showInstructionsEditor = ref(false)
const currentEditingPartIndex = ref<number | null>(null)
const currentInstructionsContent = ref('')

// IP Table Questionnaire state
const showIpTableDimensionModal = ref(false)
const showIpTableBuilderModal = ref(false)
const currentEditingPartIndexForTable = ref<number | null>(null)
const currentEditingQuestionIndexForTable = ref<number | null>(null)
const currentEditingIpTable = ref<IpTableQuestionnaire | undefined>(undefined)
const currentTableDimensions = ref({ rowCount: 3, columnCount: 4 })

// Methods
const generateTempId = (): string => {
  return 'temp_' + Math.random().toString(36).substr(2, 9)
}

const handlePartTitleChange = (partIndex: number, title: string) => {
  // Update the title
  localData.value[partIndex].title = title
  
  // Auto-generate partId from title
  if (title.trim()) {
    // Convert title to partId format (lowercase, spaces to hyphens, remove special chars)
    const generatedPartId = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s_-]/g, '') // Remove special characters except spaces, underscores, and hyphens
      .replace(/\s+/g, '-') // Replace one or more spaces with single hyphen
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore
      .replace(/-{2,}/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    
    // Always update partId to match the title (auto-generation)
    const currentPart = localData.value[partIndex]
    currentPart.partId = generatedPartId
  } else {
    // If title is empty, clear the partId
    localData.value[partIndex].partId = ''
  }
  
  // Validate the title field
  validatePart(partIndex, 'title')
}

const addPart = () => {
  const newPart: WizardLabPart = {
    tempId: generateTempId(),
    partId: '',
    title: '',
    description: '',
    instructions: '',
    order: localData.value.length + 1,
    partType: 'network_config',  // NEW: Default to network_config
    tasks: [],
    task_groups: [],
    prerequisites: [],
    totalPoints: 0,
    isExpanded: true,
    showInstructionsPreview: false
  }
  localData.value.push(newPart)
  validateStep()
}

const requestValidation = () => {
  if (!isUpdatingFromProps.value && !isValidating.value && !isChangingPartType.value) {
    debouncedValidateStep()
  }
}

const onPartTypeChange = (partIndex: number) => {
  // Set flag to prevent expensive validation during type change
  isChangingPartType.value = true

  const part = localData.value[partIndex]

  // Reset type-specific fields when changing part type
  if (part.partType === 'fill_in_blank') {
    // Initialize questions array if not exists
    if (!part.questions) {
      part.questions = []
    }
    // Clear DHCP config if exists
    part.dhcpConfiguration = undefined
    // Clear task validation errors (fill-in-blank doesn't use tasks)
    delete taskValidationErrors.value[partIndex]
  } else if (part.partType === 'dhcp_config') {
    // Clear questions if exists
    part.questions = undefined
    // Initialize DHCP configuration with defaults
    if (!part.dhcpConfiguration) {
      part.dhcpConfiguration = {
        vlanIndex: 0,
        startOffset: 100,
        endOffset: 150,
        dhcpServerDevice: ''
      }
    }
    // Clear task validation errors (dhcp_config doesn't use tasks)
    delete taskValidationErrors.value[partIndex]
  } else if (part.partType === 'network_config') {
    // Clear questions and DHCP config
    part.questions = undefined
    part.dhcpConfiguration = undefined
    // Task validation errors will be handled by TasksManager component
  }

  // Use nextTick to batch updates and clear flag
  nextTick(() => {
    // Clear flag first
    isChangingPartType.value = false

    // Then validate - this will trigger the watcher which calls debouncedValidateStep
    // No need to call debouncedValidateStep explicitly
    validatePart(partIndex, 'partType')
  })
}

// Question Management Functions
const generateQuestionId = (): string => {
  return 'q_' + Math.random().toString(36).substr(2, 9)
}

const addQuestion = (partIndex: number) => {
  const part = localData.value[partIndex]
  if (!part.questions) {
    part.questions = []
  }

  const newQuestion: Question = {
    questionId: generateQuestionId(),
    questionText: '',
    questionType: 'network_address',
    order: part.questions.length + 1,
    points: 5,
    schemaMapping: {
      vlanIndex: 0,
      field: 'networkAddress',
      autoDetected: false
    },
    expectedAnswerType: 'exact',
    placeholder: '',
    inputFormat: 'ip',
    expectedAnswer: '',
    caseSensitive: false,
    trimWhitespace: true
  }

  part.questions.push(newQuestion)
  updatePartTotalPointsFromQuestions(partIndex)
  toast.success('Question added successfully')
  requestValidation()
}

const removeQuestion = (partIndex: number, questionIndex: number) => {
  const part = localData.value[partIndex]
  if (part.questions) {
    part.questions.splice(questionIndex, 1)
    // Update order for remaining questions
    part.questions.forEach((q, idx) => {
      q.order = idx + 1
    })
    updatePartTotalPointsFromQuestions(partIndex)
    toast.success('Question removed')
    requestValidation()
  }
}

const moveQuestion = (partIndex: number, questionIndex: number, direction: number) => {
  const part = localData.value[partIndex]
  if (!part.questions) return

  const newIndex = questionIndex + direction
  if (newIndex >= 0 && newIndex < part.questions.length) {
    const question = part.questions.splice(questionIndex, 1)[0]
    part.questions.splice(newIndex, 0, question)
    // Update order
    part.questions.forEach((q, idx) => {
      q.order = idx + 1
    })
    requestValidation()
  }
}

// Auto-detect VLAN from question text
const onQuestionTextChange = (partIndex: number, questionIndex: number) => {
  const question = localData.value[partIndex].questions?.[questionIndex]
  if (!question) return

  if (question.questionType !== 'custom_text' && question.schemaMapping) {
    const text = question.questionText

    // Try to detect VLAN number using regex
    const vlanMatch = text.match(/VLAN\s*(\d+)/i)
    if (vlanMatch) {
      const vlanNumber = parseInt(vlanMatch[1])
      // Convert to 0-indexed (VLAN 1 → index 0)
      question.schemaMapping.vlanIndex = vlanNumber - 1
      question.schemaMapping.autoDetected = true
    } else {
      // No VLAN detected, keep current or default to 0
      if (question.schemaMapping.autoDetected) {
        question.schemaMapping.vlanIndex = 0
        question.schemaMapping.autoDetected = false
      }
    }

    // Auto-set field based on question type
    question.schemaMapping.field = getFieldFromQuestionType(question.questionType)
  }

  requestValidation()
}

const onQuestionTypeChange = (partIndex: number, questionIndex: number) => {
  const question = localData.value[partIndex].questions?.[questionIndex]
  if (!question) return

  if (question.questionType === 'ip_table_questionnaire') {
    // Remove schema mapping and custom text fields for IP table
    question.schemaMapping = undefined
    question.expectedAnswer = undefined
    question.caseSensitive = undefined
    question.trimWhitespace = undefined
    question.inputFormat = undefined
    question.placeholder = undefined
    // Initialize empty table questionnaire (will be configured via modal)
    question.ipTableQuestionnaire = undefined
    // Set default points (will be recalculated when table is created)
    question.points = 0
    requestValidation()
    return
  }

  // Clear IP table questionnaire if switching away from it
  if (question.ipTableQuestionnaire) {
    question.ipTableQuestionnaire = undefined
  }

  if (question.questionType === 'custom_text') {
    // Remove schema mapping when switching to custom text
    question.schemaMapping = undefined
    question.inputFormat = 'text'
    if (typeof question.expectedAnswer !== 'string') {
      question.expectedAnswer = ''
    }
    if (typeof question.caseSensitive !== 'boolean') {
      question.caseSensitive = false
    }
    if (typeof question.trimWhitespace !== 'boolean') {
      question.trimWhitespace = true
    }
    if (!question.placeholder) {
      question.placeholder = 'Type your answer here'
    }
    requestValidation()
    return
  }

  // Ensure schema mapping exists for networking questions
  if (!question.schemaMapping) {
    question.schemaMapping = {
      vlanIndex: 0,
      field: getFieldFromQuestionType(question.questionType),
      autoDetected: false
    }
  } else {
    // Auto-map to schema field
    question.schemaMapping.field = getFieldFromQuestionType(question.questionType)
  }

  // Auto-set input format based on question type
  if (question.questionType === 'subnet_mask') {
    question.inputFormat = 'cidr'
  } else if (question.questionType === 'number') {
    question.inputFormat = 'number'
  } else {
    question.inputFormat = 'ip'
  }

  requestValidation()
}

const getFieldFromQuestionType = (type: string): string => {
  const mapping: Record<string, string> = {
    'network_address': 'networkAddress',
    'first_usable_ip': 'firstUsableIp',
    'last_usable_ip': 'lastUsableIp',
    'broadcast_address': 'broadcastAddress',
    'subnet_mask': 'subnetMask',
    'ip_address': 'networkAddress', // Default to network address
    'number': 'subnetMask' // Default to subnet mask for numbers
  }
  return mapping[type] || 'networkAddress'
}

const getFieldName = (questionType: string): string => {
  return getFieldFromQuestionType(questionType)
}

const updatePartTotalPointsFromQuestions = (partIndex: number) => {
  const part = localData.value[partIndex]
  if (part.questions) {
    const total = part.questions.reduce((sum, q) => sum + (q.points || 0), 0)
    part.totalPoints = total
  }
}

const onQuestionPointsChange = (partIndex: number) => {
  updatePartTotalPointsFromQuestions(partIndex)
  requestValidation()
}

const onExpectedAnswerChange = (partIndex: number, questionIndex: number) => {
  const question = localData.value[partIndex].questions?.[questionIndex]
  if (!question) return
  if (typeof question.trimWhitespace === 'undefined') {
    question.trimWhitespace = true
  }
  if (typeof question.caseSensitive === 'undefined') {
    question.caseSensitive = false
  }
  requestValidation()
}

const onCaseSensitiveToggle = (partIndex: number, questionIndex: number, value: boolean) => {
  const question = localData.value[partIndex].questions?.[questionIndex]
  if (!question) return
  question.caseSensitive = value
  requestValidation()
}

const onTrimWhitespaceToggle = (partIndex: number, questionIndex: number, value: boolean) => {
  const question = localData.value[partIndex].questions?.[questionIndex]
  if (!question) return
  question.trimWhitespace = value
  requestValidation()
}

const onVlanIndexChange = (partIndex: number, questionIndex: number, value: number | string) => {
  const question = localData.value[partIndex].questions?.[questionIndex]
  if (!question || !question.schemaMapping) return
  question.schemaMapping.autoDetected = false
  question.schemaMapping.vlanIndex = typeof value === 'string' ? Number(value) : value
  requestValidation()
}

// IP Table Questionnaire Management Functions
const openIpTableDimensionModal = (partIndex: number, questionIndex: number) => {
  currentEditingPartIndexForTable.value = partIndex
  currentEditingQuestionIndexForTable.value = questionIndex
  showIpTableDimensionModal.value = true
}

const handleIpTableDimensionCreate = (dimensions: { rowCount: number; columnCount: number }) => {
  currentTableDimensions.value = dimensions
  currentEditingIpTable.value = undefined // Start fresh
  showIpTableBuilderModal.value = true
}

const editIpTable = (partIndex: number, questionIndex: number) => {
  const question = localData.value[partIndex].questions?.[questionIndex]
  if (!question || !question.ipTableQuestionnaire) return

  currentEditingPartIndexForTable.value = partIndex
  currentEditingQuestionIndexForTable.value = questionIndex
  currentEditingIpTable.value = question.ipTableQuestionnaire
  currentTableDimensions.value = {
    rowCount: question.ipTableQuestionnaire.rowCount,
    columnCount: question.ipTableQuestionnaire.columnCount
  }
  showIpTableBuilderModal.value = true
}

const handleIpTableSave = (tableData: IpTableQuestionnaire) => {
  if (
    currentEditingPartIndexForTable.value === null ||
    currentEditingQuestionIndexForTable.value === null
  ) {
    return
  }

  const part = localData.value[currentEditingPartIndexForTable.value]
  const question = part.questions?.[currentEditingQuestionIndexForTable.value]

  if (!question) return

  // Save the table data
  question.ipTableQuestionnaire = tableData

  // Calculate and update total points for this question
  const totalPoints = calculateTablePoints(tableData)
  question.points = totalPoints

  // Update part total points
  updatePartTotalPointsFromQuestions(currentEditingPartIndexForTable.value)

  // Clear editing state
  currentEditingPartIndexForTable.value = null
  currentEditingQuestionIndexForTable.value = null
  currentEditingIpTable.value = undefined

  requestValidation()
}

const deleteIpTable = (partIndex: number, questionIndex: number) => {
  const question = localData.value[partIndex].questions?.[questionIndex]
  if (!question) return

  question.ipTableQuestionnaire = undefined
  question.points = 0

  updatePartTotalPointsFromQuestions(partIndex)
  toast.success('IP Table deleted successfully')
  requestValidation()
}

const previewIpTable = (partIndex: number, questionIndex: number) => {
  toast.info('Preview feature coming soon!')
  // TODO: Implement preview modal
}

const calculateTablePoints = (table: IpTableQuestionnaire): number => {
  return table.cells.reduce((total, row) => {
    return total + row.reduce((rowTotal, cell) => {
      if (cell.cellType === 'input') {
        return rowTotal + (cell.points || 0)
      }
      return rowTotal
    }, 0)
  }, 0)
}

// DHCP Configuration Functions
const getVlanBaseNetwork = (vlanIndex: number): string => {
  if (vlanIndex < 0 || vlanIndex >= props.vlans.length) {
    return 'N/A'
  }
  const vlan = props.vlans[vlanIndex]
  return `${vlan.baseNetwork}/${vlan.subnetMask}`
}

const calculateIpFromOffset = (vlanIndex: number, offset: number): string => {
  if (vlanIndex < 0 || vlanIndex >= props.vlans.length) {
    return 'Invalid VLAN'
  }

  const vlan = props.vlans[vlanIndex]
  const baseIp = vlan.baseNetwork
  const parts = baseIp.split('.')

  if (parts.length !== 4) {
    return 'Invalid IP'
  }

  // Show format: {1st octet}.x.x.{offset}
  return `${parts[0]}.x.x.${offset}`
}

interface DhcpOffsetBounds {
  min: number
  max: number
}

const DEFAULT_DHCP_OFFSET_BOUNDS: DhcpOffsetBounds = { min: 1, max: 254 }

const getDhcpOffsetBounds = (vlanIndex: number | undefined | null): DhcpOffsetBounds => {
  if (vlanIndex === undefined || vlanIndex === null) {
    return DEFAULT_DHCP_OFFSET_BOUNDS
  }

  if (vlanIndex < 0 || vlanIndex >= props.vlans.length) {
    return DEFAULT_DHCP_OFFSET_BOUNDS
  }

  const vlan = props.vlans[vlanIndex]
  const subnetMask = vlan.subnetMask ?? 24
  const blockSize = Math.pow(2, 32 - subnetMask)
  const subnetIndexZeroBased = Math.max(0, (vlan.subnetIndex ?? 1) - 1)
  const networkStart = subnetIndexZeroBased * blockSize

  const firstHost = networkStart + 1
  const lastHost = networkStart + Math.max(0, blockSize - 2)

  const min = Math.min(254, Math.max(1, firstHost))
  const boundedLastHost = Math.min(254, Math.max(1, lastHost))
  const max = Math.max(min, boundedLastHost)

  return { min, max }
}

const formatDhcpOffsetRange = (vlanIndex: number | undefined | null): string => {
  const { min, max } = getDhcpOffsetBounds(vlanIndex)
  return `${min}-${max}`
}

const handleDhcpVlanChange = (partIndex: number, vlanIndex: number) => {
  const part = localData.value[partIndex]
  if (!part?.dhcpConfiguration) return

  part.dhcpConfiguration.vlanIndex = vlanIndex

  requestValidation()

  if (part.dhcpConfiguration.startOffset && part.dhcpConfiguration.endOffset) {
    validateDhcpOffsetRange(partIndex)
  }
}

const validateDhcpOffsetRange = (partIndex: number) => {
  const part = localData.value[partIndex]
  if (!part.dhcpConfiguration) return

  const { startOffset, endOffset, vlanIndex } = part.dhcpConfiguration
  const { min, max } = getDhcpOffsetBounds(vlanIndex)

  if (!startOffset || !endOffset) return

  if (startOffset < min || startOffset > max) {
    toast.error(`Start offset must be between ${min} and ${max} for the selected VLAN`)
    requestValidation()
    return
  }

  if (endOffset < min || endOffset > max) {
    toast.error(`End offset must be between ${min} and ${max} for the selected VLAN`)
    requestValidation()
    return
  }

  if (startOffset >= endOffset) {
    toast.error('Start offset must be less than End offset')
  }

  requestValidation()
}

const calculateDhcpPoolSizeFromOffsets = (startOffset: number, endOffset: number): number => {
  if (!startOffset || !endOffset) return 0
  return Math.max(0, endOffset - startOffset + 1)
}

const removePart = (partIndex: number) => {
  localData.value.splice(partIndex, 1)
  // Update order for remaining parts
  localData.value.forEach((part, index) => {
    part.order = index + 1
  })
  // Clean up errors
  delete partFieldErrors.value[partIndex]
  delete taskValidationErrors.value[partIndex]
  validateStep()
}

const movePart = (partIndex: number, direction: number) => {
  const newIndex = partIndex + direction
  if (newIndex >= 0 && newIndex < localData.value.length) {
    const part = localData.value.splice(partIndex, 1)[0]
    localData.value.splice(newIndex, 0, part)
    // Update order
    localData.value.forEach((part, index) => {
      part.order = index + 1
    })
  }
}

const togglePartExpansion = (partIndex: number) => {
  localData.value[partIndex].isExpanded = !localData.value[partIndex].isExpanded
}

const toggleInstructionsPreview = (partIndex: number) => {
  const part = localData.value[partIndex]
  part.showInstructionsPreview = !part.showInstructionsPreview
}

const renderMarkdown = (content: string): string => {
  if (!content) return '<p class="text-muted-foreground">No instructions provided</p>'
  
  try {
    return marked(content, {
      breaks: true,
      gfm: true
    })
  } catch (error) {
    return `<p class="text-destructive">Error rendering markdown: ${error}</p>`
  }
}

const getPrerequisitesDisplayText = (prerequisites: string[]): string => {
  if (!prerequisites || prerequisites.length === 0) return ''
  
  const displayNames = prerequisites.map(prereqId => {
    const part = localData.value.find(p => p.partId === prereqId || p.tempId === prereqId)
    if (part) {
      return part.partId || part.title || `Part ${localData.value.indexOf(part) + 1}`
    }
    return prereqId
  })
  
  return displayNames.join(', ')
}

const updatePartTotalPoints = (partIndex: number, totalPoints: number) => {
  if (localData.value[partIndex]) {
    localData.value[partIndex].totalPoints = totalPoints
  }
}

const handleTasksValidation = (partIndex: number, errors: string[]) => {
  taskValidationErrors.value[partIndex] = errors
  // Don't call validateStep() here - it will be called by the debounced watcher
}

const updatePartTaskGroups = (partIndex: number, taskGroups: WizardTaskGroup[]) => {
  if (localData.value[partIndex]) {
    localData.value[partIndex].task_groups = taskGroups
  }
}

// Rich Text Editor methods
const openInstructionsEditor = (partIndex: number) => {
  currentEditingPartIndex.value = partIndex
  currentInstructionsContent.value = localData.value[partIndex].instructions
  showInstructionsEditor.value = true
}

const handleInstructionsSave = (content: string) => {
  if (currentEditingPartIndex.value !== null) {
    localData.value[currentEditingPartIndex.value].instructions = content
    validatePart(currentEditingPartIndex.value, 'instructions')
  }
}

const handleInstructionsClose = (content: string) => {
  if (currentEditingPartIndex.value !== null) {
    localData.value[currentEditingPartIndex.value].instructions = content
    validatePart(currentEditingPartIndex.value, 'instructions')
  }

  // Reset editor state
  currentEditingPartIndex.value = null
  currentInstructionsContent.value = ''
  showInstructionsEditor.value = false
}

const getInstructionsStats = (content: string) => {
  const text = content.replace(/<[^>]*>/g, '').trim() // Strip HTML tags
  const words = text.split(/\s+/).filter(word => word.length > 0).length
  const characters = text.length

  return {
    words,
    characters
  }
}

const getCurrentEditorTitle = (): string => {
  if (currentEditingPartIndex.value === null) return 'Student Instructions'

  const part = localData.value[currentEditingPartIndex.value]
  return part.title || `Part ${currentEditingPartIndex.value + 1} Instructions`
}

const getCurrentEditorSubtitle = (): string => {
  if (currentEditingPartIndex.value === null) return ''

  const part = localData.value[currentEditingPartIndex.value]
  const partInfo = `Part ${currentEditingPartIndex.value + 1}`
  const partId = part.partId ? ` (${part.partId})` : ''

  return `${partInfo}${partId} - Student Instructions`
}

const hasPartErrors = (partIndex: number): boolean => {
  return !!partFieldErrors.value[partIndex] || !!(taskValidationErrors.value[partIndex]?.length > 0)
}

const hasPartFieldError = (partIndex: number, field: string): boolean => {
  return !!(partFieldErrors.value[partIndex]?.[field])
}

const getPartFieldError = (partIndex: number, field: string): string => {
  return partFieldErrors.value[partIndex]?.[field] || ''
}

const isPartValid = (part: WizardLabPart): boolean => {
  const basicValid = part.partId.length > 0 &&
                     part.title.length > 0 &&
                     part.instructions.length > 0

  // Different validation based on part type
  if (part.partType === 'network_config') {
    return basicValid && part.tasks.length > 0
  } else if (part.partType === 'fill_in_blank') {
    return basicValid && (part.questions?.length || 0) > 0
  } else if (part.partType === 'dhcp_config') {
    return basicValid && !!part.dhcpConfiguration
  }

  return basicValid
}

const validatePart = (partIndex: number, field: string) => {
  if (!partFieldErrors.value[partIndex]) {
    partFieldErrors.value[partIndex] = {}
  }

  const part = localData.value[partIndex]

  switch (field) {
    case 'partType':
      if (!part.partType) {
        partFieldErrors.value[partIndex].partType = 'Part type is required'
      } else if (!['fill_in_blank', 'network_config', 'dhcp_config'].includes(part.partType)) {
        partFieldErrors.value[partIndex].partType = 'Invalid part type'
      } else {
        delete partFieldErrors.value[partIndex].partType
      }
      break

    case 'partId':
      if (!part.partId.trim()) {
        partFieldErrors.value[partIndex].partId = 'Part ID is required'
      } else if (!/^[a-z0-9-]+$/.test(part.partId)) {
        partFieldErrors.value[partIndex].partId = 'Part ID must be lowercase alphanumeric with hyphens'
      } else if (localData.value.some((p, i) => i !== partIndex && p.partId === part.partId)) {
        partFieldErrors.value[partIndex].partId = 'Part ID must be unique'
      } else {
        delete partFieldErrors.value[partIndex].partId
      }
      break

    case 'title':
      if (!part.title.trim()) {
        partFieldErrors.value[partIndex].title = 'Part title is required'
      } else if (part.title.length > 200) {
        partFieldErrors.value[partIndex].title = 'Part title must be 200 characters or less'
      } else {
        delete partFieldErrors.value[partIndex].title
      }
      break

    case 'instructions':
      if (!part.instructions.trim()) {
        partFieldErrors.value[partIndex].instructions = 'Student instructions are required'
      } else if (part.instructions.length > 10000) {
        partFieldErrors.value[partIndex].instructions = 'Instructions must be 10000 characters or less'
      } else {
        delete partFieldErrors.value[partIndex].instructions
      }
      break

    case 'description':
      if (part.description && part.description.length > 2000) {
        partFieldErrors.value[partIndex].description = 'Description must be 2000 characters or less'
      } else {
        delete partFieldErrors.value[partIndex].description
      }
      break
  }

  // Don't call validateStep() here to avoid circular calls
  // Individual validation is handled, step validation should be triggered separately
}

const validateStep = () => {
  if (isValidating.value || isChangingPartType.value) return // Prevent recursive validation and validation during part type change
  isValidating.value = true

  try {
    // Validate all parts
    localData.value.forEach((part, index) => {
      validatePart(index, 'partType')
      validatePart(index, 'partId')
      validatePart(index, 'title')
      validatePart(index, 'instructions')
      validatePart(index, 'description')
    })

    const errors: string[] = []

    if (localData.value.length === 0) {
      errors.push('At least one lab part is required')
    }

    // Collect part field errors
    Object.values(partFieldErrors.value).forEach(partErrors => {
      errors.push(...Object.values(partErrors))
    })

    // Additional validation for fill-in-the-blank parts
    localData.value.forEach((part, partIndex) => {
      if (part.partType !== 'fill_in_blank') return

      const partLabel = part.title || part.partId || `Part ${partIndex + 1}`

      // Check if VLANs are configured
      if (props.vlans.length === 0) {
        errors.push(`${partLabel}: Cannot create Fill-in-Blank part without configuring VLANs in Step 2`)
        return
      }

      if (!part.questions || part.questions.length === 0) {
        errors.push(`${partLabel}: At least one question is required`)
        return
      }

      part.questions.forEach((question, qIndex) => {
        const questionLabel = `Question ${qIndex + 1}`

        if (!question.questionText || !question.questionText.trim()) {
          errors.push(`${partLabel} • ${questionLabel}: Question text is required`)
        }

        if (!question.points || question.points <= 0) {
          errors.push(`${partLabel} • ${questionLabel}: Points must be greater than zero`)
        }

        if (!question.questionType) {
          errors.push(`${partLabel} • ${questionLabel}: Question type is required`)
        }

        // Validate inputFormat enum if provided
        if (question.inputFormat && !['ip', 'cidr', 'number', 'text'].includes(question.inputFormat)) {
          errors.push(`${partLabel} • ${questionLabel}: Invalid input format '${question.inputFormat}'. Must be one of: ip, cidr, number, text`)
        }

        if (question.questionType === 'custom_text') {
          if (!question.expectedAnswer || !question.expectedAnswer.trim()) {
            errors.push(`${partLabel} • ${questionLabel}: Expected answer is required for custom text questions`)
          }
        } else if (question.questionType === 'ip_table_questionnaire') {
          // IP Table Questionnaire validation is handled by the IpTableBuilderModal
          // Only check if the table is configured
          if (!question.ipTableQuestionnaire) {
            errors.push(`${partLabel} • ${questionLabel}: IP table questionnaire must be configured`)
          }
        } else {
          if (!question.schemaMapping) {
            errors.push(`${partLabel} • ${questionLabel}: Schema mapping is required for networking questions`)
          } else if (question.schemaMapping.vlanIndex === undefined || question.schemaMapping.vlanIndex < 0) {
            errors.push(`${partLabel} • ${questionLabel}: Target VLAN must be specified`)
          } else if (question.schemaMapping.vlanIndex >= props.vlans.length) {
            errors.push(`${partLabel} • ${questionLabel}: Target VLAN index ${question.schemaMapping.vlanIndex} exceeds configured VLANs (max: ${props.vlans.length - 1})`)
          }
        }
      })
    })

    localData.value.forEach((part, partIndex) => {
      if (part.partType !== 'dhcp_config') return

      const partLabel = part.title || part.partId || `Part ${partIndex + 1}`
      const config = part.dhcpConfiguration

      // Check if VLANs are configured
      if (props.vlans.length === 0) {
        errors.push(`${partLabel}: Cannot create DHCP Configuration part without configuring VLANs in Step 2`)
        return
      }

      if (!config) {
        errors.push(`${partLabel}: DHCP configuration is required`)
        return
      }

      if (config.vlanIndex === undefined || config.vlanIndex < 0) {
        errors.push(`${partLabel}: VLAN index is required`)
      } else if (config.vlanIndex >= props.vlans.length) {
        errors.push(`${partLabel}: VLAN index ${config.vlanIndex} exceeds configured VLANs (max: ${props.vlans.length - 1})`)
      }

      const bounds = getDhcpOffsetBounds(config.vlanIndex)
      const rangeText = `${bounds.min}-${bounds.max}`

      if (config.startOffset === undefined || config.startOffset === null) {
        errors.push(`${partLabel}: Start offset is required`)
      } else if (config.startOffset < bounds.min || config.startOffset > bounds.max) {
        errors.push(`${partLabel}: Start offset must be between ${rangeText} for the selected VLAN`)
      }

      if (config.endOffset === undefined || config.endOffset === null) {
        errors.push(`${partLabel}: End offset is required`)
      } else if (config.endOffset < bounds.min || config.endOffset > bounds.max) {
        errors.push(`${partLabel}: End offset must be between ${rangeText} for the selected VLAN`)
      }

      if (
        config.startOffset !== undefined &&
        config.startOffset !== null &&
        config.endOffset !== undefined &&
        config.endOffset !== null &&
        config.startOffset >= config.endOffset
      ) {
        errors.push(`${partLabel}: Start offset must be lower than End offset`)
      }

      if (!config.dhcpServerDevice || !config.dhcpServerDevice.trim()) {
        errors.push(`${partLabel}: DHCP server device is required`)
      } else if (!props.devices.some(d => d.deviceId === config.dhcpServerDevice)) {
        errors.push(`${partLabel}: Selected DHCP server device '${config.dhcpServerDevice}' does not exist in configured devices`)
      }
    })

    // Collect task validation errors ONLY for network_config parts
    localData.value.forEach((part, index) => {
      if (part.partType === 'network_config' && taskValidationErrors.value[index]) {
        errors.push(...taskValidationErrors.value[index])
      }
    })

    const isValid = errors.length === 0

    const validationResult: ValidationResult = {
      isValid,
      errors
    }

    emit('validate', validationResult)
  } finally {
    isValidating.value = false
  }
}

// NEW: Debounced version of validateStep to prevent rapid consecutive calls
const debouncedValidateStep = () => {
  if (validationDebounceTimer.value) {
    clearTimeout(validationDebounceTimer.value)
  }

  validationDebounceTimer.value = setTimeout(() => {
    validateStep()
  }, 150) // 150ms debounce - fast enough for good UX, slow enough to prevent lag
}

const loadTaskTemplates = async () => {
  isLoadingTemplates.value = true
  try {
    const config = useRuntimeConfig()
    const response = await $fetch(`${config.public.backendurl}/v0/task-templates`, {
      credentials: 'include'
    })

    if (response.success && response.data.templates) {
      taskTemplates.value = response.data.templates
    }
  } catch (error) {
    console.error('Failed to load task templates:', error)
    toast.error('Failed to load task templates. Please refresh the page.')
  } finally {
    isLoadingTemplates.value = false
  }
}

// Watchers
watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value && !isChangingPartType.value) {
      // Convert to regular WizardLabPart array (remove UI-specific props for parent)
      const cleanParts = newValue.map(({ showInstructionsPreview, ...part }) => part)
      emit('update:modelValue', cleanParts)

      if (!isValidating.value) {
        debouncedValidateStep()
      }
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (isUpdatingFromProps.value) return // Prevent recursive updates
    
    isUpdatingFromProps.value = true
    
    // Add UI-specific props to parts without accessing current localData to avoid recursion
    localData.value = newValue.map((part) => ({
      ...part,
      showInstructionsPreview: false, // Reset to default to avoid recursion
      tempId: part.tempId || generateTempId()
    }))
    
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  },
  { deep: true }
)

// Separate watchers for validation - optimized to prevent lag during part type switching
// Watch error objects deeply (they're small and need deep watching for nested changes)
watch(
  () => partFieldErrors.value,
  () => {
    if (!isUpdatingFromProps.value && !isValidating.value && !isChangingPartType.value) {
      debouncedValidateStep()
    }
  },
  { deep: true } // Keep deep watching for error objects - they're small
)

watch(
  () => taskValidationErrors.value,
  () => {
    if (!isUpdatingFromProps.value && !isValidating.value && !isChangingPartType.value) {
      debouncedValidateStep()
    }
  },
  { deep: true } // Keep deep watching for task errors - they're small
)

// Watch localData length (shallow) - only care when parts are added/removed
watch(
  () => localData.value.length,
  () => {
    if (!isUpdatingFromProps.value && !isValidating.value && !isChangingPartType.value) {
      debouncedValidateStep()
    }
  }
  // No deep watching needed for length - it's just a number
)

// Lifecycle
onMounted(async () => {
  await loadTaskTemplates()

  // Initialize with existing parts if any
  if (props.modelValue.length > 0) {
    localData.value = props.modelValue.map(part => ({
      ...part,
      showInstructionsPreview: false,
      tempId: generateTempId()
    }))
  }

  validateStep()
})

// Cleanup on unmount
onUnmounted(() => {
  // Clear any pending validation timers
  if (validationDebounceTimer.value) {
    clearTimeout(validationDebounceTimer.value)
  }
})
</script>

<style scoped>
/* Part transition animations */
.part-enter-active,
.part-leave-active {
  transition: all 0.3s ease;
}

.part-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.part-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Markdown preview styles */
:deep(.prose) {
  color: hsl(var(--foreground));
}

:deep(.prose h1) {
  color: hsl(var(--foreground));
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
}

:deep(.prose h2) {
  color: hsl(var(--foreground));
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.prose p) {
  margin-bottom: 1rem;
  line-height: 1.6;
}

:deep(.prose ul) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

:deep(.prose li) {
  margin-bottom: 0.25rem;
}
</style>
