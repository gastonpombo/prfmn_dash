# Product Requirements Document — PerfuMan Dash

## Project Overview

**PerfuMan Dash** is the admin/back-office dashboard for the PerfuMan boutique perfume e-commerce platform. It allows store administrators to manage the full catalogue (products & categories), monitor and update orders, and control site-wide configuration — all backed by Supabase and presented as a Next.js 16 web app with a clean, luxury-minimalist aesthetic.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| UI Library | shadcn/ui + Radix UI |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Mercado Pago |
| Package manager | pnpm |

## Database Schema (Supabase — project: `rhnibdmzbavjbqgnxhry`)

| Table | Key Columns | Notes |
|---|---|---|
| `products` | id, name, description, price, stock, image_url, category, is_active, top_notes, heart_notes, base_notes, season, longevity, sillage, time_of_day | RLS enabled |
| `categories` | id, name, image_url | RLS enabled |
| `orders` | id, customer_email, customer_details (jsonb), total_amount, status, payment_id, user_id | RLS enabled |
| `order_items` | id, order_id, product_id, quantity, unit_price, subtotal (generated) | RLS enabled |
| `profiles` | id (uuid → auth.users), email, full_name, phone, avatar_url | RLS enabled |
| `site_config` | announcement_message, shipping_threshold, contact_whatsapp, contact_email, welcome_title, welcome_subtitle, hero_image_url, about_*, about_quote, about_quote_author | Single-row config |

## Application Routes

| Route | Description |
|---|---|
| `/` | Redirect → `/login` |
| `/login` | Auth page (Supabase email/password) |
| `/dashboard` | Overview: KPIs, revenue chart, recent orders |
| `/dashboard/categories` | Category CRUD |
| `/dashboard/products` | Product CRUD with perfume-specific attributes |
| `/dashboard/orders` | Order list + status management |
| `/dashboard/settings` | Site-wide config (site_config table) |

## Features

- [x] Auth guard on all `/dashboard` routes (middleware + layout check)
- [x] Responsive sidebar (mobile drawer + desktop fixed)
- [x] Overview dashboard with KPIs and Recharts charts
- [x] Product management (CRUD with olfactory fields)
- [x] Category management
- [x] Order management
- [x] Site configuration editor

## Technical Constraints

- Next.js 16 (App Router) with React 19
- All dashboard pages are `'use client'` — SSR only on API routes
- Tailwind CSS 3 (not v4 — postcss.config uses `tailwindcss` not `@tailwindcss/postcss`)
- Images served from Supabase storage bucket (`perfuman`)

## Notes

- Companion public-facing storefront lives in a separate project (`PerfuMan - Commerce`)
- Mercado Pago integration handles checkout on the commerce side; this dash only displays `payment_id`
- `security_report.md` at root documents audit findings
