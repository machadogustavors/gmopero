'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, FileText, DollarSign, Clock, Wallet, AlertTriangle } from 'lucide-react';
import type {
  CashFlowResponse,
  PaginatedResponse,
  ReceivablesResponse,
  ReplenishmentSuggestionsResponse,
  ServiceOrder,
} from '@/lib/types';

export default function DashboardPage() {
  const [recentOrders, setRecentOrders] = useState<ServiceOrder[]>([]);
  const [receivablesSummary, setReceivablesSummary] = useState<ReceivablesResponse['summary'] | null>(null);
  const [cashFlowSummary, setCashFlowSummary] = useState<CashFlowResponse['summary'] | null>(null);
  const [highUrgencyStockCount, setHighUrgencyStockCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersResponse, receivablesResponse, cashFlowResponse, suggestionsResponse] = await Promise.all([
        api.get<PaginatedResponse<ServiceOrder>>('/service-orders?limit=10'),
        api.get<ReceivablesResponse>('/finance/receivables?limit=5'),
        api.get<CashFlowResponse>('/finance/cash-flow'),
        api.get<ReplenishmentSuggestionsResponse>('/inventory/replenishment-suggestions?days=30&limit=20'),
      ]);

      setRecentOrders(ordersResponse.data);
      setReceivablesSummary(receivablesResponse.summary);
      setCashFlowSummary(cashFlowResponse.summary);
      setHighUrgencyStockCount(suggestionsResponse.summary.highUrgencyCount);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusCounts = {
    open: recentOrders.filter((o) => o.status === 'OPEN' || o.status === 'DRAFT').length,
    closed: recentOrders.filter((o) => o.status === 'CLOSED').length,
    invoiced: recentOrders.filter((o) => o.status === 'INVOICED').length,
  };

  const totalRevenue = recentOrders
    .filter((o) => o.status === 'INVOICED')
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'outline',
      OPEN: 'secondary',
      CLOSED: 'default',
      INVOICED: 'default',
      CANCELLED: 'destructive',
    };
    return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando painel...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Painel</h1>
        <p className="text-muted-foreground">Visão geral da atividade da sua oficina</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ordens Abertas</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fechadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.closed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faturadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.invoiced}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita (OS faturadas)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">A receber</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(receivablesSummary?.totalPending ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo caixa (período)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${Number(cashFlowSummary?.balance ?? 0) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {Number(cashFlowSummary?.balance ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estoque crítico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{highUrgencyStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordens de Serviço Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma ordem de serviço ainda. Crie a primeira!
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      OS #{order.orderNumber}
                      {order.customer && 'name' in order.customer
                        ? ` — ${order.customer.name}`
                        : ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.description ?? 'Sem descrição'}
                      {order.vehicle && 'licensePlate' in order.vehicle
                        ? ` • ${order.vehicle.licensePlate}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      R$ {Number(order.totalAmount).toFixed(2)}
                    </span>
                    {statusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
