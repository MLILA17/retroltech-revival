/*
# Create SMS logs table for tracking notifications

1. New Tables
- `sms_logs`
  - `id` (uuid, primary key)
  - `phone` (text)
  - `message` (text)
  - `status` (text, default 'sent')
  - `order_id` (uuid, nullable, references orders)
  - `error` (text, nullable)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `sms_logs`.
- Admin users can read all logs.
- Insert restricted to authenticated users.
*/

CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_sms_logs" ON sms_logs;
CREATE POLICY "select_admin_sms_logs" ON sms_logs FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "insert_sms_logs" ON sms_logs;
CREATE POLICY "insert_sms_logs" ON sms_logs FOR INSERT
  TO authenticated WITH CHECK (true);
