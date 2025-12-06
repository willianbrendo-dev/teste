-- =============================================
-- FINAL PART - Triggers and RLS Policies
-- =============================================

-- =============================================
-- TRIGGERS
-- =============================================

-- Auth triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_role();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ordens_servico_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at
  BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_garantias_updated_at
  BEFORE UPDATE ON public.garantias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pecas_estoque_updated_at
  BEFORE UPDATE ON public.pecas_estoque
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transacoes_updated_at
  BEFORE UPDATE ON public.transacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caixa_diario_updated_at
  BEFORE UPDATE ON public.caixa_diario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Protection triggers
CREATE TRIGGER prevent_super_admin_profile_deletion
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_deletion();

CREATE TRIGGER protect_super_admin_role_trigger
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_role();

CREATE TRIGGER prevent_last_admin_deletion_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_deletion();

CREATE TRIGGER prevent_super_admin_user_id_change_trigger
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_user_id_change();

-- Business logic triggers
CREATE TRIGGER reduzir_estoque_trigger
  AFTER UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.reduzir_estoque_ao_concluir();

CREATE TRIGGER auto_create_garantia_on_checklist_concluido
  AFTER UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_garantia_on_concluido();

CREATE TRIGGER auto_create_receita_ordem_trigger
  AFTER UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_receita_ordem();

CREATE TRIGGER auto_create_receita_garantia_trigger
  BEFORE UPDATE ON public.garantias
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_receita_garantia();

-- Audit triggers
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();

CREATE TRIGGER audit_clientes_delete_trigger
  BEFORE DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.audit_clientes_delete();

CREATE TRIGGER audit_marcas_delete_trigger
  BEFORE DELETE ON public.marcas
  FOR EACH ROW EXECUTE FUNCTION public.audit_marcas_delete();

CREATE TRIGGER audit_modelos_delete_trigger
  BEFORE DELETE ON public.modelos
  FOR EACH ROW EXECUTE FUNCTION public.audit_modelos_delete();

CREATE TRIGGER audit_ordens_delete_trigger
  BEFORE DELETE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.audit_ordens_delete();

CREATE TRIGGER audit_pecas_delete_trigger
  BEFORE DELETE ON public.pecas_estoque
  FOR EACH ROW EXECUTE FUNCTION public.audit_pecas_delete();

CREATE TRIGGER audit_checklists_delete_trigger
  BEFORE DELETE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.audit_checklists_delete();

CREATE TRIGGER audit_garantias_delete_trigger
  BEFORE DELETE ON public.garantias
  FOR EACH ROW EXECUTE FUNCTION public.audit_garantias_delete();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecas_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- User permissions policies
CREATE POLICY "Admins can view all permissions" ON public.user_permissions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert permissions" ON public.user_permissions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update permissions" ON public.user_permissions
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete permissions" ON public.user_permissions
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Marcas policies
CREATE POLICY "Authenticated users can view marcas" ON public.marcas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert marcas" ON public.marcas
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update marcas" ON public.marcas
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete marcas" ON public.marcas
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Modelos policies
CREATE POLICY "Authenticated users can view modelos" ON public.modelos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert modelos" ON public.modelos
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update modelos" ON public.modelos
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete modelos" ON public.modelos
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Clientes policies
CREATE POLICY "Users with permission can view clientes" ON public.clientes
  FOR SELECT USING (has_permission(auth.uid(), 'clientes', 'read'));

CREATE POLICY "Users with permission can insert clientes" ON public.clientes
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'clientes', 'create'));

CREATE POLICY "Users with permission can update clientes" ON public.clientes
  FOR UPDATE USING (has_permission(auth.uid(), 'clientes', 'update'));

CREATE POLICY "Users with permission can delete clientes" ON public.clientes
  FOR DELETE USING (has_permission(auth.uid(), 'clientes', 'delete'));

-- Ordens servico policies
CREATE POLICY "Admins view all ordens, atendentes view own" ON public.ordens_servico
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR 
    (has_permission(auth.uid(), 'ordens_servico', 'read') AND created_by = auth.uid())
  );

CREATE POLICY "Users with permission can insert ordens" ON public.ordens_servico
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'ordens_servico', 'create'));

CREATE POLICY "Admins update all ordens, atendentes update own" ON public.ordens_servico
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_permission(auth.uid(), 'ordens_servico', 'update') AND created_by = auth.uid())
  );

CREATE POLICY "Admins delete all ordens, atendentes delete own" ON public.ordens_servico
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_permission(auth.uid(), 'ordens_servico', 'delete') AND created_by = auth.uid())
  );

-- Checklists policies
CREATE POLICY "Admins view all checklists, atendentes view own" ON public.checklists
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR 
    (has_permission(auth.uid(), 'checklists', 'read') AND created_by = auth.uid())
  );

CREATE POLICY "Users with permission can insert checklists" ON public.checklists
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'checklists', 'create'));

CREATE POLICY "Admins update all checklists, atendentes update own" ON public.checklists
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_permission(auth.uid(), 'checklists', 'update') AND created_by = auth.uid())
  );

