# GMOpero 🔧

> ERP-lite for automotive workshop management — built as a full-stack monorepo with NestJS, Next.js, and Docker.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)]()
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)]()
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)]()
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)]()

---

## Overview

GMOpero is a monorepo ERP system designed for automotive workshop management. It handles the full business cycle — from customer and vehicle registration, through service orders and inventory, to invoicing and payment reconciliation.

The architecture separates concerns cleanly between a REST API backend and a React-based frontend, with Docker handling both local development and production deployment via Nginx as a reverse proxy.

---

## Architecture

```
gmopero/
├── backend/          # NestJS REST API
│   ├── src/
│   │   ├── auth/             # JWT authentication
│   │   ├── customers/        # Customer & supplier management
│   │   ├── vehicles/         # Vehicle registry
│   │   ├── products/         # Product catalog
│   │   ├── inventory/        # Stock control
│   │   ├── invoices/         # Invoice & fiscal note management
│   │   ├── payments/         # Payment & reconciliation
│   │   ├── purchase-invoices/ # Purchase order management
│   │   └── service-orders/   # Workshop service orders
│   └── prisma/               # Schema & migrations
├── frontend/         # Next.js application
├── scripts/          # Utility scripts
├── nginx.conf        # Reverse proxy config
├── docker-compose.yml          # Local development
└── docker-compose.prod.yml     # Production deployment
```

---

## Features

- **JWT Authentication** — secure login with token-based session management
- **Multi-tenant support** — company-level account configuration
- **Customer & Supplier Management** — full contact registry
- **Vehicle Registry** — track vehicles linked to customers
- **Product Catalog & Inventory** — stock control with real-time updates
- **Service Orders** — create and manage workshop jobs end-to-end
- **Invoicing & Fiscal Notes** — issue invoices with fiscal integration hooks
- **Purchase Orders** — manage supplier purchases and incoming stock
- **Payment & Reconciliation** — basic payment tracking and balance reconciliation
- **Unit & E2E Tests** — test coverage with Jest

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | NestJS + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Frontend | Next.js + React + TypeScript |
| Infrastructure | Docker, docker-compose, Nginx |
| Auth | JWT |
| Testing | Jest (unit + e2e) |
| CI/CD | GitHub Actions |
| Code Quality | ESLint + Prettier |

---

## Data Flow

```
Client (Next.js)
      ↓ HTTPS
Nginx (Reverse Proxy)
      ↓
NestJS API
      ↓
Prisma ORM
      ↓
PostgreSQL
```

---

## CI/CD

This project uses GitHub Actions for automated workflows on every push. The pipeline handles linting, testing, and build validation.

---

## Author

**Gustavo Machado** — [LinkedIn](https://www.linkedin.com/in/gustavo-machado-416326215/) · [GitHub](https://github.com/machadogustavors)