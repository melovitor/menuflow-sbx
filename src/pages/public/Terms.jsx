import { useState } from 'react'
import { IconMoon, IconSun, IconArrowLeft } from '@tabler/icons-react'
import { toggleTheme } from '../../utils/theme'

const LAST_UPDATED = '14 de maio de 2026'
const TERMS_VERSION = '1.0'

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">{title}</h2>
      <div className="flex flex-col gap-2 text-[13px] text-[var(--text-2)] leading-relaxed">
        {children}
      </div>
    </section>
  )
}

export default function Terms() {
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">

      {/* Header */}
      <header className="h-[52px] px-5 flex items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
          >
            <IconArrowLeft size={15} />
          </button>
          <span className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
            Menu<span className="text-accent">Flow</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggleTheme}
          className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
        >
          {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-[720px] mx-auto w-full px-5 py-8 flex flex-col gap-8">

        {/* Title */}
        <div>
          <h1 className="text-[22px] font-medium text-[var(--text)] tracking-[-0.5px] mb-2">
            Termos de Uso
          </h1>
          <p className="text-[12px] text-[var(--text-3)]">
            Versão {TERMS_VERSION} · Atualizado em {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. O que é o MenuFlow">
          <p>
            O <strong className="text-[var(--text)]">MenuFlow</strong> é uma plataforma SaaS de gestão para
            bares e restaurantes. Oferece ferramentas para gerenciamento de cardápio digital, pedidos via QR Code,
            Kitchen Display System (KDS), controle de mesas e fechamento de conta.
          </p>
          <p>
            Ao acessar ou utilizar o MenuFlow, você concorda integralmente com estes Termos de Uso.
            Se não concordar, não utilize o serviço.
          </p>
        </Section>

        <Section title="2. Responsabilidades do Operador (owner)">
          <p>O operador que contrata o MenuFlow é responsável por:</p>
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li>Manter informações verídicas no cadastro (nome, endereço, contato)</li>
            <li>Garantir que o conteúdo do cardápio (preços, descrições, fotos) seja preciso e lícito</li>
            <li>Utilizar o sistema apenas para finalidades lícitas relacionadas à operação do estabelecimento</li>
            <li>Manter o código de acesso do staff em sigilo e não compartilhá-lo com terceiros não autorizados</li>
            <li>Cumprir as obrigações fiscais e legais aplicáveis ao seu estabelecimento</li>
            <li>Respeitar a privacidade dos clientes cujos dados transitam pelo sistema</li>
            <li>Manter senha de acesso segura e não a compartilhar</li>
          </ul>
        </Section>

        <Section title="3. Responsabilidades do MenuFlow">
          <p>O MenuFlow se compromete a:</p>
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li>Manter o serviço disponível com o melhor esforço razoável</li>
            <li>Proteger os dados armazenados conforme a Política de Privacidade</li>
            <li>Notificar usuários sobre interrupções programadas com antecedência razoável</li>
            <li>Corrigir falhas técnicas identificadas em prazo adequado</li>
            <li>Não vender ou compartilhar dados pessoais com terceiros para fins comerciais</li>
          </ul>
        </Section>

        <Section title="4. Proibições">
          <p>É expressamente proibido ao usuário:</p>
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li>Utilizar o MenuFlow para fins ilegais, fraudulentos ou que violem direitos de terceiros</li>
            <li>Tentar acessar sistemas ou dados de outros usuários sem autorização</li>
            <li>Realizar engenharia reversa, descompilar ou modificar o software</li>
            <li>Revender, sublicenciar ou transferir o acesso à plataforma sem autorização expressa</li>
            <li>Sobrecarregar intencionalmente os servidores (ataques DDoS ou similares)</li>
            <li>Cadastrar informações falsas, enganosas ou que induzam outros usuários ao erro</li>
            <li>Automatizar acessos de forma não autorizada (bots, scrapers)</li>
          </ul>
        </Section>

        <Section title="5. Disponibilidade e Limitação de Responsabilidade">
          <p>
            O MenuFlow é fornecido <em>"no estado em que se encontra"</em> (as-is). Não garantimos
            disponibilidade ininterrupta ou livre de erros.
          </p>
          <p>
            O MenuFlow <strong className="text-[var(--text)]">não se responsabiliza</strong> por:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li>Perdas de receita ou lucros cessantes decorrentes de interrupções do serviço</li>
            <li>Danos causados por uso indevido da plataforma pelo operador ou sua equipe</li>
            <li>Transações financeiras realizadas fora da plataforma</li>
            <li>Erros de cadastro de preços, disponibilidade de itens ou informações do estabelecimento</li>
            <li>Obrigações fiscais do operador perante seus clientes ou o fisco</li>
          </ul>
          <p>
            Em nenhuma hipótese a responsabilidade total do MenuFlow excederá o valor pago pelo operador
            nos últimos 3 meses de assinatura.
          </p>
        </Section>

        <Section title="6. Propriedade Intelectual">
          <p>
            Todo o software, design, marca, logotipo e conteúdo do MenuFlow são propriedade exclusiva de
            seus desenvolvedores. É vedada qualquer reprodução, distribuição ou uso não autorizado.
          </p>
          <p>
            O operador mantém a propriedade sobre o conteúdo que inserir na plataforma (cardápio, fotos,
            dados do estabelecimento), concedendo ao MenuFlow licença não exclusiva para armazenamento
            e exibição necessários à prestação do serviço.
          </p>
        </Section>

        <Section title="7. Cancelamento e Rescisão">
          <p>
            O operador pode cancelar sua conta a qualquer momento nas configurações do perfil.
            Após o cancelamento:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li>O acesso é encerrado imediatamente</li>
            <li>Os dados são mantidos por 30 dias para possibilidade de reativação</li>
            <li>Após 30 dias, os dados são anonimizados conforme a Política de Privacidade</li>
            <li>Pedidos e registros necessários por obrigação legal são mantidos por 90 dias</li>
          </ul>
          <p>
            O MenuFlow pode suspender contas que violem estes Termos, com ou sem aviso prévio.
          </p>
        </Section>

        <Section title="8. Alterações nos Termos">
          <p>
            O MenuFlow pode alterar estes Termos a qualquer momento. Alterações relevantes serão comunicadas
            por e-mail com antecedência mínima de 15 dias. O uso continuado após a data de vigência implica
            aceite das novas condições.
          </p>
        </Section>

        <Section title="9. Foro e Legislação Aplicável">
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil.
            Fica eleito o foro da Comarca de <strong className="text-[var(--text)]">São Paulo/SP</strong> para
            dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia a qualquer outro
            por mais privilegiado que seja.
          </p>
        </Section>

        <p className="text-[11px] text-[var(--text-3)] border-t border-[var(--border)] pt-5">
          Última atualização: {LAST_UPDATED} — Versão {TERMS_VERSION}
        </p>

      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-5 px-5 text-center">
        <p className="text-[11px] text-[var(--text-3)]">
          © {new Date().getFullYear()} MenuFlow · Todos os direitos reservados ·{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-2)] underline underline-offset-2">
            Política de Privacidade
          </a>
        </p>
      </footer>

    </div>
  )
}
