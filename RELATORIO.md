# MenuFlow — Relatório de Status do Projeto
# Gerado em: 09/05/2026 | Atualizado em: 09/05/2026
# Use este documento para briefar qualquer IA ou desenvolvedor sobre o estado atual do projeto.

---

## Contexto Geral

MenuFlow é um SaaS de gestão para bares e restaurantes.
Stack: React 18 + Vite 4.5.x + Tailwind CSS 3 + Supabase + React Router v6 + Zustand.
Deploy alvo: Vercel. Repositório: github.com/melovitor/menuflow.
Supabase: nlruyaczomnigsxzkfqm.supabase.co (região São Paulo).

**IMPORTANTE:** Vite está fixado na versão 4.5.x por causa de uma política WDAC do Windows
que bloqueia o binário nativo do rollup em versões superiores. Não atualizar o Vite.

---

## Status Geral

v1 completa — todas as 22 telas implementadas e testadas manualmente.
Git não configurado na máquina de desenvolvimento (problema temporário de instalação).
Deploy de produção ainda não realizado.
Testes E2E (Playwright) não iniciados — decisão deliberada de validar com cliente real antes.

---

## O que foi construído — 22 telas

### Autenticação (Owner)
- **Login** (`/login`) — email + senha + Google OAuth via Supabase Auth
- **Cadastro** (`/register`) — cria conta owner
- **Recuperação de senha** (`/forgot-password`) — envia email de reset
- **Reset de senha** (`/reset-password`) — recebe token via `onAuthStateChange`, salva nova senha e faz logout

### Owner
- **Home** (`/owner/home`) — lista de negócios com status, pedidos ativos, mesas e faturamento em realtime
- **BusinessDashboard** (`/owner/business/:id`) — grid de acesso rápido (Dashboard, Cardápio, Mesas, Configurações)
- **BusinessForm** (`/owner/business/new` e `/owner/business/:id/edit`) — cadastro/edição com ViaCEP + timezone automático por estado
- **BusinessSettings** (`/owner/business/:id/settings`) — taxa de serviço, desconto máximo, código staff (regenerável), toggle is_open
- **MenuCategories** (`/owner/business/:id/menu`) — CRUD de categorias + reordenação
- **MenuItems** (`/owner/business/:id/menu/items`) — CRUD de itens + upload com compressão + tags
- **Tables** (`/owner/business/:id/tables`) — grid de mesas, criação, QR Code, reimpressão de PDF
- **Dashboard** (`/owner/business/:id/dashboard`) — métricas operacionais em realtime

### Staff
- **StaffLogin** (`/staff/login`) — código de 6 dígitos, sessão no localStorage, redirect de volta à rota original via `?from=`
- **PDV** (`/staff/pdv`) — mapa de mesas com status por cor, chamados de garçom em realtime, montagem de pedido, criação de mesa
- **Checkout** (`/staff/checkout/:tableId`) — fechamento de conta, múltiplas formas de pagamento, divisão por pessoa, desconto, taxa de serviço

### Cozinha
- **KitchenDisplay** (`/kds/:businessId`) — 3 colunas (NOVO / EM PREPARO / PRONTO), realtime, tema claro/escuro, som via Web Audio API, reusa login do staff

### Cliente via QR
- **MenuReadOnly** (`/order/:businessSlug/table/:tableNumber`) — cardápio visual + chamar garçom (v1, sem pedido)
- **Identify** (`/order/:businessSlug/identify`) — identificação por telefone, fluxo "não sou eu"
- **MenuOrder** (`/order/:businessSlug/counter`) — cardápio de balcão com carrinho
- **Cart** (`/order/:businessSlug/cart`) — resumo do pedido, observações por item, modal de quantidade
- **OrderStatus** (`/order/:businessSlug/status`) — status dos pedidos em realtime, cancelar pedido pending

### Público
- **CounterDisplay** (`/display/:businessSlug`) — TV do balcão, duas colunas (Em Preparo / Pronto para Retirar), realtime, tema claro/escuro

---

## Infraestrutura

### Banco de dados — 11 migrations aplicadas
001 users, 002 businesses, 003 business_staff, 004 tables,
005 waiter_calls, 006 menu_categories, 007 menu_items,
008 customers, 009 orders, 010 order_items, 011 payments.
RLS habilitado em todas as tabelas.

