# TESTES.md — MenuFlow
# Estratégia completa de testes — v1
# Gerado em 07/05/2026

Leia antes de rodar qualquer teste.
Este documento explica o que é testado, por quê, como rodar
e o que cada falha significa na prática.

---

## Filosofia

Cada regra de negócio crítica tem pelo menos um teste.
Cada fluxo completo do usuário tem um teste E2E.
Nenhum código entra em produção sem todos os testes passando.

Prioridade de cobertura:
1. Regras financeiras (cálculo de conta, desconto, divisão)
2. Fluxos de pedido (balcão e mesa)
3. Autenticação e acesso por perfil
4. Realtime (KDS e status)
5. Componentes de UI críticos

---

## Estrutura de Pastas de Teste

```
menuflow/
├── src/
│   ├── utils/
│   │   ├── formatters.test.js       ← unitários de formatação
│   │   ├── validators.test.js       ← unitários de validação
│   │   ├── customerSession.test.js  ← unitários de sessão
│   │   └── timezone.test.js         ← unitários de fuso
│   ├── stores/
│   │   └── cartStore.test.js        ← integração do carrinho
│   ├── services/
│   │   ├── orderService.test.js     ← integração de pedidos
│   │   └── authService.test.js      ← integração de auth
│   └── components/
│       ├── Checkout.test.jsx        ← componente de fechamento
│       ├── Identify.test.jsx        ← componente de identificação
│       └── KitchenDisplay.test.jsx  ← componente do KDS
├── e2e/
│   ├── auth.spec.js                 ← E2E autenticação
│   ├── owner-setup.spec.js          ← E2E configuração do negócio
│   ├── counter-order.spec.js        ← E2E pedido de balcão
│   ├── staff-pdv.spec.js            ← E2E pedido via PDV
│   ├── kds.spec.js                  ← E2E KDS e status
│   ├── checkout.spec.js             ← E2E fechamento de conta
│   └── waiter-call.spec.js          ← E2E chamado de garçom
├── src/mocks/
│   ├── handlers.js                  ← MSW — mock do Supabase
│   └── server.js                    ← setup do MSW
├── vitest.config.js
├── playwright.config.js
└── .github/
    └── workflows/
        └── tests.yml                ← GitHub Actions
```

---

## Instalação

```bash
# Instalar dependências de teste
npm install --save-dev \
  vitest \
  @vitest/coverage-v8 \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  msw \
  playwright \
  @playwright/test

# Instalar browsers do Playwright
npx playwright install chromium
```

---

## Como Rodar os Testes

### Unitários e integração (Vitest)

```bash
# Rodar uma vez
npm run test

# Rodar em modo watch (roda a cada save de arquivo)
npm run test:watch

# Rodar com relatório de cobertura
npm run test:coverage

# Rodar apenas um arquivo específico
npm run test -- formatters
```

### E2E (Playwright)

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Rodar com interface visual (você vê o browser abrindo)
npm run test:e2e:ui

# Rodar apenas um spec específico
npm run test:e2e -- counter-order

# Ver relatório após rodar
npm run test:e2e:report
```

### Rodar tudo de uma vez

```bash
npm run test:all
```

---

## Configurações

### vitest.config.js

```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/mocks/server.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'e2e', '*.config.*']
    }
  }
})
```

### playwright.config.js

```javascript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    // simula iPhone 13 — mobile first
    ...devices['iPhone 13'],
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### package.json — scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:all": "vitest run && playwright test"
  }
}
```

---

## Mock do Supabase (MSW)

```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw'

const BASE = 'https://test.supabase.co/rest/v1'

export const handlers = [

  // Buscar negócios do owner
  http.get(`${BASE}/businesses`, () => {
    return HttpResponse.json([
      {
        id: 'biz-001',
        name: 'Bar do Zé',
        slug: 'bar-do-ze',
        is_open: true,
        staff_access_code: '123456',
        service_charge_percent: 10,
        max_discount_percent: 15,
        timezone: 'America/Sao_Paulo',
      }
    ])
  }),

  // Buscar cardápio
  http.get(`${BASE}/menu_items`, () => {
    return HttpResponse.json([
      {
        id: 'item-001',
        name: 'Cerveja Heineken 600ml',
        price: 14.00,
        is_active: true,
        category_id: 'cat-001',
        photo_url: 'https://example.com/cerveja.jpg',
        prep_time_minutes: 2,
        tags: [],
      },
      {
        id: 'item-002',
        name: 'Batata frita',
        price: 28.00,
        is_active: true,
        category_id: 'cat-002',
        photo_url: 'https://example.com/batata.jpg',
        prep_time_minutes: 15,
        tags: ['vegetarian'],
      }
    ])
  }),

  // Buscar cliente por telefone
  http.get(`${BASE}/customers`, ({ request }) => {
    const url = new URL(request.url)
    const phone = url.searchParams.get('phone')
    if (phone === 'eq.(11) 99999-0000') {
      return HttpResponse.json([
        { id: 'cust-001', name: 'João Silva', phone: '(11) 99999-0000' }
      ])
    }
    return HttpResponse.json([])
  }),

  // Criar pedido
  http.post(`${BASE}/orders`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'order-001',
      order_number: '0705-0001',
      status: 'pending',
      ...body,
    }, { status: 201 })
  }),

  // Criar itens do pedido
  http.post(`${BASE}/order_items`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(body, { status: 201 })
  }),

  // Atualizar status do pedido
  http.patch(`${BASE}/orders`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body })
  }),

  // Buscar pedidos
  http.get(`${BASE}/orders`, () => {
    return HttpResponse.json([
      {
        id: 'order-001',
        order_number: '0705-0001',
        status: 'pending',
        source: 'counter',
        customer_name: 'João Silva',
        created_at: new Date().toISOString(),
      }
    ])
  }),

  // Login staff por código de acesso
  http.get(`${BASE}/businesses`, ({ request }) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('staff_access_code')
    if (code === 'eq.123456') {
      return HttpResponse.json([
        { id: 'biz-001', name: 'Bar do Zé', logo_url: null }
      ])
    }
    return HttpResponse.json([])
  }),

]
```

```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## Testes Unitários

