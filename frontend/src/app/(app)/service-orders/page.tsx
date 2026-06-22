'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Plus, Search, UserPlus, Car } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { fetchBrands, fetchModels, fetchYears } from '@/lib/fipe';
import { toast } from 'sonner';
import type { ServiceOrder, Customer, Vehicle, PaginatedResponse } from '@/lib/types';

type WizardStep = 1 | 2 | 3;

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  OPEN: 'secondary',
  CLOSED: 'default',
  INVOICED: 'default',
  CANCELLED: 'destructive',
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Aberta',
  CLOSED: 'Fechada',
  INVOICED: 'Faturada',
  CANCELLED: 'Cancelada',
};

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [description, setDescription] = useState('');

  // Inline creation modes
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);

  // New customer fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustTaxId, setNewCustTaxId] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // New vehicle fields
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehBrandCode, setNewVehBrandCode] = useState('');
  const [newVehBrand, setNewVehBrand] = useState('');
  const [newVehModelCode, setNewVehModelCode] = useState('');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehYear, setNewVehYear] = useState('');

  // FIPE data
  const [fipeBrands, setFipeBrands] = useState<{ value: string; label: string }[]>([]);
  const [fipeModels, setFipeModels] = useState<{ value: string; label: string }[]>([]);
  const [fipeYears, setFipeYears] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Load FIPE brands when creating vehicle mode is activated
  useEffect(() => {
    if (isCreatingVehicle && fipeBrands.length === 0) {
      fetchBrands()
        .then((brands) => setFipeBrands(brands.map((b) => ({ value: b.codigo, label: b.nome }))))
        .catch(() => toast.error('Falha ao carregar marcas da FIPE'));
    }
  }, [isCreatingVehicle, fipeBrands.length]);

  // Load FIPE models when brand changes
  useEffect(() => {
    if (!newVehBrandCode) { setFipeModels([]); return; }
    fetchModels(newVehBrandCode)
      .then((models) => setFipeModels(models.map((m) => ({ value: m.codigo, label: m.nome }))))
      .catch(() => setFipeModels([]));
  }, [newVehBrandCode]);

  // Load FIPE years when model changes
  useEffect(() => {
    if (!newVehBrandCode || !newVehModelCode) { setFipeYears([]); return; }
    fetchYears(newVehBrandCode, newVehModelCode)
      .then((years) => setFipeYears(years.map((y) => ({ value: y.nome, label: y.nome }))))
      .catch(() => setFipeYears([]));
  }, [newVehBrandCode, newVehModelCode]);

  const loadData = async () => {
    try {
      const [ordersRes, customersRes] = await Promise.all([
        api.get<PaginatedResponse<ServiceOrder>>('/service-orders'),
        api.get<PaginatedResponse<Customer>>('/customers?limit=100'),
      ]);
      setOrders(ordersRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error('Falha ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVehiclesForCustomer = async (custId: string) => {
    if (!custId) {
      setVehicles([]);
      return;
    }
    try {
      const res = await api.get<PaginatedResponse<Vehicle>>(`/vehicles?customerId=${custId}`);
      setVehicles(res.data);
    } catch {
      setVehicles([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let custId = customerId;
      let vehId = vehicleId;

      // Create customer inline if needed
      if (isCreatingCustomer) {
        if (!newCustName.trim()) {
          toast.error('Nome do cliente é obrigatório');
          return;
        }
        const newCustomer = await api.post<Customer>('/customers', {
          name: newCustName,
          taxId: newCustTaxId || undefined,
          phone: newCustPhone || undefined,
        });
        custId = newCustomer.id;
      }

      if (!custId) {
        toast.error('Selecione ou crie um cliente');
        return;
      }

      // Create vehicle inline if needed
      if (isCreatingVehicle) {
        if (!newVehPlate.trim()) {
          toast.error('Placa do veículo é obrigatória');
          return;
        }
        const newVehicle = await api.post<Vehicle>('/vehicles', {
          customerId: custId,
          licensePlate: newVehPlate,
          brand: newVehBrand || undefined,
          model: newVehModel || undefined,
          year: newVehYear ? parseInt(newVehYear) || undefined : undefined,
        });
        vehId = newVehicle.id;
      }

      const newOrder = await api.post<ServiceOrder>('/service-orders', {
        customerId: custId,
        vehicleId: vehId || undefined,
        description: description || undefined,
      });
      toast.success('Ordem de serviço criada — adicione peças e serviços');
      setIsOpen(false);
      resetForm();
      router.push(`/service-orders/${newOrder.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar ordem');
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setVehicleId('');
    setDescription('');
    setWizardStep(1);
    setIsCreatingCustomer(false);
    setIsCreatingVehicle(false);
    setNewCustName('');
    setNewCustTaxId('');
    setNewCustPhone('');
    setNewVehPlate('');
    setNewVehBrandCode('');
    setNewVehBrand('');
    setNewVehModelCode('');
    setNewVehModel('');
    setNewVehYear('');
    setFipeModels([]);
    setFipeYears([]);
  };

  const validateCurrentStep = (step: WizardStep) => {
    if (step === 1) {
      if (isCreatingCustomer) {
        if (!newCustName.trim()) {
          toast.error('Preencha o nome do cliente para avançar');
          return false;
        }
      } else if (!customerId) {
        toast.error('Selecione um cliente para avançar');
        return false;
      }
    }

    if (step === 2) {
      if (isCreatingVehicle && !newVehPlate.trim()) {
        toast.error('Informe a placa do veículo para avançar');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep(wizardStep)) return;
    setWizardStep((current) => (current < 3 ? ((current + 1) as WizardStep) : current));
  };

  const selectedCustomerName = isCreatingCustomer
    ? newCustName
    : customers.find((c) => c.id === customerId)?.name;

  const selectedVehicleLabel = isCreatingVehicle
    ? [newVehPlate, newVehBrand, newVehModel].filter(Boolean).join(' - ')
    : vehicles.find((v) => v.id === vehicleId)
      ? `${vehicles.find((v) => v.id === vehicleId)?.licensePlate} - ${vehicles.find((v) => v.id === vehicleId)?.brand ?? ''} ${vehicles.find((v) => v.id === vehicleId)?.model ?? ''}`.trim()
      : '';

  const handleFilter = async (overrideStatus?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const activeStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
      if (activeStatus) params.set('status', activeStatus);
      const res = await api.get<PaginatedResponse<ServiceOrder>>(`/service-orders?${params}`);
      setOrders(res.data);
    } catch {
      toast.error('Falha ao filtrar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Gerencie as ordens de reparo</p>
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
              <Plus className="mr-2 h-4 w-4" /> Nova Ordem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Ordem de Serviço</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Etapa {wizardStep} de 3</span>
                  <span>
                    {wizardStep === 1 ? 'Cliente' : wizardStep === 2 ? 'Veículo' : 'Detalhes'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full ${wizardStep >= step ? 'bg-primary' : 'bg-muted'}`}
                    />
                  ))}
                </div>
              </div>

              {wizardStep === 1 && (
                <>
              {/* ── Cliente ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Cliente *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs"
                    onClick={() => {
                      setIsCreatingCustomer(!isCreatingCustomer);
                      setCustomerId('');
                      setNewCustName('');
                      setNewCustTaxId('');
                      setNewCustPhone('');
                      setVehicles([]);
                      setVehicleId('');
                      setIsCreatingVehicle(false);
                    }}
                  >
                    {isCreatingCustomer ? (
                      <>Selecionar existente</>
                    ) : (
                      <><UserPlus className="mr-1 h-3 w-3" /> Novo cliente</>
                    )}
                  </Button>
                </div>
                {isCreatingCustomer ? (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Nome do cliente" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">CPF/CNPJ</Label>
                        <Input value={newCustTaxId} onChange={(e) => setNewCustTaxId(e.target.value)} placeholder="000.000.000-00" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Telefone</Label>
                        <Input value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="(44) 99999-0000" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select
                    value={customerId}
                    onValueChange={(value) => {
                      setCustomerId(value);
                      loadVehiclesForCustomer(value);
                      setVehicleId('');
                      setIsCreatingVehicle(false);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
                </>
              )}

              {wizardStep === 2 && (
                <>
              {/* ── Veículo ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Veículo</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs"
                    onClick={() => {
                      setIsCreatingVehicle(!isCreatingVehicle);
                      setVehicleId('');
                      setNewVehPlate('');
                      setNewVehBrandCode('');
                      setNewVehBrand('');
                      setNewVehModelCode('');
                      setNewVehModel('');
                      setNewVehYear('');
                    }}
                  >
                    {isCreatingVehicle ? (
                      <>Selecionar existente</>
                    ) : (
                      <><Car className="mr-1 h-3 w-3" /> Novo veículo</>
                    )}
                  </Button>
                </div>
                {isCreatingVehicle ? (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Placa *</Label>
                      <Input value={newVehPlate} onChange={(e) => setNewVehPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" maxLength={7} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Marca</Label>
                        <Combobox
                          options={fipeBrands}
                          value={newVehBrandCode}
                          onValueChange={(code) => {
                            setNewVehBrandCode(code);
                            setNewVehBrand(fipeBrands.find((b) => b.value === code)?.label ?? code);
                            setNewVehModelCode('');
                            setNewVehModel('');
                            setNewVehYear('');
                            setFipeYears([]);
                          }}
                          placeholder="Marca"
                          searchPlaceholder="Buscar marca..."
                          emptyText="Marca não encontrada."
                          allowCustom
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Modelo</Label>
                        <Combobox
                          options={fipeModels}
                          value={newVehModelCode}
                          onValueChange={(code) => {
                            setNewVehModelCode(code);
                            setNewVehModel(fipeModels.find((m) => m.value === code)?.label ?? code);
                            setNewVehYear('');
                          }}
                          placeholder="Modelo"
                          searchPlaceholder="Buscar modelo..."
                          emptyText={newVehBrandCode ? 'Modelo não encontrado.' : 'Selecione a marca primeiro.'}
                          disabled={!newVehBrandCode}
                          allowCustom
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ano</Label>
                        <Combobox
                          options={fipeYears}
                          value={newVehYear}
                          onValueChange={setNewVehYear}
                          placeholder="Ano"
                          searchPlaceholder="Buscar ano..."
                          emptyText={newVehModelCode ? 'Ano não encontrado.' : 'Selecione o modelo primeiro.'}
                          disabled={!newVehModelCode}
                          allowCustom
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select
                    value={vehicleId || 'NONE'}
                    onValueChange={(value) => setVehicleId(value === 'NONE' ? '' : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sem veículo</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.licensePlate} — {v.brand} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
                </>
              )}

              {wizardStep === 3 && (
                <>
              <div className="rounded-md border p-3 text-sm">
                <p>
                  <span className="font-medium">Cliente:</span> {selectedCustomerName || '—'}
                </p>
                <p>
                  <span className="font-medium">Veículo:</span> {selectedVehicleLabel || 'Sem veículo'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Troca de óleo, pastilha de freio..." />
              </div>
                </>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWizardStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current))}
                  disabled={wizardStep === 1}
                  className="flex-1"
                >
                  Voltar
                </Button>

                {wizardStep < 3 ? (
                  <Button type="button" onClick={handleNextStep} className="flex-1">
                    Próximo
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1">Criar Ordem</Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar ordens..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleFilter(); }}
        />
        <Select
          value={statusFilter || 'ALL'}
          onValueChange={(value) => {
            const next = value === 'ALL' ? '' : value;
            setStatusFilter(next);
            handleFilter(next);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="DRAFT">Rascunho</SelectItem>
            <SelectItem value="OPEN">Aberta</SelectItem>
            <SelectItem value="CLOSED">Fechada</SelectItem>
            <SelectItem value="INVOICED">Faturada</SelectItem>
            <SelectItem value="CANCELLED">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => handleFilter()}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    <p>Nenhuma ordem encontrada</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setIsOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Criar primeira ordem
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      {order.customer && 'name' in order.customer ? order.customer.name : '—'}
                    </TableCell>
                    <TableCell className="font-mono">
                      {order.vehicle && 'licensePlate' in order.vehicle ? order.vehicle.licensePlate : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[order.status] ?? 'outline'}>
                        {statusLabel[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {Number(order.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/service-orders/${order.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </Link>
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
