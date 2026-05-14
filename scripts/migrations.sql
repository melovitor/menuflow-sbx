-- ============================================================
-- MenuFlow — Migrations completas (v1)
-- Rodar na ordem exata: 001 → 011, depois RLS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Migration 001 — Users
-- ────────────────────────────────────────────────────────────

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- Migration 002 — Businesses
-- ────────────────────────────────────────────────────────────

create table if not exists public.businesses (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  category text not null,
  phone text,
  address_zip text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  timezone text not null default 'America/Sao_Paulo',
  logo_url text,
  cover_url text,
  is_open boolean default false,
  opens_at time,
  closes_at time,
  staff_access_code text unique not null,
  service_charge_percent numeric(5,2) default 0,
  max_discount_percent numeric(5,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_businesses_owner_id on public.businesses(owner_id);
create index if not exists idx_businesses_slug on public.businesses(slug);

-- ────────────────────────────────────────────────────────────
-- Migration 003 — Business Staff
-- ────────────────────────────────────────────────────────────

create table if not exists public.business_staff (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text default 'staff',
  is_active boolean default true,
  joined_at timestamptz default now(),
  unique(business_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- Migration 004 — Tables
-- ────────────────────────────────────────────────────────────

create table if not exists public.tables (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  number integer not null,
  status text default 'free',
  qr_code_url text,
  created_at timestamptz default now(),
  unique(business_id, number)
);

create index if not exists idx_tables_business_id on public.tables(business_id);

-- ────────────────────────────────────────────────────────────
-- Migration 005 — Waiter Calls
-- ────────────────────────────────────────────────────────────

create table if not exists public.waiter_calls (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  table_id uuid references public.tables(id) on delete cascade not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists idx_waiter_calls_business_id on public.waiter_calls(business_id);

-- ────────────────────────────────────────────────────────────
-- Migration 006 — Menu Categories
-- ────────────────────────────────────────────────────────────

create table if not exists public.menu_categories (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  order_index integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_menu_categories_business_id on public.menu_categories(business_id);

-- ────────────────────────────────────────────────────────────
-- Migration 007 — Menu Items
-- ────────────────────────────────────────────────────────────

create table if not exists public.menu_items (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.menu_categories(id) on delete cascade not null,
  name text not null,
  description text,
  photo_url text not null,
  price numeric(10,2) not null,
  promo_price numeric(10,2),
  prep_time_minutes integer default 15,
  tags text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_menu_items_category_id on public.menu_items(category_id);

-- ────────────────────────────────────────────────────────────
-- Migration 008 — Customers
-- ────────────────────────────────────────────────────────────

create table if not exists public.customers (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  phone text not null,
  marketing_opt_in boolean default false,
  created_at timestamptz default now(),
  unique(business_id, phone)
);

create index if not exists idx_customers_business_id on public.customers(business_id);
create index if not exists idx_customers_phone on public.customers(phone);

-- ────────────────────────────────────────────────────────────
-- Migration 009 — Orders
-- ────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  order_number text not null,
  table_id uuid references public.tables(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.users(id) on delete set null,
  source text not null,
  status text default 'pending',
  customer_name text,
  notes text,
  discount_percent numeric(5,2) default 0,
  service_charge_accepted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_orders_business_id on public.orders(business_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_table_id on public.orders(table_id);
create index if not exists idx_orders_created_at on public.orders(created_at);

create or replace function generate_order_number(p_business_id uuid)
returns text as $$
declare
  today text := to_char(now(), 'DDMM');
  next_seq integer;
begin
  select coalesce(max(
    cast(split_part(order_number, '-', 2) as integer)
  ), 0) + 1
  into next_seq
  from orders
  where business_id = p_business_id
    and order_number like today || '-%';
  return today || '-' || lpad(next_seq::text, 4, '0');
end;
$$ language plpgsql;

-- ────────────────────────────────────────────────────────────
-- Migration 010 — Order Items
-- ────────────────────────────────────────────────────────────

create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null default 1,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- ────────────────────────────────────────────────────────────
-- Migration 011 — Payments
-- ────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  method text not null,
  amount numeric(10,2) not null,
  split_count integer default 1,
  paid_at timestamptz default now()
);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- USERS
alter table public.users enable row level security;
drop policy if exists "Usuário lê e edita próprio perfil" on public.users;
create policy "Usuário lê e edita próprio perfil"
  on public.users for all
  using (id = auth.uid());

-- BUSINESSES
alter table public.businesses enable row level security;
drop policy if exists "Leitura pública de dados básicos do negócio" on public.businesses;
create policy "Leitura pública de dados básicos do negócio"
  on public.businesses for select using (true);
drop policy if exists "Owner gerencia seus negócios" on public.businesses;
create policy "Owner gerencia seus negócios"
  on public.businesses for all
  using (owner_id = auth.uid());

-- BUSINESS_STAFF
alter table public.business_staff enable row level security;
drop policy if exists "Owner gerencia staff do seu negócio" on public.business_staff;
create policy "Owner gerencia staff do seu negócio"
  on public.business_staff for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- TABLES
alter table public.tables enable row level security;
drop policy if exists "Leitura pública de mesas" on public.tables;
create policy "Leitura pública de mesas"
  on public.tables for select using (true);
drop policy if exists "Owner gerencia mesas" on public.tables;
create policy "Owner gerencia mesas"
  on public.tables for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- WAITER_CALLS
alter table public.waiter_calls enable row level security;
drop policy if exists "Inserção pública de chamados" on public.waiter_calls;
create policy "Inserção pública de chamados"
  on public.waiter_calls for insert with check (true);
drop policy if exists "Owner e staff veem chamados" on public.waiter_calls;
create policy "Owner e staff veem chamados"
  on public.waiter_calls for select
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );
drop policy if exists "Owner e staff atualizam chamados" on public.waiter_calls;
create policy "Owner e staff atualizam chamados"
  on public.waiter_calls for update
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );

-- MENU_CATEGORIES
alter table public.menu_categories enable row level security;
drop policy if exists "Leitura pública de categorias ativas" on public.menu_categories;
create policy "Leitura pública de categorias ativas"
  on public.menu_categories for select
  using (is_active = true);
drop policy if exists "Owner gerencia categorias" on public.menu_categories;
create policy "Owner gerencia categorias"
  on public.menu_categories for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- MENU_ITEMS
alter table public.menu_items enable row level security;
drop policy if exists "Leitura pública de itens ativos" on public.menu_items;
create policy "Leitura pública de itens ativos"
  on public.menu_items for select
  using (is_active = true);
drop policy if exists "Owner gerencia itens" on public.menu_items;
create policy "Owner gerencia itens"
  on public.menu_items for all
  using (
    category_id in (
      select id from public.menu_categories
      where business_id in (
        select id from public.businesses where owner_id = auth.uid()
      )
    )
  );

-- CUSTOMERS
alter table public.customers enable row level security;
drop policy if exists "Inserção pública de clientes" on public.customers;
create policy "Inserção pública de clientes"
  on public.customers for insert with check (true);
drop policy if exists "Owner e staff gerenciam clientes" on public.customers;
create policy "Owner e staff gerenciam clientes"
  on public.customers for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );

-- ORDERS
alter table public.orders enable row level security;
drop policy if exists "Inserção pública de pedidos" on public.orders;
create policy "Inserção pública de pedidos"
  on public.orders for insert with check (true);
drop policy if exists "Owner e staff veem pedidos do negócio" on public.orders;
create policy "Owner e staff veem pedidos do negócio"
  on public.orders for select
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );
drop policy if exists "Owner e staff atualizam pedidos" on public.orders;
create policy "Owner e staff atualizam pedidos"
  on public.orders for update
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );

-- ORDER_ITEMS
alter table public.order_items enable row level security;
drop policy if exists "Inserção pública de itens de pedido" on public.order_items;
create policy "Inserção pública de itens de pedido"
  on public.order_items for insert with check (true);
drop policy if exists "Owner e staff veem itens de pedido" on public.order_items;
create policy "Owner e staff veem itens de pedido"
  on public.order_items for select
  using (
    order_id in (
      select id from public.orders
      where business_id in (
        select id from public.businesses where owner_id = auth.uid()
        union
        select business_id from public.business_staff where user_id = auth.uid()
      )
    )
  );

-- PAYMENTS
alter table public.payments enable row level security;
drop policy if exists "Owner e staff gerenciam pagamentos" on public.payments;
create policy "Owner e staff gerenciam pagamentos"
  on public.payments for all
  using (
    order_id in (
      select id from public.orders
      where business_id in (
        select id from public.businesses where owner_id = auth.uid()
        union
        select business_id from public.business_staff where user_id = auth.uid()
      )
    )
  );
