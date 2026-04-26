'use client';

import { useEffect, useState } from 'react';
import { Plus, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { api } from '@/lib/api';
import type {
  PaginatedResponse,
  Product,
  PurchaseInvoice,
  Supplier,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type DraftItem = {
  productId: string;
  quantity: string;
  unitCost: string;
};

type XmlPreviewItem = {
  code: string | null;
  description: string;
  ncm: string | null;
  cfop: string | null;
  quantity: number;
  unitCost: number;
  matchedProductId: string | null;
  matchedProductDescription: string | null;
  canAutoLink: boolean;
};

type XmlPreview = {
  invoiceNumber: string | null;
  series: string | null;
  accessKey: string | null;
  items: XmlPreviewItem[];
};

const defaultItem: DraftItem = {
  productId: '',
  quantity: '1',
  unitCost: '0',
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Rascunho',
  PARTIALLY_RECEIVED: 'Recebida Parcial',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

export default function PurchasesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [series, setSeries] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ ...defaultItem }]);
  const [xmlPreview, setXmlPreview] = useState<XmlPreview | null>(null);
  const [isImportingXml, setIsImportingXml] = useState(false);

  const loadData = async () => {
    try {
      const [invoiceResponse, supplierResponse, productResponse] = await Promise.all([
        api.get<PaginatedResponse<PurchaseInvoice>>('/purchase-invoices?limit=100'),
        api.get<PaginatedResponse<Supplier>>('/suppliers?limit=100'),
        api.get<PaginatedResponse<Product>>('/products?type=PART&activeOnly=true&limit=300'),
      ]);

      setInvoices(invoiceResponse.data);
      setSuppliers(supplierResponse.data);
      setProducts(productResponse.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar compras');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setSupplierId('');
    setInvoiceNumber('');
    setSeries('');
    setItems([{ ...defaultItem }]);
    setXmlPreview(null);
  };

  const updateItem = (index: number, field: keyof DraftItem, value: string) => {
    setItems((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const addItemRow = () => {
    setItems((current) => [...current, { ...defaultItem }]);
  };

  const removeItemRow = (index: number) => {
    setItems((current) => {
      if (current.length === 1) return current;
      return current.filter((_, idx) => idx !== index);
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
      }));

    if (!supplierId) {
      toast.error('Selecione um fornecedor');
      return;
    }

    const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
    if (!selectedSupplier) {
      toast.error('Fornecedor selecionado não encontrado');
      return;
    }

    const supplierMissingFields = [
      selectedSupplier.taxId,
      selectedSupplier.zipCode,
      selectedSupplier.street,
      selectedSupplier.number,
      selectedSupplier.neighborhood,
      selectedSupplier.city,
      selectedSupplier.state,
      selectedSupplier.cityCode,
    ].some((value) => !value);

    if (supplierMissingFields) {
      toast.error('Fornecedor incompleto. Preencha CPF/CNPJ e endereço completo no cadastro de fornecedores.');
      return;
    }

    if (!parsedItems.length) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    if (parsedItems.some((item) => item.quantity <= 0 || item.unitCost < 0)) {
      toast.error('Quantidade e custo dos itens estão inválidos');
      return;
    }

    const selectedProductIds = new Set(products.map((product) => product.id));
    if (parsedItems.some((item) => !selectedProductIds.has(item.productId))) {
      toast.error('Um ou mais produtos da nota são inválidos');
      return;
    }

    try {
      await api.post('/purchase-invoices', {
        supplierId,
        invoiceNumber: invoiceNumber || undefined,
        series: series || undefined,
        items: parsedItems,
      });

      toast.success('Nota de compra criada');
      setIsOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar nota de compra');
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await api.post(`/purchase-invoices/${id}/receive`, {});
      toast.success('Estoque atualizado com sucesso');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao receber nota');
    }
  };

  const handleImportXml = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.append('xml', file);

    setIsImportingXml(true);

    try {
      const preview = await api.post<XmlPreview>('/purchase-invoices/import-xml', formData);
      setXmlPreview(preview);

      if (preview.invoiceNumber) setInvoiceNumber(preview.invoiceNumber);
      if (preview.series) setSeries(preview.series);

      const linkedItems = preview.items.filter((item) => item.matchedProductId);
      if (linkedItems.length) {
        setItems(
          linkedItems.map((item) => ({
            productId: item.matchedProductId!,
            quantity: String(item.quantity),
            unitCost: String(item.unitCost),
          })),
        );
      }

      toast.success('XML importado para revisão');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao importar XML');
    } finally {
      setIsImportingXml(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">Cadastre notas de compra para entrada de estoque</p>
          <p className="text-sm text-muted-foreground">
            Precisa cadastrar fornecedor? <Link href="/suppliers" className="underline">Ir para fornecedores</Link>
          </p>
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Nota de Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Nota de Compra</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Importar XML da NF-e</Label>
                <Input type="file" accept=".xml,text/xml" onChange={handleImportXml} />
                {isImportingXml && (
                  <p className="text-xs text-muted-foreground">Processando XML...</p>
                )}
                {xmlPreview && (
                  <div className="rounded-md border p-3 text-xs text-muted-foreground">
                    <div>
                      {xmlPreview.items.length} itens detectados no XML.
                    </div>
                    <div>
                      {xmlPreview.items.filter((item) => item.canAutoLink).length} itens vinculados automaticamente.
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>Fornecedor *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Série</Label>
                <Input value={series} onChange={(e) => setSeries(e.target.value)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Itens *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                    <Plus className="mr-1 h-3 w-3" /> Adicionar item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={`item-${index}`} className="grid gap-2 md:grid-cols-12">
                    <div className="md:col-span-6">
                      <Select
                        value={item.productId || undefined}
                        onValueChange={(value) => updateItem(index, 'productId', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.code ? `${product.code} - ` : ''}
                              {product.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        placeholder="Qtd"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                        placeholder="Custo"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemRow(index)}
                        className="w-full"
                      >
                        X
                      </Button>
                    </div>
                  </div>
                ))}

                {xmlPreview && xmlPreview.items.some((item) => !item.canAutoLink) && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    Alguns itens do XML não foram vinculados automaticamente ao catálogo.
                    Complete manualmente os itens necessários antes de criar a nota.
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">Criar Nota</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhuma nota de compra cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.supplier?.name ?? '—'}</TableCell>
                    <TableCell>{invoice.invoiceNumber ?? '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.status === 'RECEIVED' ? 'default' : 'secondary'}
                      >
                        {statusLabel[invoice.status] ?? invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{invoice._count?.items ?? 0}</TableCell>
                    <TableCell className="text-right">
                      {Number(invoice.totalAmount).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {invoice.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={() => handleReceive(invoice.id)}>
                          <PackageCheck className="mr-2 h-4 w-4" /> Receber
                        </Button>
                      )}
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
