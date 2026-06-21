'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Plus,
  Trash2,
  DollarSign,
  Play,
  Lock,
  Ban,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import type {
  ServiceOrder,
  ServiceOrderItem,
  ItemType,
  PaymentMethod,
  Payment,
  Product,
  PaginatedResponse,
} from '@/lib/types';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  OPEN: 'secondary',
  CLOSED: 'default',
  INVOICED: 'default',
  CANCELLED: 'destructive',
};

export default function ServiceOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [laborInvoiceIssued, setLaborInvoiceIssued] = useState(false);
  const [partsInvoiceIssued, setPartsInvoiceIssued] = useState(false);

  // Add Item dialog
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [itemType, setItemType] = useState<ItemType>('PART');
  const [itemDescription, setItemDescription] = useState('');
  const [itemNcm, setItemNcm] = useState('');
  const [itemCfop, setItemCfop] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnitPrice, setItemUnitPrice] = useState('');

  // Catalog
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Add Payment dialog
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('PIX');
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const loadOrder = useCallback(async () => {
    try {
      const data = await api.get<ServiceOrder>(`/service-orders/${orderId}`);
      setOrder(data);
      setLaborInvoiceIssued(data.laborInvoiceIssued);
      setPartsInvoiceIssued(data.partsInvoiceIssued);
    } catch {
      toast.error('Falha ao carregar ordem de serviço');
      router.push('/service-orders');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Load catalog when item dialog opens
  useEffect(() => {
    if (isItemOpen && catalogProducts.length === 0) {
      api.get<PaginatedResponse<Product>>('/products?limit=200')
        .then((res) => setCatalogProducts(res.data))
        .catch(() => {});
    }
  }, [isItemOpen, catalogProducts.length]);

  const selectFromCatalog = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) return;
    const product = catalogProducts.find((p) => p.id === productId);
    if (product) {
      setItemType(product.type);
      setItemDescription(product.description);
      setItemNcm(product.ncm ?? '');
      setItemCfop(product.cfop ?? '');
      setItemUnitPrice(String(Number(product.unitPrice)));
    }
  };

  const selectedProduct = selectedProductId
    ? catalogProducts.find((product) => product.id === selectedProductId)
    : null;

  const selectedQuantity = Number(itemQuantity || 0);
  const selectedStock = selectedProduct ? Number(selectedProduct.currentStock ?? 0) : null;
  const hasStockWarning =
    Boolean(selectedProduct) &&
    itemType === 'PART' &&
    selectedStock !== null &&
    selectedQuantity > 0 &&
    selectedQuantity > selectedStock;

  const handleStatusTransition = async (action: string) => {
    try {
      await api.patch(`/service-orders/${orderId}/${action}`);
      toast.success(`Ordem ${action === 'open' ? 'aberta' : action === 'close' ? 'fechada' : action === 'cancel' ? 'cancelada' : action}`);
      loadOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar status');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/service-orders/${orderId}/items`, {
        productId: selectedProductId || undefined,
        type: itemType,
        description: itemDescription,
        ncm: itemNcm || undefined,
        cfop: itemCfop || undefined,
        quantity: parseFloat(itemQuantity),
        unitPrice: parseFloat(itemUnitPrice),
      });
      toast.success('Item adicionado');
      setIsItemOpen(false);
      resetItemForm();
      loadOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao adicionar item');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await api.delete(`/service-orders/${orderId}/items/${itemId}`);
      toast.success('Item removido');
      loadOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover item');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        serviceOrderId: orderId,
        method: payMethod,
        amount: parseFloat(payAmount),
        notes: payNotes || undefined,
      });
      toast.success('Pagamento registrado');
      setIsPaymentOpen(false);
      setPayAmount('');
      setPayNotes('');
      loadOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao adicionar pagamento');
    }
  };

  const handleToggleInvoiceFlag = async (
    flag: 'laborInvoiceIssued' | 'partsInvoiceIssued',
    value: boolean,
  ) => {
    try {
      await api.patch(`/service-orders/${orderId}/invoice-flags`, { [flag]: value });
      if (flag === 'laborInvoiceIssued') setLaborInvoiceIssued(value);
      else setPartsInvoiceIssued(value);
      loadOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar nota');
    }
  };

  const resetItemForm = () => {
    setItemType('PART');
    setItemDescription('');
    setItemNcm('');
    setItemCfop('');
    setItemQuantity('1');
    setItemUnitPrice('');
    setSelectedProductId('');
  };

  if (isLoading || !order) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  const canEdit = order.status === 'DRAFT' || order.status === 'OPEN';
  const canClose = order.status === 'OPEN';
  const canCancel = order.status !== 'CANCELLED' && order.status !== 'INVOICED';
  const totalPaid = (order.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Number(order.totalAmount) - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/service-orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">OS #{order.orderNumber}</h1>
            <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {order.customer && 'name' in order.customer ? order.customer.name : ''}
            {order.vehicle && 'licensePlate' in order.vehicle
              ? ` • ${order.vehicle.licensePlate}`
              : ''}
          </p>
        </div>

        <div className="flex gap-2">
          {order.status === 'DRAFT' && (
            <Button onClick={() => handleStatusTransition('open')} variant="outline">
              <Play className="mr-2 h-4 w-4" /> Abrir
            </Button>
          )}
          {canClose && (
            <Button onClick={() => handleStatusTransition('close')}>
              <Lock className="mr-2 h-4 w-4" /> Fechar
            </Button>
          )}
          {canCancel && (
            <Button onClick={() => handleStatusTransition('cancel')} variant="destructive">
              <Ban className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      {order.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{order.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {Number(order.totalParts).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {Number(order.totalServices).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {Number(order.totalAmount).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Itens</CardTitle>
          {canEdit && (
            <Dialog open={isItemOpen} onOpenChange={setIsItemOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Buscar no catálogo</Label>
                    <Combobox
                      options={catalogProducts.map((p) => ({
                        value: p.id,
                        label: `${p.description} — R$ ${Number(p.unitPrice).toFixed(2)}`,
                      }))}
                      value={selectedProductId}
                      onValueChange={selectFromCatalog}
                      placeholder="Selecione do catálogo ou preencha manual"
                      searchPlaceholder="Buscar peça ou serviço..."
                      emptyText="Nenhum item encontrado no catálogo."
                    />
                  </div>
                  {selectedProduct && (
                    <div className="rounded-md border p-3 text-sm">
                      <div>
                        Saldo atual em estoque: <strong>{Number(selectedProduct.currentStock).toFixed(3)}</strong>
                      </div>
                      {hasStockWarning && (
                        <div className="mt-1 text-xs text-destructive">
                          Quantidade informada maior que o saldo atual. O fechamento da OS sera bloqueado se faltar estoque.
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select value={itemType} onValueChange={(value) => setItemType(value as ItemType)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PART">Peça</SelectItem>
                        <SelectItem value="SERVICE">Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      required
                      placeholder="Filtro de óleo, pastilha de freio..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>NCM</Label>
                      <Input value={itemNcm} onChange={(e) => setItemNcm(e.target.value)} placeholder="87089990" />
                    </div>
                    <div className="space-y-2">
                      <Label>CFOP</Label>
                      <Input value={itemCfop} onChange={(e) => setItemCfop(e.target.value)} placeholder="5102" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantidade *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Unitário (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={itemUnitPrice}
                        onChange={(e) => setItemUnitPrice(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Adicionar Item</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {canEdit && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!order.items || order.items.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    Nenhum item ainda
                  </TableCell>
                </TableRow>
              ) : (
                order.items.map((item: ServiceOrderItem) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.type === 'PART' ? 'outline' : 'secondary'}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">R$ {Number(item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">R$ {Number(item.totalPrice).toFixed(2)}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pagamentos</CardTitle>
            {remaining > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Restante: R$ {remaining.toFixed(2)}
              </p>
            )}
          </div>
          {remaining > 0 && (
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <DollarSign className="mr-2 h-4 w-4" /> Adicionar Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Pagamento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddPayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Método *</Label>
                    <Select value={payMethod} onValueChange={(value) => setPayMethod(value as PaymentMethod)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="CASH">Dinheiro</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                        <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                        <SelectItem value="BANK_SLIP">Boleto</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Transferência Bancária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remaining}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={remaining.toFixed(2)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Nota opcional"
                    />
                  </div>
                  <Button type="submit" className="w-full">Registrar Pagamento</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!order.payments || order.payments.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento ainda
                  </TableCell>
                </TableRow>
              ) : (
                order.payments.map((p: Payment) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Badge variant="outline">{p.method.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{new Date(p.paidAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-medium">R$ {Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.notes ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notas Fiscais */}
      {(order.status === 'CLOSED' || order.status === 'INVOICED') && (
        <Card>
          <CardHeader>
            <CardTitle>Notas Fiscais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Nota de mão de obra</p>
                <p className="text-sm text-muted-foreground">Emitida no sistema externo</p>
              </div>
              <input
                type="checkbox"
                checked={laborInvoiceIssued}
                onChange={(e) => handleToggleInvoiceFlag('laborInvoiceIssued', e.target.checked)}
                className="h-5 w-5 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Nota de peças</p>
                <p className="text-sm text-muted-foreground">Emitida no sistema externo</p>
              </div>
              <input
                type="checkbox"
                checked={partsInvoiceIssued}
                onChange={(e) => handleToggleInvoiceFlag('partsInvoiceIssued', e.target.checked)}
                className="h-5 w-5 cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
