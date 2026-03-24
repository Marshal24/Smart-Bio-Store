-- ============================================================
-- Smart Bio Store — Orders Table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  governorate     TEXT NOT NULL,
  district        TEXT,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee    NUMERIC(12,2) NOT NULL DEFAULT 0,
  bundle_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  promo_discount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','delivered','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (public anon can INSERT, admin reads all)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anonymous customers) to place an order
CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anyone to read orders (admin uses same anon key from the dashboard)
CREATE POLICY "Anyone can read orders"
  ON orders FOR SELECT
  TO anon
  USING (true);

-- Allow anyone to update order status (admin panel)
CREATE POLICY "Anyone can update orders"
  ON orders FOR UPDATE
  TO anon
  USING (true);
