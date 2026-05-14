# SETUP.md — Guia de Setup Supabase + React + Vite
# Reutilizável para novos projetos
# Baseado nas lições aprendidas no projeto MenuFlow (maio 2026)

Este documento registra armadilhas reais encontradas em produção.
Siga a ordem exata — cada passo depende do anterior.

---

## Stack

React 18 + Vite + Tailwind CSS + Supabase + React Router v6 + Zustand

---

## ⚠️ ATENÇÃO — Windows com política WDAC

Se o ambiente de desenvolvimento for Windows com Application Control (WDAC) ativo:

**Fixar o Vite na versão 4.5.x — não atualizar.**

```json
"vite": "4.5.14"
```

Versões superiores usam binário nativo do rollup que é bloqueado pela
política WDAC em `C:\Users\`. O projeto não sobe com versões mais novas.

Verificar se WDAC está ativo:
```powershell
Get-CIPolicy -FilePath "$env:SystemRoot\System32\CodeIntegrity\SIPolicy.p7b"
```

---

## Passo 1 — Criar projeto no Supabase

1. Acessar https://supabase.com → New Project
2. Região: **South America (São Paulo)** para projetos brasileiros
3. Guardar a senha do banco em local seguro — não compartilhar
4. Após criar, ir em Settings → API e copiar:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

---

## Passo 2 — Variáveis de ambiente

```env
# .env.local
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_APP_URL=http://localhost:5173
```

Adicionar `.env.local` ao `.gitignore` imediatamente.
Nunca usar `SUPABASE_SERVICE_ROLE_KEY` no frontend.

---

## Passo 3 — Rodar migrations

Rodar no SQL Editor do Supabase em ordem.
Cada migration deve ser validada antes de rodar a próxima.

Após rodar todas as migrations, validar:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## Passo 4 — ⚠️ Trigger de usuário (CRÍTICO)

**Este é o passo mais importante e mais fácil de esquecer.**

O Supabase Auth cria usuários em `auth.users` mas NÃO em `public.users`.
Sem o trigger, qualquer foreign key para `public.users` vai quebrar.

Rodar obrigatoriamente após criar a tabela `users`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.email,
      'Usuário'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Usar COALESCE com fallback para email e 'Usuário'** — sem isso,
OAuth (Google, GitHub) pode enviar `name` como null e quebrar o INSERT.

**Usar `ON CONFLICT (id) DO NOTHING`** — sem isso, recriar o trigger
com usuários existentes pode gerar erros.

### Testar o trigger
Após criar, cadastrar um usuário de teste e verificar:
```sql
SELECT * FROM public.users ORDER BY created_at DESC LIMIT 5;
```
Se o usuário aparecer aqui, o trigger está funcionando.

---

## Passo 5 — ⚠️ RLS Policies (CRÍTICO)

**Nunca criar policy de ALL sem WITH CHECK.**

Padrão correto para tabelas de owner:
```sql
-- ERRADO — sem WITH CHECK o INSERT é bloqueado com erro 409
CREATE POLICY "Owner gerencia"
  ON public.tabela FOR ALL
  USING (owner_id = auth.uid());

-- CORRETO
CREATE POLICY "Owner gerencia"
  ON public.tabela FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

### Políticas para tabelas acessadas por usuários anônimos (clientes via QR)

Quando usuários sem conta precisam acessar uma tabela:
```sql
-- Permite SELECT para anônimos
CREATE POLICY "Leitura pública"
  ON public.tabela FOR SELECT
  USING (true);

-- Permite INSERT para anônimos
CREATE POLICY "Insert público"
  ON public.tabela FOR INSERT
  WITH CHECK (true);
```

Tabelas que precisam de acesso anônimo no MenuFlow:
- `customers` — cliente se identifica pelo telefone
- `menu_items` — cardápio visível sem login
- `menu_categories` — categorias visíveis sem login
- `businesses` — dados básicos do negócio visíveis sem login
- `orders` — cliente acompanha status do próprio pedido
- `order_items` — cliente cria itens no pedido

---

## Passo 6 — ⚠️ Storage Bucket (CRÍTICO)

O bucket de storage **não é criado automaticamente**. Precisa ser criado
manualmente via SQL Editor antes do primeiro upload.

```sql
-- Criar bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nome-do-bucket',
  'nome-do-bucket',
  true,
  2097152,  -- 2MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket
CREATE POLICY "Leitura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nome-do-bucket');

CREATE POLICY "Upload autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nome-do-bucket' AND auth.role() = 'authenticated');

CREATE POLICY "Update autenticado"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'nome-do-bucket' AND auth.role() = 'authenticated');

CREATE POLICY "Delete autenticado"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'nome-do-bucket' AND auth.role() = 'authenticated');
```

**Sem as policies de Storage, uploads falham com erro 400
mesmo com o bucket criado e público.**

---

## Passo 7 — Realtime

Habilitar Realtime nas tabelas que precisam de atualização em tempo real:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;
```

Verificar se já está ativo antes de rodar (evita erro 42710):
```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

---

## Passo 8 — Áudio no browser

`<audio>.play()` é bloqueado pelo Safari iOS em callbacks assíncronos
mesmo após interação do usuário.

**Sempre usar Web Audio API:**

