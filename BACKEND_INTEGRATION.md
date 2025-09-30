# Backend Integration Guide for Enhanced Multi-Phase VLAN System with Management and VLAN-Specific IPs

## 🎯 Overview

This document outlines the required backend changes to support the enhanced flexible multi-phase VLAN system with lecturer-defined base networks, management IP generation, and VLAN-specific IP generation with interface offset support. The frontend has been updated to support all three course phases with customizable VLAN configurations and enhanced IP variable options.

## 🔄 Required Backend API Updates

### 🆕 Key Changes in Frontend Data Submission

The frontend has been updated to submit enhanced data structures for lab creation:

#### 1. **Management Network as Base Network**
- **Before**: Used `baseNetwork` from Step 2
- **After**: Uses `managementNetwork` from Step 2 as the `baseNetwork` in the payload
- **Impact**: Backend receives management network configuration as the primary network topology

#### 2. **VLAN Configuration Data**
- **Added**: Complete VLAN configuration from Step 2 is now included in the lab creation payload
- **Structure**: `vlanConfiguration` object with mode, vlanCount, and vlans array
- **Purpose**: Backend can process VLAN-specific IP generation and assignment

#### 3. **Interface Type Marking**
- **Added**: `isManagementInterface` flag for management interfaces
- **Added**: `isVlanInterface` flag for VLAN-specific interfaces  
- **Added**: `vlanIndex` and `interfaceOffset` for VLAN interface configuration
- **Purpose**: Backend can identify which interfaces require management IP vs VLAN IP generation

#### 4. **Enhanced IP Variable Structure**
```json
{
  "name": "mgmt_interface",
  "interface": "GigabitEthernet0/0",
  "inputType": "studentManagement",
  "isManagementInterface": true,     // 🆕 NEW: Marks management interface
  "isVlanInterface": false,          // 🆕 NEW: Marks VLAN interface
  "vlanIndex": null,
  "interfaceOffset": null
}
```

## 🔄 Required Backend API Updates

### 1. Enhanced Lab Creation Endpoint

**Endpoint**: `POST /v0/labs`

**New Request Structure**:
```json
{
  "courseId": "aLg0B5jPrFW47ICP",
  "title": "Enhanced OSPF Lab",
  "description": "Students will configure OSPF with management and VLAN IPs",
  "type": "lab",
  "dueDate": "2024-12-15T23:59:59.000Z",
  "availableFrom": "2024-12-01T00:00:00.000Z",
  "availableUntil": "2024-12-16T23:59:59.000Z",

  // 🆕 UPDATED: Enhanced Network Structure with VLAN Configuration
  "network": {
    "name": "Enhanced OSPF Lab",
    "topology": {
      // 🆕 CHANGED: Use managementNetwork as baseNetwork
      "baseNetwork": "10.0.0.0",           // Now uses managementNetwork from Step 2
      "subnetMask": 24,                    // Now uses managementSubnetMask from Step 2
      "allocationStrategy": "group_based"
    },
    // 🆕 ADDED: VLAN Configuration Data
    "vlanConfiguration": {
      "mode": "fixed_vlan",                // From Step 2 networkConfig.mode
      "vlanCount": 3,                      // From Step 2 networkConfig.vlanCount
      "vlans": [
        {
          "id": "vlan_1731840123456_abc123def",
          "vlanId": 1,                     // For fixed_vlan and lecturer_group modes
          "calculationMultiplier": 400,    // For calculated_vlan mode
          "baseNetwork": "192.168.0.0",
          "subnetMask": 26,
          "groupModifier": 0,              // For lecturer_group mode
          "isStudentGenerated": true
        },
        {
          "id": "vlan_1731840123456_def456ghi",
          "vlanId": 2,
          "baseNetwork": "172.16.0.0",
          "subnetMask": 24,
          "groupModifier": 10,
          "isStudentGenerated": true
        }
      ]
    },
    "devices": [
      {
        "deviceId": "router1",
        "templateId": "507f1f77bcf86cd799439012",
        "displayName": "router1",
        "ipVariables": [
          {
            "name": "mgmt_interface",
            "interface": "GigabitEthernet0/0",
            "inputType": "studentManagement",
            "isManagementInterface": true,     // 🆕 NEW: Marks management interface
            "isVlanInterface": false,          // 🆕 NEW: Marks VLAN interface
            "vlanIndex": null,
            "interfaceOffset": null
          },
          {
            "name": "gig0_0_vlan_1",
            "interface": "GigabitEthernet0/1",
            "inputType": "studentVlan0",       // VLAN-specific type
            "isManagementInterface": false,    // 🆕 NEW: Not management interface
            "isVlanInterface": true,           // 🆕 NEW: Marks as VLAN interface
            "vlanIndex": 0,                    // Which VLAN this variable belongs to
            "interfaceOffset": 1,              // Interface offset for same VLAN
            "description": "VLAN 1 interface IP"
          },
          {
            "name": "gig0_1_vlan_1",
            "interface": "GigabitEthernet0/2",
            "inputType": "studentVlan0",       // Same VLAN as above
            "isManagementInterface": false,    // 🆕 NEW: Not management interface
            "isVlanInterface": true,           // 🆕 NEW: Marks as VLAN interface
            "vlanIndex": 0,
            "interfaceOffset": 2,              // Different offset for unique IP
            "description": "VLAN 1 secondary interface IP"
          },
          {
            "name": "gig1_0_vlan_2",
            "interface": "GigabitEthernet1/0",
            "inputType": "studentVlan1",       // Different VLAN
            "isManagementInterface": false,    // 🆕 NEW: Not management interface
            "isVlanInterface": true,           // 🆕 NEW: Marks as VLAN interface
            "vlanIndex": 1,
            "interfaceOffset": 1,
            "description": "VLAN 2 interface IP"
          },
          {
            "name": "static_ip",
            "interface": "Loopback0",
            "inputType": "hostOffset",
            "isManagementInterface": false,    // 🆕 NEW: Not management interface
            "isVlanInterface": false,          // 🆕 NEW: Not VLAN interface
            "hostOffset": 5,
            "description": "Static IP using host offset"
          },
          {
            "name": "custom_ip",
            "interface": "Loopback1",
            "inputType": "fullIP",
            "isManagementInterface": false,    // 🆕 NEW: Not management interface
            "isVlanInterface": false,          // 🆕 NEW: Not VLAN interface
            "fullIp": "203.0.113.10",
            "description": "Custom fixed IP"
          }
        ],
        "credentials": {
          "usernameTemplate": "admin",
          "passwordTemplate": "cisco",
          "enablePassword": ""
        }
      }
    ]
  }
}
```

