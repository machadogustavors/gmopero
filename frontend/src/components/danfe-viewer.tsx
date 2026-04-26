'use client';

import { forwardRef } from 'react';

interface DanfeItem {
  codigo: string;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface DanfeData {
  // NF-e header
  numero: string | null;
  serie: string | null;
  chaveAcesso: string | null;
  naturezaOperacao: string;
  dataEmissao: string | null;
  dataSaida: string | null;
  horaSaida: string | null;
  tipoOperacao: '0' | '1'; // 0=Entrada, 1=Saída

  // Emitente
  emitente: {
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    inscricaoEstadual?: string;
    endereco: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    telefone?: string;
  };

  // Destinatário
  destinatario: {
    razaoSocial: string;
    cnpjCpf: string;
    inscricaoEstadual?: string;
    endereco: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    telefone?: string;
  };

  // Impostos
  impostos: {
    baseCalculoIcms: number;
    valorIcms: number;
    baseCalculoIcmsSt: number;
    valorIcmsSt: number;
    valorTotalProdutos: number;
    valorFrete: number;
    valorSeguro: number;
    desconto: number;
    outrasDespesas: number;
    valorIpi: number;
    valorTotalNota: number;
  };

  // Items
  itens: DanfeItem[];

  // Info complementar
  informacoesComplementares?: string;
  status: string;
}

export interface DanfeViewerProps {
  data: DanfeData;
}

function formatCnpjCpf(value: string) {
  const v = value.replace(/\D/g, '');
  if (v.length === 14) {
    return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (v.length === 11) {
    return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return value;
}

function formatAccessKey(key: string) {
  return key.replace(/(.{4})/g, '$1 ').trim();
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR');
}

const DanfeViewer = forwardRef<HTMLDivElement, DanfeViewerProps>(({ data }, ref) => {
  return (
    <div ref={ref} className="danfe-container bg-white text-black w-[210mm] mx-auto text-[9px] leading-tight font-['Arial',sans-serif]" style={{ minHeight: '297mm' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .danfe-container { width: 100% !important; }
          .no-print { display: none !important; }
        }
        .danfe-container * { box-sizing: border-box; }
        .danfe-cell { border: 1px solid #000; padding: 2px 4px; }
        .danfe-label { font-size: 7px; color: #333; display: block; }
        .danfe-value { font-size: 9px; font-weight: 600; }
        .danfe-header { font-weight: 700; font-size: 8px; background: #e5e5e5; text-align: center; padding: 2px; border: 1px solid #000; }
      `}</style>

      <div className="border border-black p-1">
        {/* === RECIBO (Top strip) === */}
        <div className="border border-black p-1 mb-1 text-[8px]">
          <div className="flex justify-between">
            <span>Recebemos de <strong>{data.emitente.razaoSocial}</strong> os produtos e/ou serviços constantes da Nota Fiscal Eletrônica indicada ao lado.</span>
            <div className="border border-black px-2 py-1 text-center ml-2 whitespace-nowrap">
              <div className="text-[10px] font-bold">NF-e</div>
              <div className="font-bold">N° {data.numero ?? '—'}</div>
              <div>Série {data.serie ?? '—'}</div>
            </div>
          </div>
          <div className="flex mt-1 gap-2">
            <div className="flex-1 border-t border-black pt-0.5">
              <span className="danfe-label">DATA DO RECEBIMENTO</span>
            </div>
            <div className="flex-[3] border-t border-black pt-0.5">
              <span className="danfe-label">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
            </div>
          </div>
        </div>

        {/* === HEADER: Emitente + DANFE + Barcode === */}
        <div className="flex border border-black">
          {/* Emitente */}
          <div className="flex-[4] border-r border-black p-2 flex flex-col justify-center">
            <div className="text-[12px] font-bold text-center">{data.emitente.razaoSocial}</div>
            {data.emitente.nomeFantasia && <div className="text-center text-[9px]">{data.emitente.nomeFantasia}</div>}
            <div className="text-center text-[8px] mt-1">
              {data.emitente.endereco}<br />
              {data.emitente.bairro} - CEP: {data.emitente.cep}<br />
              {data.emitente.municipio} - {data.emitente.uf}
              {data.emitente.telefone && <><br />Fone: {data.emitente.telefone}</>}
            </div>
          </div>

          {/* DANFE */}
          <div className="flex-[2] border-r border-black p-2 text-center flex flex-col items-center justify-center">
            <div className="text-[14px] font-bold tracking-wider">DANFE</div>
            <div className="text-[7px] leading-tight">Documento Auxiliar da<br />Nota Fiscal Eletrônica</div>
            <div className="mt-1 text-[9px]">
              <span>{data.tipoOperacao === '0' ? '0 - ENTRADA' : '1 - SAÍDA'}</span>
            </div>
            <div className="mt-1">
              <div className="text-[10px] font-bold">N° {data.numero ?? '—'}</div>
              <div className="font-bold">SÉRIE {data.serie ?? '—'}</div>
            </div>
          </div>

          {/* Barcode / Access key */}
          <div className="flex-[4] p-2 flex flex-col justify-center items-center">
            {data.chaveAcesso && (
              <>
                <div className="text-[8px] mb-1">CHAVE DE ACESSO</div>
                <div className="text-[8px] font-mono tracking-wider text-center break-all">
                  {formatAccessKey(data.chaveAcesso)}
                </div>
              </>
            )}
            <div className="text-[7px] mt-2 text-center">
              Consulta de autenticidade no portal nacional da NF-e<br />
              www.nfe.fazenda.gov.br/portal
            </div>
          </div>
        </div>

        {/* === NATUREZA + PROTOCOLO === */}
        <div className="flex">
          <div className="danfe-cell flex-[6]">
            <span className="danfe-label">NATUREZA DA OPERAÇÃO</span>
            <span className="danfe-value">{data.naturezaOperacao}</span>
          </div>
          <div className="danfe-cell flex-[4]">
            <span className="danfe-label">PROTOCOLO DE AUTORIZAÇÃO DE USO</span>
            <span className="danfe-value">{data.status === 'COMPLETED' ? 'NFe autorizada' : data.status}</span>
          </div>
        </div>

        {/* === IE / IE ST / CNPJ === */}
        <div className="flex">
          <div className="danfe-cell flex-1">
            <span className="danfe-label">INSCRIÇÃO ESTADUAL</span>
            <span className="danfe-value">{data.emitente.inscricaoEstadual ?? ''}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO</span>
            <span className="danfe-value"></span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">CNPJ</span>
            <span className="danfe-value">{formatCnpjCpf(data.emitente.cnpj)}</span>
          </div>
        </div>

        {/* === DESTINATÁRIO / REMETENTE === */}
        <div className="danfe-header">DESTINATÁRIO / REMETENTE</div>
        <div className="flex">
          <div className="danfe-cell flex-[5]">
            <span className="danfe-label">NOME / RAZÃO SOCIAL</span>
            <span className="danfe-value">{data.destinatario.razaoSocial}</span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">CNPJ / CPF</span>
            <span className="danfe-value">{formatCnpjCpf(data.destinatario.cnpjCpf)}</span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">DATA DA EMISSÃO</span>
            <span className="danfe-value">{formatDate(data.dataEmissao)}</span>
          </div>
        </div>
        <div className="flex">
          <div className="danfe-cell flex-[4]">
            <span className="danfe-label">ENDEREÇO</span>
            <span className="danfe-value">{data.destinatario.endereco}</span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">BAIRRO / DISTRITO</span>
            <span className="danfe-value">{data.destinatario.bairro}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">CEP</span>
            <span className="danfe-value">{data.destinatario.cep}</span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">DATA DA SAÍDA</span>
            <span className="danfe-value">{formatDate(data.dataSaida)}</span>
          </div>
        </div>
        <div className="flex">
          <div className="danfe-cell flex-[3]">
            <span className="danfe-label">MUNICÍPIO</span>
            <span className="danfe-value">{data.destinatario.municipio}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">UF</span>
            <span className="danfe-value">{data.destinatario.uf}</span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">TELEFONE / FAX</span>
            <span className="danfe-value">{data.destinatario.telefone ?? ''}</span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">INSCRIÇÃO ESTADUAL</span>
            <span className="danfe-value">{data.destinatario.inscricaoEstadual ?? ''}</span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">HORA DA SAÍDA</span>
            <span className="danfe-value">{data.horaSaida ?? ''}</span>
          </div>
        </div>

        {/* === CÁLCULO DO IMPOSTO === */}
        <div className="danfe-header">CÁLCULO DO IMPOSTO</div>
        <div className="flex">
          <div className="danfe-cell flex-1">
            <span className="danfe-label">BASE DE CÁLCULO DO ICMS</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.baseCalculoIcms)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">VALOR DO ICMS</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.valorIcms)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">BASE DE CÁLCULO DO ICMS SUBST.</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.baseCalculoIcmsSt)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">VALOR DO ICMS SUBST.</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.valorIcmsSt)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">VALOR TOTAL DOS PRODUTOS</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.valorTotalProdutos)}</span>
          </div>
        </div>
        <div className="flex">
          <div className="danfe-cell flex-1">
            <span className="danfe-label">VALOR DO FRETE</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.valorFrete)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">VALOR DO SEGURO</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.valorSeguro)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">DESCONTO</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.desconto)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">OUTRAS DESPESAS ACESSÓRIAS</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.outrasDespesas)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">VALOR DO IPI</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.valorIpi)}</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">VALOR TOTAL DA NOTA</span>
            <span className="danfe-value text-right block">{formatCurrency(data.impostos.valorTotalNota)}</span>
          </div>
        </div>

        {/* === TRANSPORTADOR / VOLUMES === */}
        <div className="danfe-header">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
        <div className="flex">
          <div className="danfe-cell flex-[3]">
            <span className="danfe-label">NOME / RAZÃO SOCIAL</span>
            <span className="danfe-value"></span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">FRETE POR CONTA</span>
            <span className="danfe-value">0 - REMETENTE</span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">CÓDIGO ANTT</span>
            <span className="danfe-value"></span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">PLACA DO VEÍCULO</span>
            <span className="danfe-value"></span>
          </div>
          <div className="danfe-cell w-10">
            <span className="danfe-label">UF</span>
            <span className="danfe-value"></span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">CNPJ / CPF</span>
            <span className="danfe-value"></span>
          </div>
        </div>
        <div className="flex">
          <div className="danfe-cell flex-[3]">
            <span className="danfe-label">ENDEREÇO</span>
            <span className="danfe-value"></span>
          </div>
          <div className="danfe-cell flex-[2]">
            <span className="danfe-label">MUNICÍPIO</span>
            <span className="danfe-value"></span>
          </div>
          <div className="danfe-cell w-10">
            <span className="danfe-label">UF</span>
            <span className="danfe-value"></span>
          </div>
          <div className="danfe-cell flex-1">
            <span className="danfe-label">INSCRIÇÃO ESTADUAL</span>
            <span className="danfe-value"></span>
          </div>
        </div>

        {/* === DADOS DOS PRODUTOS / SERVIÇOS === */}
        <div className="danfe-header">DADOS DOS PRODUTOS / SERVIÇOS</div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="danfe-cell text-[7px] font-bold w-14">CÓDIGO</th>
              <th className="danfe-cell text-[7px] font-bold">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
              <th className="danfe-cell text-[7px] font-bold w-16">NCM/SH</th>
              <th className="danfe-cell text-[7px] font-bold w-10">CSOSN</th>
              <th className="danfe-cell text-[7px] font-bold w-10">CFOP</th>
              <th className="danfe-cell text-[7px] font-bold w-10">UNID.</th>
              <th className="danfe-cell text-[7px] font-bold w-12 text-right">QTDE.</th>
              <th className="danfe-cell text-[7px] font-bold w-16 text-right">VALOR UNIT.</th>
              <th className="danfe-cell text-[7px] font-bold w-16 text-right">VALOR TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.itens.map((item, i) => (
              <tr key={i}>
                <td className="danfe-cell text-[8px]">{item.codigo}</td>
                <td className="danfe-cell text-[8px]">{item.descricao}</td>
                <td className="danfe-cell text-[8px]">{item.ncm ?? ''}</td>
                <td className="danfe-cell text-[8px]"></td>
                <td className="danfe-cell text-[8px]">{item.cfop ?? ''}</td>
                <td className="danfe-cell text-[8px]">{item.unidade}</td>
                <td className="danfe-cell text-[8px] text-right">{item.quantidade.toFixed(2)}</td>
                <td className="danfe-cell text-[8px] text-right">{formatCurrency(item.valorUnitario)}</td>
                <td className="danfe-cell text-[8px] text-right">{formatCurrency(item.valorTotal)}</td>
              </tr>
            ))}
            {/* Fill empty rows for minimum visual */}
            {data.itens.length < 5 && Array.from({ length: 5 - data.itens.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="danfe-cell text-[8px]">&nbsp;</td>
                <td className="danfe-cell text-[8px]"></td>
                <td className="danfe-cell text-[8px]"></td>
                <td className="danfe-cell text-[8px]"></td>
                <td className="danfe-cell text-[8px]"></td>
                <td className="danfe-cell text-[8px]"></td>
                <td className="danfe-cell text-[8px]"></td>
                <td className="danfe-cell text-[8px]"></td>
                <td className="danfe-cell text-[8px]"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* === DADOS ADICIONAIS === */}
        <div className="danfe-header">DADOS ADICIONAIS</div>
        <div className="flex">
          <div className="danfe-cell flex-1 min-h-[60px]">
            <span className="danfe-label">INFORMAÇÕES COMPLEMENTARES</span>
            <span className="danfe-value text-[8px] font-normal whitespace-pre-wrap">
              {data.informacoesComplementares ?? ''}
            </span>
          </div>
          <div className="danfe-cell flex-1 min-h-[60px]">
            <span className="danfe-label">RESERVADO AO FISCO</span>
          </div>
        </div>

        {/* === FOOTER === */}
        <div className="text-[7px] text-center mt-1">
          DATA E HORA DA IMPRESSÃO: {formatDateTime(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
});

DanfeViewer.displayName = 'DanfeViewer';

export { DanfeViewer };
export type { DanfeData, DanfeItem };
