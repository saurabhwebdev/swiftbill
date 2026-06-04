<div align="center">

# ⚡ SwiftBill

### Lightning-Fast Point of Sale System

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Django](https://img.shields.io/badge/Django-5.2-092E20?logo=django)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-4169E1?logo=postgresql)](https://postgresql.org)

A modern, feature-rich, offline-capable Point of Sale system built for Indian retail businesses. Complete with GST compliance, multi-terminal support, barcode scanning, UPI payments, thermal printing, and demand intelligence.

[Live Demo](https://pos.103.145.37.138.sslip.io) · [Features](#-features) · [Quick Start](#-quick-start) · [Documentation](#-documentation)

</div>

---

## 📸 Screenshots

> Screenshots coming soon. The application features a modern, responsive interface with light and dark themes.

---

## ✨ Features

### 🖥️ POS Terminal
- Product grid with category filtering and instant search
- Barcode scanning — hardware scanner, camera-based, and simulated input
- Full cart management with quantity editing and line-item removal
- Keyboard shortcuts for power users (`F2` / `F4` / `F9`–`F12`)
- Multi-payment support — cash, card, UPI QR code
- Instant checkout with automatic receipt generation
- Thermal receipt printing via ESC/POS protocol

### 📦 Product Management
- Full CRUD operations with category assignment
- Image upload with automatic WebP compression (6.4 MB PNG → 26 KB WebP)
- Advanced search, filtering, sorting, and pagination
- HSN code tracking and per-product GST rate configuration
- Barcode display and generation

### 📊 Inventory
- Real-time stock level tracking across terminals
- Stock in / out / adjust operations with reason codes
- Complete movement history with audit trail
- Low stock alerts with configurable thresholds
- Barcode scan to instantly locate stock

### 🧾 GST / Tax Compliance
- GSTIN configuration at the store level
- Automatic CGST / SGST split calculation
- Five tax slabs: 0%, 5%, 12%, 18%, 28%
- HSN code support for every product
- Composition scheme toggle
- Tax-inclusive pricing option
- Detailed tax breakdown on every receipt

### 🏪 Multi-Terminal
- Multiple POS terminals per store
- Session management with opening and closing procedures
- Cash drawer tracking and reconciliation
- Opening / closing balance verification
- Per-terminal sales reporting

### 📜 Sales History
- Full transaction history with advanced search and filters
- Sort by date, amount, payment method, and more
- Pagination for large datasets
- Partial and full refund processing
- Void sales with automatic stock restoration

### 🔍 Demand Intelligence
- Track what customers ask for that is not in stock
- Frequency analysis to identify high-demand items
- Trend charts for demand patterns over time
- Customer contact capture for follow-up
- Automatic email notification when a demanded product arrives

### 📱 UPI Payments
- Dynamic QR code generation for each transaction
- Manual confirmation workflow for offline environments
- OneUPI auto-verification for online environments
- 5-minute expiry timer with visual countdown

### 🖨️ Thermal Printing
- ESC/POS receipt generation
- USB, Network, and Serial printer support
- Test mode with dummy receipt preview
- Auto-print after every completed sale

### 📈 Dashboard
- Real-time sales statistics and KPIs
- Weekly sales trend chart
- Hourly sales distribution
- Payment method breakdown (donut chart)
- Category-wise sales analysis
- Top-selling products (bar chart)
- Low stock alert panel
- Recent transactions feed

### 👥 User Management
- Role-based access control: Owner, Manager, Cashier, Admin
- Invite users via email
- Change roles and permissions on the fly
- Deactivate and reactivate accounts
- Terminal PIN for quick cashier login

### ⚙️ Settings (9 Sections)
| Section | What It Covers |
|---------|---------------|
| **Store Info** | Store name, address, GSTIN, logo |
| **Users & Roles** | Team management, role assignment |
| **Payments** | Cash, card, mobile, UPI toggle; refund policy |
| **Receipts & Printing** | Printer config, receipt layout, auto-print |
| **Tax / GST** | Tax slabs, composition scheme, inclusive pricing |
| **Notifications** | Email alerts for low stock, demand fulfillment |
| **Security** | Password policy, PIN enforcement, session timeout |
| **Appearance** | Theme (Light / Dark / System), 7 accent colors + custom hex, compact mode, collapsible sidebar |
| **Regional** | Language, timezone, currency, date format |

### 🌍 Internationalization
Eight languages with instant switching:
English · Spanish · French · German · Hindi · Arabic · Chinese · Japanese

### 🎨 Appearance
- Light, Dark, and System-follow themes
- Seven preset accent colors plus custom hex input
- Compact mode for smaller screens
- Collapsible sidebar — all changes apply instantly

### ⌨️ Keyboard Shortcuts
- `Alt + 1–8` — Navigate between sections
- `F2` — Focus search in POS
- `F4` — Clear cart
- `F9` — Toggle payment panel
- `F10` — Cash payment
- `F11` — Card payment
- `F12` — Complete checkout
- `Alt + N` — New product
- `Alt + S` — Global search
- `?` — Show shortcuts help panel

### 🖼️ Image Optimization
- Automatic client-side compression on upload
- Converts any format to WebP
- Typical reduction: 6.4 MB PNG → 26 KB WebP

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Python 3.10 | Runtime |
| Django 5.2 | Web framework |
| Django REST Framework | API layer |
| SimpleJWT | Token authentication |
| PostgreSQL 14 | Database |
| python-escpos | Thermal printing |
| Pillow | Image processing |
| Gunicorn | WSGI server |
| systemd | Process management |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI library |
| TypeScript 5.8 | Type safety |
| Vite 8 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| shadcn/ui | Component library |
| Framer Motion | Animations |
| Recharts | Dashboard charts |
| i18next | Internationalization |
| react-barcode | Barcode rendering |
| html5-qrcode | Camera barcode scanning |
| qrcode.react | UPI QR code generation |
| react-to-print | Browser-based printing |
| Zustand | State management |
| TanStack Query | Server state & data fetching |
| Axios | HTTP client |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Caddy | Reverse proxy + automatic SSL |
| Let's Encrypt | TLS certificates |
| systemd | Process supervision |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20+
- PostgreSQL 14+

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create the database
createdb offlinepos

# Run migrations and seed data
python manage.py migrate
python manage.py setup_roles
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server starts at `http://localhost:5173` and proxies API requests to Django on port 8000.

### Production Deployment

```bash
# Backend — serve with Gunicorn
pip install gunicorn
gunicorn config.wsgi:application -c gunicorn.conf.py

# Frontend — build static assets
cd frontend
npm run build
# Serve the dist/ directory with Caddy or Nginx
```

---

## 📁 Project Structure

```
swiftbill/
├── backend/
│   ├── config/                # Django settings, root URL conf, WSGI/ASGI
│   ├── apps/
│   │   ├── accounts/          # Users, Stores, Terminals, Tax Slabs
│   │   ├── products/          # Products, Categories
│   │   ├── inventory/         # Stock levels, Stock Movements
│   │   ├── sales/             # Sales, Refunds, UPI Payments, Receipts
│   │   ├── demand/            # Demand Tracking & Intelligence
│   │   └── utils/             # Shared utilities
│   ├── media/                 # Uploaded files (product images)
│   ├── staticfiles/           # Collected static files
│   ├── gunicorn.conf.py       # Gunicorn configuration
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # Layout, UI primitives, Receipt
│   │   ├── pages/             # All page-level components
│   │   ├── stores/            # Zustand stores (auth, theme)
│   │   ├── hooks/             # Custom hooks (hotkeys, barcode)
│   │   ├── i18n/              # Translations (8 languages)
│   │   ├── lib/               # API client, helpers, utilities
│   │   └── types/             # TypeScript interfaces & types
│   ├── public/                # Static public assets
│   └── package.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
└── LICENSE
```

---

## 📡 API Documentation

All endpoints are prefixed with `/api/` and require JWT authentication unless noted otherwise.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/token/` | Obtain access + refresh tokens |
| `POST` | `/api/token/refresh/` | Refresh an access token |
| `POST` | `/api/register/` | Register a new user (public) |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/PUT` | `/api/users/me/` | Current user profile |
| `GET/POST` | `/api/users/` | List or invite users |
| `GET/PUT/DELETE` | `/api/users/:id/` | Manage a specific user |
| `GET/PUT` | `/api/stores/:id/` | Store configuration |
| `GET/POST` | `/api/terminals/` | List or create terminals |
| `GET/PUT/DELETE` | `/api/terminals/:id/` | Manage a terminal |
| `GET/POST` | `/api/tax-slabs/` | List or create tax slabs |
| `GET/PUT/DELETE` | `/api/tax-slabs/:id/` | Manage a tax slab |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/products/` | List or create products |
| `GET/PUT/DELETE` | `/api/products/:id/` | Manage a product |
| `GET/POST` | `/api/categories/` | List or create categories |
| `GET/PUT/DELETE` | `/api/categories/:id/` | Manage a category |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stocks/` | List stock levels |
| `GET` | `/api/stocks/:id/` | Stock detail for a product |
| `POST` | `/api/stocks/:id/adjust/` | Adjust stock (in/out/set) |
| `GET` | `/api/stock-movements/` | Stock movement history |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sales/` | List all sales |
| `GET` | `/api/sales/:id/` | Sale detail |
| `POST` | `/api/checkout/` | Process a new sale |
| `POST` | `/api/sales/:id/refund/` | Refund a sale (partial or full) |
| `POST` | `/api/sales/:id/void/` | Void a sale |
| `POST` | `/api/upi/generate-qr/` | Generate UPI QR code |
| `POST` | `/api/upi/verify/` | Verify UPI payment |
| `GET` | `/api/sales/:id/receipt/` | Get printable receipt data |
| `GET` | `/api/charts/weekly-sales/` | Weekly sales chart data |
| `GET` | `/api/charts/payment-breakdown/` | Payment method breakdown |
| `GET` | `/api/charts/category-sales/` | Sales by category |
| `GET` | `/api/charts/hourly-sales/` | Hourly distribution |
| `GET` | `/api/charts/top-products/` | Top-selling products |

### Demand Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/demand-requests/` | List or create demand entries |
| `GET/PUT/DELETE` | `/api/demand-requests/:id/` | Manage a demand entry |
| `GET` | `/api/demand-insights/` | Aggregated demand analytics |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/oneupi/` | OneUPI payment callback |

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DB_NAME=offlinepos
DB_USER=posuser
DB_PASSWORD=posuser123
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.com,localhost

# Email (Gmail SMTP)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com

# OneUPI (optional)
ONEUPI_API_KEY=your-oneupi-key
ONEUPI_WEBHOOK_SECRET=your-webhook-secret
```

> **Note:** Never commit `.env` files to version control. See `.env.example` for a template.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Alt + 1` | Go to Dashboard |
| `Alt + 2` | Go to POS Terminal |
| `Alt + 3` | Go to Products |
| `Alt + 4` | Go to Inventory |
| `Alt + 5` | Go to Sales History |
| `Alt + 6` | Go to Demand Tracking |
| `Alt + 7` | Go to Settings |
| `Alt + 8` | Go to Users |
| `Alt + N` | Create new product |
| `Alt + S` | Focus global search |
| `F2` | Focus POS search bar |
| `F4` | Clear cart |
| `F9` | Toggle payment panel |
| `F10` | Cash payment |
| `F11` | Card payment |
| `F12` | Complete checkout |
| `?` | Show keyboard shortcuts help |

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our development process, coding standards, and how to submit pull requests.

---

## 🔒 Security

For information about our security policy and how to report vulnerabilities, see [SECURITY.md](SECURITY.md).

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Unison Apps](https://github.com/unisonapps)**

</div>
