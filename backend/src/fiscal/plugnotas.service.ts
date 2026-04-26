import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, InvoiceType, ServiceOrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class PlugnotasService {
  private readonly logger = new Logger(PlugnotasService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = this.configService.get<string>('PLUGNOTAS_BASE_URL')
      ?? 'https://api.sandbox.plugnotas.com.br';
    this.apiKey = this.configService.get<string>('PLUGNOTAS_API_KEY') ?? '';
  }

  // ── Company Registration ─────────────────────────────

  async registerCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    if (!company.taxId || !company.legalName) {
      throw new BadRequestException(
        'CNPJ e Razão Social são obrigatórios para cadastro no PlugNotas.',
      );
    }

    if (!company.street || !company.cityCode || !company.state || !company.zipCode) {
      throw new BadRequestException(
        'Endereço completo é obrigatório para cadastro no PlugNotas.',
      );
    }

    if (!company.fiscalRegime) {
      throw new BadRequestException(
        'Regime Tributário é obrigatório para cadastro no PlugNotas.',
      );
    }

    const payload: any = {
      cpfCnpj: company.taxId.replace(/\D/g, ''),
      razaoSocial: company.legalName,
      nomeFantasia: company.name,
      inscricaoEstadual: company.stateRegistration || undefined,
      simplesNacional: company.fiscalRegime === 1 || company.fiscalRegime === 2,
      regimeTributario: company.fiscalRegime,
      endereco: {
        logradouro: company.street,
        numero: company.number || 'S/N',
        complemento: company.complement || undefined,
        bairro: company.neighborhood || 'N/I',
        codigoCidade: company.cityCode,
        estado: company.state,
        cep: company.zipCode.replace(/\D/g, ''),
      },
    };

    const response = await fetch(`${this.baseUrl}/empresa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`PlugNotas register company error: ${response.status} - ${errorBody}`);
      throw new BadRequestException(
        `Falha ao cadastrar empresa no PlugNotas: ${errorBody}`,
      );
    }

    const result = await response.json();

    // Mark company as registered
    await this.prisma.company.update({
      where: { id: companyId },
      data: { plugnotasRegistered: true },
    });

    this.logger.log('Company successfully registered in PlugNotas');

    return result;
  }

  async uploadCertificate(
    companyId: string,
    certificateBuffer: Buffer,
    certificatePassword: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company?.taxId) {
      throw new BadRequestException('CNPJ da empresa não encontrado.');
    }

    const cnpj = company.taxId.replace(/\D/g, '');

    // PlugNotas expects multipart/form-data for certificate upload
    const formData = new FormData();
    formData.append(
      'arquivo',
      new Blob([new Uint8Array(certificateBuffer)], { type: 'application/x-pkcs12' }),
      'certificate.pfx',
    );
    formData.append('senha', certificatePassword);

    const response = await fetch(`${this.baseUrl}/empresa/${cnpj}/certificado`, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`PlugNotas certificate upload error: ${response.status} - ${errorBody}`);
      throw new BadRequestException(
        `Falha ao enviar certificado: ${errorBody}`,
      );
    }

    const result = await response.json();
    this.logger.log('Certificate uploaded to PlugNotas');

    return result;
  }

  async getCompanyStatus(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company?.taxId) {
      return { registered: false, message: 'CNPJ não configurado.' };
    }

    const cnpj = company.taxId.replace(/\D/g, '');

    const response = await fetch(`${this.baseUrl}/empresa/${cnpj}`, {
      headers: { 'X-API-KEY': this.apiKey },
    });

    if (!response.ok) {
      return { registered: false, message: 'Empresa não cadastrada no PlugNotas.' };
    }

    const data = await response.json();
    return {
      registered: true,
      hasCertificate: !!data.certificado,
      certificateExpiry: data.certificado?.validade ?? null,
      data,
    };
  }

  async emitNfe(serviceOrderId: string, companyId: string) {
    // Load full service order with relations
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, companyId },
      include: {
        customer: true,
        items: true,
        company: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Service order not found');
    }

    if (order.status !== ServiceOrderStatus.CLOSED) {
      throw new BadRequestException('Service order must be CLOSED to emit invoice');
    }

    // Validate company fiscal data
    if (!order.company.taxId || !order.company.legalName) {
      throw new BadRequestException(
        'Company fiscal data is incomplete. Please fill in company settings first.',
      );
    }

    const integrationId = randomUUID();

    // Build PlugNotas payload
    const payload = this.buildNfePayload(order, integrationId);

    // Send to PlugNotas
    const response = await fetch(`${this.baseUrl}/nfe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify([payload]),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`PlugNotas API error: ${response.status} - ${errorBody}`);

      // Detect unregistered company error
      if (response.status === 404 && errorBody.includes('Empresa')) {
        throw new BadRequestException(
          'Empresa não cadastrada no PlugNotas. Acesse Configurações e cadastre a empresa antes de emitir notas.',
        );
      }

      throw new BadRequestException(`Falha ao emitir nota: ${response.statusText}`);
    }

    const result = await response.json();

    // Save invoice record
    const plugnotasId = result.documents?.[0]?.id ?? null;

    const invoice = await this.prisma.invoice.create({
      data: {
        companyId,
        serviceOrderId,
        plugnotasId,
        integrationId,
        type: InvoiceType.NFE,
        status: InvoiceStatus.PROCESSING,
        totalAmount: order.totalAmount,
      },
    });

    this.logger.log(`Invoice created: ${invoice.id} (PlugNotas: ${plugnotasId})`);

    return invoice;
  }

  async checkStatus(plugnotasId: string) {
    const response = await fetch(`${this.baseUrl}/nfe/${plugnotasId}/resumo`, {
      headers: { 'X-API-KEY': this.apiKey },
    });

    if (!response.ok) {
      this.logger.error(`PlugNotas status check failed: ${response.status}`);
      return null;
    }

    return response.json();
  }

  async processWebhook(body: any) {
    const { id, idIntegracao, status, chave, numero, serie, pdf, xml, mensagem } = body;

    const invoice = await this.prisma.invoice.findUnique({
      where: { integrationId: idIntegracao },
      select: { id: true, companyId: true, serviceOrderId: true },
    });

    if (!invoice) {
      this.logger.warn(`Webhook received for unknown integration: ${idIntegracao}`);
      return { received: true, processed: false };
    }

    // Validate that the invoice belongs to a registered company
    const company = await this.prisma.company.findFirst({
      where: { id: invoice.companyId, plugnotasRegistered: true },
      select: { id: true },
    });

    if (!company) {
      this.logger.warn(
        `Webhook rejected: invoice ${invoice.id} belongs to unregistered company ${invoice.companyId}`,
      );
      return { received: true, processed: false };
    }

    const mappedStatus = this.mapPlugnotasStatus(status);

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        plugnotasId: id,
        status: mappedStatus,
        accessKey: chave ?? null,
        invoiceNumber: numero?.toString() ?? null,
        series: serie?.toString() ?? null,
        pdfUrl: this.sanitizeExternalUrl(pdf),
        xmlUrl: this.sanitizeExternalUrl(xml),
        message: mensagem ?? null,
        issuedAt: mappedStatus === InvoiceStatus.COMPLETED ? new Date() : null,
      },
    });

    // If completed, mark service order as invoiced
    if (mappedStatus === InvoiceStatus.COMPLETED) {
      await this.prisma.serviceOrder.update({
        where: { id: invoice.serviceOrderId },
        data: {
          status: ServiceOrderStatus.INVOICED,
          invoicedAt: new Date(),
        },
      });
    }

    this.logger.log(`Webhook processed: invoice ${invoice.id} → ${mappedStatus}`);

    return { received: true, processed: true };
  }

  async cancelInvoice(companyId: string, plugnotasId: string, justification?: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        companyId,
        plugnotasId,
      },
      select: {
        id: true,
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found for this company');
    }

    const response = await fetch(`${this.baseUrl}/nfe/${plugnotasId}/cancelamento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify({
        justificativa: justification ?? 'Cancelamento solicitado pelo emitente.',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadRequestException(`Failed to cancel invoice: ${errorBody}`);
    }

    const result = await response.json();

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return result;
  }

  async correctionLetter(companyId: string, plugnotasId: string, correction: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        companyId,
        plugnotasId,
      },
      select: {
        id: true,
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found for this company');
    }

    const response = await fetch(`${this.baseUrl}/nfe/${plugnotasId}/cce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify({ correcao: correction }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadRequestException(`Failed to send correction letter: ${errorBody}`);
    }

    return response.json();
  }

  private sanitizeExternalUrl(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:') {
        return null;
      }

      const allowedHosts = this.configService
        .get<string>('PLUGNOTAS_ALLOWED_HOSTS')
        ?.split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean);

      if (allowedHosts && allowedHosts.length > 0) {
        const host = parsed.hostname.toLowerCase();
        const isAllowed = allowedHosts.some((allowedHost) => (
          host === allowedHost || host.endsWith(`.${allowedHost}`)
        ));

        if (!isAllowed) {
          return null;
        }
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }

  // ── Payload Builder ──────────────────────────────────

  private buildNfePayload(order: any, integrationId: string) {
    const company = order.company;
    const customer = order.customer;
    const isSimplesNacional = company.fiscalRegime === 1 || company.fiscalRegime === 2;

    const payload: any = {
      idIntegracao: integrationId,
      presencial: '1',
      consumidorFinal: true,
      natureza: 'PRESTACAO DE SERVICOS',
      emitente: {
        cpfCnpj: company.taxId.replace(/\D/g, ''),
        razaoSocial: company.legalName,
        nomeFantasia: company.name,
        inscricaoEstadual: company.stateRegistration || undefined,
        simplesNacional: isSimplesNacional,
        regimeTributario: company.fiscalRegime,
        endereco: {
          logradouro: company.street,
          numero: company.number || 'S/N',
          complemento: company.complement || undefined,
          bairro: company.neighborhood || 'N/I',
          codigoCidade: company.cityCode,
          estado: company.state,
          cep: company.zipCode?.replace(/\D/g, ''),
        },
      },
      itens: order.items.map((item: any, index: number) => {
        const quantidade = Number(item.quantity);
        const valorUnitario = Number(item.unitPrice);
        return {
          codigo: `ITEM-${index + 1}`,
          descricao: item.description,
          ncm: item.ncm ?? '00000000',
          cfop: item.cfop ?? '5102',
          unidade: 'UN',
          quantidade,
          valorUnitario,
          valor: Number((quantidade * valorUnitario).toFixed(2)),
          tributos: {
            icms: {
              origem: company.defaultIcmsOrigem ?? '0',
              cst: company.defaultIcmsCst ?? (isSimplesNacional ? '41' : '00'),
              ...(isSimplesNacional && { csosn: company.defaultIcmsCsosn ?? '102' }),
            },
            pis: { cst: company.defaultPisCst ?? '99' },
            cofins: { cst: company.defaultCofinsCst ?? '99' },
          },
        };
      }),
      pagamentos: [
        {
          tipo: '01', // cash
          valor: Number(order.totalAmount),
        },
      ],
    };

    // Add recipient — always include destinatario
    if (customer) {
      payload.destinatario = {
        cpfCnpj: customer.taxId?.replace(/\D/g, '') || undefined,
        razaoSocial: customer.name || 'CONSUMIDOR FINAL',
        email: customer.email ?? undefined,
      };

      const hasCompleteAddress = customer.street && customer.cityCode && customer.state && customer.zipCode;
      payload.destinatario.endereco = hasCompleteAddress
        ? {
          logradouro: customer.street,
          numero: customer.number ?? 'S/N',
          bairro: customer.neighborhood ?? 'N/I',
          codigoCidade: customer.cityCode,
          estado: customer.state,
          cep: customer.zipCode.replace(/\D/g, ''),
        }
        : {
          logradouro: company.street,
          numero: company.number || 'S/N',
          bairro: company.neighborhood || 'N/I',
          codigoCidade: company.cityCode,
          estado: company.state,
          cep: company.zipCode?.replace(/\D/g, ''),
        };
    } else {
      payload.destinatario = {
        razaoSocial: 'CONSUMIDOR FINAL',
        endereco: {
          logradouro: company.street,
          numero: company.number || 'S/N',
          bairro: company.neighborhood || 'N/I',
          codigoCidade: company.cityCode,
          estado: company.state,
          cep: company.zipCode?.replace(/\D/g, ''),
        },
      };
    }

    return payload;
  }

  private mapPlugnotasStatus(status: string): InvoiceStatus {
    const map: Record<string, InvoiceStatus> = {
      CONCLUIDO: InvoiceStatus.COMPLETED,
      REJEITADO: InvoiceStatus.REJECTED,
      CANCELADO: InvoiceStatus.CANCELLED,
      DENEGADO: InvoiceStatus.DENIED,
      PROCESSANDO: InvoiceStatus.PROCESSING,
    };

    return map[status] ?? InvoiceStatus.PROCESSING;
  }
}