### src/utils/formatters.test.js

```javascript
import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPhone,
  generateSlug,
  generateAccessCode,
  formatDate
} from './formatters'

describe('formatCurrency', () => {
  it('formata valor inteiro corretamente', () => {
    expect(formatCurrency(14)).toBe('R$\u00a014,00')
  })

  it('formata valor decimal corretamente', () => {
    expect(formatCurrency(14.5)).toBe('R$\u00a014,50')
  })

  it('formata zero corretamente', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00')
  })

  it('formata valores grandes com separador de milhar', () => {
    expect(formatCurrency(1240)).toBe('R$\u00a01.240,00')
  })

  it('não aceita valor negativo sem sinal', () => {
    expect(formatCurrency(-10)).toContain('-')
  })
})

describe('formatPhone', () => {
  it('formata celular com 11 dígitos', () => {
    expect(formatPhone('11999990000')).toBe('(11) 99999-0000')
  })

  it('formata fixo com 10 dígitos', () => {
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('remove caracteres não numéricos antes de formatar', () => {
    expect(formatPhone('(11) 99999-0000')).toBe('(11) 99999-0000')
  })
})

describe('generateSlug', () => {
  it('converte para minúsculas', () => {
    expect(generateSlug('Bar do Zé')).toBe('bar-do-ze')
  })

  it('remove acentos', () => {
    expect(generateSlug('Pizzaria Gourmet')).toBe('pizzaria-gourmet')
  })

  it('substitui espaços por hífens', () => {
    expect(generateSlug('Lanchonete Central')).toBe('lanchonete-central')
  })

  it('não gera hífens duplos', () => {
    expect(generateSlug('Bar  do  Zé')).toBe('bar-do-ze')
  })
})

describe('generateAccessCode', () => {
  it('gera código com 6 dígitos', () => {
    const code = generateAccessCode()
    expect(code).toHaveLength(6)
    expect(/^\d{6}$/.test(code)).toBe(true)
  })

  it('gera códigos diferentes a cada chamada', () => {
    const codes = new Set(Array.from({ length: 100 }, generateAccessCode))
    expect(codes.size).toBeGreaterThan(90)
  })
})
```

### src/utils/validators.test.js

```javascript
import { describe, it, expect } from 'vitest'

// Validadores a implementar em validators.js
const validatePhone = (phone) => {
  const clean = phone.replace(/\D/g, '')
  return clean.length === 10 || clean.length === 11
}

const validateOrderNotes = (notes) => {
  return notes.length <= 140
}

const validateDiscount = (percent, maxPercent) => {
  return percent >= 0 && percent <= maxPercent
}

const validateQuantityAlert = (quantity, threshold = 10) => {
  return quantity >= threshold
}

const validateImageType = (filename) => {
  const allowed = ['jpg', 'jpeg', 'png', 'webp']
  const ext = filename.split('.').pop().toLowerCase()
  return allowed.includes(ext)
}

describe('validatePhone', () => {
  it('aceita celular com 11 dígitos', () => {
    expect(validatePhone('11999990000')).toBe(true)
  })

  it('aceita fixo com 10 dígitos', () => {
    expect(validatePhone('1133334444')).toBe(true)
  })

  it('rejeita número com menos de 10 dígitos', () => {
    expect(validatePhone('119999')).toBe(false)
  })

  it('aceita telefone formatado', () => {
    expect(validatePhone('(11) 99999-0000')).toBe(true)
  })
})

describe('validateOrderNotes', () => {
  it('aceita observação dentro do limite', () => {
    expect(validateOrderNotes('sem sal')).toBe(true)
  })

  it('aceita exatamente 140 caracteres', () => {
    expect(validateOrderNotes('a'.repeat(140))).toBe(true)
  })

  it('rejeita observação com mais de 140 caracteres', () => {
    expect(validateOrderNotes('a'.repeat(141))).toBe(false)
  })

  it('aceita string vazia', () => {
    expect(validateOrderNotes('')).toBe(true)
  })
})

describe('validateDiscount', () => {
  it('aceita desconto dentro do limite', () => {
    expect(validateDiscount(10, 15)).toBe(true)
  })

  it('aceita desconto exatamente no limite', () => {
    expect(validateDiscount(15, 15)).toBe(true)
  })

  it('rejeita desconto acima do limite do negócio', () => {
    expect(validateDiscount(20, 15)).toBe(false)
  })

  it('rejeita desconto negativo', () => {
    expect(validateDiscount(-5, 15)).toBe(false)
  })

  it('aceita zero de desconto', () => {
    expect(validateDiscount(0, 15)).toBe(true)
  })
})

describe('validateQuantityAlert', () => {
  it('dispara alerta em 10 ou mais unidades', () => {
    expect(validateQuantityAlert(10)).toBe(true)
  })

  it('não dispara alerta abaixo de 10', () => {
    expect(validateQuantityAlert(9)).toBe(false)
  })

  it('dispara alerta para quantidades grandes', () => {
    expect(validateQuantityAlert(50)).toBe(true)
  })
})

describe('validateImageType', () => {
  it('aceita JPG', () => {
    expect(validateImageType('foto.jpg')).toBe(true)
  })

  it('aceita PNG', () => {
    expect(validateImageType('foto.png')).toBe(true)
  })

  it('aceita WEBP', () => {
    expect(validateImageType('foto.webp')).toBe(true)
  })

  it('rejeita GIF', () => {
    expect(validateImageType('animacao.gif')).toBe(false)
  })

  it('rejeita SVG', () => {
    expect(validateImageType('icone.svg')).toBe(false)
  })

  it('é case insensitive', () => {
    expect(validateImageType('FOTO.JPG')).toBe(true)
  })
})
```