### 2. Enhanced Part Creation Endpoint

**Endpoint**: `POST /v0/parts`

**New Request Structure**:
```json
{
  "labId": "507f1f77bcf86cd799439013",
  "partId": "enhanced-config",
  "title": "Enhanced Network Configuration",
  "description": "Configure management and VLAN interfaces",
  "instructions": "# Part 1: Enhanced Setup\n\n1. Configure management IP\n2. Set VLAN interface IPs\n3. Test connectivity",
  "order": 1,
  "tasks": [
    {
      "taskId": "management-config",
      "name": "Configure Management Interface",
      "description": "Set management interface IP",
      "templateId": "507f1f77bcf86cd799439014",
      "executionDevice": "router1",
      "targetDevices": ["router1"],
      "parameters": {
        "interface": "mgmt0",
        "ip_variable": "mgmt_interface"    // References the management IP variable
      },
      "testCases": [
        {
          "comparison_type": "contains",
          "expected_result": "interface mgmt0"
        }
      ],
      "order": 1,
      "points": 15
    },
    {
      "taskId": "vlan-interface-config",
      "name": "Configure VLAN Interfaces",
      "description": "Set VLAN interface IPs",
      "templateId": "507f1f77bcf86cd799439015",
      "executionDevice": "router1",
      "targetDevices": ["router1"],
      "parameters": {
        "vlan1_interface": "gig0_0_vlan_1",
        "vlan1_secondary": "gig0_1_vlan_1",
        "vlan2_interface": "gig1_0_vlan_2"
      },
      "testCases": [
        {
          "comparison_type": "contains",
          "expected_result": "interface GigabitEthernet0/0"
        }
      ],
      "order": 2,
      "points": 25
    },
    {
      "taskId": "ping-connectivity-test",
      "name": "Ping Connectivity Test",
      "description": "Test connectivity to specified IP addresses",
      "templateId": "507f1f77bcf86cd799439016",
      "executionDevice": "router1",
      "targetDevices": ["router1"],
      "parameters": {
        "target_ip": "router2.loopback0",        // 🆕 IP variable reference
        "external_ip": "8.8.8.8",               // 🆕 Custom IP address
        "internal_target": "192.168.1.10"       // 🆕 Custom internal IP
      },
      "testCases": [
        {
          "comparison_type": "contains",
          "expected_result": "Success rate is 100 percent"
        }
      ],
      "order": 3,
      "points": 20
    }
  ],
  "task_groups": [],
  "prerequisites": [],
  "totalPoints": 60
}
```

