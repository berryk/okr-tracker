# Data Model

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ORGANIZATION                               │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                              │
│ name                                                                 │
│ created_at                                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              TEAM                                    │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                              │
│ organization_id (FK)                                                 │
│ parent_team_id (FK, self-ref) -- Enables hierarchy                   │
│ name                                                                 │
│ level (corporate|executive|department|team|individual)               │
│ created_at                                                           │
└─────────────────────────────────────────────────────────────────────┘
           │                                      │
           │ 1:N                                  │ 1:N
           ▼                                      ▼
┌─────────────────────────┐          ┌─────────────────────────────────┐
│         USER            │          │            GOAL                  │
├─────────────────────────┤          ├─────────────────────────────────┤
│ id (PK)                 │          │ id (PK)                          │
│ team_id (FK)            │          │ team_id (FK)                     │
│ manager_id (FK, self)   │          │ owner_id (FK → User)             │
│ email                   │          │ title                            │
│ name                    │          │ description                      │
│ role                    │          │ quarter (Q1-2026, etc)           │
│ sso_id                  │          │ status (draft|active|complete)   │
│ created_at              │          │ created_at                       │
└─────────────────────────┘          └─────────────────────────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────┐
                    │                             │                 │
                    ▼                             ▼                 ▼
┌───────────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│       GOAL_LINK           │    │      MEASURE        │    │   GOAL_UPDATE   │
├───────────────────────────┤    ├─────────────────────┤    ├─────────────────┤
│ id (PK)                   │    │ id (PK)             │    │ id (PK)         │
│ child_goal_id (FK)        │    │ goal_id (FK)        │    │ goal_id (FK)    │
│ parent_goal_id (FK)       │    │ title               │    │ user_id (FK)    │
│ contribution_weight       │    │ unit (%, $, #, etc) │    │ content         │
│ created_at                │    │ target_value        │    │ created_at      │
└───────────────────────────┘    │ current_value       │    └─────────────────┘
                                 │ created_at          │
                                 └─────────────────────┘
                                           │
                                           │ 1:N
                                           ▼
                                 ┌─────────────────────┐
                                 │     PROGRESS        │
                                 ├─────────────────────┤
                                 │ id (PK)             │
                                 │ measure_id (FK)     │
                                 │ value               │
                                 │ recorded_at         │
                                 │ recorded_by (FK)    │
                                 │ notes               │
                                 └─────────────────────┘
```

## Key Relationships

### Goal Hierarchy (via GOAL_LINK)
- Many-to-many: A goal can link to multiple parent goals
- Enables cross-functional alignment
- `contribution_weight` indicates % contribution to parent

### Organizational Hierarchy (via TEAM)
- Self-referential: Teams have parent teams
- Levels: Corporate → Executive → Department → Team → Individual
- Users belong to exactly one team

### Progress Tracking (via PROGRESS)
- Time-series data for each measure
- Enables quarterly snapshots and trend analysis
- Full audit trail of who recorded what

## Indexes (Performance)

```sql
-- Goal queries by team and quarter
CREATE INDEX idx_goals_team_quarter ON goals(team_id, quarter);

-- Goal links for alignment queries
CREATE INDEX idx_goal_links_parent ON goal_links(parent_goal_id);
CREATE INDEX idx_goal_links_child ON goal_links(child_goal_id);

-- Progress by measure and time
CREATE INDEX idx_progress_measure_time ON progress(measure_id, recorded_at);

-- User lookups by SSO
CREATE INDEX idx_users_sso ON users(sso_id);
```
