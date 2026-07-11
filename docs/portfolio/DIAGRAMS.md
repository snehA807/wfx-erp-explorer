# System Diagrams — WFX Explorer

Standalone reference of every system diagram, for pulling into slides, a portfolio page, or anywhere Mermaid doesn't render natively (GitHub, most IDEs, and Notion render these directly; export to PNG/SVG via the Mermaid CLI or mermaid.live for anywhere else).

The overall-architecture, AI-pipeline, and search-flow diagrams here match [`ARCHITECTURE.md`](ARCHITECTURE.md) exactly (single source of truth, duplicated here for convenience) — the request-lifecycle and database-relationship diagrams are additions specific to this reference.

## 1. Overall Architecture

```mermaid
flowchart TB
    subgraph Client["Browser"]
        SPA[React SPA<br/>Vite + TS + Tailwind]
    end

    subgraph Backend["FastAPI — modular monolith (Render)"]
        direction TB
        Routers["Routers"]
        Services["Services"]
        Core["Core (guardrails, config, rate limit)"]
        DBLayer["DB query layer"]
        Routers --> Services --> Core --> DBLayer
    end

    subgraph Data["Supabase"]
        PG[(Postgres + pgvector<br/>app_readonly role)]
    end

    LLM["OpenRouter LLM"]
    Offline["Offline scripts<br/>(seed + embeddings, local only)"]

    SPA <-->|REST + SSE| Routers
    DBLayer -->|SELECT only| PG
    Services -->|generation + answers| LLM
    Offline -->|owner role| PG
```

## 2. Request Lifecycle

Every HTTP request through the backend, including the error-handling paths — this is what makes the response envelope (`{"data"...}` / `{"error"...}`) a guarantee rather than a convention.

```mermaid
flowchart TD
    Req[Incoming request] --> MW["bind_request_context middleware<br/>(request_id, structured access log)"]
    MW --> Limiter{slowapi rate limit<br/>check}
    Limiter -->|over limit| RLErr["RateLimitExceeded handler<br/>→ 429 error envelope"]
    Limiter -->|ok| Validate{Pydantic request<br/>validation, extra=forbid}
    Validate -->|invalid| VErr["RequestValidationError handler<br/>→ 422 error envelope"]
    Validate -->|valid| Route[Router → Service call]
    Route --> Outcome{Outcome}
    Outcome -->|success| Envelope["SuccessEnvelope<br/>{data, meta}"]
    Outcome -->|AppError raised| AErr["AppError handler<br/>→ typed status + error envelope"]
    Outcome -->|unmatched route/method| HErr["StarletteHTTPException handler<br/>→ error envelope"]
    Outcome -->|unexpected exception| UErr["Catch-all handler<br/>→ 500 INTERNAL_ERROR<br/>(no internal details leaked)"]
    Envelope --> Resp[JSON response]
    RLErr --> Resp
    VErr --> Resp
    AErr --> Resp
    HErr --> Resp
    UErr --> Resp
```

## 3. AI Pipeline (NL → SQL → Answer)

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as POST /query (SSE)
    participant V as Vanna (trained at boot)
    participant G as Guardrails
    participant DB as Postgres (read-only)
    participant LLM as OpenRouter

    FE->>API: question
    API-->>FE: status: generating_sql
    API->>V: generate_sql(question)
    V->>LLM: retrieval-augmented prompt
    LLM-->>V: SQL text
    V->>G: enforce_guardrails()
    alt blocked
        G-->>API: SQLGuardrailError
        API-->>FE: error event (blocked SQL included)
    else allowed
        G-->>API: safe SQL
        API-->>FE: sql event
        API-->>FE: status: running_query
        API->>DB: execute (10s timeout)
        DB-->>API: rows
        API-->>FE: rows event
        API-->>FE: status: writing_answer
        API->>LLM: summarize (streamed)
        LLM-->>API: token deltas
        API-->>FE: answer event ×N
        API-->>FE: done event (cost/token meta)
    end
```

## 4. Search Flow (Hybrid Product Search)

```mermaid
flowchart LR
    Q[Query text + filters] --> V{validate filters<br/>against cached facets}
    V --> Emb[BGE-small embedding<br/>384d, LRU-cached]
    Emb --> SQL["ORDER BY text_embedding <=> qvec<br/>WHERE category/fabric/GSM/...<br/>LIMIT n — one statement"]
    SQL --> HNSW[(HNSW cosine index)]
    HNSW --> Result[Ranked SearchHit[]<br/>score = 1 − distance]
```

## 5. Deployment

```mermaid
flowchart TB
    User((User)) -->|HTTPS| Vercel["Vercel<br/>static Vite build, SPA rewrite"]
    Vercel -->|REST + SSE, CORS-scoped| Render["Render<br/>Docker, uvicorn --workers 1<br/>models pre-baked at build time"]
    Render -->|app_readonly, SELECT only| Supabase[(Supabase Postgres + pgvector)]
    Render -->|server-side API key| OpenRouter[[OpenRouter]]
```

## 6. Database Relationships

```mermaid
erDiagram
    SUPPLIERS ||--o{ FINISHED_GOODS : supplies
    FINISHED_GOODS ||--o| TECH_PACKS : "has (1:1)"
    FINISHED_GOODS ||--o{ SALES_ORDERS : "ordered in"
    BUYERS ||--o{ SALES_ORDERS : places
    SALES_ORDERS ||--o| SALES_INVOICES : "invoiced as (1:0..1)"

    SUPPLIERS {
        text supplier_id PK
        text company_name UK
        text country
        int lead_time_days
        numeric rating
    }
    BUYERS {
        text buyer_id PK
        text company_name UK
        text country
        text buyer_category
    }
    FINISHED_GOODS {
        text style_number PK
        text style_name
        text category
        text fabric
        int gsm
        text supplier_id FK
        numeric selling_price
        text image_url
        vector text_embedding "384d, HNSW cosine"
        vector image_embedding "512d, HNSW cosine"
    }
    TECH_PACKS {
        text tech_pack_id PK
        text style_number FK "UNIQUE"
        text fabric_details
        text construction
    }
    SALES_ORDERS {
        text order_number PK
        text buyer_id FK
        text style_number FK
        int quantity
        numeric unit_price
        text status
    }
    SALES_INVOICES {
        text invoice_number PK
        text order_number FK "UNIQUE"
        numeric amount
        text currency
        text payment_status
    }
```

`finished_goods` is the hub of the schema — it's the only table both the relational filters and the two vector-search paths query against. Revenue is computed directly from `sales_orders.quantity × sales_orders.unit_price` in INR, excluding `status = 'Cancelled'`; `sales_invoices.amount` is a separately FX-converted figure and is deliberately not used for the revenue calculation, to avoid conflating the two currency representations.
