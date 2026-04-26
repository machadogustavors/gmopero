'use client';

import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  PaginatedResponse,
  Product,
  StockMovement,
  StockMovementType,
} from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const movementTypeLabel: Record<StockMovementType, string> = {
  PURCHASE_IN: 'Entrada por compra',
  SERVICE_OUT: 'Saída por OS',
  ADJUSTMENT_IN: 'Ajuste entrada',
  ADJUSTMENT_OUT: 'Ajuste saída',
  REVERSAL: 'Reversão',
};

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (type?: string, productId?: string) => {
    try {
      const params = new URLSearchParams();
      if (type && type !== 'ALL') params.set('type', type);
      if (productId && productId !== 'ALL') params.set('productId', productId);
      params.set('limit', '200');

      const query = params.toString() ? `?${params}` : '';

      const [movementRes, productRes] = await Promise.all([
        api.get<PaginatedResponse<StockMovement>>(`/inventory/movements${query}`),
        api.get<PaginatedResponse<Product>>('/products?type=PART&activeOnly=true&limit=300'),
      ]);

      setMovements(movementRes.data);
      setProducts(productRes.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar movimentações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = () => {
    loadData(typeFilter, productFilter);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Movimentações de Estoque</h1>
        <p className="text-muted-foreground">Histórico de entradas, saídas e ajustes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Tipo de movimentação</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PURCHASE_IN">Entrada por compra</SelectItem>
              <SelectItem value="SERVICE_OUT">Saída por OS</SelectItem>
              <SelectItem value="ADJUSTMENT_IN">Ajuste entrada</SelectItem>
              <SelectItem value="ADJUSTMENT_OUT">Ajuste saída</SelectItem>
              <SelectItem value="REVERSAL">Reversão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Produto</Label>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.code ? `${product.code} - ` : ''}
                  {product.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button variant="outline" onClick={applyFilters}>
        <Filter className="mr-2 h-4 w-4" /> Filtrar
      </Button>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Carregando movimentações...
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{new Date(movement.createdAt).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{movement.product?.description ?? movement.productId}</TableCell>
                    <TableCell>{movementTypeLabel[movement.type]}</TableCell>
                    <TableCell className="text-right">{Number(movement.quantity).toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      {movement.unitCost !== null
                        ? Number(movement.unitCost).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>{movement.referenceType ?? '—'}</TableCell>
                    <TableCell>{movement.notes ?? '—'}</TableCell>
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