## 🆕 Frontend IP Parameter Feature (Issue #8)

### New Task Template Parameter Support

**Frontend Enhancement**: The frontend now supports specialized IP address parameters in task templates. When a task template parameter has `type: "ip_address"`, the frontend provides a user-friendly interface for selecting IP variables or entering custom IP addresses.

#### Parameter Types Supported:
```json
{
  "parameterSchema": [
    {
      "name": "target_ip",
      "type": "ip_address",           // 🆕 Triggers IP parameter selector
      "description": "IP address to ping for connectivity test",
      "required": true
    }
  ]
}
```

#### Frontend Parameter Value Formats:

**1. IP Variable References** (DeviceID.VariableName):
```json
{
  "parameters": {
    "target_ip": "router1.loopback0",     // References device router1, variable loopback0
    "gateway_ip": "switch1.vlan1",        // References device switch1, variable vlan1
    "peer_ip": "router2.gig0_0"           // References device router2, variable gig0_0
  }
}
```

**2. Custom IP Addresses** (Direct IPv4):
```json
{
  "parameters": {
    "external_dns": "8.8.8.8",           // External Internet IP
    "internal_server": "192.168.1.100",  // Internal custom IP
    "test_target": "203.0.113.50"        // Custom test IP
  }
}
```

#### Backend Processing Requirements:

**Variable Reference Resolution**: When receiving a parameter value like `"router1.loopback0"`:
1. Parse the format: `deviceId.variableName`
2. Look up the actual IP value from the device's IP variables
3. Replace the reference with the resolved IP address during task execution

**Custom IP Validation**: When receiving direct IP addresses:
1. Validate IPv4 format
2. Ensure IP is accessible from the lab network (optional security check)
3. Use the IP address directly in task execution

**Example Backend Resolution**:
```javascript
// Frontend sends:
{
  "parameters": {
    "target_ip": "router2.loopback0",
    "external_ip": "8.8.8.8"
  }
}

// Backend resolves to:
{
  "parameters": {
    "target_ip": "10.1.1.2",    // Resolved from router2.loopback0
    "external_ip": "8.8.8.8"    // Used directly
  }
}
```

## 🔧 Backend Processing Requirements

### 1. Complex Network Mode Processing

The backend must support three distinct network modes:

#### Fixed VLAN Mode
- **Description**: Traditional VLAN assignment with fixed VLAN IDs
- **Processing**: Direct VLAN ID assignment from frontend configuration
- **Student Generation**: Uses `studentManagement` and `studentVlanX` types

#### Lecturer Group Mode
- **Description**: VLAN IDs calculated based on group assignments with modifiers
- **Processing**: `finalVlanId = baseVlanId + (groupNumber * groupModifier)`
- **Student Generation**: Group-based IP allocation with lecturer-defined offsets

#### Calculated VLAN Mode
- **Description**: Mathematical VLAN ID calculation using student ID components
- **Processing**: `vlanId = (studentIdNumeric * calculationMultiplier) % 4000 + 1`
- **Student Generation**: Algorithm-based VLAN assignment for scalability

### 2. Enhanced Student Generation Algorithm

**Algorithm**: `enhanced_base_network_replacement`

**Process Flow**:
1. Extract student ID components (year, faculty, index)
2. Generate management IP: `managementNetwork + yearOffset + facultyIndex`
3. For each VLAN: Generate base network using group/calculation rules
4. Apply interface offsets for multiple interfaces on same VLAN

**Configuration Parameters**:
```javascript
{
  "yearOffset": 61,        // Year component offset
  "facultyCode": "07",     // Faculty identifier
  "indexDigits": 4         // Student index digit count
}
```

### 3. IP Variable Processing Types

The backend must process these enhanced IP variable types:

- **`studentManagement`**: Management network + student offset
- **`studentVlan0`**, **`studentVlan1`**, **`studentVlan2`**: VLAN-specific IP generation
- **`hostOffset`**: Traditional host offset calculation
- **`fullIP`**: Static IP assignment

