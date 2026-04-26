'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, Eye } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Invoice, PaginatedResponse } from '@/lib/types';
import { isTrustedExternalUrl } from '@/lib/url';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PROCESSING: 'secondary',
  COMPLETED: 'default',
  REJECTED: 'destructive',
  DENIED: 'destructive',
  CANCELLED: 'outline',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async (status?: string) => {
    try {
      const params = status ? `?status=${status}` : '';
      const response = await api.get<PaginatedResponse<Invoice>>(`/invoices${params}`);
      setInvoices(response.data);
    } catch {
      toast.error('Falha ao carregar notas fiscais');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notas Fiscais</h1>
        <p className="text-muted-foreground">Visualize os documentos fiscais emitidos</p>
      </div>

      <div className="flex gap-2">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            const v = value === 'ALL' ? '' : value;
            setStatusFilter(v);
            loadInvoices(v || undefined);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="PROCESSING">Processando</SelectItem>
            <SelectItem value="COMPLETED">Concluída</SelectItem>
            <SelectItem value="REJECTED">Rejeitada</SelectItem>
            <SelectItem value="DENIED">Negada</SelectItem>
            <SelectItem value="CANCELLED">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma nota fiscal encontrada</TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/invoices/${inv.id}`}>
                    <TableCell>
                      <Badge variant="outline">{inv.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{inv.invoiceNumber ?? '—'}</TableCell>
                    <TableCell>
                      #{inv.serviceOrder?.orderNumber ?? '—'}
                    </TableCell>
                    <TableCell>{inv.serviceOrder?.customer?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[inv.status]}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {Number(inv.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/invoices/${inv.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" title="Visualizar DANFE">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {isTrustedExternalUrl(inv.pdfUrl) && (
                          <a href={inv.pdfUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" title="PDF PlugNotas">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