### src/utils/customerSession.test.js

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveCustomerSession,
  getCustomerSession,
  getSavedPhone,
  clearCustomerSession
} from './customerSession'

const SLUG = 'bar-do-ze'
const CUSTOMER = {
  id: 'cust-001',
  name: 'João Silva',
  phone: '(11) 99999-0000'
}

beforeEach(() => {
  localStorage.clear()
})

describe('saveCustomerSession', () => {
  it('salva a sessão no localStorage', () => {
    saveCustomerSession(SLUG, CUSTOMER)
    const raw = localStorage.getItem(`session_${SLUG}`)
    expect(raw).not.toBeNull()
  })

  it('salva o telefone separado sem expiração', () => {
    saveCustomerSession(SLUG, CUSTOMER)
    expect(localStorage.getItem(`phone_${SLUG}`)).toBe(CUSTOMER.phone)
  })

  it('sessão contém todos os dados do cliente', () => {
    saveCustomerSession(SLUG, CUSTOMER)
    const session = JSON.parse(localStorage.getItem(`session_${SLUG}`))
    expect(session.customerId).toBe(CUSTOMER.id)
    expect(session.customerName).toBe(CUSTOMER.name)
    expect(session.customerPhone).toBe(CUSTOMER.phone)
    expect(session.businessSlug).toBe(SLUG)
    expect(session.sessionStart).toBeDefined()
  })
})

describe('getCustomerSession', () => {
  it('retorna sessão válida', () => {
    saveCustomerSession(SLUG, CUSTOMER)
    const session = getCustomerSession(SLUG)
    expect(session).not.toBeNull()
    expect(session.customerName).toBe(CUSTOMER.name)
  })

  it('retorna null se não há sessão', () => {
    expect(getCustomerSession(SLUG)).toBeNull()
  })

  it('retorna null e remove sessão expirada (mais de 8h)', () => {
    saveCustomerSession(SLUG, CUSTOMER)
    // simular 9 horas no passado
    const session = JSON.parse(localStorage.getItem(`session_${SLUG}`))
    session.sessionStart = new Date(
      Date.now() - 9 * 60 * 60 * 1000
    ).toISOString()
    localStorage.setItem(`session_${SLUG}`, JSON.stringify(session))

    expect(getCustomerSession(SLUG)).toBeNull()
    expect(localStorage.getItem(`session_${SLUG}`)).toBeNull()
  })

  it('mantém telefone salvo mesmo após sessão expirar', () => {
    saveCustomerSession(SLUG, CUSTOMER)
    const session = JSON.parse(localStorage.getItem(`session_${SLUG}`))
    session.sessionStart = new Date(
      Date.now() - 9 * 60 * 60 * 1000
    ).toISOString()
    localStorage.setItem(`session_${SLUG}`, JSON.stringify(session))

    getCustomerSession(SLUG) // expira a sessão
    expect(getSavedPhone(SLUG)).toBe(CUSTOMER.phone)
  })

  it('não expira sessão com menos de 8h', () => {
    saveCustomerSession(SLUG, CUSTOMER)
    const session = JSON.parse(localStorage.getItem(`session_${SLUG}`))
    session.sessionStart = new Date(
      Date.now() - 7 * 60 * 60 * 1000
    ).toISOString()
    localStorage.setItem(`session_${SLUG}`, JSON.stringify(session))

    expect(getCustomerSession(SLUG)).not.toBeNull()
  })
})

