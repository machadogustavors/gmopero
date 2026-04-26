'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Company } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

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
  const [fiscalRegime, setFiscalRegime] = useState('');
  const [defaultIcmsCst, setDefaultIcmsCst] = useState('');
  const [defaultIcmsCsosn, setDefaultIcmsCsosn] = useState('');
  const [defaultPisCst, setDefaultPisCst] = useState('');
  const [defaultCofinsCst, setDefaultCofinsCst] = useState('');
  const [defaultIcmsOrigem, setDefaultIcmsOrigem] = useState('');

  // PlugNotas state
  const [plugnotasRegistered, setPlugnotasRegistered] = useState(false);
  const [plugnotasStatus, setPlugnotasStatus] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [certPassword, setCertPassword] = useState('');
  const certInputRef = useRef<HTMLInputElement>(null);

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
    setFiscalRegime(c.fiscalRegime?.toString() ?? '');
    setDefaultIcmsCst(c.defaultIcmsCst ?? '');
    setDefaultIcmsCsosn(c.defaultIcmsCsosn ?? '');
    setDefaultPisCst(c.defaultPisCst ?? '');
    setDefaultCofinsCst(c.defaultCofinsCst ?? '');
    setDefaultIcmsOrigem(c.defaultIcmsOrigem ?? '');
    setPlugnotasRegistered(c.plugnotasRegistered ?? false);
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
        fiscalRegime: fiscalRegime ? parseInt(fiscalRegime) : null,
        defaultIcmsCst: defaultIcmsCst || null,
        defaultIcmsCsosn: defaultIcmsCsosn || null,
        defaultPisCst: defaultPisCst || null,
        defaultCofinsCst: defaultCofinsCst || null,
        defaultIcmsOrigem: defaultIcmsOrigem || null,
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

  const loadPlugnotasStatus = async () => {
    try {
      const status = await api.get<any>('/fiscal/company-status');
      setPlugnotasStatus(status);
    } catch {
      // Ignore - just means we can't check status
    }
  };

  const handleRegisterPlugnotas = async () => {
    setIsRegistering(true);
    try {
      await api.post('/fiscal/register-company', {});
      setPlugnotasRegistered(true);
      await loadPlugnotasStatus();
      toast.success('Empresa cadastrada no PlugNotas com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao cadastrar empresa');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUploadCertificate = async () => {
    const file = certInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Selecione o arquivo do certificado (.pfx)');
      return;
    }
    if (!certPassword) {
      toast.error('Informe a senha do certificado');
      return;
    }

    setIsUploadingCert(true);
    try {
      const formData = new FormData();
      formData.append('certificate', file);
      formData.append('password', certPassword);

      const res = await fetch(`${API_BASE_URL}/fiscal/upload-certificate`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Falha ao enviar certificado');
      }

      setCertPassword('');
      if (certInputRef.current) certInputRef.current.value = '';
      await loadPlugnotasStatus();
      toast.success('Certificado digital enviado com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar certificado');
    } finally {
      setIsUploadingCert(false);
    }
  };

  useEffect(() => {
    if (company?.taxId) {
      loadPlugnotasStatus();
    }
  }, [company?.taxId]);

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground">
          Configure os dados da sua oficina para emissão de documentos fiscais
        </p>
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
            <div className="space-y-2">
              <Label>Regime Tributário</Label>
              <Select value={fiscalRegime} onValueChange={setFiscalRegime} disabled={!isOwnerOrAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o regime tributário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Simples Nacional</SelectItem>
                  <SelectItem value="2">Simples Nacional - Excesso de Sublimite</SelectItem>
                  <SelectItem value="3">Regime Normal (Lucro Presumido / Real)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuração Tributária</CardTitle>
            <CardDescription>
              Códigos fiscais padrão para emissão de NF-e. Consulte seu contador para definir os valores corretos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem da Mercadoria (ICMS)</Label>
                <Select value={defaultIcmsOrigem} onValueChange={setDefaultIcmsOrigem} disabled={!isOwnerOrAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Nacional</SelectItem>
                    <SelectItem value="1">1 - Estrangeira (importação direta)</SelectItem>
                    <SelectItem value="2">2 - Estrangeira (adquirida no mercado interno)</SelectItem>
                    <SelectItem value="3">3 - Nacional (importação superior a 40%)</SelectItem>
                    <SelectItem value="4">4 - Nacional (processos básicos)</SelectItem>
                    <SelectItem value="5">5 - Nacional (importação inferior a 40%)</SelectItem>
                    <SelectItem value="6">6 - Estrangeira (importação direta, sem similar)</SelectItem>
                    <SelectItem value="7">7 - Estrangeira (mercado interno, sem similar)</SelectItem>
                    <SelectItem value="8">8 - Nacional (importação superior a 70%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {fiscalRegime === '1' || fiscalRegime === '2' ? (
                <div className="space-y-2">
                  <Label>CSOSN (Simples Nacional)</Label>
                  <Select value={defaultIcmsCsosn} onValueChange={setDefaultIcmsCsosn} disabled={!isOwnerOrAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o CSOSN" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="101">101 - Tributada com permissão de crédito</SelectItem>
                      <SelectItem value="102">102 - Tributada sem permissão de crédito</SelectItem>
                      <SelectItem value="103">103 - Isenção de ICMS para faixa de receita bruta</SelectItem>
                      <SelectItem value="201">201 - Tributada com permissão de crédito e ST</SelectItem>
                      <SelectItem value="202">202 - Tributada sem permissão de crédito e ST</SelectItem>
                      <SelectItem value="203">203 - Isenção de ICMS para faixa e ST</SelectItem>
                      <SelectItem value="300">300 - Imune</SelectItem>
                      <SelectItem value="400">400 - Não tributada</SelectItem>
                      <SelectItem value="500">500 - ICMS cobrado anteriormente por ST</SelectItem>
                      <SelectItem value="900">900 - Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>CST ICMS (Regime Normal)</Label>
                  <Select value={defaultIcmsCst} onValueChange={setDefaultIcmsCst} disabled={!isOwnerOrAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o CST ICMS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="00">00 - Tributada integralmente</SelectItem>
                      <SelectItem value="10">10 - Tributada com ST</SelectItem>
                      <SelectItem value="20">20 - Com redução de base de cálculo</SelectItem>
                      <SelectItem value="30">30 - Isenta/não tributada com ST</SelectItem>
                      <SelectItem value="40">40 - Isenta</SelectItem>
                      <SelectItem value="41">41 - Não tributada</SelectItem>
                      <SelectItem value="50">50 - Suspensão</SelectItem>
                      <SelectItem value="51">51 - Diferimento</SelectItem>
                      <SelectItem value="60">60 - ICMS cobrado anteriormente por ST</SelectItem>
                      <SelectItem value="70">70 - Com redução e ST</SelectItem>
                      <SelectItem value="90">90 - Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CST PIS</Label>
                <Select value={defaultPisCst} onValueChange={setDefaultPisCst} disabled={!isOwnerOrAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o CST PIS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">01 - Tributável (alíquota básica)</SelectItem>
                    <SelectItem value="02">02 - Tributável (alíquota diferenciada)</SelectItem>
                    <SelectItem value="04">04 - Tributável (monofásica - revenda)</SelectItem>
                    <SelectItem value="06">06 - Tributável (alíquota zero)</SelectItem>
                    <SelectItem value="07">07 - Isenta</SelectItem>
                    <SelectItem value="08">08 - Sem incidência</SelectItem>
                    <SelectItem value="09">09 - Com suspensão</SelectItem>
                    <SelectItem value="49">49 - Outras operações de saída</SelectItem>
                    <SelectItem value="99">99 - Outras operações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CST COFINS</Label>
                <Select value={defaultCofinsCst} onValueChange={setDefaultCofinsCst} disabled={!isOwnerOrAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o CST COFINS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">01 - Tributável (alíquota básica)</SelectItem>
                    <SelectItem value="02">02 - Tributável (alíquota diferenciada)</SelectItem>
                    <SelectItem value="04">04 - Tributável (monofásica - revenda)</SelectItem>
                    <SelectItem value="06">06 - Tributável (alíquota zero)</SelectItem>
                    <SelectItem value="07">07 - Isenta</SelectItem>
                    <SelectItem value="08">08 - Sem incidência</SelectItem>
                    <SelectItem value="09">09 - Com suspensão</SelectItem>
                    <SelectItem value="49">49 - Outras operações de saída</SelectItem>
                    <SelectItem value="99">99 - Outras operações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Os valores padrão para Simples Nacional são: CSOSN 102, PIS 99, COFINS 99, Origem 0.
              Para Regime Normal: CST ICMS 00, PIS 01, COFINS 01, Origem 0.
              O PlugNotas calcula os valores dos impostos automaticamente (calculadora SEFAZ).
            </p>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Integração PlugNotas
                {plugnotasRegistered ? (
                  <Badge variant="default" className="bg-green-600">Cadastrada</Badge>
                ) : (
                  <Badge variant="secondary">Não cadastrada</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Cadastre sua empresa no PlugNotas para emissão de notas fiscais eletrônicas (NF-e)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Registration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">1. Cadastrar Empresa</p>
                    <p className="text-xs text-muted-foreground">
                      Salve as configurações acima antes de cadastrar. Necessário: CNPJ, Razão Social, Endereço e Regime Tributário.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={plugnotasRegistered ? 'outline' : 'default'}
                    size="sm"
                    onClick={handleRegisterPlugnotas}
                    disabled={isRegistering}
                  >
                    {isRegistering ? 'Cadastrando...' : plugnotasRegistered ? 'Recadastrar' : 'Cadastrar'}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Certificate Upload */}
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm">2. Certificado Digital (A1 - PFX)</p>
                  <p className="text-xs text-muted-foreground">
                    Envie o certificado digital A1 (.pfx) para assinar as notas fiscais.
                    {plugnotasStatus?.hasCertificate && (
                      <span className="text-green-600 font-medium ml-1">
                        ✓ Certificado instalado
                        {plugnotasStatus.certificateExpiry && ` (validade: ${plugnotasStatus.certificateExpiry})`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Arquivo (.pfx)</Label>
                    <Input
                      ref={certInputRef}
                      type="file"
                      accept=".pfx,.p12"
                      disabled={!plugnotasRegistered}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha do certificado</Label>
                    <Input
                      type="password"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Senha do certificado"
                      disabled={!plugnotasRegistered}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUploadCertificate}
                  disabled={!plugnotasRegistered || isUploadingCert}
                >
                  {isUploadingCert ? 'Enviando...' : 'Enviar Certificado'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
