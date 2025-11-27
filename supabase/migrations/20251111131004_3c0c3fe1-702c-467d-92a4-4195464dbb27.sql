-- Update RLS policies to use granular permissions

-- Clientes policies
DROP POLICY IF EXISTS "Users can view their own clientes or admins can view all" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their own clientes or admins can update all" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users with permission can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users with permission can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users with permission can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users with permission can delete clientes" ON public.clientes;

CREATE POLICY "Users with permission can view clientes"
  ON public.clientes FOR SELECT
  USING (public.has_permission(auth.uid(), 'clientes', 'read'));

CREATE POLICY "Users with permission can insert clientes"
  ON public.clientes FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'clientes', 'create'));

CREATE POLICY "Users with permission can update clientes"
  ON public.clientes FOR UPDATE
  USING (public.has_permission(auth.uid(), 'clientes', 'update'));

CREATE POLICY "Users with permission can delete clientes"
  ON public.clientes FOR DELETE
  USING (public.has_permission(auth.uid(), 'clientes', 'delete'));

-- Ordens de Serviço policies
DROP POLICY IF EXISTS "Users can view their own ordens or admins can view all" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users can insert their own ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users can update their own ordens or admins can update all" ON public.ordens_servico;
DROP POLICY IF EXISTS "Admins can delete ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users with permission can view ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users with permission can insert ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users with permission can update ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users with permission can delete ordens" ON public.ordens_servico;

CREATE POLICY "Users with permission can view ordens"
  ON public.ordens_servico FOR SELECT
  USING (public.has_permission(auth.uid(), 'ordens_servico', 'read'));

CREATE POLICY "Users with permission can insert ordens"
  ON public.ordens_servico FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'ordens_servico', 'create'));

CREATE POLICY "Users with permission can update ordens"
  ON public.ordens_servico FOR UPDATE
  USING (public.has_permission(auth.uid(), 'ordens_servico', 'update'));

CREATE POLICY "Users with permission can delete ordens"
  ON public.ordens_servico FOR DELETE
  USING (public.has_permission(auth.uid(), 'ordens_servico', 'delete'));

-- Garantias policies
DROP POLICY IF EXISTS "Users can view their own garantias or admins can view all" ON public.garantias;
DROP POLICY IF EXISTS "Users can insert their own garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users can update their own garantias or admins can update all" ON public.garantias;
DROP POLICY IF EXISTS "Admins can delete garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users with permission can view garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users with permission can insert garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users with permission can update garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users with permission can delete garantias" ON public.garantias;

CREATE POLICY "Users with permission can view garantias"
  ON public.garantias FOR SELECT
  USING (public.has_permission(auth.uid(), 'garantias', 'read'));

CREATE POLICY "Users with permission can insert garantias"
  ON public.garantias FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'garantias', 'create'));

CREATE POLICY "Users with permission can update garantias"
  ON public.garantias FOR UPDATE
  USING (public.has_permission(auth.uid(), 'garantias', 'update'));

CREATE POLICY "Users with permission can delete garantias"
  ON public.garantias FOR DELETE
  USING (public.has_permission(auth.uid(), 'garantias', 'delete'));

-- Estoque policies
DROP POLICY IF EXISTS "Authenticated users can view pecas" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Authenticated users can insert pecas" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Authenticated users can update pecas" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Admins can delete pecas" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Users with permission can view estoque" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Users with permission can insert estoque" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Users with permission can update estoque" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Users with permission can delete estoque" ON public.pecas_estoque;

CREATE POLICY "Users with permission can view estoque"
  ON public.pecas_estoque FOR SELECT
  USING (public.has_permission(auth.uid(), 'estoque', 'read'));

CREATE POLICY "Users with permission can insert estoque"
  ON public.pecas_estoque FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'estoque', 'create'));

CREATE POLICY "Users with permission can update estoque"
  ON public.pecas_estoque FOR UPDATE
  USING (public.has_permission(auth.uid(), 'estoque', 'update'));

CREATE POLICY "Users with permission can delete estoque"
  ON public.pecas_estoque FOR DELETE
  USING (public.has_permission(auth.uid(), 'estoque', 'delete'));

-- Checklists policies
DROP POLICY IF EXISTS "Users can view their own checklists or admins can view all" ON public.checklists;
DROP POLICY IF EXISTS "Users can insert their own checklists" ON public.checklists;
DROP POLICY IF EXISTS "Users can update their own checklists or admins can update all" ON public.checklists;
DROP POLICY IF EXISTS "Admins can delete checklists" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can view checklists" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can insert checklists" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can update checklists" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can delete checklists" ON public.checklists;

CREATE POLICY "Users with permission can view checklists"
  ON public.checklists FOR SELECT
  USING (public.has_permission(auth.uid(), 'checklists', 'read'));

CREATE POLICY "Users with permission can insert checklists"
  ON public.checklists FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'checklists', 'create'));

CREATE POLICY "Users with permission can update checklists"
  ON public.checklists FOR UPDATE
  USING (public.has_permission(auth.uid(), 'checklists', 'update'));

CREATE POLICY "Users with permission can delete checklists"
  ON public.checklists FOR DELETE
  USING (public.has_permission(auth.uid(), 'checklists', 'delete'));

-- Transações (Financeiro) policies
DROP POLICY IF EXISTS "Users can view their transactions or admins can view all" ON public.transacoes;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users can update their own transactions or admins can update al" ON public.transacoes;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users with permission can view transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Users with permission can insert transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Users with permission can update transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Users with permission can delete transacoes" ON public.transacoes;

CREATE POLICY "Users with permission can view transacoes"
  ON public.transacoes FOR SELECT
  USING (
    public.has_permission(auth.uid(), 'financeiro', 'read') OR
    (public.has_permission(auth.uid(), 'financeiro', 'read_own') AND created_by = auth.uid())
  );

CREATE POLICY "Users with permission can insert transacoes"
  ON public.transacoes FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'financeiro', 'create'));

CREATE POLICY "Users with permission can update transacoes"
  ON public.transacoes FOR UPDATE
  USING (public.has_permission(auth.uid(), 'financeiro', 'update'));

CREATE POLICY "Users with permission can delete transacoes"
  ON public.transacoes FOR DELETE
  USING (public.has_permission(auth.uid(), 'financeiro', 'delete'));

-- Caixa Diário policies - Admin vê todos, atendente só o próprio
DROP POLICY IF EXISTS "Authenticated users can view caixa" ON public.caixa_diario;
DROP POLICY IF EXISTS "Users can open caixa" ON public.caixa_diario;
DROP POLICY IF EXISTS "Users can close their own caixa or admins can close all" ON public.caixa_diario;
DROP POLICY IF EXISTS "Users can view their own caixa or admins view all" ON public.caixa_diario;
DROP POLICY IF EXISTS "Users with permission can open caixa" ON public.caixa_diario;
DROP POLICY IF EXISTS "Users can close their own caixa" ON public.caixa_diario;

CREATE POLICY "Users can view their own caixa or admins view all"
  ON public.caixa_diario FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    (public.has_permission(auth.uid(), 'caixa_diario', 'read_own') AND aberto_por = auth.uid())
  );

CREATE POLICY "Users with permission can open caixa"
  ON public.caixa_diario FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(), 'caixa_diario', 'open'));

CREATE POLICY "Users can close their own caixa"
  ON public.caixa_diario FOR UPDATE
  USING (
    (public.has_permission(auth.uid(), 'caixa_diario', 'close') AND aberto_por = auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );