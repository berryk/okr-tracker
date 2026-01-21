# OKR Tracker - API Specification

> **Version**: 1.0.0  
> **Base URL**: `https://okr.moodys.com/api`

---

## Authentication

All endpoints (except `/auth/*`) require authentication via Bearer token or session cookie.

### SAML Login Flow

```
1. Client redirects to: GET /api/auth/saml/login
2. Server redirects to: SSO Provider (Okta/Azure AD)
3. User authenticates with SSO
4. SSO redirects to: POST /api/auth/saml/callback
5. Server validates assertion, creates session
6. Server redirects to: Frontend with session cookie
```

### Auth Endpoints

#### `GET /api/auth/saml/login`
Initiates SAML authentication flow.

**Response:** 302 Redirect to SSO provider

#### `POST /api/auth/saml/callback`
SAML assertion consumer service.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@moodys.com",
    "name": "John Doe",
    "role": "CONTRIBUTOR"
  }
}
```

#### `POST /api/auth/logout`
Ends user session.

#### `GET /api/auth/me`
Returns current authenticated user.

---

## Goals

### `GET /api/goals`
List goals with filters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| quarter | string | current | Quarter filter (e.g., "Q1-2026") |
| teamId | uuid | - | Filter by team |
| ownerId | uuid | - | Filter by owner |
| status | string | - | Filter by status |
| parentId | uuid | - | Get child goals of parent |
| search | string | - | Full-text search |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Increase Revenue by 20%",
      "description": "Q1 revenue target for EMEA region",
      "quarter": "Q1-2026",
      "status": "ACTIVE",
      "priority": 1,
      "owner": {
        "id": "uuid",
        "name": "John Doe"
      },
      "team": {
        "id": "uuid",
        "name": "Sales",
        "level": "DEPARTMENT"
      },
      "measures": [
        {
          "id": "uuid",
          "title": "Revenue",
          "currentValue": 15000000,
          "targetValue": 20000000,
          "unit": "$",
          "progress": 75
        }
      ],
      "parentLinks": [
        {
          "parentGoalId": "uuid",
          "parentGoalTitle": "Global Revenue Growth",
          "contributionWeight": 25
        }
      ],
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-20T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### `POST /api/goals`
Create a new goal.

**Request Body:**
```json
{
  "title": "Launch New Product Feature",
  "description": "Ship the analytics dashboard by end of Q1",
  "quarter": "Q1-2026",
  "teamId": "uuid",
  "status": "DRAFT",
  "priority": 2,
  "dueDate": "2026-03-31"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "title": "Launch New Product Feature",
  "...": "full goal object"
}
```

---

### `GET /api/goals/:id`
Get a single goal with all details.

**Response:**
```json
{
  "id": "uuid",
  "title": "Increase Revenue by 20%",
  "description": "Q1 revenue target",
  "quarter": "Q1-2026",
  "status": "ACTIVE",
  "owner": { "id": "uuid", "name": "John Doe" },
  "team": { "id": "uuid", "name": "Sales", "level": "DEPARTMENT" },
  "measures": [
    {
      "id": "uuid",
      "title": "Total Revenue",
      "unit": "$",
      "startValue": 15000000,
      "currentValue": 17500000,
      "targetValue": 20000000,
      "measureType": "INCREASE",
      "progress": 50
    }
  ],
  "parentLinks": [
    {
      "id": "uuid",
      "parentGoal": {
        "id": "uuid",
        "title": "Global Revenue Growth",
        "team": { "name": "Corporate", "level": "CORPORATE" }
      },
      "contributionWeight": 25
    }
  ],
  "childLinks": [
    {
      "id": "uuid",
      "childGoal": {
        "id": "uuid",
        "title": "EMEA Enterprise Sales Target",
        "team": { "name": "EMEA Sales", "level": "TEAM" }
      },
      "contributionWeight": 100
    }
  ],
  "updates": [
    {
      "id": "uuid",
      "user": { "name": "John Doe" },
      "content": "On track for Q1 target",
      "type": "COMMENT",
      "createdAt": "2026-01-20T09:00:00Z"
    }
  ],
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-20T14:22:00Z"
}
```

---

### `PUT /api/goals/:id`
Update a goal.

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "AT_RISK",
  "description": "Updated description"
}
```

**Response:** `200 OK` with updated goal object

---

### `DELETE /api/goals/:id`
Delete a goal (soft delete or cascade based on config).

**Response:** `204 No Content`

---

### `POST /api/goals/:id/link`
Link this goal to a parent goal.

**Request Body:**
```json
{
  "parentGoalId": "uuid",
  "contributionWeight": 50
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "childGoalId": "uuid",
  "parentGoalId": "uuid",
  "contributionWeight": 50
}
```

