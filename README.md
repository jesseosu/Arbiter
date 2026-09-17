# Arbiter

A content moderation pipeline built on one principle: automate the confident decisions, spend human attention only where it matters.

Arbiter simulates enforcement on a live comment stream. Every comment is risk-scored the moment it arrives, matched against moderator-defined rules, and routed one of three ways: clear violations are rejected automatically, clearly benign content passes automatically, and everything ambiguous lands in a prioritised human review queue with locking, appeals, and a full audit trail.

**Stack:** Node.js · Express · SQLite (WAL) · socket.io · React (Vite + TypeScript) · Jest · Docker

## What this is, and isn't

A single-node personal project, built to work through how a moderation pipeline fits together end to end. The comment stream is simulated by an in-process generator, not ingested from anywhere real. Scoring is term-list matching with hand-chosen category weights, not a trained model. The category term lists are my own and are illustrative rather than authoritative.

What it does do is implement the full lifecycle honestly: scoring with explanations, runtime-editable rules, a prioritised queue with review locking, appeals with reversal, and an audit trail that ties every decision back to a request ID. [Known limitations](#known-limitations) is at the bottom and is worth reading before the code.

## Contents

- [The idea](#the-idea)
- [A comment's journey](#a-comments-journey)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [The moderation lifecycle](#the-moderation-lifecycle)
- [Risk scoring in depth](#risk-scoring-in-depth)
- [API reference](#api-reference)
- [Testing](#testing)
- [Known limitations](#known-limitations)
- [Tradeoffs](#tradeoffs)
- [From prototype to production](#from-prototype-to-production)
- [Project structure](#project-structure)

## The idea

A live stream can produce more comments per minute than any human team can read. The naive answers both fail: pure automation makes unacceptable mistakes on ambiguous content, and pure human review cannot keep up with volume.

Arbiter takes the triage approach. The scoring system is deliberately confident only at the extremes. A wide middle band of scores routes to humans, and the human queue is engineered so that reviewer time goes to the riskiest and longest-waiting items first, two moderators do not review the same item simultaneously, and every decision is appealable and auditable.

## A comment's journey

Scorer outputs for three sample comments:

| Comment | Score | Dominant category | Route |
| --- | --- | --- | --- |
| `that goal was insane, best stream all week` | 0.00 | NONE | auto approved |
| `FREE MONEY!!!!! click here bit.ly/win now` | 0.57 | SPAM | pending: human review |
| `i will hurt you, watch your back` | 0.71 | VIOLENCE | auto rejected |

Reproduce these yourself:

```
cd backend && npm run score -- "i will hurt you, watch your back"
```

The middle row is the design working as intended. The comment trips four signals (spam terms, a link, stretch punctuation, caps) yet lands just under the 0.60 auto-reject line, so a human makes the call instead of the machine. Ambiguity routes to people.

For the pending item, the pipeline then takes over: it enters the priority queue at `risk × 0.7 + age × 0.3`, a moderator claims it (a 60 second lock is intended to stop a second moderator reviewing it simultaneously), decides, and the decision, the request ID, and the acting moderator are written to the audit log. If the author appeals, a senior reviewer can overturn the decision, which reverses the content status and writes its own audit entry.

## Architecture

![Architecture](docs/architecture.png)

## Quick start

```
# Backend
cd backend && npm install && npm run dev    # http://localhost:4000

# Frontend, in a second terminal
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Or with Docker:

```
docker compose up --build
```

A content generator starts with the backend and produces simulated live comments every 1.2 seconds, so the feed, queue, and dashboard are populated within moments of starting.

## The moderation lifecycle

**Detection.** Five policy categories (hate speech, violence, spam, adult content, misinformation), each with its own term list and severity weight, combined with four stylistic signals into a 0 to 1 composite score. Every scored item carries a per-signal breakdown and a human-readable explanation, on the assumption that a reviewer who cannot see why something was flagged has to redo the work themselves.

**Rules.** Moderators can add rules at runtime with three match types: `TEXT_CONTAINS`, `REGEX`, and `RISK_SCORE_GTE`. Each rule tracks a `fired` counter, so ineffective rules are visible and removable.

**Human review.** The pending queue is sorted by `risk × 0.7 + age_weight × 0.3`, which surfaces high-risk items first and lets waiting time pull lower-risk items up over time. Claiming an item takes a 60 second lock via a single conditional SQL update, which makes the claim itself atomic and lets the lock self-release if a reviewer disappears mid-review. See [Known limitations](#known-limitations) for what this does not cover.

**Appeals and audit.** Any decision can be appealed. Senior review either upholds or overturns; an overturn reverses the content decision. Every action, automated or human, is written to a moderation actions table with the acting moderator and the originating request ID.

**Operations.** Per-route rate limiting (30/min on actions, 10/min on appeals), UUID request tracing on every request, and a `/api/metrics` endpoint reporting queue depth, average queue age, decision breakdown, hourly throughput, per-rule fired counts, category distribution, and uptime. All state changes push to clients over socket.io (`content:new`, `content:updated`, `metrics:tick`); the client does not poll.

## Risk scoring in depth

Category term matching drives the score. Stylistic signals only nudge borderline cases.

**Step 1: category signal.** Text is scanned against every category's term list, and hits convert to a 0 to 1 signal via the category's severity weight:

```
category_signal = min((hits × category_weight) / 2, 1)
```

Severity weights, chosen by hand rather than derived from data:

```
HATE_SPEECH     0.90
VIOLENCE        0.85
ADULT_CONTENT   0.80
MISINFORMATION  0.65
SPAM            0.60
```

Two hits on a 0.90-severity category already produce a 0.90 signal, enough to auto-reject on its own. The highest-scoring category becomes the item's dominant category.

**Step 2: composite.** The dominant category signal blends with four stylistic signals. Keyword evidence deliberately dominates; caps, links, and spam patterns exist to push ambiguous content toward human review, not to condemn it outright:

```
composite_score =
  keyword_density      × 0.84
  + all_caps_ratio     × 0.06
  + link_presence      × 0.06
  + repeat_character   × 0.02
  + excess_punctuation × 0.02
```

**Step 3: routing.**

```
score >= 0.60 → auto_rejected
score <= 0.12 → auto_approved
otherwise     → pending (human review queue)
```

The thresholds are asymmetric on purpose. The wide pending band (0.12 to 0.60) means the system only acts autonomously when it is confident, and the low auto-approve bar means only clearly benign content skips review entirely. Where the two thresholds sit is a judgement call, and moving them trades false positives against reviewer load; there is no dataset here to tune them against.

Everything above is configuration, not architecture: category terms, severity weights, and thresholds live in `backend/src/scoring/categories.js`, composite weights in `riskScorer.js`.

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/content` | List content, optional `?status=` filter |
| GET | `/api/content/queue` | Priority-sorted pending queue |
| GET | `/api/content/:id` | Single item with signals and audit trail |
| POST | `/api/actions` | `{contentId, action, moderatorId}` |
| POST | `/api/actions/claim/:id` | `{moderatorId}`, takes an exclusive 60 second lock |
| GET | `/api/rules` | List rules with fired counts |
| POST | `/api/rules` | `{name, matchType, pattern, category, action, weight}` |
| DELETE | `/api/rules/:id` | Delete a rule |
| GET | `/api/appeals` | List appeals, optional `?status=` filter |
| GET | `/api/appeals/:id` | Single appeal |
| POST | `/api/appeals` | `{contentId, requester, reason}` |
| POST | `/api/appeals/:id/decision` | `{action: "overturn" or "uphold", reviewedBy}` |
| GET | `/api/metrics` | System health snapshot |
| GET | `/api/health` | `{status, queueDepth}` |

## Testing

```
cd backend
npm test   # 35 tests across 3 suites
```

Unit suites cover the risk scorer and the rule engine. An integration suite exercises the appeals workflow end to end, including decision reversal on overturn.

**Not covered.** The priority queue and the claim lock have no tests, which is the most significant gap given that the lock is the piece making a concurrency claim. The WebSocket hub, the rate limiting middleware, and the request-tracing middleware are also untested, as is the frontend. A green suite here means the scoring and appeals paths behave; it says nothing about the rest.

## Known limitations

**Term-list scoring is brittle.** Deliberate misspellings, spacing, homoglyphs and emoji substitution all defeat it, and it has no notion of context, sarcasm or reclaimed language. A comment quoting a slur to condemn it scores the same as one using it. This is the limitation a served model is meant to address, and it is the largest gap between this and a real system.

**The concurrency claim is not verified.** The claim uses a single conditional SQL update, which is atomic at the statement level, but nothing tests two moderators racing for the same item, lock expiry under load, or what happens when a claim and a decision interleave. Treat it as designed-for rather than proven.

**Queue starvation is possible.** With age weighted at 0.3, a zero-risk pending item cannot exceed 0.30 in the ordering, so a steady stream of items scoring above 0.43 on risk alone will keep outranking it. Waiting time pulls items up but does not guarantee they surface.

**No authentication.** Moderator identity is whatever the caller sends. Any client can claim an item, decide it, or resolve an appeal as any moderator, including senior review. Role separation exists in the workflow but not in the access control.

**Single node, in-memory assumptions.** The rule engine runs synchronously in the request path, the generator is in-process, and SQLite means one writer. None of it survives horizontal scaling without the changes in the table below.

**No evaluation.** There is no labelled dataset, so there are no precision or recall numbers for the scorer. The thresholds and weights are reasoned, not measured.

## Tradeoffs

| Decision | Chose | Over | Because |
| --- | --- | --- | --- |
| Storage | SQLite (WAL) | PostgreSQL | No external service to run for a personal project; the store is behind an interface intended to make a pg pool a contained change |
| Live updates | socket.io | SSE / polling | Bidirectional channel (future moderator presence) and automatic reconnection with no extra client library |
| Review locking | Optimistic, 60 s TTL | Pessimistic locks | A closed tab mid-review self-heals when the TTL expires; no manual lock release |
| Rule engine | In-process, synchronous | Async worker fleet | Right-sized for a single-node prototype; the production path is documented below |

## From prototype to production

Each component maps to a production counterpart:

| In this repo | At platform scale |
| --- | --- |
| SQLite (WAL) | PostgreSQL with read replicas |
| In-process comment generator | Kafka consumer on the real comment stream |
| Synchronous rule engine | Async worker fleet (BullMQ or Celery) consuming from a topic |
| Term-list scoring | Served ML model contributing confidence scores alongside rules |
| Single node | Multi-region deployment with region-affinity routing |
| Anonymous moderators | Authentication with role-based access (tier-1, tier-2, admin) |
| `/api/metrics` JSON | Prometheus endpoint with a Grafana dashboard |

## Project structure

```
backend/
  src/
    scoring/      signals, categories, composite scorer
    queue/        priority queue with lock-aware fetch
    data/         SQLite stores (content, rules, appeals)
    routes/       content, actions, rules, appeals, metrics
    middleware/   rate limiting, request-id tracing
    websocket/    socket.io event hub
    utils/        simulated comment generator
frontend/
  src/
    components/   ContentFeed, ReviewPanel, MetricsDashboard, RuleBuilder
    hooks/        WebSocket and data hooks
tests/
  unit/           riskScorer, rulesEngine
  integration/    appeals workflow
```
