'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Company } from '@/lib/types';

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
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

export default function SettingsPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [legalName, setLegalName] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleCEPChange = async (value: string) => {
    const formatted = formatCEP(value);
    setZipCode(formatted);
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
      setIsFetchingCep(true);
      const address = await fetchAddressByCEP(digits);
      if (address) {
        if (address.street) setStreet(address.street);
        if (address.neighborhood) setNeighborhood(address.neighborhood);
        setCity(address.city);
        setState(address.state);
        setCityCode(address.cityCode);
      } else {
        toast.error('CEP não encontrado');
      }
      setIsFetchingCep(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.get<Company>('/company-settings');
      setCompany(data);
      populateForm(data);
    } catch {
      toast.error('Falha ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const populateForm = (c: Company) => {
    setName(c.name ?? '');
    setTaxId(formatCNPJ(c.taxId ?? ''));
    setLegalName(c.legalName ?? '');
    setStateRegistration(c.stateRegistration ?? '');
    setPhone(formatPhone(c.phone ?? ''));
    setEmail(c.email ?? '');
    setStreet(c.street ?? '');
    setNumber(c.number ?? '');
    setComplement(c.complement ?? '');
    setNeighborhood(c.neighborhood ?? '');
    setCityCode(c.cityCode ?? '');
    setCity(c.city ?? '');
    setState(c.state ?? '');
    setZipCode(formatCEP(c.zipCode ?? ''));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const strip = (v: string) => v.replace(/\D/g, '') || null;
      const updated = await api.patch<Company>('/company-settings', {
        name,
        taxId: strip(taxId),
        legalName: legalName || null,
        stateRegistration: stateRegistration || null,
        phone: strip(phone),
        email: email || null,
        street: street || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        cityCode: cityCode || null,
        city: city || null,
        state: state || null,
        zipCode: strip(zipCode),
      });
      setCompany(updated);
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground">Configure os dados da sua oficina</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
            <CardDescription>Dados básicos da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={!isOwnerOrAdmin} />
              </div>
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} disabled={!isOwnerOrAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={taxId} onChange={(e) => setTaxId(formatCNPJ(e.target.value))} placeholder="00.000.000/0001-00" disabled={!isOwnerOrAdmin} />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Estadual (IE)</Label>
                <Input value={stateRegistration} onChange={(e) => setStateRegistration(e.target.value)} disabled={!isOwnerOrAdmin} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(44) 99999-0000" disabled={!isOwnerOrAdmin} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isOwnerOrAdmin} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Digite o CEP para preencher o endereço automaticamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={zipCode} onChange={(e) => handleCEPChange(e.target.value)} placeholder="01001-000" disabled={!isOwnerOrAdmin || isFetchingCep} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={!isOwnerOrAdmin} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="SP" disabled={!isOwnerOrAdmin} />
              </div>
              <div className="space-y-2">
                <Label>Cód. Município (IBGE)</Label>
                <Input value={cityCode} onChange={(e) => setCityCode(e.target.value)} placeholder="3550308" disabled={!isOwnerOrAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Rua</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} disabled={!isOwnerOrAdmin} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={number} onChange={(e) => setNumber(e.target.value)} disabled={!isOwnerOrAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input value={complement} onChange={(e) => setComplement(e.target.value)} disabled={!isOwnerOrAdmin} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} disabled={!isOwnerOrAdmin} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isOwnerOrAdmin && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
