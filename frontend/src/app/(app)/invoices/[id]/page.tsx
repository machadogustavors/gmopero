'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DanfeViewer, type DanfeData } from '@/components/danfe-viewer';
import { ArrowLeft, Printer, FileDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice, Company, ServiceOrderItem, Customer } from '@/lib/types';
import { isTrustedExternalUrl } from '@/lib/url';

interface InvoiceDetail {
  id: string;
  companyId: string;
  serviceOrderId: string;
  plugnotasId: string | null;
  integrationId: string | null;
  type: string;
  status: string;
  accessKey: string | null;
  invoiceNumber: string | null;
  series: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  message: string | null;
  totalAmount: number;
  issuedAt: string | null;
  createdAt: string;
  company: Company;
  serviceOrder: {
    id: string;
    orderNumber: number;
    description: string | null;
    totalAmount: number;
    totalParts: number;
    totalServices: number;
    customer: Customer | null;
    vehicle: { id: string; licensePlate: string; brand?: string; model?: string } | null;
    items: ServiceOrderItem[];
  };
}

const statusLabels: Record<string, string> = {
  PROCESSING: 'Processando',
  COMPLETED: 'Autorizada',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
  DENIED: 'Denegada',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PROCESSING: 'secondary',
  COMPLETED: 'default',
  REJECTED: 'destructive',
  DENIED: 'destructive',
  CANCELLED: 'outline',
};