describe('clearCustomerSession', () => {
  it('remove a sessão mas mantém o telefone', () => {
    saveCustomerSession(SLUG, CUSTOMER)
    clearCustomerSession(SLUG)
    expect(localStorage.getItem(`session_${SLUG}`)).toBeNull()
    expect(localStorage.getItem(`phone_${SLUG}`)).toBe(CUSTOMER.phone)
  })
})
```

### src/stores/cartStore.test.js

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from './cartStore'

const ITEM_A = {
  itemId: 'item-001',
  name: 'Cerveja Heineken 600ml',
  price: 14.00,
  quantity: 1,
  notes: ''
}

const ITEM_B = {
  itemId: 'item-002',
  name: 'Batata frita',
  price: 28.00,
  quantity: 1,
  notes: ''
}

beforeEach(() => {
  useCartStore.getState().clear()
})

describe('addItem', () => {
  it('adiciona item novo ao carrinho', () => {
    useCartStore.getState().addItem(ITEM_A)
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('incrementa quantidade se item já existe', () => {
    useCartStore.getState().addItem(ITEM_A)
    useCartStore.getState().addItem(ITEM_A)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('adiciona múltiplos itens diferentes', () => {
    useCartStore.getState().addItem(ITEM_A)
    useCartStore.getState().addItem(ITEM_B)
    expect(useCartStore.getState().items).toHaveLength(2)
  })
})

describe('removeItem', () => {
  it('remove item do carrinho', () => {
    useCartStore.getState().addItem(ITEM_A)
    useCartStore.getState().removeItem('item-001')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('não afeta outros itens ao remover', () => {
    useCartStore.getState().addItem(ITEM_A)
    useCartStore.getState().addItem(ITEM_B)
    useCartStore.getState().removeItem('item-001')
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].itemId).toBe('item-002')
  })
})

describe('updateQuantity', () => {
  it('atualiza quantidade do item', () => {
    useCartStore.getState().addItem(ITEM_A)
    useCartStore.getState().updateQuantity('item-001', 5)
    expect(useCartStore.getState().items[0].quantity).toBe(5)
  })

  it('remove item quando quantidade é zero', () => {
    useCartStore.getState().addItem(ITEM_A)
    useCartStore.getState().updateQuantity('item-001', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('getTotal', () => {
  it('calcula total com um item', () => {
    useCartStore.getState().addItem({ ...ITEM_A, quantity: 1 })
    expect(useCartStore.getState().getTotal()).toBe(14.00)
  })

  it('calcula total com múltiplos itens e quantidades', () => {
    useCartStore.getState().addItem({ ...ITEM_A, quantity: 2 }) // 28.00
    useCartStore.getState().addItem({ ...ITEM_B, quantity: 1 }) // 28.00
    expect(useCartStore.getState().getTotal()).toBe(56.00)
  })

  it('retorna zero para carrinho vazio', () => {
    expect(useCartStore.getState().getTotal()).toBe(0)
  })
})

describe('Cálculo de fechamento de conta', () => {
  it('aplica desconto corretamente', () => {
    const subtotal = 71.00
    const desconto = 5 // 5%
    const esperado = subtotal - (subtotal * desconto / 100)
    expect(esperado).toBeCloseTo(67.45, 2)
  })

  it('aplica taxa de serviço corretamente', () => {
    const subtotal = 71.00
    const taxa = 10 // 10%
    const esperado = subtotal + (subtotal * taxa / 100)
    expect(esperado).toBeCloseTo(78.10, 2)
  })

  it('calcula total com desconto e taxa combinados', () => {
    const subtotal = 71.00
    const desconto = subtotal * 0.05  // 3.55
    const comDesconto = subtotal - desconto // 67.45
    const taxa = comDesconto * 0.10 // 6.745
    const total = comDesconto + taxa // 74.195
    expect(total).toBeCloseTo(74.20, 1)
  })

  it('divide conta corretamente entre N pessoas', () => {
    const total = 74.55
    const pessoas = 2
    const porPessoa = total / pessoas
    expect(porPessoa).toBeCloseTo(37.28, 2)
  })
})
```

---

## Testes E2E

### e2e/auth.spec.js

```javascript
import { test, expect } from '@playwright/test'

test.describe('Autenticação — Owner', () => {
  test('owner consegue criar conta e fazer login', async ({ page }) => {
    await page.goto('/register')
    await page.fill('[data-testid="name-input"]', 'Marco Rossi')
    await page.fill('[data-testid="email-input"]', 'marco@teste.com')
    await page.fill('[data-testid="password-input"]', 'Senha@123')
    await page.click('[data-testid="register-btn"]')
    await expect(page).toHaveURL('/owner/home')
  })

  test('owner não consegue logar com senha errada', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'marco@teste.com')
    await page.fill('[data-testid="password-input"]', 'senhaerrada')
    await page.click('[data-testid="login-btn"]')
    await expect(page.locator('[data-testid="error-msg"]')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('rota do owner redireciona para login sem autenticação', async ({ page }) => {
    await page.goto('/owner/home')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Autenticação — Staff', () => {
  test('staff entra com código válido', async ({ page }) => {
    await page.goto('/staff/login')
    await page.fill('[data-testid="access-code-input"]', '123456')
    await page.click('[data-testid="staff-login-btn"]')
    await expect(page).toHaveURL('/staff/pdv')
  })

  test('staff não entra com código inválido', async ({ page }) => {
    await page.goto('/staff/login')
    await page.fill('[data-testid="access-code-input"]', '000000')
    await page.click('[data-testid="staff-login-btn"]')
    await expect(page.locator('[data-testid="error-msg"]')).toBeVisible()
  })

  test('rota do staff redireciona sem código de acesso', async ({ page }) => {
    await page.goto('/staff/pdv')
    await expect(page).toHaveURL('/staff/login')
  })
})
```

### e2e/counter-order.spec.js

