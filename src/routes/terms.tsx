import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "Termos de Uso - Bruno & Zaki Garage Diecast" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Termos de Uso
        </h1>
        
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>
            Bem-vindo à <strong>Bruno & Zaki Garage Diecast</strong>. Ao acessar e utilizar o nosso site, você concorda com estes Termos de Uso. 
            Leia atentamente as condições abaixo antes de realizar qualquer reserva.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. Sobre o Serviço</h2>
          <p>
            A Bruno & Zaki Garage Diecast é uma plataforma online focada na exposição e reserva de miniaturas colecionáveis (Diecast).
            O nosso sistema permite que você reserve itens de estoque limitado. <strong>A reserva não constitui a compra final.</strong>
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Processo de Reserva e Compra</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Reserva:</strong> Ao finalizar uma reserva no site, o item é temporariamente bloqueado no estoque.</li>
            <li><strong>Pagamento:</strong> O pagamento não é processado automaticamente no site. Após a reserva, o cliente ou a loja entrarão em contato via WhatsApp/E-mail para alinhar o método de pagamento (Pix, Transferência, etc.) e os custos de envio.</li>
            <li><strong>Cancelamento por inatividade:</strong> Caso o pagamento não seja efetuado em até 48 horas (ou prazo estipulado no atendimento), a reserva será cancelada e o item retornará ao estoque público.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. Cadastro e Segurança</h2>
          <p>
            Para realizar reservas, é necessário criar uma conta informando dados verídicos. O usuário é o único responsável por manter a confidencialidade de sua senha 
            e por todas as atividades realizadas sob a sua conta. Temos limites anti-abuso (ex: limite de 5 reservas por minuto) para garantir um ambiente justo a todos os colecionadores.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. Condição dos Itens</h2>
          <p>
            Tratamos de itens colecionáveis. As fotos das miniaturas no catálogo são reais ou referências diretas do modelo. 
            Qualquer detalhe específico sobre a embalagem (cartelas amoldadas, pequenos desgastes naturais) será informado ou poderá ser solicitado durante o atendimento.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Disposições Finais</h2>
          <p>
            O uso abusivo da plataforma, incluindo criação de múltiplas contas falsas para reter estoque, resultará no banimento imediato do usuário.
            A loja reserva-se o direito de cancelar reservas em caso de falha de sistema ou indisponibilidade física do produto.
          </p>

          <p className="pt-8 text-sm">
            <em>Última atualização: Agosto de 2026.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
