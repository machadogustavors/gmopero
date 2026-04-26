import 'dotenv/config';
import { PrismaClient, UserRole, ItemType, ServiceOrderStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ── Company ──────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { taxId: '08187168000160' },
    update: {},
    create: {
      name: 'Auto Center Demo',
      taxId: '08187168000160',
      legalName: 'Auto Center Demo LTDA',
      stateRegistration: '123456789',
      street: 'Rua das Oficinas',
      number: '100',
      neighborhood: 'Centro',
      cityCode: '4115200',
      city: 'Maringa',
      state: 'PR',
      zipCode: '87020025',
      phone: '44999990000',
      email: 'contato@autocenterdemo.com.br',
    },
  });
  console.log(`✅ Company: ${company.name} (${company.id})`);

  // ── Owner User ───────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      companyId: company.id,
      name: 'John Owner',
      email: 'owner@demo.com',
      passwordHash,
      role: UserRole.OWNER,
    },
  });
  console.log(`✅ Owner: ${owner.email} (${owner.id})`);

  // ── Staff User ───────────────────────────────────────
  const staff = await prisma.user.upsert({
    where: { email: 'staff@demo.com' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Jane Staff',
      email: 'staff@demo.com',
      passwordHash,
      role: UserRole.STAFF,
    },
  });
  console.log(`✅ Staff: ${staff.email} (${staff.id})`);

  // ── Customers ────────────────────────────────────────
  const customer1 = await prisma.customer.create({
    data: {
      companyId: company.id,
      taxId: '12345678901',
      name: 'Carlos Silva',
      email: 'carlos@email.com',
      phone: '44999001122',
      street: 'Av. Brasil',
      number: '500',
      neighborhood: 'Centro',
      cityCode: '4115200',
      city: 'Maringa',
      state: 'PR',
      zipCode: '87010000',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      companyId: company.id,
      taxId: '98765432100',
      name: 'Maria Oliveira',
      email: 'maria@email.com',
      phone: '44998887766',
      street: 'Rua Parana',
      number: '200',
      neighborhood: 'Zona 7',
      cityCode: '4115200',
      city: 'Maringa',
      state: 'PR',
      zipCode: '87020100',
    },
  });
  console.log(`✅ Customers: ${customer1.name}, ${customer2.name}`);

  // ── Vehicles ─────────────────────────────────────────
  const vehicle1 = await prisma.vehicle.upsert({
    where: { companyId_licensePlate: { companyId: company.id, licensePlate: 'ABC1D23' } },
    update: {},
    create: {
      companyId: company.id,
      customerId: customer1.id,
      licensePlate: 'ABC1D23',
      brand: 'Fiat',
      model: 'Argo',
      year: 2022,
      color: 'White',
      mileage: 45000,
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { companyId_licensePlate: { companyId: company.id, licensePlate: 'XYZ9E87' } },
    update: {},
    create: {
      companyId: company.id,
      customerId: customer2.id,
      licensePlate: 'XYZ9E87',
      brand: 'Volkswagen',
      model: 'Gol',
      year: 2020,
      color: 'Silver',
      mileage: 62000,
    },
  });
  console.log(`✅ Vehicles: ${vehicle1.licensePlate}, ${vehicle2.licensePlate}`);

  // ── Service Order (with items) ───────────────────────
  const existingOrder = await prisma.serviceOrder.findFirst({
    where: { companyId: company.id, orderNumber: 1 },
  });

  if (!existingOrder) {
    const serviceOrder = await prisma.serviceOrder.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        vehicleId: vehicle1.id,
        orderNumber: 1,
        status: ServiceOrderStatus.OPEN,
        description: 'Oil change + brake pad replacement',
        totalParts: 250.0,
        totalServices: 150.0,
        totalAmount: 400.0,
        items: {
          create: [
            {
              companyId: company.id,
              type: ItemType.PART,
              description: 'Engine Oil 5W30 - 4L',
              ncm: '27101932',
              cfop: '5102',
              quantity: 1,
              unitPrice: 120.0,
              totalPrice: 120.0,
            },
            {
              companyId: company.id,
              type: ItemType.PART,
              description: 'Oil Filter',
              ncm: '84212300',
              cfop: '5102',
              quantity: 1,
              unitPrice: 30.0,
              totalPrice: 30.0,
            },
            {
              companyId: company.id,
              type: ItemType.PART,
              description: 'Front Brake Pads (set)',
              ncm: '68131000',
              cfop: '5102',
              quantity: 1,
              unitPrice: 100.0,
              totalPrice: 100.0,
            },
            {
              companyId: company.id,
              type: ItemType.SERVICE,
              description: 'Oil Change Labor',
              quantity: 1,
              unitPrice: 80.0,
              totalPrice: 80.0,
            },
            {
              companyId: company.id,
              type: ItemType.SERVICE,
              description: 'Brake Pad Replacement Labor',
              quantity: 1,
              unitPrice: 70.0,
              totalPrice: 70.0,
            },
          ],
        },
      },
    });
    console.log(`✅ Service Order #${serviceOrder.orderNumber} (${serviceOrder.id})`);
  } else {
    console.log(`✅ Service Order #${existingOrder.orderNumber} already exists (${existingOrder.id})`);
  }
  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
