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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Combobox } from '@/components/ui/combobox';
import { fetchBrands, fetchModels, fetchYears } from '@/lib/fipe';
import type { Vehicle, Customer, PaginatedResponse } from '@/lib/types';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [brandCode, setBrandCode] = useState('');
  const [modelCode, setModelCode] = useState('');
  const [fipeBrands, setFipeBrands] = useState<{ value: string; label: string }[]>([]);
  const [fipeModels, setFipeModels] = useState<{ value: string; label: string }[]>([]);
  const [fipeYears, setFipeYears] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isOpen || fipeBrands.length > 0) return;

    fetchBrands()
      .then((brands) => setFipeBrands(brands.map((b) => ({ value: b.codigo, label: b.nome }))))
      .catch(() => toast.error('Falha ao carregar marcas da FIPE'));
  }, [isOpen, fipeBrands.length]);

  useEffect(() => {
    if (!brandCode) {
      setFipeModels([]);
      return;
    }

    fetchModels(brandCode)
      .then((models) => setFipeModels(models.map((m) => ({ value: m.codigo, label: m.nome }))))
      .catch(() => setFipeModels([]));
  }, [brandCode]);

  useEffect(() => {
    if (!brandCode || !modelCode) {
      setFipeYears([]);
      return;
    }

    fetchYears(brandCode, modelCode)
      .then((years) => setFipeYears(years.map((y) => ({ value: y.nome, label: y.nome }))))
      .catch(() => setFipeYears([]));
  }, [brandCode, modelCode]);

  const loadData = async () => {
    try {
      const [vehiclesRes, customersRes] = await Promise.all([
        api.get<PaginatedResponse<Vehicle>>('/vehicles'),
        api.get<PaginatedResponse<Customer>>('/customers?limit=100'),
      ]);
      setVehicles(vehiclesRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error('Falha ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', {
        customerId,
        licensePlate,
        brand: brand || undefined,
        model: model || undefined,
        year: year ? parseInt(year) : undefined,
        color: color || undefined,
      });
      toast.success('Veículo criado com sucesso');
      setIsOpen(false);
      setCustomerId('');
      setLicensePlate('');
      setBrand('');
      setModel('');
      setYear('');
      setColor('');
      setBrandCode('');
      setModelCode('');
      setFipeModels([]);
      setFipeYears([]);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar veículo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Veículos</h1>
          <p className="text-muted-foreground">Gerencie os veículos cadastrados</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Veículo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={customerId} onValueChange={setCustomerId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Placa *</Label>
                <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} required placeholder="ABC1D23" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Combobox
                    options={fipeBrands}
                    value={brandCode}
                    onValueChange={(code) => {
                      setBrandCode(code);
                      setBrand(fipeBrands.find((b) => b.value === code)?.label ?? code);
                      setModelCode('');
                      setModel('');
                      setYear('');
                      setFipeYears([]);
                    }}
                    placeholder="Marca"
                    searchPlaceholder="Buscar marca..."
                    emptyText="Marca não encontrada."
                    allowCustom
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Combobox
                    options={fipeModels}
                    value={modelCode}
                    onValueChange={(code) => {
                      setModelCode(code);
                      setModel(fipeModels.find((m) => m.value === code)?.label ?? code);
                      setYear('');
                    }}
                    placeholder="Modelo"
                    searchPlaceholder="Buscar modelo..."
                    emptyText={brandCode ? 'Modelo não encontrado.' : 'Selecione a marca primeiro.'}
                    disabled={!brandCode}
                    allowCustom
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Combobox
                    options={fipeYears}
                    value={year}
                    onValueChange={setYear}
                    placeholder="Ano"
                    searchPlaceholder="Buscar ano..."
                    emptyText={modelCode ? 'Ano não encontrado.' : 'Selecione o modelo primeiro.'}
                    disabled={!modelCode}
                    allowCustom
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Branco" />
                </div>
              </div>
              <Button type="submit" className="w-full">Criar Veículo</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar por placa, marca ou modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              api.get<PaginatedResponse<Vehicle>>(`/vehicles?search=${encodeURIComponent(search)}`)
                .then((res) => setVehicles(res.data));
            }
          }}
        />
        <Button
          variant="outline"
          onClick={() => {
            api.get<PaginatedResponse<Vehicle>>(`/vehicles?search=${encodeURIComponent(search)}`)
              .then((res) => setVehicles(res.data));
          }}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Cliente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum veículo encontrado</TableCell>
                </TableRow>
              ) : (
                vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-medium">{v.licensePlate}</TableCell>
                    <TableCell>{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell>{v.year ?? '—'}</TableCell>
                    <TableCell>{v.color ?? '—'}</TableCell>
                    <TableCell>{v.customer?.name ?? '—'}</TableCell>
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
