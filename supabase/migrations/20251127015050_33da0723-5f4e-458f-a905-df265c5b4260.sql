-- =============================================
-- COMPLETE DATABASE RESET AND MIGRATION
-- Drops all existing structures and recreates everything
-- =============================================

-- =============================================
-- DROP EXISTING STRUCTURES (in reverse dependency order)
-- =============================================

-- Drop all policies first
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can insert permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can view marcas" ON public.marcas;
DROP POLICY IF EXISTS "Admins can insert marcas" ON public.marcas;
DROP POLICY IF EXISTS "Admins can update marcas" ON public.marcas;
DROP POLICY IF EXISTS "Admins can delete marcas" ON public.marcas;
DROP POLICY IF EXISTS "Authenticated users can view modelos" ON public.modelos;
DROP POLICY IF EXISTS "Admins can insert modelos" ON public.modelos;
DROP POLICY IF EXISTS "Admins can update modelos" ON public.modelos;
DROP POLICY IF EXISTS "Admins can delete modelos" ON public.modelos;
DROP POLICY IF EXISTS "Users with permission can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users with permission can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users with permission can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users with permission can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins view all ordens, atendentes view own" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users with permission can insert ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Admins update all ordens, atendentes update own" ON public.ordens_servico;
DROP POLICY IF EXISTS "Admins delete all ordens, atendentes delete own" ON public.ordens_servico;
DROP POLICY IF EXISTS "Admins view all checklists, atendentes view own" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can insert checklists" ON public.checklists;
DROP POLICY IF EXISTS "Admins update all checklists, atendentes update own" ON public.checklists;
DROP POLICY IF EXISTS "Admins delete all checklists, atendentes delete own" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can view garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users with permission can insert garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users with permission can update garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users with permission can delete garantias" ON public.garantias;
DROP POLICY IF EXISTS "Users with permission can view estoque" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Users with permission can insert estoque" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Users with permission can update estoque" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Users with permission can delete estoque" ON public.pecas_estoque;
DROP POLICY IF EXISTS "Users can view their ordens pecas or admins can view all" ON public.ordens_pecas;
DROP POLICY IF EXISTS "Users can insert pecas to their ordens" ON public.ordens_pecas;
DROP POLICY IF EXISTS "Users can update their ordens pecas or admins can update all" ON public.ordens_pecas;
DROP POLICY IF EXISTS "Users can delete their ordens pecas or admins can delete all" ON public.ordens_pecas;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Users with permission can view transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Users with permission can insert transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Users with permission can update transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Users with permission can delete transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Users with permission can view transacoes_categorias" ON public.transacoes_categorias;
DROP POLICY IF EXISTS "Users with permission can insert transacoes_categorias" ON public.transacoes_categorias;
DROP POLICY IF EXISTS "Users with permission can delete transacoes_categorias" ON public.transacoes_categorias;
DROP POLICY IF EXISTS "Users can view their own caixa or admins view all" ON public.caixa_diario;
DROP POLICY IF EXISTS "Users with permission can open caixa" ON public.caixa_diario;
DROP POLICY IF EXISTS "Users can close their own caixa" ON public.caixa_diario;
DROP POLICY IF EXISTS "Admins can view all print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Admins can insert print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Admins and print_bridge can update jobs" ON public.print_jobs;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
DROP TRIGGER IF EXISTS update_ordens_servico_updated_at ON public.ordens_servico;
DROP TRIGGER IF EXISTS update_checklists_updated_at ON public.checklists;
DROP TRIGGER IF EXISTS update_garantias_updated_at ON public.garantias;
DROP TRIGGER IF EXISTS update_pecas_estoque_updated_at ON public.pecas_estoque;
DROP TRIGGER IF EXISTS update_transacoes_updated_at ON public.transacoes;
DROP TRIGGER IF EXISTS update_caixa_diario_updated_at ON public.caixa_diario;
DROP TRIGGER IF EXISTS update_print_jobs_updated_at ON public.print_jobs;
DROP TRIGGER IF EXISTS prevent_super_admin_profile_deletion ON public.profiles;
DROP TRIGGER IF EXISTS protect_super_admin_role_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS prevent_last_admin_deletion_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS prevent_super_admin_user_id_change_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS reduzir_estoque_trigger ON public.ordens_servico;
DROP TRIGGER IF EXISTS auto_create_garantia_on_checklist_concluido ON public.checklists;
DROP TRIGGER IF EXISTS auto_create_receita_ordem_trigger ON public.ordens_servico;
DROP TRIGGER IF EXISTS auto_create_receita_garantia_trigger ON public.garantias;
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS audit_clientes_delete_trigger ON public.clientes;
DROP TRIGGER IF EXISTS audit_marcas_delete_trigger ON public.marcas;
DROP TRIGGER IF EXISTS audit_modelos_delete_trigger ON public.modelos;
DROP TRIGGER IF EXISTS audit_ordens_delete_trigger ON public.ordens_servico;
DROP TRIGGER IF EXISTS audit_pecas_delete_trigger ON public.pecas_estoque;
DROP TRIGGER IF EXISTS audit_checklists_delete_trigger ON public.checklists;
DROP TRIGGER IF EXISTS audit_garantias_delete_trigger ON public.garantias;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.transacoes_categorias CASCADE;
DROP TABLE IF EXISTS public.transacoes CASCADE;
DROP TABLE IF EXISTS public.caixa_diario CASCADE;
DROP TABLE IF EXISTS public.print_jobs CASCADE;
DROP TABLE IF EXISTS public.ordens_pecas CASCADE;
DROP TABLE IF EXISTS public.pecas_estoque CASCADE;
DROP TABLE IF EXISTS public.garantias CASCADE;
DROP TABLE IF EXISTS public.checklists CASCADE;
DROP TABLE IF EXISTS public.ordens_servico CASCADE;
DROP TABLE IF EXISTS public.categorias_financeiras CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.modelos CASCADE;
DROP TABLE IF EXISTS public.marcas CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_permission(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_audit_log(text, text, uuid, jsonb, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.assign_admin_role() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_super_admin_deletion() CASCADE;
DROP FUNCTION IF EXISTS public.protect_super_admin_role() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_last_admin_deletion() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_super_admin_user_id_change() CASCADE;
DROP FUNCTION IF EXISTS public.check_checklist_atraso() CASCADE;
DROP FUNCTION IF EXISTS public.get_next_pending_job(text) CASCADE;
DROP FUNCTION IF EXISTS public.update_job_status(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.reduzir_estoque_ao_concluir() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_garantia() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_garantia_on_concluido() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_receita_ordem() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_receita_garantia() CASCADE;
DROP FUNCTION IF EXISTS public.audit_user_roles() CASCADE;
DROP FUNCTION IF EXISTS public.audit_clientes_delete() CASCADE;
DROP FUNCTION IF EXISTS public.audit_marcas_delete() CASCADE;
DROP FUNCTION IF EXISTS public.audit_modelos_delete() CASCADE;
DROP FUNCTION IF EXISTS public.audit_ordens_delete() CASCADE;
DROP FUNCTION IF EXISTS public.audit_pecas_delete() CASCADE;
DROP FUNCTION IF EXISTS public.audit_checklists_delete() CASCADE;
DROP FUNCTION IF EXISTS public.audit_garantias_delete() CASCADE;

-- Drop types
DROP TYPE IF EXISTS public.component_status CASCADE;
DROP TYPE IF EXISTS public.checklist_type CASCADE;
DROP TYPE IF EXISTS public.checklist_status CASCADE;
DROP TYPE IF EXISTS public.transaction_type CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS public.ordens_servico_numero_seq CASCADE;