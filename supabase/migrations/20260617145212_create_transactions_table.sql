/*
# Create transactions table for payment history

1. New Tables
- `transactions`
  - `id` (uuid, primary key)
  - `order_id` (uuid, references orders)
  - `type` (text, e.g. 'payment', 'refund', 'status_change')
  - `status` (text, e.g. 'pending', 'completed', 'failed')
  - `amount` (integer, nullable)
  - `method` (text, nullable, e.g. 'mobile_money', 'card')
  - `reference` (text, nullable, external payment reference)
  - `metadata` (jsonb, default '{}')
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `transactions`.
- Authenticated users can read their own transactions (via order ownership).
- Admin users can read all transactions.
- Insert/update via authenticated users or service role.

3. Notes
- This table records all payment-related events for audit trail.
- Linked to orders via order_id foreign key.
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'payment',
  status text NOT NULL DEFAULT 'pending',
  amount integer,
  method text,
  reference text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = transactions.order_id
      AND orders.customer_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "select_admin_transactions" ON transactions;
CREATE POLICY "select_admin_transactions" ON transactions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "insert_transactions" ON transactions;
CREATE POLICY "insert_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_transactions" ON transactions;
CREATE POLICY "update_transactions" ON transactions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_transactions" ON transactions;
CREATE POLICY "delete_transactions" ON transactions FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
