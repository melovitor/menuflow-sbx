# CLAUDE.md — MenuFlow
# Documento técnico completo e definitivo
# Gerado em 07/05/2026
#
# Leia este arquivo inteiro antes de escrever qualquer linha de código.
# Cada decisão aqui foi deliberadamente discutida e aprovada.
# Quando uma versão for iniciada, implementar APENAS o que está
# especificado para aquela versão — nada a mais, nada a menos.

---

## Visão Geral do Produto

SaaS de gestão para bares e restaurantes.
O dono cadastra seus estabelecimentos, configura o cardápio,
imprime QR Codes e opera. A cozinha vê tudo em tempo real.
O staff fecha a conta sem papel.

---

## Versões do Produto

```
v1 → MVP: validar o produto com cliente real
v2 → Consolidação: operação completa + pedido por mesa + estoque + notificações
v3 → Expansão: integrações externas + fiscal + franquias + gorjeta
```

---

## Stack Técnica (todas as versões)

| Camada         | Tecnologia                |
|----------------|---------------------------|
| Frontend       | React 18 + Vite           |
| Estilo         | Tailwind CSS 3.x          |
| Estado global  | Zustand                   |
| Roteamento     | React Router v6           |
| Backend + Auth | Supabase                  |
| Realtime       | Supabase Realtime         |
| Storage        | Supabase Storage          |
| QR Code        | qrcode.react              |
| CEP            | ViaCEP API (REST público) |
| Deploy         | Vercel                    |

---

## Princípios de Desenvolvimento

1. Mobile-first sempre. Todo componente desenhado para 375px e expandido.
2. Sem over-engineering. Cada versão resolve o mínimo necessário.
3. Realtime é core. KDS e status usam Supabase Realtime — nunca polling.
4. RLS é a segurança principal. Não confiar só no frontend.
5. Um arquivo por componente.
6. Nomenclatura em inglês no código, banco e variáveis.
7. Textos de UI em português.
8. Nunca deletar itens do cardápio — apenas desativar.
9. Nunca deletar pedidos do banco — apenas cancelar com valor zerado.
10. Snapshots de preço e nome sempre em order_items — nunca referenciar
    preço atual do item para cálculos históricos.
11. Dark mode é o tema padrão. Toda UI deve ser construída dark-first.

---

## Tema — Dark / Light Mode

O app suporta dark mode e light mode em todas as telas e perfis
(owner, staff, cliente via QR e tela pública do balcão).

### Comportamento
- Padrão na primeira abertura: sempre Dark
- Preferência salva no localStorage: key 'theme' — 'dark' | 'light'
- Aplicado via classe 'dark' na tag <html> (padrão Tailwind darkMode: 'class')
- Persiste entre sessões e recarregamentos

### Toggle
- Botão redondo fixo no header de todas as telas
- Ícone: 🌙 no modo dark | ☀️ no modo light
- Troca instantânea ao clicar — sem reload
- Mesmo botão para todos os perfis (owner, staff, cliente)

### Implementação

```javascript
// utils/theme.js
export const getInitialTheme = () => {
  return localStorage.getItem('theme') || 'dark'
  // padrão: dark se não houver preferência salva
}

export const applyTheme = (theme) => {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  localStorage.setItem('theme', theme)
}

export const toggleTheme = () => {
  const current = localStorage.getItem('theme') || 'dark'
  const next = current === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
```

```javascript
// main.jsx — aplicar tema antes de renderizar
import { getInitialTheme, applyTheme } from './utils/theme'
applyTheme(getInitialTheme())
```

```javascript
// tailwind.config.js
export default {
  darkMode: 'class',
  // ...
}
```

### Regras de estilo
- Todo componente usa classes Tailwind com variante dark:
  ex: 'bg-white dark:bg-zinc-900'
      'text-zinc-900 dark:text-zinc-100'
      'border-zinc-200 dark:border-zinc-700'
- Nunca hardcodar cores sem a variante dark correspondente
- KDS já é dark-first por design — verificar contraste no light mode
- CounterDisplay (TV do balcão) usa dark fixo — sem toggle nessa tela

---

## Perfis de Usuário

```
OWNER    → acessa todos os seus negócios, configura tudo
STAFF    → acessa PDV e KDS do estabelecimento vinculado
CUSTOMER → acessa cardápio via QR, sem conta, sem app
```

### Autenticação por perfil

OWNER
  Supabase Auth — email + senha + Google OAuth

STAFF [v1]
  Código de acesso de 6 dígitos por estabelecimento
  Gerado automaticamente na criação do negócio
  Pode ser regenerado nas configurações pelo owner
  Sessão salva no localStorage:
  { businessId, businessName, role: 'staff', loginAt: ISO string }

STAFF [v2]
  Substituir por convite por email com perfis granulares:
  'staff' | 'manager' | 'cashier' | 'kitchen'

CUSTOMER
  Sem conta, sem auth
  Identificado por telefone como chave primária por negócio
  Sessão de visita salva no localStorage com duração de 8 horas:
  { customerId, customerName, customerPhone, businessSlug, sessionStart }
  Telefone salvo separadamente sem expiração para pré-preenchimento:
  localStorage key: phone_{businessSlug}

---

## Sistema de Design — UI/UX

### Identidade Visual
Neutro premium. Cinza escuro, branco, acentos roxo discretos.
Bordas nítidas e definidas. Espaço em branco generoso.
Sem gradientes, sem sombras decorativas, sem efeitos visuais.
Dark mode como padrão — toda UI construída dark-first.

### Paleta de Cores

#### Light Mode
```
--bg-primary:    #FFFFFF   ← superfície principal (cards, inputs)
--bg-secondary:  #F8F8F8   ← fundo de tela
--bg-tertiary:   #F1F1F1   ← fundo de elementos internos
--border:        #E2E2E2   ← borda padrão
--border-strong: #C8C8C8   ← borda em hover ou inputs preenchidos
--text:          #111111   ← texto principal
--text-2:        #555555   ← texto secundário
--text-3:        #999999   ← texto de apoio, labels, hints

--accent:        #7C3AED   ← roxo — botões, links, destaques ativos
--accent-light:  #EDE9FE   ← fundo de elementos com acento
--accent-text:   #5B21B6   ← texto sobre fundo accent-light

--green-bg:      #ECFDF5   ← fundo status aberto/pronto/ativo
--green-text:    #065F46   ← texto sobre green-bg
--green-border:  #A7F3D0   ← borda sobre green-bg

--amber-bg:      #FFFBEB   ← fundo status em preparo/atenção
--amber-text:    #92400E   ← texto sobre amber-bg
--amber-border:  #FDE68A   ← borda sobre amber-bg

--red-bg:        #FEF2F2   ← fundo status novo/alerta
--red-text:      #991B1B   ← texto sobre red-bg
--red-border:    #FECACA   ← borda sobre red-bg
```

#### Dark Mode
```
--bg-primary:    #18181B   ← superfície principal
--bg-secondary:  #111113   ← fundo de tela
--bg-tertiary:   #0A0A0C   ← topbar, elementos mais escuros
--border:        #2A2A2E   ← borda padrão
--border-strong: #3F3F46   ← borda em destaque
--text:          #FAFAFA   ← texto principal
--text-2:        #A1A1AA   ← texto secundário
--text-3:        #555558   ← texto de apoio

--accent:        #7C3AED   ← mesmo roxo em ambos os modos
--accent-light:  #1A1030   ← fundo escuro de elementos com acento
--accent-text:   #A78BFA   ← texto sobre accent-light no dark

Status colors no dark — preservar semântica:
  Novo/alerta:   bg #1A0808  border #3D1212  text #FCA5A5
  Em preparo:    bg #1A1200  border #3D2E00  text #FDE68A
  Pronto:        bg #021510  border #0D3320  text #A7F3D0
```

### KDS — Dark Fixo
O KDS usa dark independente do toggle do usuário.
CounterDisplay (TV do balcão) também usa dark fixo.
Ambas as telas são projetadas para ambiente escuro de operação.

### Tipografia
```
Font:       var(--font-sans) — Anthropic Sans / sistema
Tamanhos:
  10px — labels uppercase, hints, timestamps
  11px — labels, badges, metadata
  12px — texto de apoio, descrições
  13px — corpo de formulário, listas
  14px — botões, itens de menu
  15px — títulos de seção, nomes em cards
  16px — KDS mínimo (legibilidade em tablet)
  18px — subtítulos de página
  20px — títulos de página
  22px — tela do balcão (TV)
  24px — métricas do dashboard

Pesos:   400 (regular) e 500 (medium) — nunca 600 ou 700
Letter-spacing: -0.2px a -0.5px em títulos (refinamento)
```

### Bordas e Cantos
```
Borda padrão:   1px solid var(--border)       ← todo card e input
Borda hover:    1px solid var(--border-strong)
Borda acento:   1px solid var(--accent) ou    ← elemento ativo/selecionado
                2px solid var(--accent)        ← card featured

border-radius:
  6px  — badges, pills, chips
  8px  — inputs, botões pequenos
  10px — botões padrão, inputs grandes, tags
  12px — cards internos, seções
  14px — cards principais
  16px — container de tela (screen)
  24px — frames de phone/device
  50%  — avatares, botões redondos (toggle de tema)
```

