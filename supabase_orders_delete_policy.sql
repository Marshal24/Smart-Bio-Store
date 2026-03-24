-- Run this in Supabase SQL Editor to allow deleting orders from the admin panel
-- Required for the "حذف" (delete) buttons in the orders dashboard to work

CREATE POLICY "Anyone can delete orders"
  ON orders FOR DELETE
  TO anon
  USING (true);
