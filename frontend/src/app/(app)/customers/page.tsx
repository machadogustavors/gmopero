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
import { Plus, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer, PaginatedResponse } from '@/lib/types';

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
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
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

const emptyForm = {
  name: '', taxId: '', email: '', phone: '',
  zipCode: '', street: '', number: '', complement: '',
  neighborhood: '', city: '', state: '', cityCode: '',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);

  const setField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (searchTerm?: string) => {
    try {
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const response = await api.get<PaginatedResponse<Customer>>(`/customers${query}`);
      setCustomers(response.data);
    } catch {
      toast.error('Falha ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => loadCustomers(search);

  const handleCEPChange = async (value: string) => {
    const formatted = formatCEP(value);
    setField('zipCode', formatted);
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
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
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCustomer(null);
  };

  const openCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name ?? '',
      taxId: formatCPFCNPJ(customer.taxId ?? ''),
      email: customer.email ?? '',
      phone: formatPhone(customer.phone ?? ''),
      zipCode: formatCEP(customer.zipCode ?? ''),
      street: customer.street ?? '',
      number: customer.number ?? '',
      complement: customer.complement ?? '',
      neighborhood: customer.neighborhood ?? '',
      city: customer.city ?? '',
      state: customer.state ?? '',
      cityCode: customer.cityCode ?? '',
    });
    setIsOpen(true);
  };

  const buildPayload = () => {
    const strip = (v: string) => v.replace(/\D/g, '') || undefined;
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
    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        toast.success('Cliente atualizado com sucesso');
      } else {
        await api.post('/customers', payload);
        toast.success('Cliente criado com sucesso');
      }
      setIsOpen(false);
      resetForm();
      loadCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input value={form.taxId} onChange={(e) => setField('taxId', formatCPFCNPJ(e.target.value))} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setField('phone', formatPhone(e.target.value))} placeholder="(44) 99999-0000" />
                </div>
              </div>

              {/* Address */}
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium mb-3">Endereço <span className="text-muted-foreground font-normal">(necessário para NF-e)</span></p>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input value={form.zipCode} onChange={(e) => handleCEPChange(e.target.value)} placeholder="01001-000" disabled={isFetchingCep} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setField('city', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input value={form.state} onChange={(e) => setField('state', e.target.value)} maxLength={2} placeholder="SP" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cód. IBGE</Label>
                    <Input value={form.cityCode} onChange={(e) => setField('cityCode', e.target.value)} placeholder="3550308" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Rua</Label>
                    <Input value={form.street} onChange={(e) => setField('street', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={form.number} onChange={(e) => setField('number', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
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
                {isSaving ? 'Salvando...' : editingCustomer ? 'Salvar Alterações' : 'Criar Cliente'}
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
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.taxId ? formatCPFCNPJ(customer.taxId) : '—'}</TableCell>
                    <TableCell>{customer.email ?? '—'}</TableCell>
                    <TableCell>{customer.phone ? formatPhone(customer.phone) : '—'}</TableCell>
                    <TableCell>
                      {customer.city && customer.state
                        ? `${customer.city}/${customer.state}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