### Botões
```
Primário (ação principal):
  background: var(--accent)
  color: white
  border: none
  border-radius: 10–12px
  padding: 12–14px
  font-size: 14px, font-weight: 500
  width: 100% em mobile

Secundário:
  background: var(--bg-primary)
  color: var(--text-2)
  border: 1px solid var(--border-strong)
  border-radius: 10px

Ghost / Outline:
  background: transparent
  color: var(--accent)
  border: 1px solid var(--border)

Destrutivo:
  background: #EF4444
  color: white

Redondo (toggle tema, voltar):
  width/height: 30–34px
  border-radius: 50%
  border: 1px solid var(--border-strong)
  background: var(--bg-primary)
  color: var(--text-2)
```

### Inputs e Formulários
```
height: 40px (padrão)
padding: 10px 12px
border: 1px solid var(--border-strong)
border-radius: 10px
font-size: 13–14px
color: var(--text)
background: var(--bg-primary)
outline: none

:focus   → border-color: var(--accent)
:filled  → border-color: var(--border-strong)
:error   → border-color: #EF4444

Label:
  font-size: 11px
  font-weight: 500
  color: var(--text-2)
  margin-bottom: 5px
  uppercase + letter-spacing: .06em para labels de seção

Hint / contador de chars:
  font-size: 10px
  color: var(--text-3)
  margin-top: 4px
```

### Cards
```
background: var(--bg-primary)
border: 1px solid var(--border)
border-radius: 12–14px
padding: 14–16px

Card com acento ativo:
  border: 1px solid var(--accent)
  background: var(--accent-light)

Card de status verde (pronto):
  border: 1px solid var(--green-border)
  background: var(--green-bg)

Card de status amber (em preparo):
  border: 1px solid var(--amber-border)
  background: var(--amber-bg)

Card de status vermelho (novo/alerta):
  border: 1px solid var(--red-border)
  background: var(--red-bg)

Card dashed (novo item / nova mesa):
  border: 1px dashed var(--border-strong)
  background: var(--bg-primary)
  color: var(--text-2)
```

### Status Pills / Badges
```
font-size: 10–11px
font-weight: 500
padding: 3px 8–9px
border-radius: 20px
border: 1px solid (mesma família de cor do background)

Aberto:       bg green-bg,  text green-text,  border green-border
Fechado:      bg bg-tertiary, text text-3
Pedidos:      bg accent-light, text accent-text
Novo:         bg red-bg,    text red-text,    border red-border
Em preparo:   bg amber-bg,  text amber-text,  border amber-border
Pronto:       bg green-bg,  text green-text,  border green-border
Mesa origem:  bg #1E2D4A,  text #93C5FD      (dark — KDS)
Balcão orig.: bg #2D1A08,  text #FDBA74      (dark — KDS)
PDV origem:   bg #2E1065,  text #C4B5FD      (dark — KDS)
```

### Topbar / Header
```
background: var(--bg-primary)
border-bottom: 1px solid var(--border)
height: 52–54px
padding: 0 18–20px
display: flex, align-items: center

Elementos:
  Esquerda: botão voltar (redondo) + título (15px/500)
  Centro:   logo "MenuFlow" com "Flow" em var(--accent)
  Direita:  toggle tema (redondo) + avatar (owner) ou badge de alerta (staff)

Toggle de tema:
  Posição: sempre no canto superior direito do header
  Ícone dark mode:  ti-moon
  Ícone light mode: ti-sun
  Style: botão redondo 32–34px, border 1px solid var(--border-strong)
  Transição: instantânea ao clicar
```

### Toggle (switch on/off)
```
width: 38px, height: 22px
border-radius: 20px
ON:  background var(--accent)  — knob à direita
OFF: background var(--border-strong) — knob à esquerda
Knob: 18px, border-radius 50%, background white
```

### Animações — Apenas as necessárias
```
KDS — novo pedido pulsando:
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
  Aplicado no badge de contagem da coluna "Novo"

CounterDisplay — pedido pronto pulsando:
  @keyframes glow { 50%{box-shadow: 0 0 0 4px rgba(16,185,129,.15)} }
  Aplicado nos cards da coluna "Pronto para retirar"

Dot piscando no header da coluna pronta:
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.5} }

Demais elementos: sem animação — transições máx. border-color .15s
```

### Métricas do Dashboard
```
Cards de métrica:
  background: var(--bg-primary)
  border: 1px solid var(--border)
  border-radius: 12px
  padding: 14px 16px
  border-left: 3px solid [cor temática]  ← acento lateral
  
  Label: 11px, uppercase, letter-spacing .06em, color text-3
  Valor: 24px, font-weight 500, letter-spacing -.5px
  Sub:   11px, color text-3

Acentos laterais por métrica:
  Faturamento → var(--accent) roxo
  Pedidos ativos → #10B981 verde
  Mesas → #F59E0B amber
  Fila balcão → #EF4444 vermelho
```

### Mapa de Mesas (PDV)
```
Mesa livre:       bg #EAF3DE  border #C0DD97  text #3B6D11
Mesa ocupada:     bg #EDE9FE  border #AFA9EC  text #3C3489
Mesa aguardando:  bg #FAEEDA  border #F0997B  text #712B13
Mesa chamando:    border 2px solid var(--accent)

Dark mode equivalentes:
  Livre:      bg #042918  border #0D3320  text #6EE7B7
  Ocupada:    bg #1A1030  border #3D2060  text #A78BFA
  Aguardando: bg #1A0D00  border #3D2200  text #FDBA74
```

### Ícones
Usar exclusivamente Tabler Icons outline:
  ti-arrow-left     ← voltar
  ti-moon / ti-sun  ← toggle tema
  ti-chevron-right  ← navegação em lista
  ti-plus           ← adicionar
  ti-check          ← confirmar/salvar
  ti-bell / ti-bell-ringing ← alertas
  ti-qrcode         ← QR Code
  ti-armchair       ← mesas
  ti-tools-kitchen-2 ← cardápio/cozinha
  ti-layout-dashboard ← dashboard
  ti-settings       ← configurações
  ti-shopping-bag   ← balcão
  ti-clock          ← tempo
  ti-cash / ti-credit-card / ti-qrcode ← pagamentos
  ti-photo          ← upload de imagem
  ti-map-pin        ← localização
  ti-currency-real  ← valores em BRL
  ti-volume         ← som ativo no KDS
  ti-receipt        ← fechamento

Tamanho padrão: 16–18px inline, 20–22px em grid buttons, 14px em badges

### Tailwind Config
```javascript
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#7C3AED',
          light: '#EDE9FE',
          text: '#5B21B6',
          dark: '#A78BFA',
          'dark-bg': '#1A1030',
        }
      },
      borderRadius: {
        'card': '14px',
        'section': '12px',
        'input': '10px',
        'pill': '20px',
      }
    }
  }
}
```

### Total de Telas da v1

| # | Tela | Perfil |
|---|---|---|
| 1 | Login | Owner + Staff |
| 2 | Cadastro | Owner |
| 3 | Recuperação de senha | Owner |
| 4 | Home — lista de negócios | Owner |
| 5 | Business Dashboard — grid acesso rápido | Owner |
| 6 | Cadastro / edição de negócio | Owner |
| 7 | Configurações do negócio | Owner |
| 8 | Cardápio — categorias | Owner |
| 9 | Cardápio — itens (lista) | Owner |
| 10 | Cadastro / edição de item | Owner |
| 11 | Mesas e QR Codes | Owner |
| 12 | Dashboard operacional | Owner |
| 13 | Login staff — código de acesso | Staff |
| 14 | PDV — mapa de mesas + pedido | Staff |
| 15 | Fechamento de conta | Staff |
| 16 | KDS — Kitchen Display | Staff/Cozinha |
| 17 | Cardápio visual da mesa — MenuReadOnly | Cliente |
| 18 | Identificação — telefone → confirma | Cliente |
| 19 | Cardápio de balcão — MenuOrder | Cliente |
| 20 | Carrinho | Cliente |
| 21 | Status dos pedidos | Cliente |
| 22 | Tela pública do balcão — TV | Público |

**Total v1: 22 telas**

- Chrome 90+
- Safari 16.4+
- Samsung Internet 14+

Exibir aviso de browser incompatível antes de carregar o cardápio
caso o browser não atenda os requisitos mínimos.

---

## Roteamento Completo

```
/                                           → redirect /login ou /owner/home
/login                                      → Login.jsx
/register                                   → Register.jsx
/forgot-password                            → ForgotPassword.jsx

/owner/home                                 → Home.jsx (lista + resumo realtime)
/owner/business/new                         → BusinessForm.jsx
/owner/business/:id                         → BusinessDashboard.jsx (grid SVG)
/owner/business/:id/edit                    → BusinessForm.jsx (edição)
/owner/business/:id/settings                → BusinessSettings.jsx
/owner/business/:id/menu                    → MenuCategories.jsx
/owner/business/:id/menu/items              → MenuItems.jsx
/owner/business/:id/tables                  → Tables.jsx
/owner/business/:id/dashboard               → Dashboard.jsx

/staff/login                                → StaffLogin.jsx
/staff/pdv                                  → PDV.jsx
/staff/checkout/:tableId                    → Checkout.jsx

/kds/:businessId                            → KitchenDisplay.jsx (tela cheia)

[v1] /order/:businessSlug/table/:tableNumber → MenuReadOnly.jsx
[v2] /order/:businessSlug/table/:tableNumber → MenuOrder.jsx (substitui v1)
/order/:businessSlug/counter                → MenuOrder.jsx
/order/:businessSlug/cart                   → Cart.jsx
/order/:businessSlug/identify               → Identify.jsx
/order/:businessSlug/status                 → OrderStatus.jsx

/display/:businessSlug                      → CounterDisplay.jsx (TV pública)
```

