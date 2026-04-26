# GMOpero

Projeto monorepo com backend em NestJS e frontend em Next.js para gestão empresarial (ERP-lite).

## Visão geral

Este repositório contém duas aplicações principais:
- `backend`: API construída com NestJS e Prisma (Postgres) que implementa autenticação, gestão de clientes, produtos, inventário, faturas, pagamentos e integração fiscal.
- `frontend`: aplicação Next.js (React) com a interface do usuário para consumir a API.

O projeto é pensado para execução local em desenvolvimento e empacotamento via Docker / docker-compose para produção.

## Funcionalidades principais

- Autenticação JWT
- Gestão de empresas e configurações por conta
- Clientes, fornecedores e veículos
- Catálogo de produtos e controle de inventário
- Emissão e gestão de faturas e notas fiscais (integrações fiscais existentes no código)
- Pagamentos e conciliação básica
- Módulos de compras (purchase-invoices) e ordens de serviço
- Testes unitários e e2e com Jest

## Tecnologias

- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL
- Frontend: Next.js, React, TypeScript
- Infraestrutura: Docker, docker-compose, Nginx (reverse proxy)
- Ferramentas: ESLint, Prettier, Jest