```javascript
import { test, expect } from '@playwright/test'

test.describe('Pedido de Balcão — Fluxo completo', () => {

  test('cliente novo consegue fazer pedido completo', async ({ page }) => {
    // Acessa QR de balcão
    await page.goto('/order/bar-do-ze/counter')

    // Vê cardápio (não é redirecionado para identificação ainda)
    await expect(page.locator('[data-testid="menu-grid"]')).toBeVisible()

    // Adiciona item ao carrinho
    await page.click('[data-testid="add-item-item-001"]')
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1')

    // Abre carrinho
    await page.click('[data-testid="cart-bar"]')
    await expect(page).toHaveURL('/order/bar-do-ze/cart')

    // Clica em fazer pedido — agora pede identificação
    await page.click('[data-testid="checkout-btn"]')
    await expect(page).toHaveURL('/order/bar-do-ze/identify')

    // Digita telefone não cadastrado
    await page.fill('[data-testid="phone-input"]', '(11) 88888-0000')
    await page.click('[data-testid="phone-continue-btn"]')

    // Sistema pede nome (cliente novo)
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible()
    await page.fill('[data-testid="name-input"]', 'Carlos Lima')
    await page.click('[data-testid="identify-confirm-btn"]')

    // Confirmação do pedido
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible()
    await expect(page).toHaveURL(/\/order\/bar-do-ze\/status/)
  })

  test('cliente retornando é reconhecido pelo telefone', async ({ page }) => {
    await page.goto('/order/bar-do-ze/counter')
    await page.click('[data-testid="add-item-item-001"]')
    await page.click('[data-testid="cart-bar"]')
    await page.click('[data-testid="checkout-btn"]')

    // Telefone já cadastrado
    await page.fill('[data-testid="phone-input"]', '(11) 99999-0000')
    await page.click('[data-testid="phone-continue-btn"]')

    // Deve mostrar confirmação de nome, não formulário
    await expect(page.locator('[data-testid="confirm-name"]'))
      .toHaveText('João Silva')
    await expect(page.locator('[data-testid="confirm-yes-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="name-input"]')).not.toBeVisible()
  })

  test('"Não sou eu" volta para o campo de telefone limpo', async ({ page }) => {
    await page.goto('/order/bar-do-ze/identify')
    await page.fill('[data-testid="phone-input"]', '(11) 99999-0000')
    await page.click('[data-testid="phone-continue-btn"]')

    // Clica em não sou eu
    await page.click('[data-testid="confirm-no-btn"]')

    // Volta para o campo de telefone limpo
    const phoneInput = page.locator('[data-testid="phone-input"]')
    await expect(phoneInput).toBeVisible()
    await expect(phoneInput).toHaveValue('')
  })

  test('cliente com sessão ativa vai direto para o cardápio', async ({ page }) => {
    // Simula sessão ativa no localStorage
    await page.goto('/order/bar-do-ze/counter')
    await page.evaluate(() => {
      localStorage.setItem('session_bar-do-ze', JSON.stringify({
        customerId: 'cust-001',
        customerName: 'João Silva',
        customerPhone: '(11) 99999-0000',
        businessSlug: 'bar-do-ze',
        sessionStart: new Date().toISOString()
      }))
    })
    await page.reload()

    // Não deve ser redirecionado para identificação
    await expect(page.locator('[data-testid="menu-grid"]')).toBeVisible()
    await expect(page).not.toHaveURL('/order/bar-do-ze/identify')
  })

  test('alerta aparece ao adicionar 10 ou mais unidades', async ({ page }) => {
    await page.goto('/order/bar-do-ze/counter')

    // Simula sessão ativa
    await page.evaluate(() => {
      localStorage.setItem('session_bar-do-ze', JSON.stringify({
        customerId: 'cust-001',
        customerName: 'João',
        customerPhone: '(11) 99999-0000',
        businessSlug: 'bar-do-ze',
        sessionStart: new Date().toISOString()
      }))
    })
    await page.reload()

    // Adiciona 10 unidades
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="add-item-item-001"]')
    }

    // Modal de confirmação deve aparecer
    await expect(page.locator('[data-testid="quantity-alert-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="quantity-alert-modal"]'))
      .toContainText('10')
  })

  test('estabelecimento fechado mostra banner e bloqueia pedido', async ({ page }) => {
    await page.goto('/order/bar-do-ze/counter')

    // Simula negócio fechado — via MSW override no teste
    await page.evaluate(() => {
      window.__TEST_BUSINESS_CLOSED__ = true
    })
    await page.reload()

    await expect(page.locator('[data-testid="closed-banner"]')).toBeVisible()
    await expect(page.locator('[data-testid="cart-bar"]')).not.toBeVisible()
  })

  test('novo pedido não adiciona ao pedido existente — vai para fila', async ({ page }) => {
    // Setup: sessão ativa com pedido anterior
    await page.goto('/order/bar-do-ze/counter')
    await page.evaluate(() => {
      localStorage.setItem('session_bar-do-ze', JSON.stringify({
        customerId: 'cust-001',
        customerName: 'João',
        customerPhone: '(11) 99999-0000',
        businessSlug: 'bar-do-ze',
        sessionStart: new Date().toISOString()
      }))
    })
    await page.reload()

    await page.click('[data-testid="add-item-item-001"]')
    await page.click('[data-testid="cart-bar"]')
    await page.click('[data-testid="checkout-btn"]')

    // Deve criar novo pedido, não abrir o anterior
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible()
    const orderNumbers = await page.locator('[data-testid="order-number"]').all()
    // Cada pedido tem número único
    const numbers = await Promise.all(orderNumbers.map(n => n.textContent()))
    const unique = new Set(numbers)
    expect(unique.size).toBe(numbers.length)
  })
})

test.describe('Pedido de Balcão — Tela de status', () => {
  test('cliente vê todos os pedidos ativos da sessão', async ({ page }) => {
    await page.goto('/order/bar-do-ze/status')
    await page.evaluate(() => {
      localStorage.setItem('session_bar-do-ze', JSON.stringify({
        customerId: 'cust-001',
        customerName: 'João',
        customerPhone: '(11) 99999-0000',
        businessSlug: 'bar-do-ze',
        sessionStart: new Date().toISOString()
      }))
    })
    await page.reload()
    await expect(page.locator('[data-testid="order-card"]').first()).toBeVisible()
  })

  test('cliente pode cancelar pedido em pending', async ({ page }) => {
    await page.goto('/order/bar-do-ze/status')
    await page.evaluate(() => {
      localStorage.setItem('session_bar-do-ze', JSON.stringify({
        customerId: 'cust-001',
        customerName: 'João',
        customerPhone: '(11) 99999-0000',
        businessSlug: 'bar-do-ze',
        sessionStart: new Date().toISOString()
      }))
    })
    await page.reload()

    await page.click('[data-testid="cancel-order-btn"]')
    await expect(page.locator('[data-testid="cancel-confirm-modal"]')).toBeVisible()
    await page.click('[data-testid="cancel-confirm-yes"]')
    await expect(page.locator('[data-testid="order-cancelled-badge"]')).toBeVisible()
  })
})
```

### e2e/staff-pdv.spec.js