### Segurança de slugs
v1: URL usa businessSlug legível. Aceitável para MVP com cliente único.
v2: Substituir por token UUID por QR Code.
    URL vira /order/[uuid-token] — não adivinhável.

---

## Estrutura de Pastas

```
menuflow/
├── public/
│   └── sounds/
│       ├── new-order.mp3          ← alerta KDS (urgente)
│       └── waiter-call.mp3        ← alerta chamado garçom (suave)
├── src/
│   ├── assets/
│   │   └── logo.svg
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Toggle.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── ConnectionStatus.jsx
│   │   ├── layout/
│   │   │   ├── OwnerLayout.jsx
│   │   │   ├── StaffLayout.jsx
│   │   │   └── CustomerLayout.jsx
│   │   ├── menu/
│   │   │   ├── CategoryTabs.jsx
│   │   │   ├── MenuItemCard.jsx
│   │   │   └── MenuItemForm.jsx
│   │   ├── orders/
│   │   │   ├── OrderCard.jsx
│   │   │   ├── CartDrawer.jsx
│   │   │   └── OrderStatusBadge.jsx
│   │   └── kds/
│   │       ├── KdsColumn.jsx
│   │       └── KdsOrderCard.jsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ForgotPassword.jsx
│   │   ├── owner/
│   │   │   ├── Home.jsx
│   │   │   ├── BusinessDashboard.jsx
│   │   │   ├── BusinessForm.jsx
│   │   │   ├── BusinessSettings.jsx
│   │   │   ├── MenuCategories.jsx
│   │   │   ├── MenuItems.jsx
│   │   │   ├── Tables.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── staff/
│   │   │   ├── StaffLogin.jsx
│   │   │   ├── PDV.jsx
│   │   │   └── Checkout.jsx
│   │   ├── kds/
│   │   │   └── KitchenDisplay.jsx
│   │   ├── customer/
│   │   │   ├── MenuReadOnly.jsx    ← [v1] cardápio visual + chamar garçom
│   │   │   ├── MenuOrder.jsx       ← [v2] cardápio com pedido (mesa e balcão)
│   │   │   ├── Cart.jsx
│   │   │   ├── Identify.jsx
│   │   │   └── OrderStatus.jsx
│   │   └── public/
│   │       └── CounterDisplay.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useBusiness.js
│   │   ├── useMenu.js
│   │   ├── useOrders.js
│   │   ├── useRealtime.js
│   │   ├── useCart.js
│   │   └── useConnection.js
│   ├── stores/
│   │   ├── authStore.js
│   │   ├── cartStore.js            ← persiste no localStorage
│   │   └── businessStore.js
│   ├── services/
│   │   ├── supabase.js
│   │   ├── authService.js
│   │   ├── businessService.js
│   │   ├── menuService.js
│   │   ├── orderService.js
│   │   └── storageService.js
│   ├── utils/
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   ├── qrcode.js
│   │   ├── cep.js
│   │   ├── timezone.js
│   │   ├── imageCompressor.js
│   │   └── customerSession.js
│   └── routes/
│       ├── index.jsx
│       ├── OwnerRoute.jsx
│       ├── StaffRoute.jsx
│       └── PublicRoute.jsx
├── .env.example
├── .env.local                      ← NÃO commitar
├── CLAUDE.md
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Configuração do Projeto

### Repositório e Deploy
```
GitHub:   github.com/melovitor/menuflow (público)
Vercel:   menuflow.vercel.app
Supabase: nlruyaczomnigsxzkfqm.supabase.co
Região:   South America (São Paulo)
```

### Variáveis de Ambiente — .env.local (desenvolvimento)
```env
VITE_SUPABASE_URL=https://nlruyaczomnigsxzkfqm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnV5YWN6b21uaWdzeHprZnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNzgzMjMsImV4cCI6MjA5Mzg1NDMyM30.Yt3S1Phz2yhCB99xIET70RhUGQuO5xoDh20wQVZM4xk
VITE_APP_URL=http://localhost:5173
```

### Variáveis de Ambiente — Produção (Vercel)
```env
VITE_SUPABASE_URL=https://nlruyaczomnigsxzkfqm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnV5YWN6b21uaWdzeHprZnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNzgzMjMsImV4cCI6MjA5Mzg1NDMyM30.Yt3S1Phz2yhCB99xIET70RhUGQuO5xoDh20wQVZM4xk
VITE_APP_URL=https://menuflow.vercel.app
```

### GitHub Actions Secrets
Configurar em: github.com/melovitor/menuflow/settings/secrets/actions
```
VITE_SUPABASE_URL      → https://nlruyaczomnigsxzkfqm.supabase.co
VITE_SUPABASE_ANON_KEY → eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VERCEL_TOKEN           → (token gerado na Vercel)
```

Nunca usar VITE_SUPABASE_SERVICE_ROLE_KEY no frontend.
Nunca commitar o .env.local — já está no .gitignore.

### Seed de Teste — Primeiro Cliente
```
Nome:      Vitor Teste
Slug:      vitor-teste
CEP:       04327180
Mesas:     3
Categoria: bar
Timezone:  America/Sao_Paulo
Código staff inicial: 123456 (trocar após primeiro acesso)
Taxa de serviço: 10%
Desconto máximo: 15%
```
Endereço completo preenchido automaticamente via ViaCEP no seed.

---

## Banco de Dados — Schema Completo

Rodar migrations na ordem abaixo.

### Migration 001 — Users

```sql
create table public.users (
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Migration 002 — Businesses

```sql
create table public.businesses (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  category text not null,
  -- 'bar' | 'restaurant' | 'snack_bar' | 'cafeteria' | 'other'
  phone text,
  address_zip text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  timezone text not null default 'America/Sao_Paulo',
  -- definido automaticamente pelo address_state no cadastro
  logo_url text,
  -- opcional — fallback: iniciais do nome do negócio
  cover_url text,
  is_open boolean default false,
  -- toggle manual sempre prevalece sobre horário de funcionamento
  opens_at time,
  -- informativo na v1 — automático na v2
  closes_at time,
  -- informativo na v1 — automático na v2
  staff_access_code text unique not null,
  -- 6 dígitos gerado automaticamente na criação
  -- regenerável nas configurações pelo owner
  service_charge_percent numeric(5,2) default 0,
  -- taxa de serviço configurável (ex: 10.00)
  -- não obrigatória — cliente pode recusar no fechamento
  max_discount_percent numeric(5,2) default 0,
  -- desconto máximo que staff pode aplicar no fechamento
  -- configurado pelo owner nas configurações
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_businesses_owner_id on public.businesses(owner_id);
create index idx_businesses_slug on public.businesses(slug);
```

### Migration 003 — Business Staff

```sql
create table public.business_staff (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text default 'staff',
  -- v1: 'staff' apenas
  -- v2: 'staff' | 'manager' | 'cashier' | 'kitchen'
  is_active boolean default true,
  joined_at timestamptz default now(),
  unique(business_id, user_id)
);
```

### Migration 004 — Tables

```sql
create table public.tables (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  number integer not null,
  status text default 'free',
  -- 'free' | 'occupied' | 'waiting_payment'
  qr_code_url text,
  -- gerado automaticamente na criação da mesa
  -- sempre o mesmo — nunca regenerado
  -- owner e staff podem reimprimir o PDF a qualquer momento
  created_at timestamptz default now(),
  unique(business_id, number)
);

create index idx_tables_business_id on public.tables(business_id);
```

### Migration 005 — Waiter Calls

```sql
-- chamados de garçom via botão no cardápio visual da mesa [v1]
create table public.waiter_calls (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  table_id uuid references public.tables(id) on delete cascade not null,
  status text default 'pending',
  -- 'pending'  → aguardando atendimento — alerta ativo no PDV
  -- 'answered' → atendido — alerta some do PDV, botão cliente volta ao normal
  created_at timestamptz default now()
);

create index idx_waiter_calls_business_id on public.waiter_calls(business_id);
```

### Migration 006 — Menu Categories

```sql
create table public.menu_categories (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  order_index integer default 0,
  is_active boolean default true,
  -- desativar: oculta todos os itens da categoria no cardápio
  -- reativar: exibe todos os itens ativos da categoria novamente
  created_at timestamptz default now()
);

create index idx_menu_categories_business_id on public.menu_categories(business_id);
```

### Migration 007 — Menu Items

```sql
create table public.menu_items (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.menu_categories(id) on delete cascade not null,
  name text not null,
  description text,
  photo_url text not null,
  -- OBRIGATÓRIO — upload bloqueado sem foto
  -- compressão automática antes do upload (máx 2MB após compressão)
  -- formatos aceitos: JPG, PNG, WEBP
  -- formatos bloqueados: GIF, SVG
  price numeric(10,2) not null,
  promo_price numeric(10,2),
  prep_time_minutes integer default 15,
  tags text[] default '{}',
  -- ['vegetarian', 'vegan', 'gluten_free', 'spicy']
  is_active boolean default true,
  -- NUNCA deletar — apenas desativar
  -- desativado: some do cardápio via Realtime imediatamente
  -- se estava no carrinho: removido automaticamente com toast de aviso
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_menu_items_category_id on public.menu_items(category_id);
```

### Migration 008 — Customers

```sql
create table public.customers (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  phone text not null,
  marketing_opt_in boolean default false,
  created_at timestamptz default now(),
  unique(business_id, phone)
  -- telefone é documento único por negócio
  -- se telefone já existe: reusar customer_id existente, nunca duplicar
);

create index idx_customers_business_id on public.customers(business_id);
create index idx_customers_phone on public.customers(phone);
```

### Migration 009 — Orders

```sql
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  order_number text not null,
  -- formato: DDMM-0001
  -- ex: 0705-0001, 0705-0002
  -- reinicia todo dia começando em 0001
  -- sequencial por negócio por dia
  table_id uuid references public.tables(id) on delete set null,
  -- null quando source = 'counter'
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.users(id) on delete set null,
  source text not null,
  -- 'table'   → via QR de mesa [v1: sem pedido / v2: pedido real]
  -- 'counter' → via QR de balcão
  -- 'staff'   → via PDV
  status text default 'pending',
  -- 'pending'   → aguardando cozinha
  -- 'preparing' → cozinha iniciou
  -- 'ready'     → pronto
  -- 'closed'    → conta fechada
  -- 'cancelled' → cancelado (valor zerado, mantido no banco)
  customer_name text,
  -- obrigatório quando source = 'counter'
  notes text,
  discount_percent numeric(5,2) default 0,
  -- aplicado pelo staff no fechamento
  -- limitado ao max_discount_percent do negócio
  service_charge_accepted boolean default false,
  -- cliente aceitou ou recusou a taxa de serviço
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_orders_business_id on public.orders(business_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_table_id on public.orders(table_id);
create index idx_orders_created_at on public.orders(created_at);

-- gera order_number sequencial por negócio por dia
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
```

### Migration 010 — Order Items

```sql
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  -- snapshot do nome no momento do pedido
  unit_price numeric(10,2) not null,
  -- snapshot do preço no momento do pedido
  -- NUNCA usar menu_items.price para cálculos históricos
  quantity integer not null default 1,
  notes text,
  -- máximo 140 caracteres
  created_at timestamptz default now()
);

create index idx_order_items_order_id on public.order_items(order_id);
```

### Migration 011 — Payments

```sql
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  method text not null,
  -- 'cash' | 'pix' | 'credit' | 'debit'
  amount numeric(10,2) not null,
  split_count integer default 1,
  paid_at timestamptz default now()
);
-- um pedido pode ter múltiplos registros de payment
-- suporte a múltiplas formas no mesmo fechamento
-- suporte a divisão com formas diferentes por pessoa
```

### Retenção de Dados
Pedidos ficam no banco por 90 dias.
Rotina de limpeza automática: v2.
No v1 os dados acumulam sem rotina de arquivamento.

---

## Row Level Security (RLS)

```sql
-- BUSINESSES
alter table public.businesses enable row level security;

create policy "Leitura pública de dados básicos do negócio"
  on public.businesses for select using (true);
-- ATENÇÃO: staff_access_code e max_discount_percent NUNCA
-- devem ser incluídos em queries do cliente ou do cardápio

create policy "Owner gerencia seus negócios"
  on public.businesses for all
  using (owner_id = auth.uid());

-- MENU_CATEGORIES — leitura pública para cardápio funcionar
alter table public.menu_categories enable row level security;

create policy "Leitura pública de categorias ativas"
  on public.menu_categories for select
  using (is_active = true);

create policy "Owner gerencia categorias"
  on public.menu_categories for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- MENU_ITEMS — leitura pública para cardápio funcionar
alter table public.menu_items enable row level security;

create policy "Leitura pública de itens ativos"
  on public.menu_items for select
  using (is_active = true);

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

-- ORDERS
alter table public.orders enable row level security;

create policy "Owner e staff veem pedidos do negócio"
  on public.orders for select
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );

-- CUSTOMERS — apenas owner e staff
alter table public.customers enable row level security;

create policy "Owner e staff gerenciam clientes"
  on public.customers for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
      union
      select business_id from public.business_staff where user_id = auth.uid()
    )
  );

-- PAYMENTS — apenas owner e staff
alter table public.payments enable row level security;

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
```

### Checklist RLS pré-deploy
- [ ] RLS habilitado em todas as tabelas
- [ ] Owner só lê/escreve dados dos próprios negócios
- [ ] Staff só lê/escreve dados do negócio vinculado
- [ ] menu_items e menu_categories têm leitura pública
- [ ] businesses tem leitura pública apenas de campos não sensíveis
- [ ] staff_access_code nunca exposto em queries do cliente
- [ ] max_discount_percent nunca exposto em queries do cliente
- [ ] customers só acessível por owner e staff do negócio
- [ ] payments só acessível por owner e staff do negócio
- [ ] Nenhuma service_role_key no frontend

---

## Fuso Horário por Estado

```javascript
// utils/timezone.js
const timezoneByState = {
  'AC': 'America/Rio_Branco',
  'AM': 'America/Manaus',
  'MT': 'America/Cuiaba',
  'MS': 'America/Campo_Grande',
  'RO': 'America/Porto_Velho',
  'RR': 'America/Boa_Vista',
  'PA': 'America/Belem',
  'AP': 'America/Belem',
  'TO': 'America/Araguaina',
  'MA': 'America/Fortaleza',
  'PI': 'America/Fortaleza',
  'CE': 'America/Fortaleza',
  'RN': 'America/Fortaleza',
  'PB': 'America/Fortaleza',
  'PE': 'America/Recife',
  'AL': 'America/Maceio',
  'SE': 'America/Maceio',
  'BA': 'America/Bahia',
  'default': 'America/Sao_Paulo'
}

export const getTimezoneByState = (state) =>
  timezoneByState[state] || timezoneByState['default']
```

Supabase armazena tudo em UTC.
Fuso salvo em businesses.timezone definido pelo address_state no cadastro.
Toda exibição de data e hora usa o fuso do negócio.

---

## Sessão do Cliente

```javascript
// utils/customerSession.js
const SESSION_DURATION_HOURS = 8
export const QUANTITY_ALERT_THRESHOLD = 10

export const saveCustomerSession = (businessSlug, customer) => {
  const session = {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    businessSlug,
    sessionStart: new Date().toISOString()
  }
  localStorage.setItem(`session_${businessSlug}`, JSON.stringify(session))
  localStorage.setItem(`phone_${businessSlug}`, customer.phone)
  // telefone salvo sem expiração para pré-preenchimento futuro
}

export const getCustomerSession = (businessSlug) => {
  const raw = localStorage.getItem(`session_${businessSlug}`)
  if (!raw) return null
  const session = JSON.parse(raw)
  const hoursElapsed =
    (new Date() - new Date(session.sessionStart)) / (1000 * 60 * 60)
  if (hoursElapsed > SESSION_DURATION_HOURS) {
    localStorage.removeItem(`session_${businessSlug}`)
    return null
    // telefone permanece salvo mesmo após expiração
  }
  return session
}

export const getSavedPhone = (businessSlug) =>
  localStorage.getItem(`phone_${businessSlug}`)

export const clearCustomerSession = (businessSlug) => {
  localStorage.removeItem(`session_${businessSlug}`)
  // não remove o telefone salvo
}
```

---

## Fluxo de Identificação do Cliente

Usado apenas no fluxo de balcão (counter) na v1.
Na v1, cardápio de mesa é somente visual — sem identificação.
Na v2, mesmo fluxo se aplica ao cardápio de mesa com pedido.

```
Escaneia QR
     │
     ▼
Tem sessão ativa? ──SIM──→ Cardápio direto (zero fricção)
     │
    NÃO
     │
     ▼
Campo: Telefone
(pré-preenchido via getSavedPhone se disponível)
     │
     ▼
Busca: customers where business_id AND phone
     │
  ┌──┴──┐
NÃO    SIM
 │      │
 ▼      ▼
Pede  "Olá, [Nome]! É você?"
nome    │
 │   ┌──┴──────────┐
 │  SIM        "Não sou eu"
 │   │              │
 │   │              ▼
 │   │         Volta ao campo de telefone
 │   │         (campo limpo)
 │   │         "Não sou eu" = digitou número errado
 │   │         Telefone é único — não há dois donos
 └───┘
      │
      ▼
saveCustomerSession()
      │
      ▼
Cardápio liberado — sem pedir dados novamente nessa visita
```

---

## Carrinho — Persistência e Recuperação

```javascript
// stores/cartStore.js
// Persiste automaticamente no localStorage
// key: cart_{businessSlug}
//
// Ao adicionar item com quantity >= QUANTITY_ALERT_THRESHOLD (10):
//   Modal: "Você quer adicionar [N] [nome do item]?"
//   [Confirmar] [Corrigir]
//
// Ao iniciar sessão com carrinho salvo no localStorage:
//   Modal: "Você tinha itens no carrinho. Quer continuar?"
//   [Continuar] [Descartar]
//
// Ao expirar sessão (8h): carrinho descartado junto
//
// Cliente pode editar pedido enquanto status = 'pending':
//   - Alterar quantidade de itens
//   - Adicionar observações (máx 140 chars)
//   - Remover itens completamente
//   - Adicionar novos itens (gera novo pedido no final da fila,
//     NÃO adiciona ao pedido existente)
//
// [v2] Remover ingrediente específico de um item
```

---

## Fluxos Principais por Versão

### [v1] QR de Mesa — Cardápio Visual + Chamar Garçom

```
Cliente escaneia QR da mesa → MenuReadOnly.jsx
Cardápio navegável por categorias + campo de busca
Fotos, preços, tags, tempo de preparo
Sem carrinho, sem pedido, sem identificação

Botão fixo no rodapé: "🤚 Chamar Garçom"
        ↓
INSERT em waiter_calls (status: pending)
Botão → "Garçom chamado ✓" (desabilitado)
        ↓
PDV staff recebe via Realtime → apita (waiter-call.mp3)
Alerta no dispositivo do garçom: "🔔 Mesa [N] está chamando"
        ↓
Staff toca no alerta → status: answered
Alerta some do dispositivo do garçom
Botão do cliente volta ao estado inicial
```

### [v2] QR de Mesa — Pedido Completo

Substituir MenuReadOnly.jsx por MenuOrder.jsx na rota de mesa.
Aplicar mesmo fluxo do QR de balcão descrito abaixo.
Estrutura de banco já suporta — apenas habilitar a UI.

### [v1 + v2] QR de Balcão — Pedido Completo

```
Cliente escaneia QR do balcão
        ↓
Sessão ativa? → SIM → Cardápio direto
              → NÃO → Identify.jsx (fluxo telefone)
        ↓
MenuOrder.jsx
Cardápio com busca por nome + navegação por categorias
        ↓
Cart.jsx
Resumo, observações por item (máx 140 chars)
Modal de alerta se quantity >= 10
        ↓
Confirmar → INSERT orders + order_items
order_number via generate_order_number()
        ↓
OrderStatus.jsx
Lista todos os pedidos ativos da sessão
Atualização em tempo real via Realtime
Cliente pode cancelar pedido enquanto status = 'pending'
```

### PDV — Staff

```
StaffLogin.jsx → código de acesso → sessão localStorage
        ↓
PDV.jsx
Mapa de mesas com status por cor:
  🟢 Livre | 🟡 Ocupada | 🔴 Aguardando pagamento
Qualquer staff pode abrir qualquer mesa
Múltiplos pedidos independentes na mesma mesa são permitidos
(cada um gera um order separado — sem conflito de carrinho)
Staff pode criar nova mesa diretamente no PDV
        ↓
Montar pedido: busca + categorias
Observações por item (máx 140 chars)
Modal de alerta se quantity >= 10
Staff pode editar quantity de item já adicionado (apenas em pending)
        ↓
"Enviar para cozinha" → INSERT orders + order_items
source = 'staff'
        ↓
Chamado de garçom: alerta via waiter_calls Realtime
apita (waiter-call.mp3) no dispositivo do staff
```

### Fechamento de Conta — Checkout.jsx

```
Staff toca na mesa no mapa
        ↓
Lista todos os order_items da mesa com status != 'cancelled'
Itens cancelados: aparecem com valor R$ 0,00 (rastreio)
        ↓
Subtotal calculado com unit_price do order_items (snapshot)
Taxa de serviço: exibida discriminada, cliente pode recusar
Desconto: staff digita % (limitado ao max_discount_percent)
        ↓
Total final
        ↓
Forma de pagamento: cash | pix | credit | debit
Suporte a múltiplas formas no mesmo fechamento
Suporte a divisão por N pessoas com formas diferentes por pessoa
        ↓
INSERT payments (múltiplos registros se necessário)
orders.status → 'closed'
tables.status → 'free'
Mesa volta a 🟢 no mapa
```

---

## Sistema de Estados dos Pedidos

```
pending → preparing → ready → closed
   │
   └→ cancelled
```

### Transições válidas
- pending    → preparing  (cozinha toca o card no KDS)
- preparing  → ready      (cozinha toca o card no KDS)
- ready      → closed     (staff fecha a conta)
- pending    → cancelled  (staff OU cliente de balcão)

### Sem volta de status — sem botão de desfazer

### Cancelamento
Quem pode cancelar:
  Staff: qualquer pedido em pending
  Cliente: apenas pedidos de balcão (source='counter') em pending
            via OrderStatus.jsx

Pedido cancelado:
  status = 'cancelled'
  Aparece no fechamento com valor R$ 0,00 para rastreio
  NUNCA deletado do banco

Rastreio de cancelamentos por owner: v3

### Destino por source quando ready
  'table'   → garçom avisado no KDS, leva à mesa
  'counter' → nome aparece na CounterDisplay.jsx
  'staff'   → garçom avisado no KDS, leva à mesa

---

## KDS — Kitchen Display System

Design tablet-first (7–8 polegadas preso na parede).
Tela cheia sem navbar, sem sidebar, sem distrações.
Dark mode para legibilidade em cozinha.
Fonte mínima 16px. Cards com altura mínima 120px.

### Colunas
```
| NOVO | EM PREPARO | PRONTO |
```

### Ordenação
v1: ordem de chegada (created_at ASC)
v2: priorização inteligente por tempo e tipo de pedido

### Cores por status
```javascript
const statusColors = {
  pending:    'border-red-500 bg-red-950',
  preparing:  'border-yellow-500 bg-yellow-950',
  ready:      'border-green-500 bg-green-950'
}
```

### Cores por source (badge no card)
```javascript
const sourceColors = {
  table:   'bg-blue-600',    // 🪑 Mesa N
  counter: 'bg-orange-500',  // 🏷️ Balcão — Nome
  staff:   'bg-purple-600'   // 👤 PDV
}
```

### Alerta sonoro
new-order.mp3   → novo pedido (urgente)
waiter-call.mp3 → chamado de garçom (suave)

Browser bloqueia autoplay sem interação prévia.
Exibir botão "Ativar alertas sonoros" na primeira abertura.
Após clique: áudio funciona normalmente para toda a sessão.

### Realtime KDS
```javascript
export const useKdsRealtime = (businessId, onNewOrder, onStatusChange) => {
  useEffect(() => {
    if (!businessId) return
    const channel = supabase
      .channel(`kds-${businessId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'orders',
        filter: `business_id=eq.${businessId}`
      }, onNewOrder)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `business_id=eq.${businessId}`
      }, onStatusChange)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [businessId])
}
```

---

## Tela Pública do Balcão — CounterDisplay.jsx

URL: /display/:businessSlug — sem autenticação, completamente pública
Projetada para TV ou monitor em landscape
Mostra APENAS pedidos com source = 'counter'
Pedidos de mesa e staff NÃO aparecem aqui

Seções:
  Em Preparo:        status = 'preparing'
  Pronto p/ Retirar: status = 'ready' (piscam suavemente)

Exibe: customer_name + order_number
Não exibe: telefone, valor, detalhes do pedido

Realtime: escuta UPDATE em orders filtrado por business_id

---

## Tela de Status do Cliente — OrderStatus.jsx

Lista todos os pedidos ativos da sessão atual
Atualização em tempo real via Realtime por order_id
Pedidos 'closed' aparecem como "Entregue"
Somem quando a sessão expira (8h)
Cliente pode cancelar pedido em 'pending' diretamente nessa tela

```javascript
export const useOrderStatusRealtime = (orderId, onStatusChange) => {
  useEffect(() => {
    if (!orderId) return
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`
      }, onStatusChange)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [orderId])
}
```

---

## Home do Owner — Resumo em Tempo Real

Cards de cada negócio exibem:
  - Nome + logo (fallback: iniciais quando logo_url for null)
  - Status: aberto / fechado (toggle manual)
  - Pedidos ativos agora
  - Mesas ocupadas
  - Faturado hoje

Owner acompanha todos os negócios de qualquer lugar a qualquer hora.
Cada estabelecimento opera de forma completamente independente.
Dados atualizados via Supabase Realtime por business_id.

---

## BusinessDashboard — Grid de Acesso Rápido

Grid de botões quadrados grandes com SVG + label
Mobile: 2 colunas | Desktop: 4 colunas

Botões:
  📊 Dashboard    → /owner/business/:id/dashboard
  🍽️ Cardápio    → /owner/business/:id/menu
  🪑 Mesas e QR  → /owner/business/:id/tables
  ⚙️ Configurações → /owner/business/:id/settings

---

## Estabelecimento Fechado — Comportamento

Toggle manual (is_open) sempre prevalece sobre horário de funcionamento.
Horário cadastrado é apenas informativo na v1.
Abertura e fechamento automático por horário: v2.

Quando is_open = false:
  Novos pedidos via QR: bloqueados
  PDV do staff: continua funcionando normalmente
  Pedidos em andamento: continuam na fila normalmente
  KDS: continua operando normalmente

Cardápio do cliente quando fechado:
  Opção A — cardápio visível (somente visual) para gerar desejo
  Banner no topo: "Estamos fechados agora. Volte em breve!"
  Horário de funcionamento exibido abaixo do banner
  Sem opção de pedir, sem carrinho, sem identificação

---

## Cardápio do Cliente — Estados Especiais

Cardápio vazio (sem itens cadastrados):
  Tela amigável: "Cardápio em breve! Fale com nosso atendente."

Item desativado com carrinho ativo:
  Item some do cardápio via Realtime
  Se estava no carrinho: removido automaticamente
  Toast: "Ops! [nome do item] saiu do cardápio e foi removido do seu carrinho."

Categoria desativada:
  Todos os itens da categoria somem do cardápio
  Reativar categoria: todos os itens ativos voltam imediatamente

---

## Imagens — Regras

```javascript
// utils/imageCompressor.js
// Compressão automática antes do upload
// Limite: 2MB após compressão
// Formatos aceitos: JPG, PNG, WEBP
// Formatos bloqueados: GIF, SVG
// Foto obrigatória em menu_items — upload bloqueado sem foto
// Logo em businesses — opcional
// Fallback de logo: iniciais do nome exibidas como avatar

// Storage — Bucket: menuflow-assets (público)
// businesses/{business_id}/logo.{ext}
// businesses/{business_id}/cover.{ext}
// menu-items/{business_id}/{item_id}.{ext}
```

---

## Conexão — Estado e Comportamento

```javascript
// hooks/useConnection.js
// Monitora navigator.onLine + eventos online/offline
// Indicador visual de conexão em todas as telas

// Se offline:
//   Bloquear confirmação de pedido
//   Exibir: "Sem conexão. Seu pedido não foi enviado."
//   Carrinho preservado no localStorage

// Modo offline completo para PDV: v2
```

---

## QR Codes

```javascript
// utils/qrcode.js
const APP_URL = import.meta.env.VITE_APP_URL

// QR de mesa [v1: cardápio visual / v2: pedido completo]
export const getTableQrUrl = (businessSlug, tableNumber) =>
  `${APP_URL}/order/${businessSlug}/table/${tableNumber}`

// QR de balcão [v1 + v2: pedido completo]
export const getCounterQrUrl = (businessSlug) =>
  `${APP_URL}/order/${businessSlug}/counter`

// QR de mesa: gerado automaticamente na criação
// Sempre o mesmo — NUNCA regenerado
// Owner e staff reimprimitam PDF a qualquer momento pelo painel

// PDF de mesa: logo + "Mesa N" + QR Code
// PDF de balcão: layout maior + "Peça aqui e retire no balcão"
// Reimpressão individual ou de todas as mesas de uma vez
```

---

## Regras de Negócio — Completas

1.  Pedido de mesa [v1]: source='table', apenas visual, nenhum order gerado
2.  Pedido de mesa [v2]: source='table', fluxo completo igual ao balcão
3.  Pedido de balcão: source='counter', customer_name obrigatório
4.  Pedido via PDV: source='staff', staff_id obrigatório
5.  Snapshot obrigatório: item_name e unit_price em order_items no momento do pedido
6.  Nunca usar menu_items.price para cálculos históricos
7.  Nunca deletar menu_items — apenas is_active = false
8.  Nunca deletar orders — cancelled mantém registro com valor zerado
9.  Cancelamento apenas em status 'pending' — sem exceções
10. Quem cancela: staff (qualquer pedido pending) e cliente (apenas source='counter' pending)
11. Telefone é único por negócio — reusar customer_id se já existe, nunca duplicar
12. "Não sou eu" na identificação = digitou número errado, volta ao campo de telefone
13. Toggle is_open sempre prevalece sobre horário de funcionamento
14. is_open = false bloqueia QR mas não bloqueia PDV nem KDS
15. Múltiplos staff podem gerar pedidos independentes na mesma mesa
16. Novo pedido do cliente não adiciona ao pedido existente — vai ao final da fila
17. Staff pode criar mesa nova diretamente no PDV
18. QR Code de mesa é sempre o mesmo — nunca regenerar
19. Owner e staff podem reimprimir PDF de QR a qualquer momento
20. Desconto máximo do staff limitado ao max_discount_percent do negócio
21. Taxa de serviço não obrigatória — cliente pode recusar no fechamento
22. Observações por item: máximo 140 caracteres
23. Alerta modal ao adicionar 10+ unidades do mesmo item
24. Foto obrigatória em menu_items — JPG, PNG ou WEBP, máx 2MB após compressão
25. Logo do negócio opcional — fallback com iniciais do nome
26. Fuso horário do negócio definido pelo address_state no cadastro
27. order_number formato DDMM-0001, reinicia todo dia, por negócio
28. Pedidos ficam no banco por 90 dias — rotina de limpeza na v2
29. Cada estabelecimento opera de forma completamente independente
30. Browser mínimo: Chrome 90+, Safari 16.4+, Samsung Internet 14+
31. Validação de plano e limites de negócios por owner: v2

---

## Formatadores

```javascript
// utils/formatters.js

export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(value)

export const formatPhone = (value) => {
  const c = value.replace(/\D/g, '')
  return c.length === 11
    ? c.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    : c.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export const formatDate = (date, timezone) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: timezone
  }).format(new Date(date))

export const generateSlug = (name) =>
  name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-').trim()

export const generateAccessCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString()
```

---

## Erros Comuns — Não Cometer

1.  Não usar polling — sempre Realtime para KDS, status e display
2.  Não deletar menu_items — apenas desativar
3.  Não deletar orders — apenas cancelar
4.  Não usar menu_items.price em cálculos históricos
5.  Não expor staff_access_code ou max_discount_percent no cliente
6.  Não usar service_role_key no frontend
7.  Não esquecer cleanup de canais Realtime no return do useEffect
8.  Não gerar slug sem verificar unicidade no banco
9.  Não bloquear UI durante upload — loading granular por campo
10. Não permitir cancelamento após status 'preparing'
11. Não reiniciar order_number no meio do dia
12. Não regenerar QR Code de mesa já existente
13. Não aceitar GIF ou SVG no upload de imagens
14. Não criar formulários com tag form — usar onClick nos botões
15. Não adicionar novo item ao pedido existente do cliente — sempre novo pedido

---

## Testes

Leia TESTES.md antes de escrever qualquer componente.
Todo elemento interativo deve ter data-testid desde o primeiro commit.
Nenhum código entra em produção sem todos os testes passando no GitHub Actions.

### Ferramentas
- Vitest — unitários e integração
- React Testing Library — componentes
- Playwright — E2E (simula mobile Chrome e Safari)
- MSW — mock do Supabase nos testes
- GitHub Actions — CI/CD automático

### Comandos
```bash
npm run test              # unitários uma vez
npm run test:watch        # unitários em watch mode
npm run test:coverage     # com relatório de cobertura
npm run test:e2e          # E2E completo
npm run test:e2e:ui       # E2E com interface visual
npm run test:all          # tudo de uma vez
```

### Pipeline CI/CD
Push para main ou PR → unitários → E2E → deploy Vercel
Deploy só acontece se TODOS os testes passarem.
E2E só roda se unitários passarem.

### Regra de data-testid
Todo elemento interativo ou verificável recebe data-testid no momento
da implementação — nunca retroativamente.
Lista completa em TESTES.md.

---

## Fluxo de Desenvolvimento — Regra Principal

NUNCA gerar o projeto inteiro de uma vez.
O desenvolvimento segue obrigatoriamente este ciclo:

```
1. Gerar UMA tela completa
        ↓
2. Aguardar o owner testar manualmente no browser
        ↓
3. Rodar os testes automatizados da tela
   npm run test        → unitários relacionados
   npm run test:e2e    → E2E da tela específica
        ↓
4. Todos os testes passaram + owner aprovou?
   SIM → gerar a próxima tela
   NÃO → corrigir e voltar para o passo 2
```

Cada tela é uma unidade de entrega independente.
Nenhuma tela nova começa sem aprovação explícita do owner.
Aprovação explícita = mensagem confirmando que testou e está ok.

### Ordem de entrega das telas (seguir exatamente)

Sprint 1 — Fundação (sem telas, apenas setup)
  - Setup do projeto Vite + React + Tailwind
  - Configuração do Supabase
  - Configuração do Vitest e Playwright
  - GitHub Actions
  - Componentes UI base (Button, Input, Card, Modal, Toast...)
  - Theme (dark/light) global
  → Aprovação antes de começar Sprint 2

Sprint 2 — Autenticação
  Tela 01: Login
  Tela 02: Cadastro
  Tela 03: Recuperação de senha

Sprint 3 — Owner Core
  Tela 04: Home — lista de negócios
  Tela 05: Business Dashboard — grid acesso rápido
  Tela 06: Cadastro / edição de negócio
  Tela 07: Configurações do negócio

Sprint 4 — Cardápio
  Tela 08: Cardápio — categorias
  Tela 09: Cardápio — itens (lista)
  Tela 10: Cadastro / edição de item

Sprint 5 — Mesas e QR
  Tela 11: Mesas e QR Codes

Sprint 6 — Dashboard
  Tela 12: Dashboard operacional

Sprint 7 — Staff
  Tela 13: Login staff — código de acesso
  Tela 14: PDV — mapa de mesas + pedido
  Tela 15: Fechamento de conta

Sprint 8 — Cozinha
  Tela 16: KDS — Kitchen Display

Sprint 9 — Cliente via QR
  Tela 17: Cardápio visual da mesa — MenuReadOnly
  Tela 18: Identificação — telefone → confirma
  Tela 19: Cardápio de balcão — MenuOrder
  Tela 20: Carrinho
  Tela 21: Status dos pedidos

Sprint 10 — Público
  Tela 22: Tela pública do balcão — TV

Sprint 11 — Finalização
  - Testes E2E completos em todos os fluxos
  - Ajustes de UX mobile
  - Deploy produção

---

## Ordem de Desenvolvimento

### Sprint 1 — Fundação
1. Setup Vite + React + Tailwind + Supabase
2. Migrations 001 a 011
3. RLS policies completas
4. Componentes UI base (Button, Input, Card, Modal, Badge, Toggle, Spinner, Toast, ConnectionStatus)
5. Auth owner: Login, Cadastro, Recuperação de senha
6. Rotas e guards (OwnerRoute, StaffRoute, PublicRoute)

### Sprint 2 — Owner Core
7. Home: lista de negócios + resumo em tempo real
8. BusinessDashboard: grid SVG de acesso rápido
9. BusinessForm: cadastro e edição com ViaCEP + timezone automático
10. BusinessSettings: taxa de serviço + desconto máximo + código staff
11. MenuCategories: CRUD + reordenação
12. MenuItems: CRUD + upload com compressão + tags

### Sprint 3 — Mesas e QR
13. Tables: grid de mesas + status + criação + reimpressão de PDF
14. Geração de QR de balcão

### Sprint 4 — Operação Staff
15. StaffLogin: código de acesso + sessão localStorage
16. PDV: mapa de mesas + busca + montagem de pedido + criação de mesa
17. KitchenDisplay: colunas + Realtime + alertas sonoros + botão ativar som
18. Waiter calls: Realtime no PDV + botão no cliente + answered
19. Checkout: fechamento + múltiplos pagamentos + divisão + desconto + taxa

### Sprint 5 — Cliente via QR
20. MenuReadOnly: cardápio visual da mesa + busca + chamar garçom
21. Identify: fluxo telefone → busca → confirma → "não sou eu"
22. MenuOrder: cardápio de balcão com busca + modal de quantidade
23. Cart: carrinho + persistência localStorage + recuperação + alerta
24. OrderStatus: lista de pedidos da sessão + Realtime + cancelar pending
25. CounterDisplay: TV do balcão + Realtime

### Sprint 6 — Finalização
26. Dashboard: operacional em tempo real
27. ConnectionStatus: indicador em todas as telas
28. Aviso de browser incompatível
29. Cardápio fechado: banner + horário de funcionamento
30. Cardápio vazio: tela amigável
31. Ajustes de UX mobile em todos os fluxos
32. Testes em dispositivos reais (Android + iPhone + tablet 7-8")
33. Deploy Vercel + variáveis de ambiente de produção

---

## Roadmap Pós-MVP

### v2 — Consolidação

SEGURANÇA
- Substituir slugs públicos por tokens UUID nos QR Codes
  URL vira /order/[uuid-token] — não adivinhável
- Convite de staff por email com perfis granulares
  'staff' | 'manager' | 'cashier' | 'kitchen'

OPERAÇÃO
- Pedido completo pelo QR de mesa (MenuOrder substitui MenuReadOnly)
- Impressora térmica para comanda física como backup do KDS
- Modo offline para PDV com sync automático ao reconectar
- Abertura e fechamento automático por horário de funcionamento
- Priorização inteligente de pedidos no KDS
- Alerta de mesa sem fechar conta há muito tempo
- Rastreio de pedidos cancelados no dashboard do owner
- Histórico de pedidos com filtro por período
- Rotina de limpeza de pedidos com mais de 90 dias
- Validação de limite de negócios por plano (Starter/Pro/Business)

NOTIFICAÇÕES
- Web Push para cliente acompanhar status no celular
  Android: funciona nativamente
  iOS 16.4+: requer Add to Home Screen
  Fallback: tela de status já funciona sem push
- Service Worker + Supabase Edge Function para disparo
- Banner de opt-in após identificação

ESTOQUE
- Ficha técnica por item (insumos + quantidades)
- [v2 item desativado] Se item sem estoque e pedido via QR:
  notificação na tela do cliente
  Se via garçom: responsabilidade do staff informar
- Baixa automática de estoque ao fechar pedido
- Alerta de estoque mínimo no dashboard
- Entrada manual de estoque
- Estoque por unidade separado
- [v2 carrinho] Remover ingrediente específico de um item

FINANCEIRO
- Relatório DRE: receitas vs despesas por período
- Relatório de vendas: por item, categoria, forma de pagamento
- CMV automático pela ficha técnica
- Ticket médio por mesa e por período
- Exportação CSV e PDF
- Controle de caixa: abertura, fechamento, sangria, suprimento

COMPRAS
- Ordem de compra por unidade
- Ordem de compra consolidada para todas as unidades
- Baseada em estoque mínimo atingido
- Quantidade sugerida por histórico de consumo
- Exportável em PDF para fornecedor
- Cadastro de fornecedores por insumo

CRM
- Base de clientes capturados via QR
- Segmentação por frequência e ticket médio
- Campanhas via WhatsApp Business API
- Programa de fidelidade simples (pontos por pedido)
- Avaliação pós-atendimento via QR (1–5 estrelas)

### v3 — Expansão

- Integração iFood, Rappi, Uber Eats centralizados no KDS
- Cardápio sincronizado em todas as plataformas de uma vez
- Relatório unificado salão + delivery
- Reservas de mesa com confirmação automática
- NFC-e / emissão de nota fiscal (homologação por estado)
- Gorjeta opcional no fechamento de conta
- Rastreio de pedidos cancelados com relatório por período por owner
- App nativo React Native (owner + push notifications)
- Cardápio com IA (sugestões, upsell, descrições geradas)
- Mapa de mesas customizável (drag-and-drop do layout real)
- Multi-idioma no cardápio do cliente (PT, EN, ES)
- MenuFlow para franquias e redes:
  Cardápio master com propagação para unidades
  Variações locais de preço por unidade
  Relatório comparativo entre unidades
  White-label para redes com marca própria

---

## Modelo de Negócio

| Plano    | Preço/mês | Limites                                  |
|----------|-----------|------------------------------------------|
| Starter  | R$ 79     | 1 negócio, até 10 mesas                 |
| Pro      | R$ 149    | Até 3 negócios, mesas ilimitadas        |
| Business | R$ 299    | Negócios ilimitados + relatórios + CRM  |

Validação de plano: v2 junto com integração de pagamento.
v1: sem validação de limite — owner cadastra livremente.
Cobrança por plano fixo mensal — sem comissão por pedido.

---

*CLAUDE.md — MenuFlow — Escopo v1/v2/v3 fechado e aprovado*
*Próximo passo: iniciar Sprint 1*

---

## Status da v1 — 09/05/2026

22 telas implementadas e testadas manualmente.
Todos os bugs críticos de infraestrutura corrigidos.
Deploy pendente — resolver git no Windows primeiro.

---

## Bugs Corrigidos — v1

### Bug 1 — Trigger on_auth_user_created
**Sintoma:** usuário se cadastra mas não aparece em `public.users`.
**Consequência:** foreign key quebra ao criar negócio (erro 409).
**Causa:** função sem COALESCE quebrava quando `name` vinha nulo do OAuth.
**Correção:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.email, 'Usuário')
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

### Bug 2 — RLS policy sem WITH CHECK
**Sintoma:** erro 409 ao criar estabelecimento.
**Causa:** policy criada sem `WITH CHECK`, bloqueando INSERT.
**Correção:**
```sql
DROP POLICY IF EXISTS "Owner gerencia seus negócios" ON public.businesses;
CREATE POLICY "Owner gerencia seus negócios"
  ON public.businesses FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

### Bug 3 — Bucket Storage não existia
**Sintoma:** erro 400 no upload de foto.
**Causa:** bucket `menuflow-assets` nunca foi criado.
**Correção:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menuflow-assets', 'menuflow-assets', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
```

### Bug 4 — Policies do Storage ausentes
**Sintoma:** erro 400 mesmo com bucket criado.
**Causa:** sem policies, Storage rejeita todas as operações.
**Correção:**
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

### Bug 5 — RLS customers bloqueava anônimos
**Sintoma:** erro 401 na tela de identificação via QR.
**Causa:** RLS não permitia SELECT nem INSERT para usuários anônimos.
**Correção:**
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

## Decisões Técnicas — v1

### Vite fixado em 4.5.x
Política WDAC do Windows bloqueia binário nativo do rollup em versões superiores.
Não atualizar o Vite sem antes resolver a política WDAC.

### Áudio via Web Audio API
`<audio>.play()` é bloqueado pelo Safari iOS em callbacks assíncronos.
Usar sempre o hook `src/hooks/useAudio.js` com `AudioContext`.
Arquivos de som em `.wav` — não renomear para `.mp3`.

### Sons gerados sinteticamente
`public/sounds/new-order.wav` — duplo beep 880Hz (KDS)
`public/sounds/waiter-call.wav` — chime C5→E5 (PDV)
Gerados via `scripts/generate-sounds.cjs` — rodar se os arquivos sumissem.

### CounterDisplay — pending como preparing
Pedidos `source='counter'` com `status='pending'` aparecem em "Em Preparo"
para evitar que o cliente fique sem feedback visual após confirmar.

### KDS — auth reaproveitado do staff
`StaffRoute` encoda rota atual em `?from=ENCODED_PATH`.
KDS verifica `session.businessId === businessId`.

### Reset de senha fora do PublicRoute
Supabase cria sessão de recovery temporária que precisa existir
para `updateUser` funcionar. Rota `/reset-password` fica fora do guard.

### Tema claro/escuro
KDS e CounterDisplay usam `isDark` state local — não herdam da classe `html`
porque usam inline styles extensivamente.

---

## Checklist Pré-Deploy

Antes do primeiro deploy em produção executar em ordem:

### Banco
- [ ] Trigger `on_auth_user_created` criado e testado com novo usuário
- [ ] RLS habilitado em todas as tabelas
- [ ] Todas as policies têm `WITH CHECK` quando necessário
- [ ] Policies anônimas criadas em customers, menu_items, menu_categories, businesses
- [ ] Bucket `menuflow-assets` criado com 4 policies de Storage
- [ ] Realtime habilitado em orders, order_items, waiter_calls
- [ ] Função `generate_order_number` usando timezone do negócio

### Testes funcionais
- [ ] Criar novo usuário → aparece em `public.users` automaticamente
- [ ] Criar negócio com novo usuário → sem erro
- [ ] Upload de foto de item → sem erro 400
- [ ] QR de balcão → identificação → pedido → KDS → status → fechar conta
- [ ] QR de mesa → cardápio visual → chamar garçom → alerta no PDV
- [ ] Tela pública do balcão atualiza em tempo real
- [ ] Dark/light mode funciona em todas as 22 telas

### Deploy
- [ ] `.env.local` não commitado
- [ ] Variáveis configuradas na Vercel
- [ ] `VITE_APP_URL` apontando para URL de produção
- [ ] Git configurado e primeiro commit realizado

---

## Bugs Pendentes

| Bug | Impacto | Quando corrigir |
|---|---|---|
| Layout CounterDisplay com uma coluna | Cosmético | v2 |
| Testes E2E não rodados | Médio | Após validação com cliente real |


---

## Atualizações pós v1 — 09/05/2026

### Ajuste de tempos — todas as telas
Em todas as telas que exibem tempo (KDS, status do cliente, PDV, lista de pedidos):
- Pedido em aberto → tempo crescente em tempo real (há quanto tempo está aberto)
- Pedido finalizado → tempo total fixo (do pedido ao fechamento)
Nunca exibir "há quanto tempo foi criado" — sempre o tempo de duração do pedido.

### Tela 23 — Lista de Pedidos do Dia [v1]
Rota: /owner/business/:id/orders
Acesso: apenas owner
Grid BusinessDashboard: quinto botão — ícone ti-receipt + label "Pedidos"

LISTA
- Ordenação padrão: mais recente primeiro
- Card exibe: número do pedido, fonte com badge (Mesa/Balcão/PDV),
  nome do cliente ou número da mesa, quantidade de itens, valor total,
  status com pill colorida, tempo (aberto=crescente / fechado=tempo total)
- Filtros:
  Status: Todos · Novo · Em preparo · Pronto · Fechado · Cancelado
  Fonte: Todos · Mesa · Balcão · PDV
  Período: Hoje · Ontem · Últimos 7 dias
  Busca: campo de texto pelo número do pedido

DETALHE DO PEDIDO (ao clicar)
- Número, data e hora do pedido
- Fonte e origem (mesa/balcão/PDV)
- Nome e telefone do cliente (se disponível)
- Lista de itens com quantidade, nome, preço unitário e observações
- Subtotal, desconto aplicado, taxa de serviço, total
- Forma de pagamento e divisão
- Histórico de status com timestamps:
  🕐 Pedido criado às HH:MM
  🍳 Entrou em preparo às HH:MM
  ✅ Ficou pronto às HH:MM
  💳 Fechado às HH:MM
- Tempo total: do pedido ao fechamento
- Somente visualização — sem ações

Total v1 atualizado: 23 telas


---

## Atualizações — Perfil do Owner e Logo do Estabelecimento

### Tela 24 — Perfil do Owner [v1]
Rota: /owner/profile
Acesso: apenas owner
Acesso via: dropdown no avatar (canto superior direito da Home)
  - Opção "Meu perfil" → abre /owner/profile
  - Opção "Sair" → logout (já implementado)

DADOS EXIBIDOS E EDITÁVEIS
- Foto de perfil (upload, compressão automática, bucket menuflow-assets)
  Fallback: iniciais do nome quando sem foto
- Nome completo
- Email (não editável — vinculado ao Supabase Auth)
- Telefone
- Senha (campo separado com confirmação — chama updateUser do Supabase Auth)

PLANO (apenas informativo no MVP)
- Exibir: "Plano Starter" como texto fixo
- Sem lógica de controle ainda — v3 quando tiver cobrança real
- Visual: badge simples com o nome do plano

AÇÕES
- Salvar alterações (nome, telefone, foto)
- Alterar senha (fluxo separado com senha atual + nova senha + confirmação)
- Botão "Sair" no rodapé da tela

### Ajuste — Logo no Cadastro de Estabelecimento [v1]
Campo logo_url já existe no banco mas não estava na UI.
Adicionar na tela BusinessForm (cadastro e edição):
- Upload de logo com compressão automática (máx 2MB, JPG/PNG/WEBP)
- Preview da logo após upload
- Fallback: iniciais do nome do negócio quando sem logo
- Logo exibida nos cards da Home e no header do cardápio do cliente

Total v1 atualizado: 24 telas

---

## Planejamento — Admin Panel (Backoffice MenuFlow)

Painel separado acessível apenas pelo dono do MenuFlow (Vitor).
Controla todos os clientes (owners) e planos de todos os SaaS.
Documentação completa em CLAUDE-BACKOFFICE.md.

Versão: v3 do MenuFlow — depende de cobrança implementada antes.
Pode ser reutilizado para outros SaaS futuros.


---

## Bugs Corrigidos — Pós v1 (rodada 2)

### Financeiro
- Taxa de serviço incluída no faturamento do dashboard
- Pedidos source='counter' incluídos no faturamento
- Toggle da taxa de serviço recalcula total em tempo real

### KDS e Operacional
- Pedido só some do KDS após confirmação de entrega — nunca ao fechar conta
- KDS exige código de acesso de staff igual ao PDV

### Dashboard
- Realtime corrigido — atualiza automaticamente ao receber INSERT/UPDATE

### PDV
- Estado de mute usa ref para persistir entre re-renders
- Checkout busca apenas pedidos com status != 'cancelled'

### UI e Fluxo
- Ícone do card "Acessos" com dark mode correto
- Botão "Acompanhar meu pedido" adicionado no balcão

### Busca e Melhorias
- Busca de itens usa ilike('%termo%') — resultados parciais e case-insensitive
- Campo capacity (lugares) adicionado na tabela tables
- Campo open_days (dias de funcionamento) adicionado na tabela businesses

---

## Roadmap v2 — Atualizado

Adicionar aos itens já planejados:
- Cadastro universal de clientes — opção B (global, único no sistema inteiro)
  Requer migração de dados e repensar tabela customers
  Não fazer em produção ativa — planejar migração com cuidado
- Múltiplos owners por estabelecimento (convite por email)
- Operador no PDV (perfis granulares de staff)


---

## LGPD — Conformidade Técnica

O MenuFlow coleta e trata dados pessoais de duas categorias de titulares:
- **Owners** — nome, email, telefone, foto de perfil
- **Clientes dos estabelecimentos** — nome, telefone

A LGPD exige implementação técnica das seguintes obrigações:

### Dados coletados e finalidade

| Dado | Titular | Finalidade | Base legal |
|---|---|---|---|
| Nome, email, senha | Owner | Autenticação e identificação | Execução de contrato |
| Telefone do owner | Owner | Contato e suporte | Legítimo interesse |
| Foto de perfil | Owner | Personalização da interface | Consentimento |
| Nome do cliente | Cliente do bar | Identificação no balcão | Legítimo interesse |
| Telefone do cliente | Cliente do bar | Identificação e histórico | Legítimo interesse |
| Pedidos realizados | Cliente do bar | Operação do serviço | Execução de contrato |

### Obrigações técnicas implementadas

1. **Consentimento explícito** — banner/checkbox no cadastro de owner e na identificação do cliente via QR informando quais dados são coletados e para quê.

2. **Política de privacidade** — página /privacy acessível sem login explicando: quais dados são coletados, finalidade, como são protegidos, tempo de retenção, direitos do titular e como exercê-los.

3. **Direito de acesso** — owner pode ver todos os seus dados no perfil.

4. **Direito de correção** — owner pode editar nome, telefone e foto no perfil.

5. **Direito de exclusão** — owner pode solicitar exclusão da conta. Dados são anonimizados (não deletados imediatamente para manter integridade dos pedidos históricos).

6. **Direito de portabilidade** — owner pode exportar seus dados em formato legível (JSON ou CSV).

7. **Retenção de dados** — pedidos retidos por 90 dias conforme já documentado. Dados de clientes do estabelecimento retidos enquanto o negócio estiver ativo.

8. **Segurança** — RLS no Supabase, HTTPS obrigatório, sem dados sensíveis no localStorage além da sessão.

9. **Opt-in de marketing** — campo `marketing_opt_in` já existe na tabela customers. Exibir checkbox explícito na identificação do cliente.

10. **Notificação de vazamento** — em caso de incidente, notificar a ANPD em até 72h e os titulares afetados.

### O que NÃO fazer
- Nunca coletar dados além do necessário
- Nunca compartilhar dados de clientes com terceiros sem consentimento
- Nunca usar dados de clientes do estabelecimento para marketing do MenuFlow sem opt-in separado
- Nunca armazenar senha em texto puro (Supabase Auth cuida disso)
- Nunca expor CPF, RG ou dados sensíveis — MenuFlow não coleta esses dados

### Textos obrigatórios na UI

**No cadastro do owner:**
"Ao criar sua conta você concorda com nossa [Política de Privacidade] e [Termos de Uso]. Seus dados são usados exclusivamente para operar o MenuFlow."

**Na identificação do cliente via QR:**
"Seu nome e telefone serão usados para identificar seu pedido. [Saiba mais]"

**Checkbox de marketing (opcional):**
"Aceito receber promoções e novidades deste estabelecimento"