CREATE POLICY "Admins delete all checklists, atendentes delete own" ON public.checklists
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_permission(auth.uid(), 'checklists', 'delete') AND created_by = auth.uid())
  );

-- Garantias policies
CREATE POLICY "Users with permission can view garantias" ON public.garantias
  FOR SELECT USING (has_permission(auth.uid(), 'garantias', 'read'));

CREATE POLICY "Users with permission can insert garantias" ON public.garantias
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'garantias', 'create'));

CREATE POLICY "Users with permission can update garantias" ON public.garantias
  FOR UPDATE USING (has_permission(auth.uid(), 'garantias', 'update'));

CREATE POLICY "Users with permission can delete garantias" ON public.garantias
  FOR DELETE USING (has_permission(auth.uid(), 'garantias', 'delete'));

-- Pecas estoque policies
CREATE POLICY "Users with permission can view estoque" ON public.pecas_estoque
  FOR SELECT USING (has_permission(auth.uid(), 'estoque', 'read'));

CREATE POLICY "Users with permission can insert estoque" ON public.pecas_estoque
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'estoque', 'create'));

CREATE POLICY "Users with permission can update estoque" ON public.pecas_estoque
  FOR UPDATE USING (has_permission(auth.uid(), 'estoque', 'update'));

CREATE POLICY "Users with permission can delete estoque" ON public.pecas_estoque
  FOR DELETE USING (has_permission(auth.uid(), 'estoque', 'delete'));

-- Ordens pecas policies
CREATE POLICY "Users can view their ordens pecas or admins can view all" ON public.ordens_pecas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ordens_servico
      WHERE ordens_servico.id = ordens_pecas.ordem_id
      AND (ordens_servico.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert pecas to their ordens" ON public.ordens_pecas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ordens_servico
      WHERE ordens_servico.id = ordens_pecas.ordem_id
      AND ordens_servico.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their ordens pecas or admins can update all" ON public.ordens_pecas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ordens_servico
      WHERE ordens_servico.id = ordens_pecas.ordem_id
      AND (ordens_servico.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can delete their ordens pecas or admins can delete all" ON public.ordens_pecas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ordens_servico
      WHERE ordens_servico.id = ordens_pecas.ordem_id
      AND (ordens_servico.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Categorias financeiras policies
CREATE POLICY "Authenticated users can view categories" ON public.categorias_financeiras
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert categories" ON public.categorias_financeiras
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories" ON public.categorias_financeiras
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories" ON public.categorias_financeiras
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Transacoes policies
CREATE POLICY "Users with permission can view transacoes" ON public.transacoes
  FOR SELECT USING (
    has_permission(auth.uid(), 'financeiro', 'read') OR 
    (has_permission(auth.uid(), 'financeiro', 'read_own') AND created_by = auth.uid())
  );

CREATE POLICY "Users with permission can insert transacoes" ON public.transacoes
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'financeiro', 'create'));

CREATE POLICY "Users with permission can update transacoes" ON public.transacoes
  FOR UPDATE USING (has_permission(auth.uid(), 'financeiro', 'update'));

CREATE POLICY "Users with permission can delete transacoes" ON public.transacoes
  FOR DELETE USING (has_permission(auth.uid(), 'financeiro', 'delete'));

-- Transacoes categorias policies
CREATE POLICY "Users with permission can view transacoes_categorias" ON public.transacoes_categorias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transacoes t
      WHERE t.id = transacoes_categorias.transacao_id
      AND (has_permission(auth.uid(), 'financeiro', 'read') OR 
           (has_permission(auth.uid(), 'financeiro', 'read_own') AND t.created_by = auth.uid()))
    )
  );

CREATE POLICY "Users with permission can insert transacoes_categorias" ON public.transacoes_categorias
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'financeiro', 'create'));

CREATE POLICY "Users with permission can delete transacoes_categorias" ON public.transacoes_categorias
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transacoes t
      WHERE t.id = transacoes_categorias.transacao_id
      AND has_permission(auth.uid(), 'financeiro', 'delete')
    )
  );

-- Caixa diario policies
CREATE POLICY "Users can view their own caixa or admins view all" ON public.caixa_diario
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR 
    (has_permission(auth.uid(), 'caixa_diario', 'read_own') AND aberto_por = auth.uid())
  );

CREATE POLICY "Users with permission can open caixa" ON public.caixa_diario
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'caixa_diario', 'open'));

CREATE POLICY "Users can close their own caixa" ON public.caixa_diario
  FOR UPDATE USING (
    (has_permission(auth.uid(), 'caixa_diario', 'close') AND aberto_por = auth.uid()) OR 
    has_role(auth.uid(), 'admin')
  );

-- Print jobs policies
CREATE POLICY "Admins can view all print jobs" ON public.print_jobs
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'print_bridge')
  );

CREATE POLICY "Admins can insert print jobs" ON public.print_jobs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and print_bridge can update jobs" ON public.print_jobs
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'print_bridge')
  );

-- =============================================
-- STORAGE POLICIES
-- =============================================

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'device-photos' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'device-photos' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'device-photos' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'device-photos' AND 
    auth.role() = 'authenticated'
  );