**VLAN-Specific Processing**:
```javascript
// Example for studentVlan0 with interfaceOffset
{
  "name": "gig0_0_vlan_1",
  "inputType": "studentVlan0",
  "vlanIndex": 0,
  "interfaceOffset": 1,
  "isStudentGenerated": true
}
```

### 4. Required API Endpoints

**Device Templates**: `GET /v0/device-templates`
**Task Templates**: `GET /v0/task-templates`
**Course Groups**: `GET /v0/courses/{courseId}/groups` (for lecturer_group mode)
**Student Assignments**: `GET /v0/courses/{courseId}/student-groups` (for group allocation)

## 🎯 Advanced Backend Features Required

### 1. Dynamic VLAN Assignment
- Support for 3 distinct VLAN assignment modes
- Real-time VLAN ID calculation based on student/group data
- Validation of VLAN ID ranges (1-4094)

### 1.1. Base Network Duplication Support
- **Frontend Change**: Base network duplication is now allowed across multiple VLANs
- **Rationale**: The IP generation algorithm replaces the second and third octets of the base network, making duplication functionally irrelevant
- **Backend Impact**: Backend should not validate for base network uniqueness across VLANs
- **Use Case**: Multiple VLANs can use the same base network (e.g., `172.16.0.0`) since the student-specific algorithm will generate unique IPs anyway

### 2. Multi-Phase IP Generation
- **Phase 1**: Management IP generation using base network + offsets
- **Phase 2**: VLAN-specific IP generation with lecturer-defined base networks
- **Phase 3**: Interface offset support for multiple IPs per VLAN

### 3. Group Management Integration
- Group assignment validation for lecturer_group mode
- Group modifier application to VLAN calculations
- Student-to-group mapping persistence

### 4. Enhanced Validation Rules
- VLAN ID uniqueness within course/lab scope
- Network overlap detection across VLANs (⚠️ **Note**: Base network duplication is now allowed)
- IP range capacity validation based on subnet masks
- Interface offset boundary checking

### 5. 🆕 IP Parameter Resolution Engine (Issue #8)
- **Variable Reference Parser**: Resolve "deviceId.variableName" format to actual IP addresses
- **IP Address Validator**: Validate custom IPv4 addresses from frontend
- **Dynamic Parameter Substitution**: Replace IP variables during task execution
- **Frontend Integration**: Support for `type: "ip_address"` in task template parameter schemas

#### IP Parameter Resolution Flow:
```javascript
// 1. Frontend sends task with IP parameter
{
  "taskId": "ping-test",
  "parameters": {
    "target_ip": "router1.loopback0"  // Variable reference
  }
}

// 2. Backend resolves during task execution
const deviceId = "router1";
const variableName = "loopback0";
const resolvedIP = lab.devices
  .find(d => d.deviceId === deviceId)
  ?.ipVariables.find(v => v.name === variableName)
  ?.resolvedIP || "10.1.1.1";

// 3. Execute task with resolved IP
executeTask({
  "target_ip": "10.1.1.1"  // Resolved value
});
```

## 🔄 Processing Flow Examples

### Fixed VLAN Mode Processing
```javascript
// Frontend sends:
{
  "mode": "fixed_vlan",
  "vlans": [
    {"vlanId": 100, "baseNetwork": "192.168.1.0", "subnetMask": 24}
  ]
}

// Backend processes:
studentIP = generateIP("192.168.1.0", 24, studentOffset)
vlanAssignment = { vlanId: 100, studentIP: studentIP }
```

### Calculated VLAN Mode Processing
```javascript
// Frontend sends:
{
  "mode": "calculated_vlan",
  "vlans": [
    {"calculationMultiplier": 400, "baseNetwork": "10.0.0.0", "subnetMask": 26}
  ]
}

// Backend processes:
vlanId = (studentId * 400) % 4000 + 1
studentNetwork = calculateNetworkForStudent("10.0.0.0", 26, studentId)
```

## 📋 Database Schema Extensions

