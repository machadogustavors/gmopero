'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { CashFlowResponse, ReceivablesResponse, ReceivableStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';

const receivableStatusLabel: Record<ReceivableStatus, string> = {
  OPEN: 'Em aberto',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
};

export default function FinancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [receivables, setReceivables] = useState<ReceivablesResponse | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowResponse | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | ReceivableStatus>('ALL');
  const [from, setFrom] = useState<string>(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const loadData = async () => {
    setIsLoading(true);
    try {
      const receivablesQuery = new URLSearchParams();
      if (search) receivablesQuery.set('search', search);
      if (status !== 'ALL') receivablesQuery.set('status', status);
      receivablesQuery.set('limit', '50');

      const cashFlowQuery = new URLSearchParams();
      if (from) cashFlowQuery.set('from', from);
      if (to) cashFlowQuery.set('to', to);

      const [receivablesResponse, cashFlowResponse] = await Promise.all([
        api.get<ReceivablesResponse>(`/finance/receivables?${receivablesQuery.toString()}`),
        api.get<CashFlowResponse>(`/finance/cash-flow?${cashFlowQuery.toString()}`),
      ]);

      setReceivables(receivablesResponse);
      setCashFlow(cashFlowResponse);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar financeiro');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = useMemo(
    () => receivables?.data.filter((item) => item.pendingAmount > 0).length ?? 0,
    [receivables],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Contas a receber por OS e fluxo de caixa da operação</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">A receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(receivables?.summary.totalPending ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{receivables?.summary.overdueCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {Number(cashFlow?.summary.inflows ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo do período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${Number(cashFlow?.summary.balance ?? 0) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {Number(cashFlow?.summary.balance ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-6">
          <div className="space-y-2 md:col-span-2">
            <Label>Buscar por OS ou cliente</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex.: 1023 ou João" />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as 'ALL' | ReceivableStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="OPEN">Em aberto</SelectItem>
                <SelectItem value="PARTIAL">Parcial</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="OVERDUE">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={loadData}>Aplicar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber ({pendingCount} pendentes)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : !receivables?.data.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma conta encontrada</TableCell>
                </TableRow>
              ) : (
                receivables.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">#{item.orderNumber}</TableCell>
                    <TableCell>{item.customer?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'OVERDUE' ? 'destructive' : item.status === 'PAID' ? 'default' : 'secondary'}>
                        {receivableStatusLabel[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.dueDate).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      {item.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa do Período</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : !cashFlow?.movements.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhuma movimentação no período</TableCell>
                </TableRow>
              ) : (
                cashFlow.movements.map((movement) => (
                  <TableRow key={`${movement.type}-${movement.id}`}>
                    <TableCell>{new Date(movement.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge variant={movement.type === 'INFLOW' ? 'default' : 'secondary'}>
                        {movement.type === 'INFLOW' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell>{movement.description}</TableCell>
                    <TableCell className={`text-right font-medium ${movement.type === 'INFLOW' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {movement.amount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
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
