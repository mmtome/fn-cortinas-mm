-- ============================================================
-- FN Cortinas — Schema Postgres (Supabase) + Segurança (RLS)
--
-- Modelo multi-tenant: cada "loja" é um tenant. Um usuário (auth.users)
-- pertence a um ou mais tenants via `memberships`. Todas as tabelas de
-- dados são isoladas por tenant através de Row Level Security (RLS):
-- ninguém enxerga dados de outra loja, garantido pelo próprio banco.
--
-- Os registros do app são guardados como JSONB (mesmo formato do cliente),
-- o que casa 1:1 com a camada de sincronização (outbox/Change). Cada linha
-- tem updated_at (base do "puxar mudanças desde X") e deleted (tombstone).
--
-- COMO USAR: cole tudo no SQL Editor do Supabase e rode uma vez.
-- ============================================================

-- ---------- Tenants (lojas) e vínculos de usuário ----------
create table if not exists public.tenants (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  role       text not null default 'Operador' check (role in ('Admin','Operador')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- Helper: tenants do usuário logado (usado nas policies).
create or replace function public.my_tenant_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.memberships where user_id = auth.uid()
$$;

-- ---------- Tabelas de dados (isoladas por tenant) ----------
-- proposals / stock / clientes: coleções indexadas por id (string do app).
create table if not exists public.proposals (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  id         text not null,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists public.stock (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  id         text not null,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists public.clientes (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  id         text not null,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

-- settings: valores "inteiros" (modelos[], cores[], vars{}, empresa{}).
create table if not exists public.settings (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  key        text not null check (key in ('modelos','cores','vars','empresa')),
  data       jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, key)
);

-- Índices para o "pull desde X".
create index if not exists proposals_updated_idx on public.proposals (tenant_id, updated_at);
create index if not exists stock_updated_idx     on public.stock     (tenant_id, updated_at);
create index if not exists clientes_updated_idx  on public.clientes  (tenant_id, updated_at);
create index if not exists settings_updated_idx  on public.settings  (tenant_id, updated_at);

-- ---------- updated_at automático em toda escrita ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['proposals','stock','clientes','settings'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before insert or update on public.%1$s
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.tenants     enable row level security;
alter table public.memberships enable row level security;
alter table public.proposals   enable row level security;
alter table public.stock       enable row level security;
alter table public.clientes    enable row level security;
alter table public.settings    enable row level security;

-- Vê os tenants dos quais é membro.
drop policy if exists tenants_read on public.tenants;
create policy tenants_read on public.tenants
  for select using (id in (select public.my_tenant_ids()));

-- Vê os próprios vínculos.
drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships
  for select using (user_id = auth.uid());

-- Tabelas de dados: acesso total apenas aos registros do próprio tenant.
do $$
declare t text;
begin
  foreach t in array array['proposals','stock','clientes','settings'] loop
    execute format('drop policy if exists %1$s_rw on public.%1$s', t);
    execute format($f$
      create policy %1$s_rw on public.%1$s
        for all
        using (tenant_id in (select public.my_tenant_ids()))
        with check (tenant_id in (select public.my_tenant_ids()))
    $f$, t);
  end loop;
end $$;

-- ============================================================
-- PRIMEIRO USO (rode uma vez, ajustando o e-mail):
--   1) Crie o usuário em Authentication > Users (ou por convite).
--   2) Rode:
--        insert into public.tenants (nome) values ('FN Cortinas')
--          returning id;  -- copie o id
--        insert into public.memberships (user_id, tenant_id, role)
--          select u.id, '<TENANT_ID>', 'Admin'
--          from auth.users u where u.email = 'voce@exemplo.com';
--   Pronto: esse usuário passa a enxergar/sincronizar os dados dessa loja.
-- ============================================================
