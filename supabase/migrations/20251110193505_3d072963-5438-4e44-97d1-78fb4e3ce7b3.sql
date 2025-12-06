-- Create permissions table for granular access control
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null, -- 'clientes', 'marcas', 'ordens_servico', 'estoque'
  action text not null, -- 'create', 'read', 'update', 'delete'
  created_at timestamp with time zone not null default now(),
  unique(user_id, module, action)
);

-- Enable RLS
alter table public.user_permissions enable row level security;

-- Admins can view all permissions
create policy "Admins can view all permissions"
on public.user_permissions
for select
using (has_role(auth.uid(), 'admin'));

-- Admins can insert permissions
create policy "Admins can insert permissions"
on public.user_permissions
for insert
with check (has_role(auth.uid(), 'admin'));

-- Admins can update permissions
create policy "Admins can update permissions"
on public.user_permissions
for update
using (has_role(auth.uid(), 'admin'));

-- Admins can delete permissions
create policy "Admins can delete permissions"
on public.user_permissions
for delete
using (has_role(auth.uid(), 'admin'));

-- Create function to check if user has specific permission
create or replace function public.has_permission(_user_id uuid, _module text, _action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Admins have all permissions
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = 'admin'
  ) or exists (
    select 1 from public.user_permissions 
    where user_id = _user_id and module = _module and action = _action
  )
$$;

-- Create index for better performance
create index if not exists idx_user_permissions_user_id on public.user_permissions(user_id);
create index if not exists idx_user_permissions_module_action on public.user_permissions(module, action);