### Função SQL crítica — generate_order_number
Gera order_number no formato DDMM-0001.
**Correção aplicada:** usa `now() AT TIME ZONE tz` (timezone do negócio)
em vez de UTC puro — sem isso o número do dia virava errado à noite no Brasil.
SQL da versão corrigida já foi aplicado no Supabase.

```sql
create or replace function generate_order_number(p_business_id uuid)
returns text as $$
declare
  tz   text;
  today text;
  next_seq integer;
begin
  select coalesce(timezone, 'America/Sao_Paulo')
    into tz from businesses where id = p_business_id;
  today := to_char(now() at time zone tz, 'DDMM');
  select coalesce(max(cast(split_part(order_number, '-', 2) as integer)), 0) + 1
    into next_seq from orders
   where business_id = p_business_id and order_number like today || '-%';
  return today || '-' || lpad(next_seq::text, 4, '0');
end;
$$ language plpgsql;
```

### Arquivos de som
`public/sounds/new-order.wav` — duplo beep 880 Hz (urgente, KDS)
`public/sounds/waiter-call.wav` — chime suave C5→E5 (PDV, chamado de garçom)
Gerados via `scripts/generate-sounds.cjs` (WAV sintético puro, sem dependências).
**Importante:** extensão é `.wav`, não `.mp3`. MIME type deve bater com conteúdo
para o Web Audio API (`decodeAudioData`) funcionar corretamente.

---

## Decisões Técnicas Relevantes

### Áudio — Web Audio API
`<audio>.play()` de callbacks assíncronos é bloqueado pelo Safari iOS mesmo
após interação do usuário. Solução: Web Audio API (`AudioContext`).
Hook em `src/hooks/useAudio.js` — pré-carrega buffers no `enable()` e reproduz
via `createBufferSource` no `play()`. Funciona de qualquer contexto assíncrono.

KDS: `muted` state + `mutedRef` (ref necessária por closure no useEffect de realtime).
PDV: sem toggle de mute — botão ativo vira indicador visual não clicável.

### KDS — auth reaproveitado do staff
`StaffRoute` encoda a rota atual em `?from=ENCODED_PATH`.
`StaffLogin` lê o param e redireciona de volta após login.
KDS em `/kds/:businessId` verifica se `session.businessId === businessId`
e exibe tela de "estabelecimento incorreto" se divergir (sem forçar redirect automático).

### CounterDisplay — ordens pending
Pedidos `source='counter'` com `status='pending'` aparecem na coluna
"Em Preparo" do CounterDisplay (não ficam ocultos até virar 'preparing').
Isso evita que o cliente fique sem feedback visual após confirmar o pedido.

```js
const preparingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing')
const readyOrders = orders.filter(o => o.status === 'ready')
```

### Reset de senha — rota dedicada
`/reset-password` não está dentro de `PublicRoute` pois o Supabase cria
uma sessão de recovery temporária que precisa existir para `updateUser` funcionar.
Componente: `src/pages/auth/ResetPassword.jsx`.

### Tema claro/escuro
Aplicado via classe `dark` na `<html>`. `utils/theme.js` controla toggle e persistência.
KDS e CounterDisplay: usam `isDark` state local (não herdam da classe html)
porque usam inline styles extensivamente. Toggle funciona em ambas as telas.

---

## Bugs de Infraestrutura Corrigidos (09/05/2026)

Cinco bugs críticos encontrados durante os testes da v1, todos corrigidos via SQL Editor do Supabase.

| # | Bug | Causa | Correção |
|---|-----|-------|----------|
| 1 | Trigger `on_auth_user_created` não populava `public.users` | Função sem `COALESCE` quebrava quando `name` vinha nulo do OAuth | Função recriada com `COALESCE(name, email, 'Usuário')` + trigger dropado e recriado |
| 2 | Erro 409 ao criar estabelecimento | Policy `businesses` criada sem `WITH CHECK`, bloqueando INSERT | Policy recriada com `WITH CHECK (owner_id = auth.uid())` |
| 3 | Upload de imagem falhava — bucket inexistente | Bucket `menuflow-assets` nunca foi criado no Storage | Criado via `INSERT INTO storage.buckets` com limite 2MB e MIME types restritos |
| 4 | Upload falhava com erro 400 mesmo com bucket criado | Policies de Storage ausentes | 4 policies criadas: SELECT público, INSERT/UPDATE/DELETE para autenticados |
| 5 | Erro 401 na identificação via QR de balcão | RLS de `customers` bloqueava usuários anônimos | 2 policies adicionadas: SELECT e INSERT liberados para `anon` |

