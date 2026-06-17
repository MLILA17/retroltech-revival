/*
# Add user roles table for admin support

1. New Tables
- `user_roles`
  - `user_id` (uuid, references auth.users, primary key)
  - `role` (text, not null, default 'user')
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `user_roles`.
- Authenticated users can read their own role.
- Only authenticated users can insert/update their own role (for the admin seed).
- Admin users can read all roles.

3. Notes
- The `role` column defaults to 'user' for regular customers.
- 'admin' role grants access to the admin panel.
*/

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_role" ON user_roles;
CREATE POLICY "select_own_role" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_admin_roles" ON user_roles;
CREATE POLICY "select_admin_roles" ON user_roles FOR SELECT
  TO authenticated USING (role = 'admin');

DROP POLICY IF EXISTS "insert_own_role" ON user_roles;
CREATE POLICY "insert_own_role" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_role" ON user_roles;
CREATE POLICY "update_own_role" ON user_roles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_role" ON user_roles;
CREATE POLICY "delete_own_role" ON user_roles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
