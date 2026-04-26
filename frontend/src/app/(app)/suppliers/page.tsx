'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PaginatedResponse, Supplier } from '@/lib/types';

function formatCPFCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1-$2');
  }
  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function formatCEP(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

async function fetchAddressByCEP(cep: string) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await response.json();
    if (data.erro) return null;

    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      cityCode: data.ibge || '',
    };
  } catch {
    return null;
  }
}

function isValidCpf(cpf: string): boolean {
  if (!cpf || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;

  return digit === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (!cnpj || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const total = base
      .split('')
      .reduce((sum, value, index) => sum + Number(value) * factors[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcDigit(cnpj.slice(0, 12) + firstDigit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
}

const emptyForm = {
  name: '',
  taxId: '',
  email: '',
  phone: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  cityCode: '',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCEPChange = async (value: string) => {
    const formatted = formatCEP(value);
    setField('zipCode', formatted);

    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setIsFetchingCep(true);
    const address = await fetchAddressByCEP(digits);

    if (address) {
      setForm((prev) => ({
        ...prev,
        street: address.street || prev.street,
        neighborhood: address.neighborhood || prev.neighborhood,
        city: address.city,
        state: address.state,
        cityCode: address.cityCode,
      }));
    } else {
      toast.error('CEP não encontrado');
    }

    setIsFetchingCep(false);
  };

  const loadSuppliers = async (searchTerm?: string) => {
    try {
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const response = await api.get<PaginatedResponse<Supplier>>(`/suppliers${query}`);
      setSuppliers(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar fornecedores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSearch = () => {
    loadSuppliers(search);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingSupplier(null);
  };

  const openCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name ?? '',
      taxId: formatCPFCNPJ(supplier.taxId ?? ''),
      email: supplier.email ?? '',
      phone: formatPhone(supplier.phone ?? ''),
      zipCode: formatCEP(supplier.zipCode ?? ''),
      street: supplier.street ?? '',
      number: supplier.number ?? '',
      complement: supplier.complement ?? '',
      neighborhood: supplier.neighborhood ?? '',
      city: supplier.city ?? '',
      state: supplier.state ?? '',
      cityCode: supplier.cityCode ?? '',
    });
    setIsOpen(true);
  };

  const buildPayload = () => {
    const strip = (value: string) => value.replace(/\D/g, '') || undefined;

    return {
      name: form.name,
      taxId: strip(form.taxId),
      email: form.email || undefined,
      phone: strip(form.phone),
      zipCode: strip(form.zipCode),
      street: form.street || undefined,
      number: form.number || undefined,
      complement: form.complement || undefined,
      neighborhood: form.neighborhood || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      cityCode: form.cityCode || undefined,
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = buildPayload();

    const requiredFields = [
      { key: 'name', label: 'Nome/Razão Social' },
      { key: 'taxId', label: 'CPF/CNPJ' },
      { key: 'zipCode', label: 'CEP' },
      { key: 'street', label: 'Rua' },
      { key: 'number', label: 'Número' },
      { key: 'neighborhood', label: 'Bairro' },
      { key: 'city', label: 'Cidade' },
      { key: 'state', label: 'UF' },
      { key: 'cityCode', label: 'Código IBGE' },
    ] as const;

    const missing = requiredFields.find((field) => !(payload as Record<string, unknown>)[field.key]);
    if (missing) {
      toast.error(`Preencha o campo obrigatório: ${missing.label}`);
      return;
    }

    const taxIdDigits = String(payload.taxId);
    if (taxIdDigits.length !== 11 && taxIdDigits.length !== 14) {
      toast.error('CPF/CNPJ deve ter 11 ou 14 dígitos');
      return;
    }

    if (taxIdDigits.length === 11 && !isValidCpf(taxIdDigits)) {
      toast.error('CPF inválido');
      return;
    }

    if (taxIdDigits.length === 14 && !isValidCnpj(taxIdDigits)) {
      toast.error('CNPJ inválido');
      return;
    }

    if (payload.state && payload.state.length !== 2) {
      toast.error('UF deve ter 2 letras');
      return;
    }

    setIsSaving(true);

    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload);
        toast.success('Fornecedor atualizado com sucesso');
      } else {
        await api.post('/suppliers', payload);
        toast.success('Fornecedor criado com sucesso');
      }

      setIsOpen(false);
      resetForm();
      loadSuppliers(search || undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar fornecedor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Fornecedor removido com sucesso');
      loadSuppliers(search || undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover fornecedor');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">Cadastro completo de fornecedores para compras e estoque</p>
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social / Nome *</Label>
                  <Input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={form.taxId}
                    onChange={(e) => setField('taxId', formatCPFCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setField('phone', formatPhone(e.target.value))}
                    placeholder="(44) 99999-0000"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium">Endereço fiscal</p>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={form.zipCode}
                      onChange={(e) => handleCEPChange(e.target.value)}
                      placeholder="87000-000"
                      disabled={isFetchingCep}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setField('city', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input
                      value={form.state}
                      onChange={(e) => setField('state', e.target.value.toUpperCase())}
                      maxLength={2}
                      placeholder="PR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cód. IBGE</Label>
                    <Input value={form.cityCode} onChange={(e) => setField('cityCode', e.target.value)} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Rua</Label>
                    <Input value={form.street} onChange={(e) => setField('street', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={form.number} onChange={(e) => setField('number', e.target.value)} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input value={form.complement} onChange={(e) => setField('complement', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={form.neighborhood} onChange={(e) => setField('neighborhood', e.target.value)} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? 'Salvando...' : editingSupplier ? 'Salvar Alterações' : 'Criar Fornecedor'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nome, CPF/CNPJ ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum fornecedor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.taxId ? formatCPFCNPJ(supplier.taxId) : '—'}</TableCell>
                    <TableCell>{supplier.email ?? '—'}</TableCell>
                    <TableCell>{supplier.phone ? formatPhone(supplier.phone) : '—'}</TableCell>
                    <TableCell>
                      {supplier.city && supplier.state ? `${supplier.city}/${supplier.state}` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(supplier)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(supplier.id)}
                        >
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