---

### `DELETE /api/goals/:id/link/:linkId`
Remove a goal link.

**Response:** `204 No Content`

---

### `GET /api/goals/:id/alignment`
Get the full alignment tree for a goal (all the way to corporate).

**Response:**
```json
{
  "goal": {
    "id": "uuid",
    "title": "My Personal Goal"
  },
  "alignmentPath": [
    {
      "level": 0,
      "goal": {
        "id": "uuid",
        "title": "My Personal Goal",
        "team": { "level": "INDIVIDUAL" }
      },
      "contributionWeight": 100
    },
    {
      "level": 1,
      "goal": {
        "id": "uuid",
        "title": "Team Goal",
        "team": { "level": "TEAM" }
      },
      "contributionWeight": 33
    },
    {
      "level": 2,
      "goal": {
        "id": "uuid",
        "title": "Department Goal",
        "team": { "level": "DEPARTMENT" }
      },
      "contributionWeight": 25
    },
    {
      "level": 3,
      "goal": {
        "id": "uuid",
        "title": "Corporate Goal",
        "team": { "level": "CORPORATE" }
      },
      "contributionWeight": 100
    }
  ]
}
```

---

### `GET /api/goals/:id/children`
Get all child goals (recursively).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| depth | number | 1 | How many levels deep |
| includeProgress | boolean | false | Include progress data |

**Response:**
```json
{
  "goal": { "id": "uuid", "title": "Corporate Goal" },
  "children": [
    {
      "goal": { "id": "uuid", "title": "Department Goal" },
      "contributionWeight": 25,
      "children": [
        {
          "goal": { "id": "uuid", "title": "Team Goal" },
          "contributionWeight": 50,
          "children": []
        }
      ]
    }
  ],
  "aggregateProgress": 68
}
```

---

## Measures

### `POST /api/measures`
Create a measure for a goal.

**Request Body:**
```json
{
  "goalId": "uuid",
  "title": "Revenue Target",
  "description": "Total revenue for Q1",
  "unit": "$",
  "startValue": 15000000,
  "targetValue": 20000000,
  "measureType": "INCREASE"
}
```

**Response:** `201 Created`

---

### `PUT /api/measures/:id`
Update a measure.

**Request Body:**
```json
{
  "title": "Updated Title",
  "targetValue": 22000000
}
```

---

### `DELETE /api/measures/:id`
Delete a measure.

**Response:** `204 No Content`

---

## Progress

### `POST /api/progress`
Record progress for a measure.

**Request Body:**
```json
{
  "measureId": "uuid",
  "value": 17500000,
  "notes": "Strong January sales"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "measureId": "uuid",
  "value": 17500000,
  "notes": "Strong January sales",
  "recordedBy": { "id": "uuid", "name": "John Doe" },
  "recordedAt": "2026-01-21T10:30:00Z"
}
```

---

### `GET /api/progress`
Get progress history.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| measureId | uuid | Filter by measure |
| goalId | uuid | Filter by goal (all measures) |
| from | date | Start date |
| to | date | End date |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "measureId": "uuid",
      "value": 17500000,
      "notes": "Strong January sales",
      "recordedBy": { "name": "John Doe" },
      "recordedAt": "2026-01-21T10:30:00Z"
    }
  ]
}
```

---

## Teams

### `GET /api/teams`
List teams with hierarchy.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| level | string | Filter by team level |
| parentId | uuid | Get child teams |

### `GET /api/teams/:id`
Get team details with members.

### `GET /api/teams/:id/goals`
Get all goals for a team.

---

## Users

### `GET /api/users`
List users (admin only).

### `GET /api/users/:id`
Get user profile.

### `GET /api/users/:id/goals`
Get user's goals.

---

## Reports

### `GET /api/reports/quarterly`
Quarterly progress report.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| quarter | string | Quarter (e.g., "Q1-2026") |
| teamId | uuid | Filter by team |
| format | string | "json" or "csv" |

### `GET /api/reports/alignment`
Alignment coverage report.

**Response:**
```json
{
  "quarter": "Q1-2026",
  "stats": {
    "totalGoals": 2450,
    "linkedGoals": 2100,
    "unlinkedGoals": 350,
    "alignmentRate": 85.7
  },
  "byLevel": [
    { "level": "CORPORATE", "total": 12, "linked": 12 },
    { "level": "EXECUTIVE", "total": 48, "linked": 48 },
    { "level": "DEPARTMENT", "total": 180, "linked": 175 },
    { "level": "TEAM", "total": 720, "linked": 650 },
    { "level": "INDIVIDUAL", "total": 1490, "linked": 1215 }
  ]
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized for action |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- **Standard users**: 100 requests/minute
- **API tokens**: 1000 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706367600
```
