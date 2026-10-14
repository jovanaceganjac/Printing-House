# Printing House

A full-stack web platform for print shops and their customers, built for the
*Web Application Programming* course at ETF Belgrade (2025/26).

## Features

- **Three roles** — administrator, printer (print shop) and client (individual or company),
  with registration approval by the administrator
- **Product catalogue** with categories, search, product details and image upload;
  bulk product import from a JSON file
- **Cart, orders and order preparation** workflow between client and printer
- **Payments** with Stripe test mode, or a local fallback with the same test cards
- **Public procurements and auctions** — companies publish a tender, printers bid
- **PDF invoices** generated on the server and sent by email
- **Password reset** by email link, archive and statistics for the administrator

## Tech

**Frontend:** Angular 20 (standalone components), TypeScript
**Backend:** Node.js, Express, TypeScript, Mongoose, bcrypt, Multer, Nodemailer, PDFKit
**Database:** MongoDB

## Run locally

```bash
# 1. backend (port 4000)
cd backend_Node/backend_Node
cp .env.example .env        # mail and Stripe keys are optional
npm install
npm run build
npm run serve

# 2. database (from the project root, MongoDB running on localhost)
node printing_house/seed.js

# 3. frontend (port 4200)
cd frontend/frontend
npm install
ng serve
```

Open `http://localhost:4200`. The administrator login is at `/admin-prijava`.
Without mail settings, emails go to an Ethereal test inbox and the preview link is
printed in the backend console.

### Demo accounts

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `Admin123!` |
| Printer / client | see `printing_house/data/korisnici.json` | `Sifra123!` |

## Structure

```
backend_Node/      Express + Mongoose API (controllers, models, routes, PDF and mail utils)
frontend/          Angular application
printing_house/    seed script, JSON data and initial images
```
