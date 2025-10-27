-- SQL to add the 'note' column to the 'products' table
ALTER TABLE products ADD COLUMN IF NOT EXISTS note TEXT;
