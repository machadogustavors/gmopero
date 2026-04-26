'use client';

import { useEffect, useState } from 'react';
import { Search, AlertTriangle, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { api } from '@/lib/api';
import type {
  PaginatedResponse,
  Product,
  ReplenishmentSuggestion,
  ReplenishmentSuggestionsResponse,
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[]>([]);

  const loadStock = async (searchTerm?: string, onlyLow = false) => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (onlyLow) params.set('lowOnly', 'true');
      params.set('limit', '200');

      const query = params.toString() ? `?${params}` : '';
      const [stockResponse, suggestionsResponse] = await Promise.all([
        api.get<PaginatedResponse<Product>>(`/inventory/stock${query}`),
        api.get<ReplenishmentSuggestionsResponse>('/inventory/replenishment-suggestions?days=30&limit=8'),
      ]);
      setProducts(stockResponse.data);
      setSuggestions(suggestionsResponse.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar estoque');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStock(undefined, false);
  }, []);

  const lowStockCount = products.filter((p) => Number(p.currentStock) <= Number(p.reorderLevel)).length;
  const totalStockValue = products.reduce(
    (sum, product) => sum + Number(product.currentStock) * Number(product.unitCost),
    0,
  );

  const applyFilters = () => {
    loadStock(search || undefined, lowOnly);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Estoque</h1>
        <p className="text-muted-foreground">Acompanhe saldo e itens com reposição necessária</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens em estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Boxes className="h-5 w-5" />
              {products.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alerta de baixo estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {lowStockCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor do estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalStockValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por código ou descrição"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          className="max-w-md"
        />
        <Button variant={lowOnly ? 'default' : 'outline'} onClick={() => setLowOnly((v) => !v)}>
          {lowOnly ? 'Somente baixo estoque: ligado' : 'Somente baixo estoque: desligado'}
        </Button>
        <Button variant="outline" onClick={applyFilters}>
          <Search className="mr-2 h-4 w-4" />
          Filtrar
        </Button>
        <Link href="/inventory/movements">
          <Button variant="outline">Ver movimentações</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Reposição</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="text-right">Valor em estoque</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Carregando estoque...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const currentStock = Number(product.currentStock);
                  const reorderLevel = Number(product.reorderLevel);
                  const isLow = currentStock <= reorderLevel;
                  const stockValue = currentStock * Number(product.unitCost);

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-xs">{product.code ?? '—'}</TableCell>
                      <TableCell>{product.description}</TableCell>
                      <TableCell className="text-right">{currentStock.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{reorderLevel.toFixed(3)}</TableCell>
                      <TableCell className="text-right">
                        {Number(product.unitCost).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {stockValue.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isLow ? 'destructive' : 'default'}>
                          {isLow ? 'Baixo estoque' : 'OK'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sugestões de Reposição (30 dias)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Consumo no período</TableHead>
                <TableHead className="text-right">Cobertura (dias)</TableHead>
                <TableHead className="text-right">Sugestão de compra</TableHead>
                <TableHead className="text-right">Custo estimado</TableHead>
                <TableHead>Urgência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Carregando sugestões...
                  </TableCell>
                </TableRow>
              ) : suggestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Sem sugestões de reposição no momento
                  </TableCell>
                </TableRow>
              ) : (
                suggestions.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <div className="font-medium">{item.description}</div>
                      <div className="text-xs text-muted-foreground">{item.code ?? 'Sem código'}</div>
                    </TableCell>
                    <TableCell className="text-right">{item.consumedInPeriod.toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      {item.daysOfCoverage === null ? '—' : item.daysOfCoverage.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.suggestedQuantity.toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      {item.estimatedCost.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.urgency === 'HIGH' ? 'destructive' : 'secondary'}>
                        {item.urgency === 'HIGH' ? 'Alta' : 'Média'}
                      </Badge>
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
