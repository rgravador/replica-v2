# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopify embedded app built with React Router 7, using the official Shopify app template. The app runs inside the Shopify Admin as an embedded iframe.

## Common Commands

```bash
# Development (starts Shopify CLI tunnel + dev server)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Database setup (generate Prisma client + run migrations)
npm run setup

# Linting
npm run lint

# Type checking
npm run typecheck

# Generate Shopify extensions
npm run generate

# Deploy app configuration to Shopify
npm run deploy

# Generate GraphQL types
npm run graphql-codegen
```

## Architecture

### Framework Stack
- **React Router 7**: Full-stack React framework (successor to Remix)
- **Vite**: Build tool and dev server
- **Prisma**: ORM with SQLite database for session storage
- **Shopify App Bridge**: Embedded app communication with Shopify Admin

### Key Files
- `app/shopify.server.js`: Shopify app configuration and authentication setup. Exports `authenticate`, `unauthenticated`, `login`, `registerWebhooks`
- `app/db.server.js`: Prisma client singleton (uses global variable in dev to survive HMR)
- `app/routes.js`: File-system based routing via `@react-router/fs-routes`
- `shopify.app.toml`: Shopify app configuration (scopes, webhooks, URLs)
- `prisma/schema.prisma`: Database schema (Session model for OAuth)

### Routing Convention
Routes use React Router's flat file routing in `app/routes/`:
- `app.tsx`: Layout wrapper for authenticated app pages (applies `AppProvider`)
- `auth.$.tsx`: OAuth callback handler
- `webhooks.*.tsx`: Webhook handlers

**Pages should use directory structure:**
```
app/routes/pagename/
├── route.tsx           # main route file
├── styles.module.css   # page styles
└── ...                 # related components, utilities
```

Examples:
- `app/routes/app._index/route.tsx` → `/app`
- `app/routes/app.products/route.tsx` → `/app/products`

### Shopify Authentication Pattern
Every protected route loader/action must call `authenticate.admin(request)`:
```javascript
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  // admin.graphql() for API calls
  return null;
};
```

### UI Components
Uses Shopify Polaris Web Components (prefixed with `s-`):
- `<s-page>`, `<s-section>`, `<s-button>`, `<s-link>`, etc.
- Declared in `@shopify/polaris-types` for TypeScript

## Embedded App Navigation Rules
- Use `Link` from `react-router` or `<s-link>` — never `<a>` tags
- Use `redirect` from `authenticate.admin` — not from `react-router`
- Navigation must preserve the embedded session context

## Database
- SQLite file at `prisma/dev.sqlite` (development)
- Run `npm run setup` after cloning or schema changes
- For production, consider PostgreSQL or MySQL (update `prisma/schema.prisma` datasource)

## Extensions
- Extensions live in `extensions/` directory
- Generate new extensions with `npm run generate`
- Extensions are npm workspaces

## GraphQL
- Admin API queries go in route loaders/actions using `admin.graphql()`
- GraphQL config in `.graphqlrc.js` for IDE hints
- API version: October 2025 (`ApiVersion.October25`)

## Environment Variables
Provided automatically by Shopify CLI during `npm run dev`:
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`
- `SCOPES`

## MCP Integration
The Shopify Dev MCP is pre-configured in `.cursor/mcp.json` for AI-assisted development.
