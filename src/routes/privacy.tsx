import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Política de Privacidade - Bruno & Zaki Garage Diecast" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Política de Privacidade
        </h1>
        
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>
            Na <strong>Bruno & Zaki Garage Diecast</strong>, a privacidade e segurança dos seus dados pessoais são nossa prioridade. 
            Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações quando você utiliza nosso site e serviços.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. Coleta de Informações</h2>
          <p>
            Coletamos informações essenciais para o processamento das suas reservas e melhoria da sua experiência de usuário. Isso inclui:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Dados Cadastrais:</strong> Nome completo, endereço de e-mail e número de telefone (WhatsApp), fornecidos no momento do cadastro ou reserva.</li>
            <li><strong>Dados de Navegação:</strong> Informações de uso, logs e dados analíticos (através do Sentry) para identificar problemas técnicos e melhorar a performance da plataforma.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Uso das Informações</h2>
          <p>Utilizamos os seus dados pessoais exclusivamente para:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Gerenciar, processar e atualizar o status das suas reservas de miniaturas.</li>
            <li>Entrar em contato via WhatsApp ou E-mail para combinar detalhes de pagamento e envio.</li>
            <li>Prevenir fraudes e garantir a segurança das contas.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. Proteção e Segurança</h2>
          <p>
            As suas informações são armazenadas em infraestrutura em nuvem altamente segura (Supabase), que utiliza criptografia e rigorosas políticas de acesso. 
            Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. Seus Direitos</h2>
          <p>
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de acessar, corrigir ou solicitar a exclusão dos seus dados pessoais a qualquer momento. 
            Para exercer esses direitos, basta entrar em contato através dos nossos canais de atendimento.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Alterações nesta Política</h2>
          <p>
            Reservamo-nos o direito de modificar esta Política de Privacidade a qualquer momento. Alterações significativas serão notificadas através do site ou via e-mail.
          </p>
          
          <p className="pt-8 text-sm">
            <em>Última atualização: Agosto de 2026.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
