# Architecture Overview

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Load Balancer                          │
└──────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Frontend (React)      │     │   Frontend (React)      │
│   - SPA                 │     │   - SPA                 │
│   - Port 3000           │     │   - Port 3000           │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      API Gateway                              │
└──────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Backend (Node.js)     │     │   Backend (Node.js)     │
│   - Express API         │     │   - Express API         │
│   - Port 4000           │     │   - Port 4000           │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  PostgreSQL   │     │    Redis      │     │  SSO Provider │
│  Primary      │     │   (Cache)     │     │  (SAML/OIDC)  │
└───────────────┘     └───────────────┘     └───────────────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │
│  Replica      │
└───────────────┘
```

## Scaling Strategy

For 18,000 users:

1. **Horizontal Pod Autoscaling**: Multiple backend instances behind load balancer
2. **Database Read Replicas**: Offload read queries
3. **Redis Caching**: Cache frequently accessed goals and org structure
4. **CDN**: Static frontend assets via CDN
5. **Connection Pooling**: PgBouncer for database connections

## Security Layers

1. **Edge**: WAF, DDoS protection
2. **Transport**: TLS 1.3
3. **Authentication**: SAML/OIDC via corporate SSO
4. **Authorization**: RBAC with row-level security
5. **Data**: Encryption at rest (PostgreSQL)
