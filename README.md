# Arbiter

A backend-first content moderation pipeline simulating TikTok Live comment enforcement at scale. Routes every comment through automated risk scoring, rule matching, and human review — with real-time WebSocket delivery, persistent audit logs, and a full appeals workflow.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (Vite + TypeScript)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  ContentFeed │  │ ReviewPanel  │  │ MetricsDashboard  │ │
│  │  WebSocket   │  │ Risk scores  │  │ Live counters     │ │
│  │  live feed   │  │ Appeal flow  │  │ Category charts   │ │
│  └──────────────┘  └──────────────┘  └───────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                       WebSocket + REST
┌────────────────────────────▼────────────────────────────────┐
│  Express Backend (Node.js)                                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Content Ingestion (1.2 s interval)                  │   │
│  │  → Risk Scorer → Rule Engine → Priority Queue        │   │
│  │                ↓                                     │   │
│  │  auto_approved / auto_rejected / pending             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Routes: /content  /actions  /rules  /appeals  /metrics     │
│  Middleware: rate-limiting · request-id tracing             │
│  WebSocket hub: content:new · content:updated · metrics:tick│
│                                                             │
│  ┌──────────────────┐                                       │
│  │  SQLite (WAL)    │  — persistent, index-optimised        │
│  │  content_items   │                                       │
│  │  mod_actions     │                                       │
│  │  rules           │                                       │
│  │  appeals         │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Backend (focus for Trust & Safety Engineering)

| Feature | Detail |
|---|---|
| **Multi-signal risk scorer** | 5 signals (keyword density, ALL-CAPS, links, stretch-spam, punctuation) produce a 0–1 composite score with per-signal breakdown and human-readable explanation |
| **Policy categories** | Aligned with TikTok Community Guidelines: HATE_SPEECH · VIOLENCE · SPAM · ADULT_CONTENT · MISINFORMATION |
| **Priority queue** | Pending items sorted by `risk × 0.7 + age_weight × 0.3` — high-risk and stale items surface first |
| **Optimistic locking** | `POST /api/actions/claim/:id` atomically locks an item for 60 s, preventing duplicate human review |
| **Persistent SQLite** | WAL mode, foreign keys, indexes on `status`, `created_at`, `content_id` |
| **Appeals workflow** | Full CRUD — submit → senior review → overturn/uphold → audit entry written |
| **Observability endpoint** | `/api/metrics` — queue depth, avg age, decision breakdown, automation rate, rule effectiveness, category distribution |
| **WebSocket push** | socket.io replaces HTTP polling; server pushes `content:new`, `content:updated`, `metrics:tick` |
| **Rate limiting** | 30 req/min on actions, 10 req/min on appeals (express-rate-limit with standard headers) |
| **Request tracing** | Every request gets a UUID `X-Request-ID` header stored with moderation actions for log correlation |
| **Rule engine** | TEXT_CONTAINS · REGEX · RISK_SCORE_GTE rule types with `fired` counter for effectiveness tracking |

### Frontend

- Live feed with WebSocket connection indicator (green dot when connected)
- Status filter (pending / auto-approved / auto-rejected / approved / rejected / escalated)
- Review panel with risk score gauge, per-signal breakdown bars, and audit trail
- Appeal submission form inline with the review panel
- Metrics dashboard showing automation rate, queue depth, decision breakdown, category distribution, rule effectiveness
- Rule builder with 3 match types and category/action selectors

## Risk Scoring

```
composite_score =
  keyword_density      × 0.50
  + all_caps_ratio     × 0.15
  + link_presence      × 0.15
  + repeat_character   × 0.10
  + excess_punctuation × 0.10

score >= 0.75 → auto_rejected
score <= 0.15 → auto_approved
otherwise     → pending (human review queue)
```

Configurable in `backend/src/scoring/categories.js` (thresholds) and `riskScorer.js` (weights).

## API Reference

```
GET  /api/content              — list all content (optional ?status= filter)
GET  /api/content/queue        — priority-sorted pending queue
GET  /api/content/:id          — single item with signals + audit trail
POST /api/actions              — {contentId, action, moderatorId}
POST /api/actions/claim/:id    — {moderatorId} → exclusive 60 s lock
GET  /api/rules                — list rules
POST /api/rules                — {name, matchType, pattern, category, action, weight}
DELETE /api/rules/:id
GET  /api/appeals              — list appeals (optional ?status= filter)
GET  /api/appeals/:id
POST /api/appeals              — {contentId, requester, reason}
POST /api/appeals/:id/decision — {action: "overturn"|"uphold", reviewedBy}
GET  /api/metrics              — system health snapshot
GET  /api/health               — {status, queueDepth}
```

## Setup

### Local development

```bash
# Backend
cd backend
npm install
npm run dev       # → http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev       # → http://localhost:5173
```

### Docker

```bash
docker compose up --build
# frontend → http://localhost:5173
# backend  → http://localhost:4000
```

### Tests

```bash
cd backend
npm test
```

## Design Decisions

**SQLite over PostgreSQL** — sufficient for a demo/portfolio project; eliminates external service dependency. The store interface could be swapped for a pg pool with minimal changes.

**WebSocket over SSE** — socket.io gives bidirectional communication (needed for future moderator-presence features) and automatic reconnection with no extra library on the client.

**Optimistic locking over pessimistic** — short TTL (60 s) avoids deadlocks if a moderator closes the tab mid-review. Claimed items re-surface automatically once the lock expires.

**In-process rule engine** — for a portfolio project this is fine. At TikTok scale this would be an async worker pool consuming from a Kafka topic, with rules loaded from a config service.

## What's next at production scale

- Replace SQLite with PostgreSQL + read replicas for query throughput
- Replace in-process generator with Kafka consumer ingesting real comment stream
- Replace synchronous rule engine with async worker fleet (BullMQ / Celery)
- Add ML model API integration (confidence scores from a served model)
- Multi-region deployment with region-affinity routing
- Moderator authentication with role-based access (tier-1 / tier-2 / admin)
- Prometheus metrics endpoint + Grafana dashboard