### Enhanced Lab Schema
```javascript
{
  network: {
    name: String,
    topology: {
      baseNetwork: String,        // 🆕 CHANGED: Now uses managementNetwork
      subnetMask: Number,         // 🆕 CHANGED: Now uses managementSubnetMask
      allocationStrategy: String  // 'student_id_based' | 'group_based'
    },
    vlanConfiguration: {          // 🆕 NEW: VLAN configuration data
      mode: String,               // 'fixed_vlan' | 'lecturer_group' | 'calculated_vlan'
      vlanCount: Number,
      vlans: [{
        id: String,
        vlanId: Number,           // For fixed_vlan and lecturer_group
        calculationMultiplier: Number, // For calculated_vlan
        baseNetwork: String,
        subnetMask: Number,
        groupModifier: Number,    // For lecturer_group
        isStudentGenerated: Boolean
      }]
    },
    devices: [{
      deviceId: String,
      templateId: String,
      displayName: String,
      ipVariables: [{
        name: String,
        interface: String,
        inputType: String,        // 'studentManagement' | 'studentVlan0' | 'hostOffset' | 'fullIP'
        isManagementInterface: Boolean,  // 🆕 NEW: Management interface flag
        isVlanInterface: Boolean,        // 🆕 NEW: VLAN interface flag
        vlanIndex: Number,               // 🆕 NEW: VLAN index for VLAN interfaces
        interfaceOffset: Number,         // 🆕 NEW: Interface offset for VLAN interfaces
        hostOffset: Number,              // For hostOffset type
        fullIp: String,                  // For fullIP type
        description: String
      }],
      credentials: {
        usernameTemplate: String,
        passwordTemplate: String,
        enablePassword: String
      }
    }]
  }
}
```

### Enhanced IP Variable Schema
```javascript
{
  ipVariables: [{
    name: String,
    interface: String,                    // Full interface name from device template
    inputType: String,                     // 'studentManagement' | 'studentVlan0' | 'hostOffset' | 'fullIP'
    isManagementInterface: Boolean,         // 🆕 NEW: Marks management interface
    isVlanInterface: Boolean,              // 🆕 NEW: Marks VLAN interface
    vlanIndex: Number,                     // Which VLAN this variable belongs to
    interfaceOffset: Number,                // Interface offset within VLAN
    isStudentGenerated: Boolean,
    hostOffset: Number,                    // For hostOffset type
    fullIp: String,                        // For fullIP type (note: lowercase 'p')
    description: String                    // Optional description
  }]
}
```

## 🔧 Implementation Priority

### Phase 1: Core VLAN Processing ⭐ HIGH PRIORITY
- Implement three VLAN mode processors
- Basic student IP generation for each mode
- VLAN assignment validation

### Phase 2: Advanced IP Generation ⭐ MEDIUM PRIORITY
- Interface offset support
- Multi-VLAN IP allocation
- Enhanced student generation algorithm

### Phase 3: Group Integration ⭐ LOWER PRIORITY
- Group assignment management
- Lecturer group modifier processing
- Group-based allocation strategies

### Phase 4: 🆕 IP Parameter Feature Support (Issue #8) ⭐ HIGH PRIORITY
- **Task Template API Enhancement**: Support `type: "ip_address"` in parameter schemas
- **IP Parameter Resolution Engine**: Parse and resolve "deviceId.variableName" references
- **Custom IP Validation**: Validate and process direct IPv4 addresses
- **Frontend Integration**: Ensure lab creation API handles new parameter formats

#### Required API Changes:

**Task Templates Response Enhancement**:
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "_id": "507f1f77bcf86cd799439016",
        "templateId": "ping_connectivity_test",
        "name": "Ping Connectivity Test",
        "description": "Test network connectivity using ping command",
        "parameterSchema": [
          {
            "name": "target_ip",
            "type": "ip_address",        // 🆕 NEW: Triggers frontend IP selector
            "description": "IP address to ping for connectivity test",
            "required": true
          },
          {
            "name": "count",
            "type": "number",
            "description": "Number of ping packets to send",
            "required": false
          }
        ],
        "defaultTestCases": [
          {
            "comparison_type": "contains",
            "expected_result": "Success rate is 100 percent"
          }
        ]
      }
    ]
  }
}
```

## 🚀 Testing Requirements

### Unit Tests Required
- VLAN ID calculation accuracy for all modes
- IP generation algorithm validation
- Network overlap detection
- Interface offset boundary testing
- 🆕 **IP parameter resolution logic** (deviceId.variableName parsing)
- 🆕 **Custom IP address validation** (IPv4 format checking)

### Integration Tests Required
- Full lab creation with all VLAN modes
- Student assignment processing
- Group-based allocation flows
- API endpoint integration testing
- 🆕 **Task creation with ip_address parameters** (variable references and custom IPs)
- 🆕 **Task execution with IP parameter resolution** (runtime IP substitution)