### SQL aplicado — BUG 1 (Trigger)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email, 'Usuário'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### SQL aplicado — BUG 2 (Policy businesses)
```sql
DROP POLICY IF EXISTS "Owner gerencia seus negócios" ON public.businesses;
CREATE POLICY "Owner gerencia seus negócios"
  ON public.businesses FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

### SQL aplicado — BUG 3 (Bucket Storage)
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menuflow-assets', 'menuflow-assets', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
```

### SQL aplicado — BUG 4 (Policies Storage)
```sql
CREATE POLICY "Public read menuflow-assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'menuflow-assets');
CREATE POLICY "Auth upload menuflow-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menuflow-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update menuflow-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menuflow-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete menuflow-assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menuflow-assets' AND auth.role() = 'authenticated');
```

### SQL aplicado — BUG 5 (RLS customers anon)
```sql
DROP POLICY IF EXISTS "Owner e staff gerenciam clientes" ON public.customers;
DROP POLICY IF EXISTS "Anon e staff leem clientes" ON public.customers;
DROP POLICY IF EXISTS "Anon pode criar cliente" ON public.customers;

CREATE POLICY "Anon e staff leem clientes"
  ON public.customers FOR SELECT USING (true);
CREATE POLICY "Anon pode criar cliente"
  ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner e staff gerenciam clientes"
  ON public.customers FOR ALL
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id FROM public.business_staff WHERE user_id = auth.uid()
  ))
  WITH CHECK (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id FROM public.business_staff WHERE user_id = auth.uid()
  ));
```

---

## Bugs Conhecidos / Pendências

| Item | Status | Notas |
|------|--------|-------|
| Bug visual CounterDisplay — layout desalinha quando só uma coluna tem itens | Adiado | Usuário optou por não corrigir agora |
| Testes E2E (Playwright) | Não iniciados | Decisão: validar com cliente real antes |
| Deploy Vercel | Não realizado | Git não disponível na máquina de desenvolvimento |
| Sem git configurado na máquina | Temporário | Problema de instalação no Windows |

---

## Estrutura de Arquivos Relevante

```
src/
  hooks/
    useAudio.js          ← Web Audio API hook (enable + play)
  pages/
    auth/
      ResetPassword.jsx  ← criado nesta sessão (não estava no escopo original)
    staff/
      PDV.jsx            ← waiter calls nos cards, auto-answer ao clicar na mesa
    kds/
      KitchenDisplay.jsx ← tema claro/escuro, auth reaproveitado, Web Audio API
    public/
      CounterDisplay.jsx ← pending tratado como preparing, tema claro/escuro
  routes/
    StaffRoute.jsx       ← redirect com ?from= encoding
    index.jsx            ← inclui rota /reset-password fora do PublicRoute
  utils/
    theme.js             ← getInitialTheme, applyTheme, toggleTheme
public/
  sounds/
    new-order.wav        ← gerado por scripts/generate-sounds.cjs
    waiter-call.wav      ← gerado por scripts/generate-sounds.cjs
scripts/
  generate-sounds.cjs   ← gera os WAV sintéticos (node scripts/generate-sounds.cjs)
```

---

## Seed de Teste

```
Slug:   vitor-teste
Código staff: 123456
KDS:    /kds/{businessId}  ← pegar o ID no Supabase
TV:     /display/vitor-teste
Balcão: /order/vitor-teste/counter
```

---

## Próximos Passos (v1 → produção)

1. Instalar git e fazer o primeiro commit com todo o código
2. Conectar repositório ao Vercel
3. Configurar variáveis de ambiente no Vercel (já documentadas no CLAUDE.md)
4. Fazer deploy e testar em produção com o cliente real
5. Corrigir bug visual do CounterDisplay
6. Avaliar necessidade de testes E2E após validação com cliente

---

## v2 — Principais itens planejados (referência)

- Pedido completo pelo QR de mesa (MenuOrder substitui MenuReadOnly)
- Slugs públicos substituídos por tokens UUID nos QR Codes
- Convite de staff por email com perfis granulares
- Modo offline para PDV
- Estoque, CRM, relatórios financeiros
- Web Push para cliente acompanhar status

Roadmap completo detalhado em CLAUDE.md.
```
