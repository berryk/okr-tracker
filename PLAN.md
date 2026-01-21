# OKR Tracker - Detailed Implementation Plan

> **Status**: DRAFT - Awaiting Review  
> **Last Updated**: 2026-01-21  
> **Target Users**: ~18,000 (enterprise scale)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technical Architecture](#technical-architecture)
3. [LLM Integration](#llm-integration)
4. [Database Schema](#database-schema)
5. [API Specification](#api-specification)
6. [Mobile App](#mobile-app)
7. [Integrations](#integrations)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)
10. [AWS Deployment](#aws-deployment)
11. [Resolved Questions](#resolved-questions)

---

## Executive Summary

### Problem Statement
Organizations need a scalable OKR tracking system that:
- Enables strategic alignment from CEO to individual contributor
- Supports ~18,000 users with real-time updates
- Provides clear visibility into how individual goals connect to company objectives
- Tracks quarterly progress with quantifiable measures
- Leverages AI to improve goal quality and provide intelligent insights

### Solution Overview
A comprehensive OKR platform with:
- **React SPA** frontend with hierarchical goal visualization
- **React Native** mobile app for iOS and Android
- **Node.js/Express** API backend with Redis caching
- **PostgreSQL** database optimized for hierarchical queries
- **Okta SSO** for enterprise authentication
- **LLM Integration** (Claude/GPT-4) for AI-powered goal coaching
- **Microsoft Teams** integration for notifications and quick actions
- **Email notifications** via AWS SES
- **AWS EKS** deployment for horizontal scaling

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CloudFront CDN                                      │
│                    Static assets, DDoS protection (AWS Shield)                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Application Load Balancer (ALB)                          │
│                        SSL termination, path-based routing                       │
└─────────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │                    │
    ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
    │  Frontend   │      │  Backend    │      │  LLM        │      │  Mobile     │
    │  (React)    │      │  API        │      │  Service    │      │  API        │
    │  EKS Pods   │      │  EKS Pods   │      │  EKS Pods   │      │  Gateway    │
    └─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
                                │                    │
        ┌───────────────────────┼────────────────────┼────────────────────┐
        │                       │                    │                    │
  ┌─────┴─────┐          ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
  │  RDS      │          │ ElastiCache │      │   Bedrock   │      │    SES      │
  │ PostgreSQL│          │   Redis     │      │   Claude    │      │   Email     │
  │ Multi-AZ  │          │   Cluster   │      │   (or API)  │      │   Service   │
  └───────────┘          └─────────────┘      └─────────────┘      └─────────────┘
        │
  ┌─────┴─────┐          ┌─────────────┐      ┌─────────────┐
  │  RDS      │          │    Okta     │      │ MS Teams    │
  │  Replica  │          │    SSO      │      │  Webhook    │
  │  (read)   │          │             │      │  Bot        │
  └───────────┘          └─────────────┘      └─────────────┘
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
│   │   ├── ai.ts                   # LLM API hooks
│   │   └── teams.ts                # Teams API hooks
│   ├── components/
│   │   ├── common/                 # Shared UI components
│   │   ├── goals/
│   │   │   ├── GoalCard.tsx
│   │   │   ├── GoalForm.tsx
│   │   │   ├── GoalTree.tsx
│   │   │   ├── AlignmentView.tsx
│   │   │   └── AIGoalAssistant.tsx # LLM-powered suggestions
│   │   ├── measures/
│   │   │   ├── MeasureCard.tsx
│   │   │   ├── MeasureForm.tsx
│   │   │   ├── ProgressChart.tsx
│   │   │   └── AIMeasureReview.tsx # LLM measure analysis
│   │   ├── ai/
│   │   │   ├── AIChat.tsx          # Conversational AI interface
│   │   │   ├── AISuggestions.tsx   # Inline suggestions
│   │   │   ├── AIInsights.tsx      # Dashboard insights
│   │   │   └── AICoach.tsx         # OKR coaching panel
│   │   └── dashboard/
│   │       ├── ExecutiveDashboard.tsx
│   │       ├── TeamDashboard.tsx
│   │       └── AIInsightsWidget.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Goals.tsx
│   │   ├── AIAssistant.tsx         # Dedicated AI page
│   │   └── Settings.tsx
│   └── hooks/
│       ├── useAuth.ts
│       ├── useGoals.ts
│       └── useAI.ts                # LLM interaction hooks
├── package.json
└── Dockerfile
```

### Backend Architecture

```
backend/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── okta.ts                 # Okta SAML/OIDC config
│   │   ├── bedrock.ts              # AWS Bedrock config
│   │   └── teams.ts                # MS Teams bot config
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rbac.ts
│   │   └── rateLimit.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── goals.routes.ts
│   │   ├── ai.routes.ts            # LLM endpoints
│   │   ├── notifications.routes.ts
│   │   └── webhooks.routes.ts      # Teams webhooks
│   ├── services/
│   │   ├── goal.service.ts
│   │   ├── ai/
│   │   │   ├── llm.service.ts      # LLM abstraction layer
│   │   │   ├── goal-coach.service.ts
│   │   │   ├── measure-analyzer.service.ts
│   │   │   ├── insights.service.ts
│   │   │   └── prompts/            # Prompt templates
│   │   │       ├── goal-suggestions.ts
│   │   │       ├── measure-review.ts
│   │   │       ├── alignment-advice.ts
│   │   │       └── progress-summary.ts
│   │   ├── notification/
│   │   │   ├── email.service.ts    # AWS SES
│   │   │   ├── teams.service.ts    # MS Teams
│   │   │   └── push.service.ts     # Mobile push
│   │   └── cache.service.ts
│   └── types/
├── prisma/
│   └── schema.prisma
└── Dockerfile
```

---

## LLM Integration

### Overview
The LLM integration provides AI-powered assistance throughout the OKR lifecycle, helping users write better goals, choose meaningful measures, and gain insights from their data.

### LLM Provider Strategy
- **Primary**: AWS Bedrock (Claude 3.5 Sonnet) - enterprise compliance, data residency
- **Fallback**: Anthropic API (Claude) or OpenAI (GPT-4)
- **Abstraction layer** allows swapping providers without code changes

### Use Cases

#### 1. Goal Writing Assistant 🎯
**When**: User creates or edits a goal
**How**: Real-time suggestions as user types

```typescript
// Example prompt
const goalAssistantPrompt = `
You are an OKR coach helping write effective objectives.
The user is in: ${teamName} (${teamLevel} level)
Parent goals they could align to:
${parentGoals.map(g => `- ${g.title}`).join('\n')}

Their draft goal: "${userInput}"

Provide:
1. Improved version (clearer, more inspiring, action-oriented)
2. Why the changes help
3. Suggested parent goal to link to
4. 3 example key results/measures
`;
```

**UI**: Inline suggestion panel next to goal form
```
┌─────────────────────────────────────────────────────────────┐
│ Create Goal                                                  │
├─────────────────────────────────────────────────────────────┤
│ Title: [Improve customer satisfaction          ]            │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💡 AI Suggestion                                        │ │
│ │                                                         │ │
│ │ Try: "Achieve industry-leading customer satisfaction    │ │
│ │ scores in Q1 2026"                                      │ │
│ │                                                         │ │
│ │ ✓ More specific and measurable                         │ │
│ │ ✓ Time-bound                                           │ │
│ │                                                         │ │
│ │ Suggested measures:                                     │ │
│ │ • NPS score ≥ 70                                       │ │
│ │ • CSAT ≥ 4.5/5                                         │ │
│ │ • Support ticket resolution < 4 hours                  │ │
│ │                                                         │ │
│ │ [Apply Suggestion] [Dismiss]                           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Measure Quality Review 📊
**When**: User adds measures to a goal
**How**: Automatic analysis after measure is saved

```typescript
const measureReviewPrompt = `
Review this OKR measure for quality:

Goal: "${goal.title}"
Measure: "${measure.title}"
Target: ${measure.targetValue} ${measure.unit}
Type: ${measure.measureType}

Evaluate against SMART criteria:
- Specific: Is it clear what's being measured?
- Measurable: Can progress be objectively tracked?
- Achievable: Is the target realistic?
- Relevant: Does it actually indicate goal success?
- Time-bound: Is there a clear deadline?

Also check:
- Is this a leading or lagging indicator?
- Could this metric be gamed?
- What might this miss?

Provide a score (1-10) and specific improvement suggestions.
`;
```

**Output Example**:
```json
{
  "score": 7,
  "assessment": {
    "specific": { "score": 8, "note": "Clear metric" },
    "measurable": { "score": 9, "note": "Easily tracked" },
    "achievable": { "score": 5, "note": "20% increase may be aggressive" },
    "relevant": { "score": 8, "note": "Directly tied to goal" },
    "timeBound": { "score": 6, "note": "Inherits quarter from goal" }
  },
  "suggestions": [
    "Consider adding a leading indicator like 'weekly active users'",
    "The 20% target is ambitious - consider interim milestones",
    "Add a quality metric alongside quantity to prevent gaming"
  ],
  "risks": [
    "Could incentivize short-term gains over long-term value"
  ]
}
```

#### 3. Alignment Suggestions 🔗
**When**: User creates a goal without linking to parent
**How**: AI analyzes goal content and suggests best parent matches

```typescript
const alignmentPrompt = `
Find the best parent goals for this objective:

New goal: "${goal.title}" 
Team: ${team.name} (${team.level})
Quarter: ${goal.quarter}

Available parent goals (${team.parentLevel} level):
${parentGoals.map((g, i) => `${i+1}. "${g.title}" - ${g.description}`).join('\n')}

Rank the top 3 matches by relevance and explain the connection.
Consider: semantic similarity, strategic fit, contribution potential.
`;
```

#### 4. Progress Narrative Generator 📝
**When**: Viewing goal progress or generating reports
**How**: AI summarizes progress data into human-readable narrative

```typescript
const progressSummaryPrompt = `
Generate an executive summary of OKR progress:

Goal: "${goal.title}"
Status: ${goal.status}
Time elapsed: ${weeksElapsed} of ${totalWeeks} weeks

Measures:
${measures.map(m => `
- ${m.title}: ${m.currentValue}/${m.targetValue} ${m.unit} (${m.progress}%)
  Trend: ${m.trend} | Last update: ${m.lastUpdate}
`).join('')}

Recent updates:
${updates.map(u => `- ${u.date}: ${u.content}`).join('\n')}

Write a 2-3 sentence summary suitable for an executive dashboard.
Highlight: overall status, key wins, main risks, recommended actions.
`;
```

**Output**: 
> "Revenue target is on track at 68% with 6 weeks remaining. Strong performance in EMEA (+15% above plan) is offsetting APAC delays. Recommend focusing Q1 push on enterprise deals in pipeline to secure the remaining $2.3M."

#### 5. Risk Detection & Alerts 🚨
**When**: Background job runs daily/weekly
**How**: AI analyzes patterns across goals to identify risks

```typescript
const riskDetectionPrompt = `
Analyze this goal portfolio for risks:

Team: ${team.name}
Goals this quarter: ${goals.length}

${goals.map(g => `
Goal: ${g.title}
Progress: ${g.progress}% (expected: ${g.expectedProgress}%)
Measures at risk: ${g.measuresAtRisk}
Days since update: ${g.daysSinceUpdate}
`).join('\n')}

Identify:
1. Goals likely to miss targets (with confidence %)
2. Patterns suggesting systemic issues
3. Goals with stale data (not updated recently)
4. Resource conflicts or dependencies
5. Recommended interventions
`;
```

#### 6. Natural Language Queries 💬
**When**: User asks questions in AI chat interface
**How**: AI interprets questions and queries the database

```
User: "How are we doing on revenue goals this quarter?"

AI: "Here's your Q1 2026 revenue goal summary:

📊 Corporate Revenue Goal: 72% complete
   Target: $50M | Current: $36M | Gap: $14M

Breaking down by region:
• EMEA: 85% ✅ (ahead of plan)
• Americas: 70% (on track)  
• APAC: 58% ⚠️ (behind - needs attention)

Top contributing team goals:
1. Enterprise Sales: +$12M (80% of target)
2. Mid-Market: +$8M (65% of target)
3. Renewals: +$16M (95% of target) ✅

Would you like me to drill into APAC or suggest actions?"
```

#### 7. OKR Coaching & Best Practices 🎓
**When**: User requests help or system detects poor OKR patterns
**How**: Contextual coaching based on user's actual goals

```typescript
const coachingPrompt = `
Act as an OKR coach. The user needs guidance.

Their current goals:
${userGoals.map(g => g.title).join('\n')}

Common issues detected:
- ${issues.join('\n- ')}

User question: "${userQuestion}"

Provide practical, specific advice. Reference their actual goals.
Include examples of what good looks like.
Keep it encouraging but direct.
`;
```

#### 8. Quarterly Report Generation 📋
**When**: End of quarter or on-demand
**How**: AI generates narrative report from structured data

**Output**: Full markdown report with:
- Executive summary
- Goal completion rates by level
- Top achievements
- Misses and learnings
- Recommendations for next quarter
- Appendix with detailed metrics

#### 9. Goal Quality Scoring 📈
**When**: Goal is created/updated
**How**: Automatic scoring shown in UI

```
Goal Quality Score: 8.2/10

✅ Clear and inspiring (9/10)
✅ Measurable outcomes defined (8/10)
✅ Aligned to parent goals (9/10)
⚠️ Stretch factor could be higher (6/10)
✅ Time-bound (10/10)

"This is a strong goal. Consider making the target 
more ambitious - historical data suggests your team 
typically achieves 110% of targets."
```

#### 10. Meeting Prep Assistant 📅
**When**: Before OKR review meetings
**How**: AI generates talking points and questions

```
📋 OKR Review Prep - Engineering Team

Key Discussion Points:
1. Platform Reliability goal at 92% - celebrate the win!
2. Developer Productivity showing only 45% progress - dig into blockers
3. 3 goals have no updates in 2+ weeks - need status check

Suggested Questions:
• "What's blocking the CI/CD pipeline improvements?"
• "Do we need to adjust the code review time target?"
• "Should we de-scope the documentation goal given priorities?"

Time Allocation Suggestion:
• 5 min: Wins (Reliability)
• 15 min: Deep dive (Productivity blockers)
• 10 min: Status updates on stale goals
```

### LLM API Endpoints

```typescript
// POST /api/ai/suggest-goal
// Suggest improvements to a draft goal
{
  "draftTitle": "Improve sales",
  "draftDescription": "Make more sales",
  "teamId": "uuid",
  "quarter": "Q1-2026"
}

// POST /api/ai/review-measure  
// Analyze a measure for quality
{
  "goalId": "uuid",
  "measureTitle": "Increase revenue",
  "targetValue": 1000000,
  "unit": "$"
}

// POST /api/ai/suggest-alignment
// Recommend parent goals to link to
{
  "goalId": "uuid"
}

// POST /api/ai/summarize-progress
// Generate narrative summary
{
  "goalId": "uuid",  // or teamId for team summary
  "format": "brief" | "detailed"
}

// POST /api/ai/chat
// Natural language queries
{
  "message": "How is my team doing?",
  "context": { "teamId": "uuid", "quarter": "Q1-2026" }
}

// GET /api/ai/insights
// Get AI-generated insights for dashboard
{
  "scope": "user" | "team" | "corporate",
  "scopeId": "uuid"
}
```

### Cost Management
- Cache common queries (goal suggestions for same context)
- Rate limit: 50 AI requests/user/day
- Batch processing for reports (off-peak hours)
- Use smaller/faster models for simple tasks (scoring)
- Estimated cost: ~$0.02/user/month at typical usage

---

## Database Schema

### Prisma Schema (Updated with AI tables)

```prisma
// ... (previous schema remains the same)

// ============ AI INTERACTIONS ============

model AIInteraction {
  id           String   @id @default(uuid())
  userId       String
  type         AIInteractionType
  prompt       String   @db.Text
  response     String   @db.Text
  model        String   // e.g., "claude-3-sonnet"
  tokens       Int      // Total tokens used
  latencyMs    Int      // Response time
  rating       Int?     // User feedback (1-5)
  entityType   String?  // e.g., "Goal", "Measure"
  entityId     String?
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([type])
  @@index([createdAt])
}

enum AIInteractionType {
  GOAL_SUGGESTION
  MEASURE_REVIEW
  ALIGNMENT_SUGGESTION
  PROGRESS_SUMMARY
  CHAT_QUERY
  RISK_DETECTION
  REPORT_GENERATION
}

model AIInsight {
  id          String   @id @default(uuid())
  scope       String   // "user", "team", "corporate"
  scopeId     String   // userId, teamId, or orgId
  quarter     String
  insightType String   // "risk", "achievement", "recommendation"
  title       String
  content     String   @db.Text
  priority    Int      @default(0)
  dismissed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  expiresAt   DateTime

  @@index([scope, scopeId])
  @@index([quarter])
}

// ============ NOTIFICATIONS ============

model NotificationPreference {
  id                    String   @id @default(uuid())
  userId                String   @unique
  emailEnabled          Boolean  @default(true)
  teamsEnabled          Boolean  @default(true)
  pushEnabled           Boolean  @default(true)
  weeklyDigest          Boolean  @default(true)
  progressReminders     Boolean  @default(true)
  goalDeadlineAlerts    Boolean  @default(true)
  aiInsightsEnabled     Boolean  @default(true)
  
  user User @relation(fields: [userId], references: [id])
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      NotificationType
  title     String
  body      String
  data      Json?
  read      Boolean  @default(false)
  channels  String[] // ["email", "teams", "push"]
  sentAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, read])
  @@index([createdAt])
}

enum NotificationType {
  GOAL_ASSIGNED
  PROGRESS_REMINDER
  GOAL_AT_RISK
  GOAL_COMPLETED
  COMMENT_ADDED
  WEEKLY_DIGEST
  AI_INSIGHT
  QUARTER_ENDING
}
```

---

## Mobile App

### Technology Stack
- **Framework**: React Native (code sharing with web)
- **State**: React Query + Zustand
- **Navigation**: React Navigation
- **Push**: Firebase Cloud Messaging (FCM) + APNs
- **Auth**: Okta React Native SDK

### App Structure

```
mobile/
├── src/
│   ├── App.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── screens/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx      # Okta SSO
│   │   ├── home/
│   │   │   └── DashboardScreen.tsx  # My OKRs overview
│   │   ├── goals/
│   │   │   ├── GoalListScreen.tsx
│   │   │   ├── GoalDetailScreen.tsx
│   │   │   ├── CreateGoalScreen.tsx
│   │   │   └── UpdateProgressScreen.tsx
│   │   ├── ai/
│   │   │   └── AIChatScreen.tsx     # AI assistant
│   │   └── settings/
│   │       └── SettingsScreen.tsx
│   ├── components/
│   │   ├── GoalCard.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── AIAssistantFAB.tsx       # Floating AI button
│   │   └── QuickProgressEntry.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── push.ts
│   └── shared/                       # Shared with web
│       ├── types/
│       └── utils/
├── ios/
├── android/
└── package.json
```

### Key Mobile Features

1. **Quick Progress Updates**: One-tap progress entry from home screen
2. **Push Notifications**: Goal reminders, @mentions, AI insights
3. **Offline Support**: View goals offline, queue updates
4. **AI Chat**: Voice-to-text for asking questions
5. **Widgets**: iOS/Android home screen widgets showing goal progress
6. **Deep Links**: Open specific goals from Teams/email links

### Mobile Screens

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Dashboard           │  │ Goal Detail         │  │ AI Chat             │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ ┌─────────────────┐ │  │ Increase Revenue    │  │ ┌─────────────────┐ │
│ │ Q1 Progress     │ │  │ ━━━━━━━━━━━━ 72%   │  │ │ How's my team   │ │
│ │ ████████░░ 78%  │ │  │                     │  │ │ doing?          │ │
│ └─────────────────┘ │  │ Key Results:        │  │ └─────────────────┘ │
│                     │  │ ├─ Revenue: $36M    │  │                     │
│ My Goals (4)        │  │ │  ████████░░ 72%   │  │ ┌─────────────────┐ │
│ ├─ Increase Rev ▶  │  │ ├─ Deals: 45        │  │ │ Your team is at │ │
│ ├─ Launch Prod  ▶  │  │ │  ██████░░░░ 60%   │  │ │ 78% overall.    │ │
│ ├─ Hire Team    ▶  │  │ └─ NPS: 72          │  │ │                 │ │
│ └─ Reduce Cost  ▶  │  │    ██████████ 95%   │  │ │ 🎉 Revenue goal │ │
│                     │  │                     │  │ │ is ahead!       │ │
│ ┌─────────────────┐ │  │ [+ Update Progress] │  │ │                 │ │
│ │ 💡 AI Insight   │ │  │                     │  │ │ ⚠️ Hiring is    │ │
│ │ APAC revenue is │ │  │ Aligned to:        │  │ │ behind by 2     │ │
│ │ behind - tap    │ │  │ → Global Growth    │  │ │ weeks.          │ │
│ │ for suggestions │ │  │                     │  │ └─────────────────┘ │
│ └─────────────────┘ │  │ Updates (3)         │  │                     │
│                     │  │ └─ Jan 20: Strong...│  │ [Type a message...] │
│ [🤖 Ask AI]         │  │                     │  │ [🎤]               │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

## Integrations

### 1. Okta SSO (Authentication)

**Configuration**:
```typescript
// config/okta.ts
export const oktaConfig = {
  issuer: 'https://your-org.okta.com/oauth2/default',
  clientId: process.env.OKTA_CLIENT_ID,
  redirectUri: 'https://okr.yourcompany.com/auth/callback',
  scopes: ['openid', 'profile', 'email', 'groups'],
  pkce: true
};
```

**User Provisioning**:
- SCIM integration for automatic user sync
- Group-to-role mapping:
  - `OKR-Admins` → ADMIN
  - `OKR-Executives` → EXECUTIVE
  - `OKR-Managers` → MANAGER
  - `Default` → CONTRIBUTOR

### 2. Microsoft Teams Integration

**Features**:
- **Notifications**: Goal updates, reminders, AI insights
- **Bot Commands**:
  - `/okr status` - Show my goals summary
  - `/okr update [goal] [value]` - Quick progress update
  - `/okr ask [question]` - AI query
- **Adaptive Cards**: Rich goal cards with action buttons
- **Tab App**: Embedded OKR dashboard in Teams

**Architecture**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Teams     │────▶│  Bot        │────▶│  OKR API    │
│   Client    │◀────│  Service    │◀────│  Backend    │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    ┌─────┴─────┐
                    │  Azure    │
                    │  Bot Svc  │
                    └───────────┘
```

**Notification Card Example**:
```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "text": "🎯 Goal Progress Update",
      "weight": "bolder"
    },
    {
      "type": "TextBlock",
      "text": "**Increase Revenue by 20%** is now at 72%"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Current", "value": "$36M" },
        { "title": "Target", "value": "$50M" },
        { "title": "Gap", "value": "$14M" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Goal",
      "url": "https://okr.yourcompany.com/goals/abc123"
    },
    {
      "type": "Action.Submit",
      "title": "Update Progress",
      "data": { "action": "updateProgress", "goalId": "abc123" }
    }
  ]
}
```

### 3. Email Notifications (AWS SES)

**Notification Types**:
| Type | Trigger | Frequency |
|------|---------|-----------|
| Weekly Digest | Sunday 6pm | Weekly |
| Progress Reminder | No update in 7 days | As needed |
| Goal at Risk | Progress < expected | Immediate |
| Deadline Alert | 7 days before due | Once |
| AI Insight | New insight generated | Daily max |
| Quarter End | 2 weeks before | Once |

**Email Template Example**:
```html
Subject: 📊 Your Weekly OKR Summary - Q1 2026 Week 3

Hi {{name}},

Here's your OKR progress this week:

📈 OVERALL: 72% (↑ 5% from last week)

YOUR GOALS:
✅ Increase Revenue: 75% (+8%)
⚠️ Launch Product: 45% (+2%) - Behind schedule
✅ Reduce Costs: 82% (+12%)

🤖 AI INSIGHTS:
• Product launch is at risk - consider descoping features
• Revenue goal trending to exceed target by 10%

ACTION NEEDED:
• Update "Launch Product" progress (last update: 12 days ago)

[View Dashboard] [Update Progress]
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3) - 120 hours
*No changes from original*

### Phase 2: Goal Management (Weeks 4-6) - 160 hours
*No changes from original*

### Phase 3: Measures & Progress (Weeks 7-8) - 100 hours
*No changes from original*

### Phase 4: Alignment Visualization (Weeks 9-10) - 80 hours
*No changes from original*

### Phase 5: Reporting & Dashboards (Weeks 11-12) - 80 hours
*No changes from original*

### Phase 6: LLM Integration (Weeks 13-15) - 120 hours ⭐ NEW

| Task | Hours | Description |
|------|-------|-------------|
| LLM service setup | 16 | Bedrock/API integration, abstraction layer |
| Prompt engineering | 24 | Develop and test all prompt templates |
| Goal suggestion API | 16 | Real-time goal improvement suggestions |
| Measure review API | 16 | SMART criteria analysis |
| AI chat interface | 24 | Natural language query system |
| Progress summaries | 8 | Narrative generation |
| AI insights dashboard | 16 | Proactive insights widget |

**Deliverable**: AI assistant fully integrated throughout app

### Phase 7: Integrations (Weeks 16-17) - 80 hours ⭐ NEW

| Task | Hours | Description |
|------|-------|-------------|
| Okta SSO | 16 | OIDC/SAML integration, group sync |
| AWS SES | 8 | Email templates, sending service |
| MS Teams bot | 32 | Bot framework, adaptive cards, commands |
| Push notifications | 16 | FCM/APNs setup |
| Webhook system | 8 | Outbound events for integrations |

**Deliverable**: Full enterprise integration

### Phase 8: Mobile App (Weeks 18-21) - 160 hours ⭐ NEW

| Task | Hours | Description |
|------|-------|-------------|
| React Native setup | 16 | Project scaffolding, navigation |
| Auth flow | 16 | Okta SDK integration |
| Core screens | 48 | Dashboard, goals, progress |
| AI chat screen | 16 | Voice-to-text, chat UI |
| Push notifications | 16 | FCM/APNs integration |
| Offline support | 24 | Local storage, sync queue |
| App store prep | 24 | Screenshots, listings, submission |

**Deliverable**: iOS and Android apps published

### Phase 9: Performance & Polish (Weeks 22-24) - 80 hours

| Task | Hours | Description |
|------|-------|-------------|
| Load testing | 24 | 18k user simulation |
| Performance optimization | 24 | Caching, query optimization |
| Security audit | 16 | Penetration testing, fixes |
| Documentation | 16 | User guides, API docs |

**Deliverable**: Production-ready system

### Total Estimated Hours: 980 hours (~6 months with small team)

---

## Testing Strategy

*Previous testing strategy remains, plus:*

### AI-Specific Testing

```typescript
// AI response quality tests
describe('Goal Suggestion AI', () => {
  it('improves vague goals', async () => {
    const result = await aiService.suggestGoal({
      draft: 'Make things better'
    });
    expect(result.improvedTitle).toMatch(/specific|measurable/i);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('respects context', async () => {
    const result = await aiService.suggestGoal({
      draft: 'Increase revenue',
      teamLevel: 'INDIVIDUAL'
    });
    expect(result.improvedTitle).not.toContain('company-wide');
  });
});

// Measure review accuracy
describe('Measure Review AI', () => {
  it('catches unmeasurable measures', async () => {
    const result = await aiService.reviewMeasure({
      title: 'Improve team morale',
      unit: 'happiness'
    });
    expect(result.score).toBeLessThan(6);
    expect(result.suggestions).toContain(/quantif|measur/i);
  });
});
```

---

## AWS Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  AWS Cloud                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                           VPC (10.0.0.0/16)                          │    │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐           │    │
│  │  │   Public Subnet A       │  │   Public Subnet B       │           │    │
│  │  │   (10.0.1.0/24)         │  │   (10.0.2.0/24)         │           │    │
│  │  │   ┌─────────────────┐   │  │   ┌─────────────────┐   │           │    │
│  │  │   │      ALB        │   │  │   │      NAT        │   │           │    │
│  │  │   └─────────────────┘   │  │   └─────────────────┘   │           │    │
│  │  └─────────────────────────┘  └─────────────────────────┘           │    │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐           │    │
│  │  │   Private Subnet A      │  │   Private Subnet B      │           │    │
│  │  │   (10.0.10.0/24)        │  │   (10.0.20.0/24)        │           │    │
│  │  │   ┌─────────────────┐   │  │   ┌─────────────────┐   │           │    │
│  │  │   │   EKS Nodes     │   │  │   │   EKS Nodes     │   │           │    │
│  │  │   └─────────────────┘   │  │   └─────────────────┘   │           │    │
│  │  └─────────────────────────┘  └─────────────────────────┘           │    │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐           │    │
│  │  │   Data Subnet A         │  │   Data Subnet B         │           │    │
│  │  │   (10.0.100.0/24)       │  │   (10.0.200.0/24)       │           │    │
│  │  │   ┌───────┐ ┌───────┐   │  │   ┌───────┐ ┌───────┐   │           │    │
│  │  │   │  RDS  │ │ Redis │   │  │   │  RDS  │ │ Redis │   │           │    │
│  │  │   │Primary│ │Primary│   │  │   │Replica│ │Replica│   │           │    │
│  │  │   └───────┘ └───────┘   │  │   └───────┘ └───────┘   │           │    │
│  │  └─────────────────────────┘  └─────────────────────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  External Services:                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │CloudFront│ │   SES    │ │ Bedrock  │ │  Secrets │ │    S3    │          │
│  │   CDN    │ │  Email   │ │  Claude  │ │ Manager  │ │ Backups  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### AWS Services Used

| Service | Purpose | Configuration |
|---------|---------|---------------|
| EKS | Kubernetes cluster | 3 nodes, m6i.xlarge |
| RDS PostgreSQL | Database | db.r6g.xlarge, Multi-AZ |
| ElastiCache Redis | Caching, sessions | cache.r6g.large, 2 nodes |
| ALB | Load balancer | Path-based routing |
| CloudFront | CDN | Global edge caching |
| SES | Email | Production access |
| Bedrock | LLM | Claude 3.5 Sonnet |
| Secrets Manager | Credentials | API keys, DB creds |
| S3 | Storage | Backups, exports |
| CloudWatch | Monitoring | Logs, metrics, alarms |
| WAF | Security | SQL injection, XSS protection |

### Estimated AWS Costs

| Service | Monthly Cost |
|---------|-------------|
| EKS (3 nodes) | $450 |
| RDS (Multi-AZ) | $800 |
| ElastiCache | $300 |
| ALB | $50 |
| CloudFront | $100 |
| Bedrock (LLM) | $400 |
| SES | $50 |
| Other (S3, CW, etc.) | $150 |
| **Total** | **~$2,300/month** |

### Terraform Structure

```
infrastructure/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── vpc/
│   │   ├── eks/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   └── monitoring/
│   └── environments/
│       ├── staging/
│       └── production/
└── k8s/
    ├── base/
    ├── staging/
    └── production/
```

---

## Resolved Questions

| Question | Answer |
|----------|--------|
| SSO Provider | **Okta** - OIDC with SCIM provisioning |
| Deployment | **AWS** - EKS, RDS, ElastiCache |
| Email notifications | **Yes** - AWS SES with templates |
| Teams integration | **Yes** - Bot + Tab app + Notifications |
| Mobile app | **Yes** - React Native (iOS + Android) |
| LLM integration | **Yes** - AWS Bedrock (Claude) for AI features |

---

## Next Steps

1. ✅ Repository created and initial structure committed
2. ✅ Detailed implementation plan created
3. ✅ Plan updated with LLM, mobile, and integrations
4. ✅ Phase 1 Foundation - Initial implementation complete
5. ⏳ **Test and validate initial build**
6. ⬜ Begin Phase 2 implementation (Goal Management enhancements)
7. ⬜ Weekly checkpoint reviews

---

*Plan updated: 2026-01-21*
*Ready for review at: https://github.com/berryk/okr-tracker*

---

## Implementation Progress Tracking

### Phase 1: Foundation - COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Project scaffolding | ✅ Complete | package.json, Dockerfiles, tsconfig |
| Prisma schema design | ✅ Complete | All entities: User, Team, Goal, Measure, GoalLink, AI tables, Notifications |
| Backend Express setup | ✅ Complete | Auth, Goals, Measures, Teams routes with services |
| Frontend React setup | ✅ Complete | Dashboard, Goals, Teams pages with Chakra UI |
| Authentication (basic) | ✅ Complete | JWT-based auth with login/register |
| Docker integration | ✅ Complete | nginx.conf, docker-compose ready |
| Database seeding | ✅ Complete | Demo data with 5 users, teams, goals, measures |

### Files Created

**Backend (17 files)**:
- `prisma/schema.prisma` - Full database schema
- `prisma/seed.ts` - Demo data seeding script
- `src/index.ts` - Server entry point
- `src/app.ts` - Express configuration
- `src/config/` - Database, Redis, environment config
- `src/middleware/` - Auth, error handling
- `src/routes/` - Auth, Goals, Measures, Teams APIs
- `src/services/` - Business logic layer
- `src/types/` - TypeScript interfaces

**Frontend (18 files)**:
- `src/main.tsx` - React entry point
- `src/App.tsx` - Router and providers
- `src/api/` - API client with React Query hooks
- `src/context/AuthContext.tsx` - Auth state management
- `src/components/common/` - Layout, ProtectedRoute
- `src/components/goals/` - GoalCard, GoalForm
- `src/pages/` - Login, Dashboard, Goals, GoalDetail, Teams
- `nginx.conf` - Production nginx config

**Last Updated**: 2026-01-21

### How to Run

```bash
# Install dependencies
cd backend && npm install
cd frontend && npm install

# Generate Prisma client
cd backend && npx prisma generate

# Run with Docker
docker-compose up

# Or run locally (requires PostgreSQL and Redis)
cd backend && npm run dev
cd frontend && npm run dev

# Seed database
cd backend && npm run db:migrate
cd backend && npm run db:seed
```

### Demo Credentials
- `ceo@demo.com` / `demo123` - Executive access
- `vp.sales@demo.com` / `demo123` - Sales VP
- `vp.engineering@demo.com` / `demo123` - Engineering VP
- `manager@demo.com` / `demo123` - Sales Manager
- `dev@demo.com` / `demo123` - Developer
