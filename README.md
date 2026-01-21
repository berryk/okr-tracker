# OKR Tracker - Corporate Scorecard

A hierarchical OKR (Objectives and Key Results) tracker for managing corporate goals from CEO level down to individual contributors.

## Overview

This application enables companies to:
- Set strategic goals at the executive level with quantifiable measures
- Cascade goals down through the organizational hierarchy
- Track quarterly progress against measures
- Visualize goal alignment from individual contributor to corporate objectives
- Support ~18,000 users with scalable architecture

## Key Features

- **Hierarchical Goal Structure**: Goals cascade from CEO → Executive Team → Department → Team → Individual
- **Multi-Measure Tracking**: Each goal can have multiple quantifiable key results/measures
- **Quarterly Cadence**: Progress tracked and reported quarterly
- **Goal Linking**: Lower-level goals link back to parent corporate objectives
- **Alignment Visualization**: Individual contributors can trace their goals up to company strategy
- **Many-to-Many Relationships**: A single goal can map to multiple goals at lower levels

## Architecture

- **Frontend**: React/TypeScript SPA
- **Backend**: Node.js/Express API (or Python/FastAPI)
- **Database**: PostgreSQL (hierarchical data support)
- **Authentication**: SSO/SAML integration for enterprise
- **Containerization**: Docker + Docker Compose
- **Scalability**: Designed for 18,000+ concurrent users

## Project Structure

```
okr-tracker/
├── README.md
├── PLAN.md                 # Detailed implementation plan
├── docker-compose.yml
├── frontend/               # React SPA
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── backend/                # API server
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── database/               # DB migrations and seeds
│   └── migrations/
├── docs/                   # Documentation
│   ├── architecture.md
│   ├── api-spec.md
│   └── data-model.md
└── scripts/                # Utility scripts
```

## Getting Started

See [PLAN.md](./PLAN.md) for implementation details.

## License

MIT License - Open Source
