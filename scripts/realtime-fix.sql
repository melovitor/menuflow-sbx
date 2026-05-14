-- ============================================================
-- MenuFlow — Realtime Fix
-- Execute no SQL Editor do Supabase Dashboard
-- Idempotente: seguro rodar mais de uma vez
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Adicionar tabelas na publicação supabase_realtime
-- (sem isso nenhum evento chega ao cliente)
-- ────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.waiter_calls;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.menu_categories;
alter publication supabase_realtime add table public.menu_items;

-- ────────────────────────────────────────────────────────────
-- 2. REPLICA IDENTITY FULL
-- Obrigatório para filtros por coluna (filter: business_id=eq.X)
-- funcionarem no Realtime com RLS ativo
-- ────────────────────────────────────────────────────────────
alter table public.orders       replica identity full;
alter table public.tables       replica identity full;
alter table public.waiter_calls replica identity full;
alter table public.order_items  replica identity full;
alter table public.menu_categories replica identity full;
alter table public.menu_items   replica identity full;

-- ────────────────────────────────────────────────────────────
-- 3. Políticas de leitura pública
--
-- PDV, KDS e CounterDisplay usam a anon key (sem auth.uid()),
-- então as políticas que exigem auth.uid() nunca passam.
-- A solução correta para v1 é leitura pública nas tabelas
-- operacionais (os dados são internos do restaurante).
-- v2 → convite de staff por email substitui esse modelo.
-- ────────────────────────────────────────────────────────────

-- orders: KDS precisa ler e atualizar; PDV precisa ler;
--         CounterDisplay e OrderStatus precisam ler
drop policy if exists "Leitura pública de pedidos" on public.orders;
create policy "Leitura pública de pedidos"
  on public.orders for select using (true);

drop policy if exists "Atualização pública de pedidos" on public.orders;
create policy "Atualização pública de pedidos"
  on public.orders for update using (true);

-- order_items: KDS e OrderStatus precisam ler via join
drop policy if exists "Leitura pública de itens de pedido" on public.order_items;
create policy "Leitura pública de itens de pedido"
  on public.order_items for select using (true);

-- waiter_calls: PDV recebe via realtime com anon key
drop policy if exists "Leitura pública de chamados" on public.waiter_calls;
create policy "Leitura pública de chamados"
  on public.waiter_calls for select using (true);

drop policy if exists "Atualização pública de chamados" on public.waiter_calls;
create policy "Atualização pública de chamados"
  on public.waiter_calls for update using (true);

-- tables: PDV precisa atualizar status (free/occupied) via anon key
drop policy if exists "Atualização pública de mesas" on public.tables;
create policy "Atualização pública de mesas"
  on public.tables for update using (true);

-- tables: PDV cria novas mesas via anon key
drop policy if exists "Inserção pública de mesas" on public.tables;
create policy "Inserção pública de mesas"
  on public.tables for insert with check (true);

-- customers: busca por telefone no fluxo de identificação do balcão (anon key)
drop policy if exists "Leitura pública de clientes" on public.customers;
create policy "Leitura pública de clientes"
  on public.customers for select using (true);