function buildDanfeData(invoice: InvoiceDetail): DanfeData {
  const company = invoice.company;
  const customer = invoice.serviceOrder?.customer;
  const items = invoice.serviceOrder?.items ?? [];

  const totalProdutos = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);

  return {
    numero: invoice.invoiceNumber,
    serie: invoice.series,
    chaveAcesso: invoice.accessKey,
    naturezaOperacao: 'PRESTACAO DE SERVICOS',
    dataEmissao: invoice.issuedAt ?? invoice.createdAt,
    dataSaida: invoice.issuedAt,
    horaSaida: invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleTimeString('pt-BR') : null,
    tipoOperacao: '1',

    emitente: {
      razaoSocial: company.legalName ?? company.name,
      nomeFantasia: company.name !== company.legalName ? company.name : undefined,
      cnpj: company.taxId ?? '',
      inscricaoEstadual: company.stateRegistration ?? undefined,
      endereco: [company.street, company.number].filter(Boolean).join(', '),
      bairro: company.neighborhood ?? '',
      cep: company.zipCode ?? '',
      municipio: company.city ?? '',
      uf: company.state ?? '',
      telefone: company.phone ?? undefined,
    },

    destinatario: {
      razaoSocial: customer?.name ?? 'CONSUMIDOR FINAL',
      cnpjCpf: customer?.taxId ?? '',
      endereco: [customer?.street, customer?.number].filter(Boolean).join(', ') || '',
      bairro: customer?.neighborhood ?? '',
      cep: customer?.zipCode ?? '',
      municipio: customer?.city ?? '',
      uf: customer?.state ?? '',
      telefone: customer?.phone ?? undefined,
    },

    impostos: {
      baseCalculoIcms: 0,
      valorIcms: 0,
      baseCalculoIcmsSt: 0,
      valorIcmsSt: 0,
      valorTotalProdutos: totalProdutos,
      valorFrete: 0,
      valorSeguro: 0,
      desconto: 0,
      outrasDespesas: 0,
      valorIpi: 0,
      valorTotalNota: Number(invoice.totalAmount),
    },

    itens: items.map((item, index) => ({
      codigo: `ITEM-${index + 1}`,
      descricao: item.description,
      ncm: item.ncm,
      cfop: item.cfop,
      unidade: 'UN',
      quantidade: Number(item.quantity),
      valorUnitario: Number(item.unitPrice),
      valorTotal: Number(item.totalPrice),
    })),

    informacoesComplementares: invoice.serviceOrder?.description
      ? `OS #${invoice.serviceOrder.orderNumber} - ${invoice.serviceOrder.description}`
      : `OS #${invoice.serviceOrder?.orderNumber ?? ''}`,
    status: invoice.status,
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    try {
      const data = await api.get<InvoiceDetail>(`/invoices/${params.id}`);
      setInvoice(data);
    } catch {
      toast.error('Falha ao carregar nota fiscal');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up bloqueado. Permita pop-ups para imprimir.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DANFE - NF-e ${invoice?.invoiceNumber ?? ''}</title>
        <style>
          @page { size: A4; margin: 5mm; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .danfe-container { width: 200mm; margin: 0 auto; font-size: 9px; line-height: 1.2; color: #000; }
          .danfe-cell { border: 1px solid #000; padding: 2px 4px; }
          .danfe-label { font-size: 7px; color: #333; display: block; }
          .danfe-value { font-size: 9px; font-weight: 600; }
          .danfe-header { font-weight: 700; font-size: 8px; background: #e5e5e5; text-align: center; padding: 2px; border: 1px solid #000; }
          table { width: 100%; border-collapse: collapse; }
          .flex { display: flex; }
          .flex-1 { flex: 1; }
          .flex-\\[2\\] { flex: 2; }
          .flex-\\[3\\] { flex: 3; }
          .flex-\\[4\\] { flex: 4; }
          .flex-\\[5\\] { flex: 5; }
          .flex-\\[6\\] { flex: 6; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .font-mono { font-family: 'Courier New', monospace; }
          .border { border: 1px solid #000; }
          .border-black { border-color: #000; }
          .border-r { border-right: 1px solid #000; }
          .border-t { border-top: 1px solid #000; }
          .p-1 { padding: 4px; }
          .p-2 { padding: 8px; }
          .px-2 { padding-left: 8px; padding-right: 8px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .mb-1 { margin-bottom: 4px; }
          .ml-2 { margin-left: 8px; }
          .gap-2 { gap: 8px; }
          .w-10 { width: 40px; }
          .w-14 { width: 56px; }
          .w-16 { width: 64px; }
          .w-12 { width: 48px; }
          .min-h-\\[60px\\] { min-height: 60px; }
          .whitespace-nowrap { white-space: nowrap; }
          .whitespace-pre-wrap { white-space: pre-wrap; }
          .break-all { word-break: break-all; }
          .tracking-wider { letter-spacing: 0.05em; }
          .leading-tight { line-height: 1.25; }
          .block { display: block; }
          .items-center { align-items: center; }
          .justify-center { justify-content: center; }
          .justify-between { justify-content: space-between; }
          .flex-col { flex-direction: column; }
          .text-\\[7px\\] { font-size: 7px; }
          .text-\\[8px\\] { font-size: 8px; }
          .text-\\[9px\\] { font-size: 9px; }
          .text-\\[10px\\] { font-size: 10px; }
          .text-\\[12px\\] { font-size: 12px; }
          .text-\\[14px\\] { font-size: 14px; }
          .font-normal { font-weight: 400; }
          .pt-0\\.5 { padding-top: 2px; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nota fiscal não encontrada</p>
      </div>
    );
  }

  const danfeData = buildDanfeData(invoice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              NF-e {invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm">
              {invoice.accessKey ? `Chave: ${invoice.accessKey}` : `ID: ${invoice.id}`}
            </p>
          </div>
          <Badge variant={statusVariant[invoice.status]} className="ml-2">
            {statusLabels[invoice.status] ?? invoice.status}
          </Badge>
        </div>

        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          {isTrustedExternalUrl(invoice.pdfUrl) && (
            <a href={invoice.pdfUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                PDF PlugNotas
              </Button>
            </a>
          )}
          {isTrustedExternalUrl(invoice.xmlUrl) && (
            <a href={invoice.xmlUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                XML
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Message card if rejected/errored */}
      {invoice.message && invoice.status !== 'COMPLETED' && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive">Mensagem da SEFAZ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.message}</p>
          </CardContent>
        </Card>
      )}

      {/* DANFE Visualization */}
      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <div ref={printRef}>
            <DanfeViewer data={danfeData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