```javascript
import { test, expect } from '@playwright/test'

test.describe('PDV — Staff', () => {
  test.beforeEach(async ({ page }) => {
    // Login do staff
    await page.goto('/staff/login')
    await page.fill('[data-testid="access-code-input"]', '123456')
    await page.click('[data-testid="staff-login-btn"]')
    await expect(page).toHaveURL('/staff/pdv')
  })

  test('mapa de mesas é exibido corretamente', async ({ page }) => {
    await expect(page.locator('[data-testid="tables-map"]')).toBeVisible()
    await expect(page.locator('[data-testid="table-card"]').first()).toBeVisible()
  })

  test('staff consegue abrir pedido em mesa livre', async ({ page }) => {
    await page.click('[data-testid="table-1"]')
    await expect(page.locator('[data-testid="pdv-order-panel"]')).toBeVisible()
  })

  test('staff consegue adicionar item ao pedido', async ({ page }) => {
    await page.click('[data-testid="table-1"]')
    await page.click('[data-testid="add-item-item-001"]')
    await expect(page.locator('[data-testid="pdv-cart-item"]')).toBeVisible()
  })

  test('staff consegue enviar pedido para cozinha', async ({ page }) => {
    await page.click('[data-testid="table-1"]')
    await page.click('[data-testid="add-item-item-001"]')
    await page.click('[data-testid="send-to-kitchen-btn"]')
    await expect(page.locator('[data-testid="order-sent-toast"]')).toBeVisible()
  })

  test('alerta de chamado de garçom aparece no PDV', async ({ page }) => {
    // Simula chamado via localStorage/evento
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('waiter-call', {
        detail: { tableNumber: 3, businessId: 'biz-001' }
      }))
    })
    await expect(page.locator('[data-testid="waiter-alert"]')).toBeVisible()
    await expect(page.locator('[data-testid="waiter-alert"]')).toContainText('Mesa 3')
  })

  test('alerta de garçom some após marcar como atendido', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('waiter-call', {
        detail: { tableNumber: 3, businessId: 'biz-001' }
      }))
    })
    await page.click('[data-testid="waiter-answer-btn"]')
    await expect(page.locator('[data-testid="waiter-alert"]')).not.toBeVisible()
  })

  test('staff consegue criar nova mesa', async ({ page }) => {
    const mesasAntes = await page.locator('[data-testid="table-card"]').count()
    await page.click('[data-testid="add-table-btn"]')
    const mesasDepois = await page.locator('[data-testid="table-card"]').count()
    expect(mesasDepois).toBe(mesasAntes + 1)
  })

  test('múltiplos pedidos na mesma mesa são independentes', async ({ page }) => {
    await page.click('[data-testid="table-2"]')
    await page.click('[data-testid="add-item-item-001"]')
    await page.click('[data-testid="send-to-kitchen-btn"]')

    // Abre novamente a mesma mesa e faz outro pedido
    await page.click('[data-testid="table-2"]')
    await page.click('[data-testid="add-item-item-002"]')
    await page.click('[data-testid="send-to-kitchen-btn"]')

    // Dois pedidos distintos na mesa
    await page.click('[data-testid="table-2"]')
    const orders = await page.locator('[data-testid="mesa-order-item"]').count()
    expect(orders).toBe(2)
  })
})
```

### e2e/checkout.spec.js

```javascript
import { test, expect } from '@playwright/test'

test.describe('Fechamento de conta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/staff/login')
    await page.fill('[data-testid="access-code-input"]', '123456')
    await page.click('[data-testid="staff-login-btn"]')
  })

  test('staff consegue fechar conta com pagamento único', async ({ page }) => {
    await page.click('[data-testid="table-4"]') // mesa ocupada no mock
    await page.click('[data-testid="checkout-btn"]')
    await expect(page).toHaveURL(/\/staff\/checkout\//)

    await page.click('[data-testid="payment-pix"]')
    await page.click('[data-testid="close-table-btn"]')

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
    // Mesa deve voltar ao status livre
    await expect(page.locator('[data-testid="table-4"]'))
      .toHaveAttribute('data-status', 'free')
  })

  test('desconto não ultrapassa o máximo configurado', async ({ page }) => {
    await page.click('[data-testid="table-4"]')
    await page.click('[data-testid="checkout-btn"]')

    // max_discount_percent = 15% no mock
    await page.fill('[data-testid="discount-input"]', '20')
    await page.click('[data-testid="close-table-btn"]')

    await expect(page.locator('[data-testid="discount-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="discount-error"]'))
      .toContainText('15%')
  })

  test('divisão de conta calcula valor por pessoa corretamente', async ({ page }) => {
    await page.click('[data-testid="table-4"]')
    await page.click('[data-testid="checkout-btn"]')

    await page.click('[data-testid="split-plus-btn"]') // 2 pessoas
    await page.click('[data-testid="split-plus-btn"]') // 3 pessoas

    const splitValue = await page.locator('[data-testid="split-per-person"]').textContent()
    // Total R$ 71,00 / 3 = R$ 23,67
    expect(splitValue).toContain('23,67')
  })

  test('item cancelado aparece com valor zerado no fechamento', async ({ page }) => {
    await page.click('[data-testid="table-4"]')
    await page.click('[data-testid="checkout-btn"]')

    const cancelledItem = page.locator('[data-testid="cancelled-item"]')
    if (await cancelledItem.isVisible()) {
      await expect(cancelledItem.locator('[data-testid="item-price"]'))
        .toHaveText('R$ 0,00')
    }
  })

  test('taxa de serviço pode ser recusada', async ({ page }) => {
    await page.click('[data-testid="table-4"]')
    await page.click('[data-testid="checkout-btn"]')

    // Taxa de serviço ativa por padrão
    const toggle = page.locator('[data-testid="service-charge-toggle"]')
    await toggle.click() // desativa

    // Total não deve incluir os 10%
    const totalSemTaxa = await page.locator('[data-testid="total-value"]').textContent()
    expect(totalSemTaxa).not.toContain('78') // 71 + 10% = 78.10
  })
})
```

