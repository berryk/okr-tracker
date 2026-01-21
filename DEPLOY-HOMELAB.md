# Homelab Deployment Guide

Deploy OKR Tracker to your homelab with Docker Compose. No AWS or Okta required!

## Prerequisites

- Docker & Docker Compose v2
- 2GB+ RAM available
- (Optional) Anthropic API key for AI features
- (Optional) Traefik or nginx-proxy for SSL

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/berryk/okr-tracker.git
cd okr-tracker
```

### 2. Create environment file

```bash
cp .env.example .env.homelab
```

Edit `.env.homelab`:

```env
# Required: Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Optional: Enable AI features (highly recommended!)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Alternative: Use OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-your-key-here

# Or disable AI entirely
# LLM_PROVIDER=mock

# Optional: Email notifications
EMAIL_PROVIDER=console  # Logs to console (default)
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=app-password
```

### 3. Start the stack

```bash
# Build and start all services
docker compose -f docker-compose.homelab.yml --env-file .env.homelab up -d

# Watch the logs
docker compose -f docker-compose.homelab.yml logs -f
```

### 4. Initialize the database

```bash
# Run migrations
docker compose -f docker-compose.homelab.yml exec backend npm run db:migrate

# Seed demo data (optional but recommended for demo)
docker compose -f docker-compose.homelab.yml --profile setup up seed
```

### 5. Access the app

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **Adminer** (DB admin): http://localhost:8080 (run with `--profile tools`)

## Demo Users

When `AUTH_MODE=demo` is set, the following users are available:

| Email | Password | Role | Team |
|-------|----------|------|------|
| ceo@demo.com | demo123 | EXECUTIVE | Corporate |
| vp.sales@demo.com | demo123 | EXECUTIVE | Sales |
| vp.engineering@demo.com | demo123 | EXECUTIVE | Engineering |
| manager@demo.com | demo123 | MANAGER | Platform Team |
| dev@demo.com | demo123 | CONTRIBUTOR | Platform Team |

## Demo Data

The seed script creates a realistic OKR hierarchy:

```
Corporate Goals (CEO)
├── Grow Revenue 25% YoY
│   ├── Sales: Close $50M in new deals
│   │   ├── Enterprise Team: 10 enterprise deals
│   │   └── SMB Team: 500 SMB customers
│   └── Product: Launch v2.0 platform
│       └── Engineering: Complete core features
├── Achieve 95% Customer Satisfaction
│   ├── Support: < 4hr response time
│   └── Product: NPS > 60
└── Build World-Class Team
    ├── HR: Hire 50 engineers
    └── L&D: 100% completion of training
```

## Reverse Proxy Setup (Optional)

### With Traefik

If you're using Traefik, the labels are already configured. Just ensure:

1. Traefik is on the `okr-network`
2. DNS points `okr.8landridgeroad.com` to your homelab

```bash
# Join the network
docker network connect okr-network traefik
```

### With nginx-proxy

```yaml
# Add to your nginx-proxy docker-compose
services:
  frontend:
    environment:
      - VIRTUAL_HOST=okr.8landridgeroad.com
      - LETSENCRYPT_HOST=okr.8landridgeroad.com
```

### Manual nginx

```nginx
server {
    listen 443 ssl http2;
    server_name okr.8landridgeroad.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## AI Features

### With Anthropic API (Recommended)

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
```

Cost: ~$0.01-0.05 per AI interaction (Claude 3.5 Sonnet)

### With OpenAI

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
```

### With Local LLM (Ollama)

```env
LLM_PROVIDER=ollama
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.1:8b
```

Add to docker-compose:
```yaml
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
```

### Mock Mode (No API needed)

```env
LLM_PROVIDER=mock
```

Returns placeholder responses - useful for UI development.

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.homelab.yml up -d --build

# Run any new migrations
docker compose -f docker-compose.homelab.yml exec backend npm run db:migrate
```

## Backup

```bash
# Backup database
docker compose -f docker-compose.homelab.yml exec db \
  pg_dump -U okr okr_tracker > backup-$(date +%Y%m%d).sql

# Restore
cat backup-20260121.sql | docker compose -f docker-compose.homelab.yml exec -T db \
  psql -U okr okr_tracker
```

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker compose -f docker-compose.homelab.yml logs backend

# Verify database is healthy
docker compose -f docker-compose.homelab.yml exec db pg_isready
```

### Database connection errors

```bash
# Ensure db is healthy before backend starts
docker compose -f docker-compose.homelab.yml up -d db
sleep 10
docker compose -f docker-compose.homelab.yml up -d backend
```

### AI features not working

```bash
# Test API key
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  https://api.anthropic.com/v1/messages \
  -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Reset everything

```bash
# Stop and remove all containers and volumes
docker compose -f docker-compose.homelab.yml down -v

# Fresh start
docker compose -f docker-compose.homelab.yml up -d
```

## Resource Usage

Typical homelab requirements:

| Service | CPU | RAM |
|---------|-----|-----|
| Frontend | 0.1 | 128MB |
| Backend | 0.5 | 512MB |
| PostgreSQL | 0.3 | 256MB |
| Redis | 0.1 | 64MB |
| **Total** | **~1 core** | **~1GB** |

## Next Steps

1. ✅ Deploy to homelab
2. 🔗 Set up DNS/reverse proxy for external access
3. 🔑 Enable HTTPS with Let's Encrypt
4. 🤖 Add Anthropic API key for AI features
5. 📧 Configure email notifications (optional)
6. 👥 Invite team members to test

---

Questions? Open an issue at https://github.com/berryk/okr-tracker/issues
