-- ============================================================
-- MenuFlow — Row Level Security (RLS)
-- Idempotente: drop policy if exists antes de cada create
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────
alter table public.users enable row level security;

drop policy if exists "Usuário lê e edita próprio perfil" on public.users;
create policy "Usuário lê e edita próprio perfil"
  on public.users for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- BUSINESSES
-- ────────────────────────────────────────────────────────────
alter table public.businesses enable row level security;

drop policy if exists "Leitura pública de dados básicos do negócio" on public.businesses;
create policy "Leitura pública de dados básicos do negócio"
  on public.businesses for select using (true);

drop policy if exists "Owner gerencia seus negócios" on public.businesses;
create policy "Owner gerencia seus negócios"
  on public.businesses for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- BUSINESS_STAFF
-- ────────────────────────────────────────────────────────────
alter table public.business_staff enable row level security;

drop policy if exists "Owner gerencia staff do seu negócio" on public.business_staff;
create policy "Owner gerencia staff do seu negócio"
  on public.business_staff for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- TABLES
-- ────────────────────────────────────────────────────────────
alter table public.tables enable row level security;

drop policy if exists "Leitura pública de mesas" on public.tables;
create policy "Leitura pública de mesas"
  on public.tables for select using (true);

-- PDV staff usa anon key → inserção e atualização públicas em v1
drop policy if exists "Inserção pública de mesas" on public.tables;
create policy "Inserção pública de mesas"
  on public.tables for insert with check (true);

drop policy if exists "Atualização pública de mesas" on public.tables;
create policy "Atualização pública de mesas"
  on public.tables for update using (true);

drop policy if exists "Owner e staff gerenciam mesas" on public.tables;
create policy "Owner e staff gerenciam mesas"
  on public.tables for delete
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- WAITER_CALLS
-- ────────────────────────────────────────────────────────────
alter table public.waiter_calls enable row level security;

drop policy if exists "Inserção pública de chamados" on public.waiter_calls;
create policy "Inserção pública de chamados"
  on public.waiter_calls for insert with check (true);

-- PDV staff usa anon key → leitura e atualização públicas em v1
drop policy if exists "Leitura pública de chamados" on public.waiter_calls;
create policy "Leitura pública de chamados"
  on public.waiter_calls for select using (true);

drop policy if exists "Atualização pública de chamados" on public.waiter_calls;
create policy "Atualização pública de chamados"
  on public.waiter_calls for update using (true);

-- Manter nome antigo para evitar conflito se já existia
drop policy if exists "Owner e staff veem chamados" on public.waiter_calls;
drop policy if exists "Owner e staff atualizam chamados" on public.waiter_calls;

-- ────────────────────────────────────────────────────────────
-- MENU_CATEGORIES
-- ────────────────────────────────────────────────────────────
alter table public.menu_categories enable row level security;

drop policy if exists "Leitura pública de categorias ativas" on public.menu_categories;
create policy "Leitura pública de categorias ativas"
  on public.menu_categories for select using (is_active = true);

drop policy if exists "Owner gerencia categorias" on public.menu_categories;
create policy "Owner gerencia categorias"
  on public.menu_categories for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- MENU_ITEMS
-- ────────────────────────────────────────────────────────────
alter table public.menu_items enable row level security;

drop policy if exists "Leitura pública de itens ativos" on public.menu_items;
create policy "Leitura pública de itens ativos"
  on public.menu_items for select using (is_active = true);

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
  )
  with check (
    category_id in (
      select id from public.menu_categories
      where business_id in (
        select id from public.businesses where owner_id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ────────────────────────────────────────────────────────────
alter table public.customers enable row level security;

drop policy if exists "Inserção pública de clientes" on public.customers;
create policy "Inserção pública de clientes"
  on public.customers for insert with check (true);

-- Leitura pública: necessário para busca de telefone no fluxo de identificação do balcão
drop policy if exists "Leitura pública de clientes" on public.customers;
create policy "Leitura pública de clientes"
  on public.customers for select using (true);

drop policy if exists "Owner e staff gerenciam clientes" on public.customers;
create policy "Owner e staff gerenciam clientes"
  on public.customers for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- ORDERS
-- ────────────────────────────────────────────────────────────
alter table public.orders enable row level security;

drop policy if exists "Inserção pública de pedidos" on public.orders;
create policy "Inserção pública de pedidos"
  on public.orders for insert with check (true);

-- KDS, PDV e telas do cliente usam anon key → leitura e atualização públicas em v1
drop policy if exists "Leitura pública de pedidos" on public.orders;
create policy "Leitura pública de pedidos"
  on public.orders for select using (true);

drop policy if exists "Atualização pública de pedidos" on public.orders;
create policy "Atualização pública de pedidos"
  on public.orders for update using (true);

-- Manter nomes antigos para evitar conflito se já existiam
drop policy if exists "Owner e staff veem pedidos" on public.orders;
drop policy if exists "Owner e staff atualizam pedidos" on public.orders;

-- ────────────────────────────────────────────────────────────
-- ORDER_ITEMS
-- ────────────────────────────────────────────────────────────
alter table public.order_items enable row level security;

drop policy if exists "Inserção pública de itens de pedido" on public.order_items;
create policy "Inserção pública de itens de pedido"
  on public.order_items for insert with check (true);

-- KDS e telas do cliente usam anon key → leitura pública em v1
drop policy if exists "Leitura pública de itens de pedido" on public.order_items;
create policy "Leitura pública de itens de pedido"
  on public.order_items for select using (true);

-- Manter nome antigo para evitar conflito se já existia
drop policy if exists "Owner e staff veem itens de pedido" on public.order_items;

-- ────────────────────────────────────────────────────────────
-- PAYMENTS
-- ────────────────────────────────────────────────────────────
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
  )
  with check (
    order_id in (
      select id from public.orders
      where business_id in (
        select id from public.businesses where owner_id = auth.uid()
        union
        select business_id from public.business_staff where user_id = auth.uid()
      )
    )
  );
