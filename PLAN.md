# OKR Tracker - Detailed Implementation Plan

> **Status**: DRAFT - Awaiting Review  
> **Last Updated**: 2026-01-21  
> **Target Users**: ~18,000 (Moody's Analytics)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema](#database-schema)
4. [API Specification](#api-specification)
5. [Implementation Phases](#implementation-phases)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Open Questions](#open-questions)

---

## Executive Summary

### Problem Statement
Moody's Analytics needs a scalable OKR tracking system that:
- Enables strategic alignment from CEO to individual contributor
- Supports ~18,000 users with real-time updates
- Provides clear visibility into how individual goals connect to company objectives
- Tracks quarterly progress with quantifiable measures

### Solution Overview
A containerized web application with:
- **React SPA** frontend with hierarchical goal visualization
- **Node.js/Express** API backend with Redis caching
- **PostgreSQL** database optimized for hierarchical queries
- **SAML/SSO** integration for enterprise authentication
- **Kubernetes** deployment for horizontal scaling

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CDN (CloudFlare/AWS)                            │
│                         Static assets, DDoS protection                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Load Balancer (nginx/ALB)                            │
│                        SSL termination, routing                              │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
    ┌───────────────┴───────────────┐    ┌───────────────┴───────────────┐
    │      Frontend Pods (3+)       │    │      Backend Pods (5+)        │
    │   ┌─────────────────────┐     │    │   ┌─────────────────────┐     │
    │   │ React SPA (nginx)   │     │    │   │  Express API        │     │
    │   │ - Vite build        │     │    │   │  - REST endpoints   │     │
    │   │ - Chakra UI         │     │    │   │  - WebSocket        │     │
    │   │ - React Query       │     │    │   │  - Passport SAML    │     │
    │   └─────────────────────┘     │    │   └─────────────────────┘     │
    └───────────────────────────────┘    └───────────────────────────────┘
                                                        │
                    ┌───────────────────────────────────┼───────────────┐
                    │                                   │               │
    ┌───────────────┴───────────────┐    ┌─────────────┴─────┐    ┌────┴────┐
    │        PostgreSQL 15          │    │   Redis Cluster   │    │   SSO   │
    │  ┌──────────┬──────────┐      │    │  ┌─────────────┐  │    │ Provider│
    │  │ Primary  │ Replica  │      │    │  │ Sessions    │  │    │ (Okta/  │
    │  │          │ (read)   │      │    │  │ Cache       │  │    │ AzureAD)│
    │  └──────────┴──────────┘      │    │  │ Pub/Sub     │  │    └─────────┘
    │  + PgBouncer connection pool  │    │  └─────────────┘  │
    └───────────────────────────────┘    └───────────────────┘
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component with routing
│   ├── api/                        # API client (axios + react-query)
│   │   ├── client.ts               # Axios instance with interceptors
│   │   ├── goals.ts                # Goals API hooks
│   │   ├── measures.ts             # Measures API hooks
│   │   ├── users.ts                # Users API hooks
│   │   └── teams.ts                # Teams API hooks
│   ├── components/
│   │   ├── common/                 # Shared UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── goals/
│   │   │   ├── GoalCard.tsx        # Individual goal display
│   │   │   ├── GoalForm.tsx        # Create/edit goal
│   │   │   ├── GoalTree.tsx        # Hierarchical tree view
│   │   │   ├── GoalLink.tsx        # Link selector modal
│   │   │   └── AlignmentView.tsx   # My goal → corporate alignment
│   │   ├── measures/
│   │   │   ├── MeasureCard.tsx
│   │   │   ├── MeasureForm.tsx
│   │   │   ├── ProgressInput.tsx
│   │   │   └── ProgressChart.tsx
│   │   ├── dashboard/
│   │   │   ├── ExecutiveDashboard.tsx
│   │   │   ├── TeamDashboard.tsx
│   │   │   └── MyDashboard.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── PageLayout.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Goals.tsx
│   │   ├── MyGoals.tsx
│   │   ├── TeamGoals.tsx
│   │   ├── CorporateGoals.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGoals.ts
│   │   └── useRealtime.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   └── utils/
│       ├── formatting.ts
│       └── validation.ts
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Dockerfile
```

### Backend Architecture

```
backend/
├── src/
│   ├── index.ts                    # Server entry point
│   ├── app.ts                      # Express app setup
│   ├── config/
│   │   ├── database.ts             # Prisma client
│   │   ├── redis.ts                # Redis client
│   │   ├── passport.ts             # SAML configuration
│   │   └── env.ts                  # Environment variables
│   ├── middleware/
│   │   ├── auth.ts                 # JWT/session validation
│   │   ├── rbac.ts                 # Role-based access control
│   │   ├── rateLimit.ts            # API rate limiting
│   │   ├── validation.ts           # Zod schema validation
│   │   └── errorHandler.ts         # Global error handling
│   ├── routes/
│   │   ├── index.ts                # Route aggregator
│   │   ├── auth.routes.ts          # /api/auth/*
│   │   ├── goals.routes.ts         # /api/goals/*
│   │   ├── measures.routes.ts      # /api/measures/*
│   │   ├── progress.routes.ts      # /api/progress/*
│   │   ├── users.routes.ts         # /api/users/*
│   │   ├── teams.routes.ts         # /api/teams/*
│   │   └── reports.routes.ts       # /api/reports/*
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── goals.controller.ts
│   │   ├── measures.controller.ts
│   │   ├── progress.controller.ts
│   │   ├── users.controller.ts
│   │   ├── teams.controller.ts
│   │   └── reports.controller.ts
│   ├── services/
│   │   ├── goal.service.ts         # Goal business logic
│   │   ├── measure.service.ts      # Measure business logic
│   │   ├── alignment.service.ts    # Alignment calculations
│   │   ├── cache.service.ts        # Redis caching layer
│   │   └── notification.service.ts # Email/Slack notifications
│   ├── repositories/
│   │   ├── goal.repository.ts      # Goal data access
│   │   ├── measure.repository.ts
│   │   ├── user.repository.ts
│   │   └── team.repository.ts
│   ├── schemas/
│   │   ├── goal.schema.ts          # Zod validation schemas
│   │   ├── measure.schema.ts
│   │   └── user.schema.ts
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Migration files
├── package.json
├── tsconfig.json
└── Dockerfile
```

### State Management (Frontend)

- **React Query (TanStack Query)** for server state
  - Automatic caching with stale-while-revalidate
  - Background refetching
  - Optimistic updates for goal changes
- **React Context** for client state
  - Auth context (user session)
  - Theme context (dark/light mode)
- **URL State** for navigation
  - React Router for page navigation
  - Query params for filters/search

### Caching Strategy (Redis)

```
Cache Key Patterns:
├── user:{id}                    # User profile (TTL: 1h)
├── user:{id}:goals              # User's goals list (TTL: 5m)
├── team:{id}                    # Team details (TTL: 1h)
├── team:{id}:goals              # Team goals (TTL: 5m)
├── goal:{id}                    # Single goal (TTL: 5m)
├── goal:{id}:children           # Child goals (TTL: 5m)
├── goal:{id}:parents            # Parent goals (TTL: 5m)
├── corporate:goals:Q{x}-{year}  # Corporate goals per quarter (TTL: 15m)
└── session:{token}              # User session (TTL: 8h)

Invalidation Strategy:
- On goal create/update/delete → invalidate goal:{id}, team:{id}:goals, user:{id}:goals
- On progress update → invalidate goal:{id}
- Use Redis pub/sub for multi-instance cache invalidation
```

---

## Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ ORGANIZATION ============

model Organization {
  id        String   @id @default(uuid())
  name      String
  domain    String   @unique // e.g., "moodys.com"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  teams Team[]
  users User[]
}

// ============ TEAM HIERARCHY ============

model Team {
  id             String       @id @default(uuid())
  organizationId String
  parentTeamId   String?      // Self-reference for hierarchy
  name           String
  level          TeamLevel
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization Organization  @relation(fields: [organizationId], references: [id])
  parentTeam   Team?         @relation("TeamHierarchy", fields: [parentTeamId], references: [id])
  childTeams   Team[]        @relation("TeamHierarchy")
  users        User[]
  goals        Goal[]

  @@index([organizationId])
  @@index([parentTeamId])
  @@index([level])
}

enum TeamLevel {
  CORPORATE    // C-suite / Company-wide
  EXECUTIVE    // Executive leadership team
  DEPARTMENT   // Department / Division
  TEAM         // Team / Squad
  INDIVIDUAL   // Individual contributor
}

// ============ USER ============

model User {
  id             String   @id @default(uuid())
  organizationId String
  teamId         String
  managerId      String?  // Direct manager
  email          String   @unique
  name           String
  role           UserRole
  ssoId          String?  @unique // External SSO identifier
  avatarUrl      String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization     @relation(fields: [organizationId], references: [id])
  team         Team             @relation(fields: [teamId], references: [id])
  manager      User?            @relation("ManagerReports", fields: [managerId], references: [id])
  reports      User[]           @relation("ManagerReports")
  ownedGoals   Goal[]           @relation("GoalOwner")
  goalUpdates  GoalUpdate[]
  progress     Progress[]

  @@index([organizationId])
  @@index([teamId])
  @@index([managerId])
  @@index([email])
}

enum UserRole {
  ADMIN        // Full system access
  EXECUTIVE    // Can create corporate goals
  MANAGER      // Can manage team goals
  CONTRIBUTOR  // Can manage own goals
  VIEWER       // Read-only access
}

// ============ GOALS ============

model Goal {
  id          String     @id @default(uuid())
  teamId      String
  ownerId     String
  title       String
  description String?
  quarter     String     // e.g., "Q1-2026"
  status      GoalStatus @default(DRAFT)
  priority    Int        @default(0) // For ordering
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  team     Team         @relation(fields: [teamId], references: [id])
  owner    User         @relation("GoalOwner", fields: [ownerId], references: [id])
  measures Measure[]
  updates  GoalUpdate[]

  // Many-to-many: this goal links to parent goals
  parentLinks GoalLink[] @relation("ChildGoal")
  // Many-to-many: goals that link to this as a parent
  childLinks  GoalLink[] @relation("ParentGoal")

  @@index([teamId])
  @@index([ownerId])
  @@index([quarter])
  @@index([status])
}

enum GoalStatus {
  DRAFT      // Not yet active
  ACTIVE     // In progress
  AT_RISK    // Behind schedule
  COMPLETED  // Successfully achieved
  CANCELLED  // No longer relevant
}

// ============ GOAL LINKS (Many-to-Many) ============

model GoalLink {
  id                 String   @id @default(uuid())
  childGoalId        String   // The lower-level goal
  parentGoalId       String   // The higher-level goal it aligns to
  contributionWeight Int      @default(100) // % contribution (0-100)
  createdAt          DateTime @default(now())

  childGoal  Goal @relation("ChildGoal", fields: [childGoalId], references: [id], onDelete: Cascade)
  parentGoal Goal @relation("ParentGoal", fields: [parentGoalId], references: [id], onDelete: Cascade)

  @@unique([childGoalId, parentGoalId])
  @@index([childGoalId])
  @@index([parentGoalId])
}

// ============ MEASURES / KEY RESULTS ============

model Measure {
  id           String      @id @default(uuid())
  goalId       String
  title        String
  description  String?
  unit         String      // e.g., "%", "$", "#", "score"
  targetValue  Float
  startValue   Float       @default(0)
  currentValue Float       @default(0)
  measureType  MeasureType @default(INCREASE)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  goal     Goal       @relation(fields: [goalId], references: [id], onDelete: Cascade)
  progress Progress[]

  @@index([goalId])
}

enum MeasureType {
  INCREASE   // Higher is better (e.g., revenue)
  DECREASE   // Lower is better (e.g., costs)
  TARGET     // Hit specific target (e.g., launch date)
  MAINTAIN   // Stay within range
}

// ============ PROGRESS TRACKING ============

model Progress {
  id          String   @id @default(uuid())
  measureId   String
  recordedBy  String
  value       Float
  notes       String?
  recordedAt  DateTime @default(now())

  measure Measure @relation(fields: [measureId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [recordedBy], references: [id])

  @@index([measureId])
  @@index([recordedAt])
}

// ============ GOAL UPDATES / COMMENTS ============

model GoalUpdate {
  id        String   @id @default(uuid())
  goalId    String
  userId    String
  content   String
  type      UpdateType @default(COMMENT)
  createdAt DateTime @default(now())

  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@index([goalId])
  @@index([createdAt])
}

enum UpdateType {
  COMMENT       // General comment
  STATUS_CHANGE // Status was updated
  PROGRESS      // Progress was recorded
}

// ============ AUDIT LOG ============

model AuditLog {
  id         String   @id @default(uuid())
  userId     String
  action     String   // e.g., "GOAL_CREATED", "MEASURE_UPDATED"
  entityType String   // e.g., "Goal", "Measure"
  entityId   String
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### Database Indexes for Performance

```sql
-- Hierarchical queries (recursive CTEs)
CREATE INDEX CONCURRENTLY idx_goal_links_alignment 
ON "GoalLink" (child_goal_id, parent_goal_id) 
INCLUDE (contribution_weight);

-- Dashboard queries
CREATE INDEX CONCURRENTLY idx_goals_team_quarter_status 
ON "Goal" (team_id, quarter, status);

-- User's goals view
CREATE INDEX CONCURRENTLY idx_goals_owner_quarter 
ON "Goal" (owner_id, quarter);

-- Progress history
CREATE INDEX CONCURRENTLY idx_progress_measure_time 
ON "Progress" (measure_id, recorded_at DESC);

-- Full-text search on goals
CREATE INDEX CONCURRENTLY idx_goals_search 
ON "Goal" USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

---

## API Specification

See [docs/api-spec.md](./docs/api-spec.md) for complete API documentation.

### Key Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/saml/login` | Initiate SAML login |
| GET | `/api/auth/saml/callback` | SAML callback |
| POST | `/api/auth/logout` | End session |
| GET | `/api/users/me` | Current user profile |
| GET | `/api/goals` | List goals (with filters) |
| POST | `/api/goals` | Create goal |
| GET | `/api/goals/:id` | Get goal with measures |
| PUT | `/api/goals/:id` | Update goal |
| DELETE | `/api/goals/:id` | Delete goal |
| POST | `/api/goals/:id/link` | Link to parent goal |
| GET | `/api/goals/:id/alignment` | Get alignment tree |
| GET | `/api/goals/:id/children` | Get child goals |
| POST | `/api/measures` | Create measure |
| PUT | `/api/measures/:id` | Update measure |
| POST | `/api/progress` | Record progress |
| GET | `/api/teams/:id/goals` | Team goals |
| GET | `/api/reports/quarterly` | Quarterly report |
| GET | `/api/reports/alignment` | Alignment report |

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3) - 120 hours

| Task | Hours | Description |
|------|-------|-------------|
| Project setup | 8 | Monorepo, ESLint, Prettier, Husky |
| Database schema | 16 | Prisma schema, migrations, seed data |
| Backend scaffolding | 24 | Express, middleware, error handling |
| Authentication | 24 | SAML integration, JWT, sessions |
| Frontend scaffolding | 24 | Vite, React, routing, auth flow |
| Docker setup | 16 | Dockerfiles, docker-compose, dev env |
| CI/CD pipeline | 8 | GitHub Actions basic workflow |

**Deliverable**: Users can authenticate and see a basic dashboard

### Phase 2: Goal Management (Weeks 4-6) - 160 hours

| Task | Hours | Description |
|------|-------|-------------|
| Goal CRUD API | 24 | Create, read, update, delete goals |
| Goal UI components | 40 | GoalCard, GoalForm, GoalList |
| Goal linking API | 24 | Parent-child relationships |
| Goal linking UI | 24 | Link selector, tree view |
| Team hierarchy | 24 | Team management, permissions |
| Unit tests | 24 | API and component tests |

**Deliverable**: Users can create and link goals

### Phase 3: Measures & Progress (Weeks 7-8) - 100 hours

| Task | Hours | Description |
|------|-------|-------------|
| Measure CRUD API | 16 | Create, update measures |
| Progress tracking API | 16 | Record progress entries |
| Measure UI components | 24 | MeasureCard, MeasureForm |
| Progress UI | 24 | ProgressInput, charts |
| Progress calculations | 12 | Roll-up percentages |
| Tests | 8 | Measure/progress tests |

**Deliverable**: Users can add measures and track progress

### Phase 4: Alignment Visualization (Weeks 9-10) - 80 hours

| Task | Hours | Description |
|------|-------|-------------|
| Alignment query API | 16 | Recursive CTE queries |
| Tree visualization | 32 | Interactive goal tree (D3.js or React Flow) |
| "My Alignment" view | 16 | Individual → corporate path |
| Impact analysis | 16 | Show how goals contribute up |

**Deliverable**: Users can visualize goal alignment

### Phase 5: Reporting & Dashboards (Weeks 11-12) - 80 hours

| Task | Hours | Description |
|------|-------|-------------|
| Executive dashboard | 24 | Company-wide overview |
| Team dashboard | 16 | Team progress view |
| Personal dashboard | 16 | My goals and progress |
| Quarterly reports | 16 | Snapshot and export |
| Export functionality | 8 | CSV, PDF export |

**Deliverable**: Comprehensive dashboards and reports

### Phase 6: Performance & Scale (Weeks 13-14) - 80 hours

| Task | Hours | Description |
|------|-------|-------------|
| Redis caching | 16 | Implement caching layer |
| Database optimization | 16 | Query optimization, indexes |
| Load testing | 24 | Artillery/k6 tests for 18k users |
| Horizontal scaling | 16 | K8s HPA configuration |
| Performance monitoring | 8 | APM setup (Datadog/New Relic) |

**Deliverable**: System handles 18k concurrent users

### Total Estimated Hours: 620 hours

---

## Testing Strategy

### Unit Tests (Jest/Vitest)
- **Coverage target**: 80%
- Controllers, services, repositories
- React components (React Testing Library)
- Utility functions

### Integration Tests
- API endpoint tests with supertest
- Database operations with test database
- Authentication flows

### E2E Tests (Playwright)
- Critical user journeys:
  - Login → Create goal → Add measure → Record progress
  - Link goal to parent → View alignment
  - Dashboard views and reports

### Load Testing (Artillery/k6)
```yaml
# artillery-config.yml
config:
  target: 'https://okr-staging.moodys.com'
  phases:
    - duration: 60
      arrivalRate: 50     # Ramp up
    - duration: 300
      arrivalRate: 300    # Sustained (18k users ≈ 300 concurrent)
    - duration: 60
      arrivalRate: 500    # Peak load test

scenarios:
  - name: "Typical user session"
    flow:
      - get:
          url: "/api/users/me"
      - get:
          url: "/api/goals?quarter=Q1-2026"
      - get:
          url: "/api/goals/{{ goalId }}"
      - post:
          url: "/api/progress"
          json:
            measureId: "{{ measureId }}"
            value: 42
```

### Performance Targets
- API response time: p95 < 200ms
- Dashboard load time: < 2s
- Search results: < 500ms
- Concurrent users: 18,000+

---

## Deployment Plan

### Container Images
```dockerfile
# Frontend (frontend/Dockerfile)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Backend (backend/Dockerfile)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### Kubernetes Resources
```yaml
# k8s/deployment.yaml (simplified)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: okr-backend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: okr-backend
  template:
    spec:
      containers:
      - name: backend
        image: okr-tracker/backend:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: okr-secrets
              key: database-url
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: okr-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: okr-backend
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/moodys/okr-tracker:${{ github.sha }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: azure/k8s-deploy@v4
        with:
          manifests: k8s/staging/
          images: ghcr.io/moodys/okr-tracker:${{ github.sha }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: azure/k8s-deploy@v4
        with:
          manifests: k8s/production/
          images: ghcr.io/moodys/okr-tracker:${{ github.sha }}
```

### Infrastructure Requirements
- **Kubernetes cluster**: 3+ nodes, 8 vCPU / 16GB RAM each
- **PostgreSQL**: RDS/Cloud SQL, db.r6g.xlarge or equivalent
- **Redis**: ElastiCache/Memorystore, 2 nodes (primary + replica)
- **Load balancer**: ALB/nginx ingress
- **CDN**: CloudFlare or CloudFront for static assets

---

## Open Questions

### Authentication
1. What SSO provider does Moody's use? (Okta, Azure AD, Ping?)
2. Required claims in SAML assertion? (email, department, employee_id?)
3. Role mapping from SSO groups?

### Deployment
4. On-premise or cloud? (AWS, Azure, GCP?)
5. Existing Kubernetes clusters available?
6. VPN/network requirements for internal access?

### Data
7. Import existing OKR data from current system?
8. Organizational hierarchy data source? (HRIS integration?)
9. Data retention policy for historical goals?

### Features
10. Email notifications required? (Weekly summaries, reminders?)
11. Slack/Teams integration desired?
12. Mobile app needed or responsive web sufficient?
13. Offline support requirements?

---

## Next Steps

1. ✅ Repository created and initial structure committed
2. ✅ Detailed implementation plan created (this document)
3. ⏳ **Review and approve this plan**
4. ⬜ Resolve open questions (SSO, deployment, etc.)
5. ⬜ Begin Phase 1 implementation
6. ⬜ Weekly checkpoint reviews

---

*Plan created: 2026-01-21*  
*Ready for review at: https://github.com/berryk/okr-tracker*
