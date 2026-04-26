'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import type { Customer, PaginatedResponse, Product, ServiceOrder, Vehicle } from '@/lib/types';

type SearchResults = {
  orders: ServiceOrder[];
  customers: Customer[];
  vehicles: Vehicle[];
  products: Product[];
};

const emptyResults: SearchResults = {
  orders: [],
  customers: [],
  vehicles: [],
  products: [],
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [results, setResults] = useState<SearchResults>(emptyResults);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommand = event.metaKey || event.ctrlKey;
      if (isCommand && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(emptyResults);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(emptyResults);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const encoded = encodeURIComponent(trimmed);
        const [ordersRes, customersRes, vehiclesRes, productsRes] = await Promise.all([
          api.get<PaginatedResponse<ServiceOrder>>(`/service-orders?search=${encoded}&limit=5`),
          api.get<PaginatedResponse<Customer>>(`/customers?search=${encoded}&limit=5`),
          api.get<PaginatedResponse<Vehicle>>(`/vehicles?search=${encoded}&limit=5`),
          api.get<PaginatedResponse<Product>>(`/products?search=${encoded}&activeOnly=true&limit=5`),
        ]);

        setResults({
          orders: ordersRes.data,
          customers: customersRes.data,
          vehicles: vehiclesRes.data,
          products: productsRes.data,
        });
      } catch {
        setHasError(true);
        setResults(emptyResults);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [open, query]);

  const hasResults = useMemo(
    () =>
      results.orders.length > 0 ||
      results.customers.length > 0 ||
      results.vehicles.length > 0 ||
      results.products.length > 0,
    [results],
  );

  const selectResult = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  useEffect(() => {
    if (hasError) {
      toast.error('Falha na busca global. Verifique se o backend está disponível.');
    }
  }, [hasError]);

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-between md:w-[360px]"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-4 w-4" /> Buscar OS, cliente, veículo, produto...
        </span>
        <CommandShortcut>Ctrl+K</CommandShortcut>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Busca global"
        description="Pesquise rapidamente em ordens, clientes, veículos e produtos"
        className="max-w-2xl"
      >
        <CommandInput
          placeholder="Digite ao menos 2 caracteres..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
          {!isLoading && hasError && (
            <CommandEmpty>Não foi possível buscar agora. Tente novamente.</CommandEmpty>
          )}
          {!isLoading && query.trim().length < 2 && (
            <CommandEmpty>Digite ao menos 2 caracteres para pesquisar.</CommandEmpty>
          )}
          {!isLoading && !hasError && query.trim().length >= 2 && !hasResults && (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          )}

          {!!results.orders.length && (
            <CommandGroup heading="Ordens de Serviço">
              {results.orders.map((order) => (
                <CommandItem
                  key={order.id}
                  value={`os-${order.orderNumber}-${order.id}`}
                  onSelect={() => selectResult(`/service-orders/${order.id}`)}
                >
                  OS #{order.orderNumber}
                  <CommandShortcut>{order.status}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!results.customers.length && (
            <CommandGroup heading="Clientes">
              {results.customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`customer-${customer.name}-${customer.id}`}
                  onSelect={() => selectResult(`/customers?search=${encodeURIComponent(customer.name)}`)}
                >
                  {customer.name}
                  <CommandShortcut>Cliente</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!results.vehicles.length && (
            <CommandGroup heading="Veículos">
              {results.vehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
                  value={`vehicle-${vehicle.licensePlate}-${vehicle.id}`}
                  onSelect={() => selectResult(`/vehicles?search=${encodeURIComponent(vehicle.licensePlate)}`)}
                >
                  {vehicle.licensePlate} - {vehicle.brand ?? ''} {vehicle.model ?? ''}
                  <CommandShortcut>Veículo</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!results.products.length && (
            <CommandGroup heading="Produtos e Serviços">
              {results.products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`product-${product.description}-${product.id}`}
                  onSelect={() => selectResult(`/products?search=${encodeURIComponent(product.description)}`)}
                >
                  {product.description}
                  <CommandShortcut>{product.type === 'PART' ? 'Peça' : 'Serviço'}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
