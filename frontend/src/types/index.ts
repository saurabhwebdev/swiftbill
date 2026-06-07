export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'manager' | 'cashier' | 'admin';
  pin: string | null;
  is_active: boolean;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  logo: string | null;
  tax_rate: string;
  currency: string;
  owner: number;
  is_active: boolean;
  is_setup_complete: boolean;
  payment_cash: boolean;
  payment_card: boolean;
  payment_mobile: boolean;
  payment_store_credit: boolean;
  receipt_header: string;
  receipt_footer: string;
  receipt_paper_size: string;
  receipt_copies: number;
  receipt_show_logo: boolean;
  receipt_show_tax_breakdown: boolean;
  notify_low_stock: boolean;
  notify_daily_summary: boolean;
  notify_new_sale: boolean;
  notify_refund: boolean;
  low_stock_threshold_default: number;
  notification_email: string;
  demand_tracking_enabled: boolean;
  notify_demand_fulfilled: boolean;
  appearance_theme: 'light' | 'dark' | 'system';
  appearance_accent_color: string;
  appearance_compact_mode: boolean;
  appearance_sidebar_collapsed: boolean;
  locale_language: string;
  locale_timezone: string;
  locale_date_format: string;
  locale_time_format: string;
  locale_number_format: string;
  gst_enabled: boolean;
  gstin: string;
  gst_state_code: string;
  gst_state_name: string;
  gst_business_name: string;
  gst_composition_scheme: boolean;
  gst_default_slab: string;
  gst_inclusive_pricing: boolean;
  discount_enabled: boolean;
  discount_max_percent_cashier: string | number;
  discount_max_percent_manager: string | number;
  discount_require_reason: boolean;
  discount_require_approval: boolean;
  refund_enabled: boolean;
  refund_time_limit_days: number;
  refund_require_reason: boolean;
  printer_type: 'none' | 'test' | 'usb' | 'network' | 'serial';
  printer_address: string;
  printer_auto_print: boolean;
  printer_paper_width: number;
  upi_id: string;
  upi_payee_name: string;
  upi_verification_mode: 'manual' | 'oneupi';
  oneupi_api_key: string;
  oneupi_api_secret: string;
}

export interface TaxSlab {
  id: number;
  store: number;
  name: string;
  rate: string;
  description: string;
  hsn_code: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  image: string | null;
  store: number;
  is_active: boolean;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category: number | null;
  category_name?: string;
  store: number;
  price: string | number;
  cost_price: string | number;
  image: string | null;
  hsn_code: string;
  gst_rate: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_stock?: number;
}

export interface Stock {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  product_category: string;
  product_price: string | number;
  quantity: number;
  low_stock_threshold: number;
  last_restocked: string | null;
  is_low_stock: boolean;
  product_gst_rate: string | null;
  product_hsn_code: string;
}

export interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  quantity_change: number;
  movement_type: 'in' | 'out' | 'adjustment';
  notes: string;
  created_by_name: string;
  created_at: string;
}

export interface StockSummary {
  total_products: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
  total_movements: number;
}

export interface SaleItem {
  id: number;
  product: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_amount: number;
  total: number;
}

export interface Sale {
  id: number;
  receipt_number: string;
  store: number;
  store_name?: string;
  cashier: number;
  cashier_name?: string;
  items: SaleItem[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  discount_type?: 'flat' | 'percent';
  discount_reason?: string;
  customer_name?: string;
  customer_email?: string;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile' | 'mixed';
  payment_status: 'completed' | 'pending' | 'refunded';
  created_at: string;
  synced: boolean;
  refunds?: Refund[];
}

export interface Terminal {
  id: number;
  store: number;
  name: string;
  device_id: string;
  is_active: boolean;
  current_cashier: number | null;
  current_cashier_name: string | null;
  opened_at: string | null;
  closed_at: string | null;
  opening_balance: string;
  closing_balance: string | null;
  cash_balance: string;
  created_at: string;
}

export interface DemandRequest {
  id: number;
  store: number;
  query: string;
  query_normalized: string;
  product: number | null;
  product_name: string;
  category: number | null;
  category_name: string;
  logged_by: number | null;
  logged_by_name: string;
  status: 'new' | 'fulfilled' | 'dismissed';
  notes: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notify_customer: boolean;
  notified_at: string | null;
  created_at: string;
}

export interface DemandInsights {
  total: number;
  new_count: number;
  fulfilled_count: number;
  top_items: {
    query: string;
    query_normalized: string;
    count: number;
    new_count: number;
    fulfilled_count: number;
    dismissed_count: number;
    latest: string | null;
    first: string | null;
  }[];
  trend: { date: string; count: number }[];
}

export interface RefundItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: string | number;
  tax_amount: string | number;
  gst_rate: string | number;
  subtotal: string | number;
}

export interface Refund {
  id: number;
  sale: number;
  refund_number: string;
  refund_amount: string | number;
  refund_tax: string | number;
  reason: string;
  processed_by: number | null;
  processed_by_name: string;
  created_at: string;
  items: RefundItem[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
