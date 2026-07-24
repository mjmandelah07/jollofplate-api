import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { CategoryStatus, PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for seeding');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const email = (process.env.ADMIN_EMAIL ?? 'admin@jollofplate.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const firstName = process.env.ADMIN_FIRST_NAME ?? 'Mojisola';
  const lastName = process.env.ADMIN_LAST_NAME ?? 'Aramide';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { firstName, lastName, passwordHash },
    create: { email, firstName, lastName, passwordHash, role: 'admin' },
  });

  await prisma.restaurantSettings.deleteMany();
  const settings = await prisma.restaurantSettings.create({
    data: {
      restaurantName: 'JollofPlate',
      whatsappNumber: '2348012345678',
      contactNumber: '2348012345678',
      email: 'hello@jollofplate.com',
      address: 'Lagos, Nigeria',
      deliveryFee: 1500,
      businessHours: {
        mon: '10:00-21:00',
        tue: '10:00-21:00',
        wed: '10:00-21:00',
        thu: '10:00-21:00',
        fri: '10:00-22:00',
        sat: '11:00-22:00',
        sun: '12:00-20:00',
      },
      socialLinks: {
        instagram: 'https://instagram.com/jollofplate',
      },
    },
  });

  const classics = await prisma.category.upsert({
    where: { slug: 'classics' },
    update: {},
    create: {
      name: 'Classics',
      slug: 'classics',
      description: 'Signature jollof plates',
      status: CategoryStatus.ACTIVE,
      sortOrder: 1,
    },
  });

  const sides = await prisma.category.upsert({
    where: { slug: 'sides' },
    update: {},
    create: {
      name: 'Sides',
      slug: 'sides',
      description: 'Perfect pairings',
      status: CategoryStatus.ACTIVE,
      sortOrder: 2,
    },
  });

  await prisma.meal.upsert({
    where: { slug: 'party-jollof' },
    update: {},
    create: {
      name: 'Party Jollof',
      slug: 'party-jollof',
      description: 'Smoky party-style jollof rice with rich tomato base.',
      price: 4500,
      categoryId: classics.id,
      images: [],
      preparationTime: 25,
      featured: true,
      bestSeller: true,
      available: true,
      ingredients: 'Rice, tomato stew, spices, oil',
      extras: [
        { name: 'Chicken', price: 2000 },
        { name: 'Beef', price: 1800 },
      ],
    },
  });

  await prisma.meal.upsert({
    where: { slug: 'plantain' },
    update: {},
    create: {
      name: 'Fried Plantain',
      slug: 'plantain',
      description: 'Sweet ripe plantain, golden fried.',
      price: 1500,
      categoryId: sides.id,
      images: [],
      preparationTime: 10,
      featured: false,
      bestSeller: true,
      available: true,
    },
  });

  console.log('Seed complete:');
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Settings: ${settings.restaurantName}`);
  console.log(`  Categories: ${classics.slug}, ${sides.slug}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
