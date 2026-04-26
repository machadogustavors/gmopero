'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, ItemType, PaginatedResponse } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [type, setType] = useState<ItemType>('PART');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [ncm, setNcm] = useState('');
  const [cfop, setCfop] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (searchTerm?: string, typeParam?: string) => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (typeParam) params.set('type', typeParam);
      params.set('activeOnly', 'false');
      params.set('limit', '100');
      const query = params.toString() ? `?${params}` : '';
      const response = await api.get<PaginatedResponse<Product>>(`/products${query}`);
      setProducts(response.data);
    } catch {
      toast.error('Falha ao carregar catálogo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    loadProducts(search || undefined, typeFilter || undefined);
  };

  const resetForm = () => {
    setType('PART');
    setCode('');
    setDescription('');
    setNcm('');
    setCfop('');
    setUnitPrice('');
    setEditingProduct(null);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setType(p.type);
    setCode(p.code ?? '');
    setDescription(p.description);
    setNcm(p.ncm ?? '');
    setCfop(p.cfop ?? '');
    setUnitPrice(String(Number(p.unitPrice)));
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        type,
        code: code || undefined,
        description,
        ncm: ncm || undefined,
        cfop: cfop || undefined,
        unitPrice: parseFloat(unitPrice),
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success('Item atualizado');
      } else {
        await api.post('/products', payload);
        toast.success('Item cadastrado');
      }

      setIsOpen(false);
      resetForm();
      loadProducts(search || undefined, typeFilter || undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success('Item removido');
      loadProducts(search || undefined, typeFilter || undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Peças e Serviços</h1>
          <p className="text-muted-foreground">Cadastre peças e mão de obra para usar nas ordens de serviço</p>
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
              <Plus className="mr-2 h-4 w-4" /> Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Item' : 'Novo Item do Catálogo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={type} onValueChange={(v) => setType(v as ItemType)}>
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
                  <Label>Código</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SKU, código interno..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Filtro de óleo, troca de pastilha..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>NCM</Label>
                  <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="87089990" />
                </div>
                <div className="space-y-2">
                  <Label>CFOP</Label>
                  <Input value={cfop} onChange={(e) => setCfop(e.target.value)} placeholder="5102" />
                </div>
                <div className="space-y-2">
                  <Label>Preço Unitário (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingProduct ? 'Salvar Alterações' : 'Cadastrar Item'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar por descrição ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
        />
        <Select
          value={typeFilter || 'ALL'}
          onValueChange={(v) => setTypeFilter(v === 'ALL' ? '' : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="PART">Peças</SelectItem>
            <SelectItem value="SERVICE">Serviços</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleFilter}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>CFOP</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum item cadastrado</TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id} className={!p.isActive ? 'opacity-50' : ''}>
                    <TableCell>
                      <Badge variant={p.type === 'PART' ? 'outline' : 'secondary'}>
                        {p.type === 'PART' ? 'Peça' : 'Serviço'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.code ?? '—'}</TableCell>
                    <TableCell>{p.description}</TableCell>
                    <TableCell className="font-mono text-xs">{p.ncm ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{p.cfop ?? '—'}</TableCell>
                    <TableCell className="text-right">R$ {Number(p.unitPrice).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? 'default' : 'destructive'}>
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
