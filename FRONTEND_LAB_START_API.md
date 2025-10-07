# Lab Start API - Frontend Integration Guide

## Overview
When a student clicks **"Start Lab"**, the frontend should call this endpoint to get the complete network configuration (Management IP, VLAN IPs, and VLAN IDs) needed to configure their lab devices.

---

## Endpoint

```
POST /api/labs/:id/start
```

### Authentication
**Required:** Bearer token (Student, Instructor, or Admin role)

### Parameters
- **`:id`** (path parameter) - Lab ID (MongoDB ObjectId as string)

### Request Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Lab started successfully",
  "data": {
    "labId": "507f1f77bcf86cd799439011",
    "labTitle": "OSPF Routing Lab",
    "session": {
      "sessionId": "507f191e810c19729de860ea",
      "status": "active",
      "startedAt": "2025-01-15T10:30:00.000Z"
    },
    "networkConfiguration": {
      "managementIp": "10.0.0.15",
      "ipMappings": {
        "router1.mgmt": "10.0.0.15",
        "router1.gig0_1": "172.40.41.66",
        "router1.gig0_2": "172.40.41.67",
        "router2.mgmt": "10.0.0.15",
        "router2.gig0_1": "172.40.42.66"
      },
      "vlanMappings": {
        "vlan0": 140,
        "vlan1": 240,
        "vlan2": 340
      }
    }
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Lab not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error starting lab",
  "error": "Unable to assign Management IP: too many exempt ranges"
}
```

---

## Response Fields Explanation

### `data.session`
| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session ID for this student's lab session |
| `status` | string | Always "active" when lab starts |
| `startedAt` | string (ISO 8601) | Timestamp when lab was started |

### `data.networkConfiguration.managementIp`
| Field | Type | Description |
|-------|------|-------------|
| `managementIp` | string | The Management IP address for this student (e.g., "10.0.0.15") |

**Important:**
- This IP is **persistent** - calling the endpoint again returns the same IP
- This IP is **unique** per student per lab
- This IP may skip exempt ranges (e.g., if 10.0.0.1 is exempt, student gets 10.0.0.2)

### `data.networkConfiguration.ipMappings`
| Field | Type | Description |
|-------|------|-------------|
| `ipMappings` | object | Key-value pairs of device interface IPs |
| Key format | string | `"deviceId.variableName"` (e.g., `"router1.gig0_1"`) |
| Value | string | IPv4 address calculated for this student |

**Usage:**
- Use these IPs to populate device configuration forms
- Keys match the device and variable names from lab definition
- All IPs are pre-calculated by backend for this specific student

### `data.networkConfiguration.vlanMappings`
| Field | Type | Description |
|-------|------|-------------|
| `vlanMappings` | object | Key-value pairs of VLAN IDs |
| Key format | string | `"vlan0"`, `"vlan1"`, `"vlan2"`, etc. (0-indexed) |
| Value | number | VLAN ID (1-4094) calculated for this student |

**Usage:**
- Use these VLAN IDs for VLAN interface configuration
- Only present if lab uses `calculated_vlan` mode
- Empty object `{}` if lab uses `fixed_vlan` mode (VLAN IDs are pre-defined)

---

## Frontend Integration Steps

### Step 1: Call the Endpoint
```javascript
async function startLab(labId) {
  try {
    const response = await fetch(`/api/labs/${labId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to start lab:', error);
    throw error;
  }
}
```

### Step 2: Display Network Configuration
```javascript
function displayNetworkConfig(data) {
  const { networkConfiguration } = data;

  // Display Management IP prominently
  console.log(`Management IP: ${networkConfiguration.managementIp}`);

  // Display device IPs
  console.log('Device IP Addresses:');
  Object.entries(networkConfiguration.ipMappings).forEach(([key, ip]) => {
    const [deviceId, variable] = key.split('.');
    console.log(`  ${deviceId} - ${variable}: ${ip}`);
  });

  // Display VLAN IDs (if any)
  if (Object.keys(networkConfiguration.vlanMappings).length > 0) {
    console.log('VLAN IDs:');
    Object.entries(networkConfiguration.vlanMappings).forEach(([key, vlanId]) => {
      console.log(`  ${key}: ${vlanId}`);
    });
  }
}
```

### Step 3: Handle Student Configuration
```javascript
// Example: Student needs to configure Router 1's GigabitEthernet0/1 interface
const router1Gig01Ip = networkConfiguration.ipMappings['router1.gig0_1'];
const vlan0Id = networkConfiguration.vlanMappings['vlan0'];

// Display to student:
// "Configure Router 1 GigabitEthernet0/1 with IP: 172.40.41.66 on VLAN 140"
```

---

## Important Behaviors

### ✅ Idempotent
- Calling the endpoint **multiple times** returns the **same IPs**
- Safe to call on page refresh or navigation

### ✅ Persistent Session
- Student's Management IP is **stored in database**
- Remains assigned until:
  - Student completes all lab parts with 100% score, OR
  - Lab reaches `availableUntil` or `dueDate`

### ✅ Unique Per Student
- Each student gets a **different Management IP**
- IPs are calculated based on enrollment order
- No two students share the same Management IP in a lab

### ✅ Exempt IP Ranges (New Feature)
- Some IPs may be reserved by instructor (e.g., 10.0.0.1 for gateway)
- Backend automatically **skips exempt IPs** when assigning
- Students receive next available non-exempt IP

---

## Example UI Flow

```
┌─────────────────────────────────────┐
│  OSPF Routing Lab                   │
│                                     │
│  Status: Not Started                │
│                                     │
│  [Start Lab Button]                 │
└─────────────────────────────────────┘
           ↓ (Student clicks)
           ↓
    POST /api/labs/:id/start
           ↓
┌─────────────────────────────────────┐
│  OSPF Routing Lab                   │
│                                     │
│  Status: Active ✓                   │
│  Started: Jan 15, 2025 10:30 AM     │
│                                     │
│  📡 Your Management IP: 10.0.0.15   │
│                                     │
│  🖥️ Device Configuration:           │
│  ├─ Router 1                        │
│  │  ├─ mgmt: 10.0.0.15              │
│  │  ├─ gig0/1: 172.40.41.66 (VLAN 140)│
│  │  └─ gig0/2: 172.40.41.67 (VLAN 240)│
│  └─ Router 2                        │
│     ├─ mgmt: 10.0.0.15              │
│     └─ gig0/1: 172.40.42.66 (VLAN 140)│
│                                     │
│  [Begin Configuration] →            │
└─────────────────────────────────────┘
```

---

## Testing

### Test Case 1: First Time Start
```bash
curl -X POST http://localhost:3000/api/labs/507f1f77bcf86cd799439011/start \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Expected: 200 OK with new session and IPs
```

### Test Case 2: Repeated Start (Idempotent)
```bash
curl -X POST http://localhost:3000/api/labs/507f1f77bcf86cd799439011/start \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Expected: 200 OK with SAME session and SAME IPs
```

### Test Case 3: Invalid Lab ID
```bash
curl -X POST http://localhost:3000/api/labs/invalid-id/start \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Expected: 404 Not Found
```

### Test Case 4: No Authentication
```bash
curl -X POST http://localhost:3000/api/labs/507f1f77bcf86cd799439011/start

# Expected: 401 Unauthorized
```

---

## TypeScript Types (Optional)

```typescript
interface LabStartResponse {
  success: boolean;
  message: string;
  data: {
    labId: string;
    labTitle: string;
    session: {
      sessionId: string;
      status: 'active';
      startedAt: string; // ISO 8601
    };
    networkConfiguration: {
      managementIp: string;
      ipMappings: Record<string, string>;  // { "router1.gig0_1": "172.40.41.66" }
      vlanMappings: Record<string, number>; // { "vlan0": 140 }
    };
  };
}

interface LabStartError {
  success: false;
  message: string;
  error?: string;
}
```

---

## Questions?

**Q: Can I call this endpoint before the lab is published?**
A: The commented-out code suggests checks exist for `publishedAt`, `availableFrom`, and `availableUntil`, but they're currently disabled in the backend. Check with backend team for current behavior.

**Q: What if the student already has an active session?**
A: The endpoint returns the existing session with the same IPs. No new session is created.

**Q: How do I know if a student's IP was released?**
A: Call `GET /api/admin/sessions/student/:studentId/lab/:labId` (admin endpoint) to check session status.

**Q: What's the difference between `ipMappings` and `vlanMappings`?**
A:
- `ipMappings`: All IP addresses (Management + VLAN IPs) for device interfaces
- `vlanMappings`: VLAN IDs only (used for VLAN tagging/configuration)

---

## Support

For issues or questions, contact the backend team or check:
- Full implementation guide: `IP_VLAN_IMPLEMENTATION_GUIDE.md`
- Exempt IP ranges: `EXEMPT_IP_RANGES_BACKEND.md`