```javascript
// src/hooks/useAudio.js
export function useAudio(src) {
  const contextRef = useRef(null)
  const bufferRef = useRef(null)

  const enable = async () => {
    contextRef.current = new AudioContext()
    const res = await fetch(src)
    const data = await res.arrayBuffer()
    bufferRef.current = await contextRef.current.decodeAudioData(data)
  }

  const play = () => {
    if (!contextRef.current || !bufferRef.current) return
    const source = contextRef.current.createBufferSource()
    source.buffer = bufferRef.current
    source.connect(contextRef.current.destination)
    source.start(0)
  }

  return { enable, play }
}
```

**Importante:** arquivos de som em `.wav` — o MIME type deve bater
com o conteúdo real do arquivo para `decodeAudioData` funcionar.
Não renomear `.wav` para `.mp3` ou vice-versa.

---

## Passo 9 — Reset de senha

A rota `/reset-password` não deve ficar dentro de `PublicRoute`
(que redireciona usuários autenticados para home).

O Supabase cria uma sessão de recovery temporária ao clicar no link
de reset — essa sessão precisa existir para `updateUser` funcionar.
Colocar a rota fora do guard de autenticação.

```jsx
// routes/index.jsx
<Route path="/reset-password" element={<ResetPassword />} />
// NÃO dentro de <PublicRoute>
```

---

## Passo 10 — Fuso horário em funções SQL

Sempre usar o timezone do negócio em funções que dependem de data/hora.
UTC puro gera datas erradas para usuários no Brasil após meia-noite UTC
(que é 21h no horário de Brasília).

```sql
-- ERRADO
today := to_char(now(), 'DDMM');

-- CORRETO
SELECT coalesce(timezone, 'America/Sao_Paulo')
  INTO tz FROM businesses WHERE id = p_business_id;
today := to_char(now() AT TIME ZONE tz, 'DDMM');
```

---

## Checklist pré-deploy

Antes de fazer o primeiro deploy em produção, validar cada item:

### Banco de dados
- [ ] Todas as migrations rodaram sem erro
- [ ] Trigger `on_auth_user_created` criado e testado
- [ ] RLS habilitado em todas as tabelas
- [ ] Todas as policies têm `WITH CHECK` quando necessário
- [ ] Policies para usuários anônimos criadas nas tabelas públicas
- [ ] Função `generate_order_number` usa timezone do negócio
- [ ] Realtime habilitado nas tabelas necessárias

### Storage
- [ ] Bucket criado via SQL
- [ ] 4 policies do Storage criadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Limite de tamanho configurado (2MB recomendado)
- [ ] MIME types restritos a imagens (jpeg, png, webp)

### Auth
- [ ] Google OAuth configurado (se necessário)
- [ ] URL de redirect configurada no Supabase Auth
- [ ] Email de confirmação testado
- [ ] Reset de senha testado end-to-end

### Testes funcionais
- [ ] Criar novo usuário → confirmar que aparece em `public.users`
- [ ] Criar negócio com novo usuário → sem erro de foreign key
- [ ] Upload de foto → sem erro 400
- [ ] Fluxo completo do cliente via QR → identificação → pedido → status
- [ ] KDS recebe pedido em tempo real
- [ ] Tela pública do balcão atualiza em tempo real
- [ ] Dark/light mode funciona em todas as telas

### Variáveis de ambiente
- [ ] `.env.local` não commitado no git
- [ ] Variáveis configuradas na plataforma de deploy (Vercel)
- [ ] `VITE_APP_URL` apontando para a URL de produção

---

## Erros comuns e soluções rápidas

| Erro | Causa | Solução |
|---|---|---|
| Foreign key violation ao criar registro | Trigger não criou usuário em `public.users` | Rodar SQL do Passo 4 |
| 409 Conflict ao fazer INSERT | Policy sem `WITH CHECK` | Recriar policy com `WITH CHECK` |
| 400 Bad Request no upload | Bucket não existe ou sem policies | Rodar SQL do Passo 6 |
| 401 Unauthorized para anônimos | RLS bloqueando acesso anônimo | Criar policy com `TO anon` |
| 42710 ao adicionar tabela ao Realtime | Tabela já está na publication | Ignorar o erro, já está ativo |
| `decodeAudioData` falha | MIME type não bate com conteúdo do arquivo | Manter extensão original do arquivo |
| Projeto não sobe no Windows | WDAC bloqueando rollup nativo | Fixar Vite em 4.5.x |
| Data/hora errada à noite | Função SQL usando UTC em vez de timezone local | Usar `now() AT TIME ZONE tz` |
| Safari iOS não toca áudio | `<audio>.play()` bloqueado em async | Usar Web Audio API |
| Rota de reset não funciona | Dentro de guard de autenticação | Mover para fora do PublicRoute |

---

*SETUP.md — MenuFlow — gerado em 09/05/2026*
*Reutilizar e adaptar para novos projetos com Supabase*

---

## Lições de UX — Tempos e Timestamps

### Exibição de tempo em pedidos
Nunca exibir "há quanto tempo foi criado" — sempre o tempo de duração do pedido.

```javascript
// Pedido em aberto — tempo crescente em tempo real
const getElapsedTime = (createdAt) => {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}min`
  return `${minutes}min`
}

// Pedido finalizado — tempo total fixo
const getTotalTime = (createdAt, closedAt) => {
  const diff = new Date(closedAt).getTime() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}min`
  return `${minutes}min`
}
```

Para tempos crescentes em tempo real usar `setInterval` de 60 segundos
ou Supabase Realtime no campo `updated_at` do pedido.