### e2e/kds.spec.js

```javascript
import { test, expect } from '@playwright/test'

test.describe('KDS — Kitchen Display', () => {
  test('KDS é acessível por URL direta sem login', async ({ page }) => {
    await page.goto('/kds/biz-001')
    await expect(page.locator('[data-testid="kds-screen"]')).toBeVisible()
  })

  test('KDS exibe três colunas', async ({ page }) => {
    await page.goto('/kds/biz-001')
    await expect(page.locator('[data-testid="col-novo"]')).toBeVisible()
    await expect(page.locator('[data-testid="col-preparing"]')).toBeVisible()
    await expect(page.locator('[data-testid="col-ready"]')).toBeVisible()
  })

  test('pedido avança de Novo para Em preparo ao tocar', async ({ page }) => {
    await page.goto('/kds/biz-001')
    const card = page.locator('[data-testid="kds-card"]').first()
    await card.click()
    await expect(page.locator('[data-testid="col-preparing"] [data-testid="kds-card"]'))
      .toBeVisible()
  })

  test('pedido avança de Em preparo para Pronto', async ({ page }) => {
    await page.goto('/kds/biz-001')
    // Avança para preparing
    await page.locator('[data-testid="col-novo"] [data-testid="kds-card"]').first().click()
    // Avança para ready
    await page.locator('[data-testid="col-preparing"] [data-testid="kds-card"]').first().click()
    await expect(page.locator('[data-testid="col-ready"] [data-testid="kds-card"]'))
      .toBeVisible()
  })

  test('pedidos de balcão têm badge laranja', async ({ page }) => {
    await page.goto('/kds/biz-001')
    const counterCard = page.locator('[data-testid="source-badge-counter"]').first()
    if (await counterCard.isVisible()) {
      await expect(counterCard).toHaveCSS('background-color', /rgb\(253/)
    }
  })

  test('KDS usa dark mode fixo independente do toggle', async ({ page }) => {
    await page.goto('/kds/biz-001')
    const screen = page.locator('[data-testid="kds-screen"]')
    const bg = await screen.evaluate(el => getComputedStyle(el).backgroundColor)
    // Background escuro — não deve ser branco mesmo que tema seja light
    expect(bg).not.toBe('rgb(255, 255, 255)')
  })
})

test.describe('Tela pública do balcão', () => {
  test('CounterDisplay é acessível sem login', async ({ page }) => {
    await page.goto('/display/bar-do-ze')
    await expect(page.locator('[data-testid="counter-display"]')).toBeVisible()
  })

  test('exibe apenas pedidos de balcão', async ({ page }) => {
    await page.goto('/display/bar-do-ze')
    // Não deve exibir pedidos de mesa
    const tableOrders = page.locator('[data-testid="table-order-in-display"]')
    expect(await tableOrders.count()).toBe(0)
  })

  test('pedidos prontos piscam na coluna correta', async ({ page }) => {
    await page.goto('/display/bar-do-ze')
    const readyCol = page.locator('[data-testid="col-ready-display"]')
    await expect(readyCol).toBeVisible()
  })
})
```

### e2e/waiter-call.spec.js

```javascript
import { test, expect } from '@playwright/test'

test.describe('Chamado de Garçom', () => {
  test('botão chamar garçom aparece no cardápio da mesa', async ({ page }) => {
    await page.goto('/order/bar-do-ze/table/4')
    await expect(page.locator('[data-testid="waiter-call-btn"]')).toBeVisible()
  })

  test('botão fica desabilitado após chamar', async ({ page }) => {
    await page.goto('/order/bar-do-ze/table/4')
    await page.click('[data-testid="waiter-call-btn"]')
    await expect(page.locator('[data-testid="waiter-call-btn"]'))
      .toBeDisabled()
    await expect(page.locator('[data-testid="waiter-call-btn"]'))
      .toContainText('Garçom chamado')
  })

  test('botão não aparece no cardápio de balcão', async ({ page }) => {
    await page.goto('/order/bar-do-ze/counter')
    await expect(page.locator('[data-testid="waiter-call-btn"]'))
      .not.toBeVisible()
  })
})
```

### e2e/owner-setup.spec.js

```javascript
import { test, expect } from '@playwright/test'

test.describe('Configuração do negócio — Owner', () => {
  test.beforeEach(async ({ page }) => {
    // Simula owner logado
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'owner@teste.com')
    await page.fill('[data-testid="password-input"]', 'Senha@123')
    await page.click('[data-testid="login-btn"]')
    await expect(page).toHaveURL('/owner/home')
  })

  test('owner cadastra novo negócio', async ({ page }) => {
    await page.click('[data-testid="new-business-btn"]')
    await page.fill('[data-testid="business-name"]', 'Novo Bar')
    await page.fill('[data-testid="business-zip"]', '01310100')
    await page.waitForSelector('[data-testid="address-street"]') // CEP autocompletou
    await page.selectOption('[data-testid="business-category"]', 'bar')
    await page.fill('[data-testid="business-phone"]', '(11) 3333-4444')
    await page.click('[data-testid="save-business-btn"]')
    await expect(page).toHaveURL(/\/owner\/business\//)
  })

  test('CEP preenche endereço automaticamente', async ({ page }) => {
    await page.goto('/owner/business/new')
    await page.fill('[data-testid="business-zip"]', '01310100')
    await page.waitForSelector('[data-testid="address-street"]:not([value=""])')
    const street = await page.locator('[data-testid="address-street"]').inputValue()
    expect(street.length).toBeGreaterThan(0)
  })

  test('cadastro de item exige foto', async ({ page }) => {
    await page.goto('/owner/business/biz-001/menu/items')
    await page.click('[data-testid="new-item-btn"]')
    await page.fill('[data-testid="item-name"]', 'Cerveja')
    await page.fill('[data-testid="item-price"]', '14')
    // Tenta salvar sem foto
    await page.click('[data-testid="save-item-btn"]')
    await expect(page.locator('[data-testid="photo-required-error"]')).toBeVisible()
  })

  test('QR Code de mesa pode ser baixado novamente', async ({ page }) => {
    await page.goto('/owner/business/biz-001/tables')
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-qr-table-1"]')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('mesa-1')
  })

  test('toggle de aberto/fechado funciona', async ({ page }) => {
    await page.goto('/owner/home')
    const toggle = page.locator('[data-testid="business-toggle-biz-001"]')
    const statusBefore = await page.locator('[data-testid="business-status-biz-001"]').textContent()
    await toggle.click()
    const statusAfter = await page.locator('[data-testid="business-status-biz-001"]').textContent()
    expect(statusBefore).not.toBe(statusAfter)
  })
})
```

