# Changelog

All notable changes to SwiftBill are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-04

### Added

#### POS Terminal
- Product grid with search, category filtering, and instant add-to-cart
- Barcode scanning via hardware USB/Bluetooth scanners, device camera, and manual entry
- Full cart management with quantity controls, per-item discounts, and overall discount
- Multi-payment support: Cash, Card, UPI QR code
- Keyboard shortcuts: F2 (search), F4 (clear cart), F9/F10/F11 (payment), F12 (charge)
- Terminal selection screen with session management
- Cash drawer balance tracking (opening + sales - refunds)
- Terminal session close with expected vs actual cash reconciliation

#### Product Management
- Full CRUD for products and categories
- Image upload with automatic WebP compression
- Search, filter by category, sortable columns, pagination
- HSN code and GST rate per product
- Barcode display via react-barcode
- Clickable rows with detailed product modal

#### Inventory Management
- Real-time stock tracking with Stock In/Out/Adjust operations
- Movement history with user tracking
- Low stock alerts with configurable thresholds
- Barcode scan to find stock
- Summary statistics (total products, low stock, out of stock, inventory value)

#### GST / Tax Compliance
- GSTIN configuration with all 36 Indian state codes
- CGST/SGST split on receipts and cart
- 5 standard tax slabs with custom slab support
- HSN code association
- Composition scheme and inclusive pricing modes

#### Multi-Terminal Support
- Multiple POS terminals per store
- Terminal session open/close with cash drawer reconciliation
- Per-terminal sales tracking and reporting
- Cash balance auto-update on sales and refunds

#### Sales History and Refunds
- Full transaction history with search, filter, sort, pagination
- Partial and full refunds with item-level quantity selection
- Automatic stock restoration on refund
- Void sales with stock restoration
- Refund policy configuration (enable, time limit, require reason)

#### Demand Intelligence
- Customer request logging from POS
- Customer contact capture with notification opt-in
- Frequency analysis and trend charts
- Bulk fulfill and notify via email
- Status tracking: New, Fulfilled, Dismissed

#### UPI Payments
- UPI QR code generation from deep links
- Manual confirmation mode (offline-capable)
- OneUPI auto-verification via webhook
- 5-minute payment expiry timer
- Transaction reference tracking

#### Thermal Printing
- ESC/POS receipt text generation
- USB, Network, Serial, and Test (Dummy) printer support
- Auto-print option after every sale
- Receipt preview in test mode
- Refund receipt generation

#### Dashboard
- Real-time stats cards (sales, transactions, tax, refunds)
- Weekly sales area chart
- Payment methods donut chart
- Top products bar chart
- Sales by category chart
- Hourly sales chart
- Recent transactions table
- Low stock alerts panel
- All charts respond to accent color changes

#### User Management
- Role-based access: Owner, Manager, Cashier, Admin
- User invitation and role assignment
- Account deactivation
- Terminal PIN for quick login
- Password change with validation

#### Settings (9 Sections)
- Store Info with logo upload
- Users and Roles management
- Payment methods and UPI configuration
- Receipts and thermal printer setup
- Tax / GST configuration
- Notifications with email support
- Security (password, PIN, sessions)
- Appearance (theme, colors, layout)
- Regional (8 languages, timezone, currency, formats)

#### Internationalization
- 8 languages: English, Spanish, French, German, Hindi, Arabic, Chinese, Japanese
- Instant language switching
- Full translation coverage across all pages and settings

#### Design and UX
- Light, Dark, and System themes
- 7 preset accent colors plus custom hex color picker
- Compact mode and collapsible sidebar
- Framer Motion animations throughout
- Satoshi + Cabinet Grotesk typography
- Responsive layout with warm color palette
- Custom scrollbars and selection styling

#### Infrastructure
- Django 5.2 + DRF backend with JWT authentication
- React 19 + TypeScript + Vite frontend
- PostgreSQL database
- Caddy reverse proxy with auto SSL
- systemd service management
- Image auto-compression to WebP