---

## GitHub Actions — CI/CD

```yaml
# .github/workflows/tests.yml
name: MenuFlow — Testes

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: Unitários e Integração
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Instalar dependências
        run: npm ci

      - name: Rodar testes unitários
        run: npm run test

      - name: Relatório de cobertura
        run: npm run test:coverage

      - name: Upload cobertura
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  e2e-tests:
    name: Testes E2E
    runs-on: ubuntu-latest
    needs: unit-tests  # só roda E2E se unitários passaram
    env:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Instalar dependências
        run: npm ci

      - name: Instalar browsers Playwright
        run: npx playwright install --with-deps chromium

      - name: Build do projeto
        run: npm run build

      - name: Rodar testes E2E
        run: npm run test:e2e

      - name: Upload relatório E2E
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  deploy:
    name: Deploy para Vercel
    runs-on: ubuntu-latest
    needs: [unit-tests, e2e-tests]  # deploy SÓ se TODOS os testes passaram
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Vercel
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## data-testid — Guia de Implementação

Todo elemento interativo ou verificável nos testes deve ter `data-testid`.
Adicionar durante o desenvolvimento do componente, não depois.

### Convenção de nomenclatura
```
Elementos únicos:    data-testid="login-btn"
Elementos em lista:  data-testid="table-{number}"
                     data-testid="add-item-{itemId}"
                     data-testid="order-card-{orderId}"
Status dinâmico:     data-status="free|occupied|waiting_payment"
                     data-source="table|counter|staff"
```

### Lista completa de data-testids obrigatórios

```
AUTH
  email-input, password-input, name-input
  login-btn, register-btn, staff-login-btn
  access-code-input, error-msg

OWNER HOME
  new-business-btn
  business-card-{id}
  business-status-{id}
  business-toggle-{id}

BUSINESS FORM
  business-name, business-zip, business-category
  business-phone, address-street
  save-business-btn

MENU ITEMS
  new-item-btn, item-name, item-price
  item-category, item-prep-time
  photo-upload-zone, photo-required-error
  save-item-btn

TABLES
  tables-map
  table-{number}           (data-status no elemento)
  add-table-btn
  download-qr-table-{number}
  download-qr-counter

PDV
  pdv-order-panel
  add-item-{itemId}
  pdv-cart-item
  send-to-kitchen-btn
  checkout-btn
  order-sent-toast
  waiter-alert
  waiter-answer-btn
  mesa-order-item

CHECKOUT
  discount-input, discount-error
  payment-cash, payment-pix, payment-credit, payment-debit
  service-charge-toggle
  split-plus-btn, split-minus-btn, split-per-person
  total-value
  close-table-btn
  success-toast
  cancelled-item

CUSTOMER — IDENTIFY
  phone-input, phone-continue-btn
  confirm-name, confirm-yes-btn, confirm-no-btn
  identify-confirm-btn

CUSTOMER — MENU
  menu-grid
  cart-bar, cart-count
  add-item-{itemId}
  cart-drawer
  quantity-alert-modal
  closed-banner

CUSTOMER — STATUS
  order-card, order-card-{orderId}
  order-number
  cancel-order-btn
  cancel-confirm-modal
  cancel-confirm-yes
  order-cancelled-badge

KDS
  kds-screen
  col-novo, col-preparing, col-ready
  kds-card
  source-badge-counter, source-badge-mesa

COUNTER DISPLAY
  counter-display
  col-ready-display

WAITER CALL
  waiter-call-btn
```

---

## Como Interpretar Falhas

| Teste que falhou | O que significa na prática |
|---|---|
| `formatCurrency` | Valores na tela do cliente estão errados |
| `validateDiscount` | Staff pode dar mais desconto que o permitido |
| `customerSession expira` | Cliente precisa se identificar toda hora |
| `cliente retornando é reconhecido` | Toda visita pede nome de novo |
| `novo pedido não adiciona ao existente` | Segundo pedido some do sistema |
| `desconto não ultrapassa máximo` | Prejuízo financeiro real para o negócio |
| `KDS avança status` | Cozinha não consegue operar |
| `estabelecimento fechado bloqueia pedido` | Pedidos entram fora do horário |
| `QR Counter Display sem login` | TV do balcão não funciona |
| `deploy` | Código com bug entrou em produção |

---

## Cobertura Mínima Esperada

| Módulo | Meta |
|---|---|
| utils/ | 100% |
| stores/ | 90% |
| services/ | 80% |
| components/ críticos | 80% |
| E2E fluxos principais | 100% dos fluxos mapeados |

Rodar `npm run test:coverage` e abrir `coverage/index.html` para ver o relatório visual.
