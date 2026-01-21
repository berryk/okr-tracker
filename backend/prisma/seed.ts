import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme',
    },
  });
  console.log('Created organization:', org.name);

  // Create Teams
  const corporateTeam = await prisma.team.create({
    data: {
      name: 'Corporate',
      description: 'Executive leadership team',
      level: 'CORPORATE',
      organizationId: org.id,
    },
  });

  const salesTeam = await prisma.team.create({
    data: {
      name: 'Sales',
      description: 'Sales organization',
      level: 'EXECUTIVE',
      parentId: corporateTeam.id,
      organizationId: org.id,
    },
  });

  const engineeringTeam = await prisma.team.create({
    data: {
      name: 'Engineering',
      description: 'Engineering organization',
      level: 'EXECUTIVE',
      parentId: corporateTeam.id,
      organizationId: org.id,
    },
  });

  const enterpriseSalesTeam = await prisma.team.create({
    data: {
      name: 'Enterprise Sales',
      description: 'Enterprise sales team',
      level: 'DEPARTMENT',
      parentId: salesTeam.id,
      organizationId: org.id,
    },
  });

  const platformTeam = await prisma.team.create({
    data: {
      name: 'Platform Team',
      description: 'Core platform development',
      level: 'TEAM',
      parentId: engineeringTeam.id,
      organizationId: org.id,
    },
  });

  console.log('Created teams');

  // Create Users
  const passwordHash = await bcrypt.hash('demo123', 12);

  const ceo = await prisma.user.create({
    data: {
      email: 'ceo@demo.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Chen',
      title: 'CEO',
      role: 'EXECUTIVE',
      organizationId: org.id,
      teamId: corporateTeam.id,
    },
  });

  const vpSales = await prisma.user.create({
    data: {
      email: 'vp.sales@demo.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      title: 'VP Sales',
      role: 'EXECUTIVE',
      organizationId: org.id,
      teamId: salesTeam.id,
      managerId: ceo.id,
    },
  });

  const vpEngineering = await prisma.user.create({
    data: {
      email: 'vp.engineering@demo.com',
      passwordHash,
      firstName: 'Marcus',
      lastName: 'Williams',
      title: 'VP Engineering',
      role: 'EXECUTIVE',
      organizationId: org.id,
      teamId: engineeringTeam.id,
      managerId: ceo.id,
    },
  });

  const salesManager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      passwordHash,
      firstName: 'Emily',
      lastName: 'Rodriguez',
      title: 'Enterprise Sales Manager',
      role: 'MANAGER',
      organizationId: org.id,
      teamId: enterpriseSalesTeam.id,
      managerId: vpSales.id,
    },
  });

  const developer = await prisma.user.create({
    data: {
      email: 'dev@demo.com',
      passwordHash,
      firstName: 'Jordan',
      lastName: 'Lee',
      title: 'Senior Software Engineer',
      role: 'CONTRIBUTOR',
      organizationId: org.id,
      teamId: platformTeam.id,
      managerId: vpEngineering.id,
    },
  });

  console.log('Created users');

  // Create Goals for Q1-2026
  const quarter = 'Q1-2026';
  const year = 2026;

  // Corporate Revenue Goal
  const revenueGoal = await prisma.goal.create({
    data: {
      title: 'Grow Revenue 25% Year-over-Year',
      description: 'Increase annual recurring revenue from $80M to $100M ARR through new customer acquisition and expansion',
      quarter,
      year,
      status: 'ACTIVE',
      progress: 68,
      teamId: corporateTeam.id,
      ownerId: ceo.id,
    },
  });

  // Sales Goal
  const salesGoal = await prisma.goal.create({
    data: {
      title: 'Close $50M in New Annual Contract Value',
      description: 'Drive new business through enterprise and mid-market sales',
      quarter,
      year,
      status: 'ON_TRACK',
      progress: 72,
      teamId: salesTeam.id,
      ownerId: vpSales.id,
    },
  });

  // Enterprise Sales Goal
  const enterpriseGoal = await prisma.goal.create({
    data: {
      title: 'Close 10 Enterprise Deals >$500K',
      description: 'Land major enterprise accounts with ACV over $500K',
      quarter,
      year,
      status: 'AT_RISK',
      progress: 40,
      teamId: enterpriseSalesTeam.id,
      ownerId: salesManager.id,
    },
  });

  // Corporate Product Goal
  const productGoal = await prisma.goal.create({
    data: {
      title: 'Launch Platform v2.0 with AI Features',
      description: 'Deliver next-generation platform with AI-powered capabilities',
      quarter,
      year,
      status: 'ACTIVE',
      progress: 55,
      teamId: corporateTeam.id,
      ownerId: ceo.id,
    },
  });

  // Engineering Goal
  const engineeringGoal = await prisma.goal.create({
    data: {
      title: 'Deliver Core Platform Features On Schedule',
      description: 'Complete all planned features for v2.0 release',
      quarter,
      year,
      status: 'ON_TRACK',
      progress: 65,
      teamId: engineeringTeam.id,
      ownerId: vpEngineering.id,
    },
  });

  // Individual Developer Goal
  const devGoal = await prisma.goal.create({
    data: {
      title: 'Implement AI Integration Service',
      description: 'Build the backend service for AI model integration',
      quarter,
      year,
      status: 'ON_TRACK',
      progress: 70,
      teamId: platformTeam.id,
      ownerId: developer.id,
    },
  });

  console.log('Created goals');

  // Create Measures
  await prisma.measure.createMany({
    data: [
      // Revenue goal measures
      {
        title: 'Annual Recurring Revenue (ARR)',
        measureType: 'INCREASE_TO',
        unit: '$M',
        startValue: 80,
        currentValue: 93.6,
        targetValue: 100,
        progress: 68,
        goalId: revenueGoal.id,
      },
      {
        title: 'Net Revenue Retention (NRR)',
        measureType: 'MAINTAIN',
        unit: '%',
        startValue: 115,
        currentValue: 118,
        targetValue: 120,
        progress: 60,
        goalId: revenueGoal.id,
      },
      // Sales goal measures
      {
        title: 'New ACV Closed',
        measureType: 'INCREASE_TO',
        unit: '$M',
        startValue: 0,
        currentValue: 36,
        targetValue: 50,
        progress: 72,
        goalId: salesGoal.id,
      },
      {
        title: 'Win Rate',
        measureType: 'INCREASE_TO',
        unit: '%',
        startValue: 25,
        currentValue: 32,
        targetValue: 35,
        progress: 70,
        goalId: salesGoal.id,
      },
      // Enterprise goal measures
      {
        title: 'Enterprise Deals Closed',
        measureType: 'INCREASE_TO',
        unit: 'deals',
        startValue: 0,
        currentValue: 4,
        targetValue: 10,
        progress: 40,
        goalId: enterpriseGoal.id,
      },
      // Engineering goal measures
      {
        title: 'Sprint Velocity',
        measureType: 'MAINTAIN',
        unit: 'points',
        startValue: 40,
        currentValue: 45,
        targetValue: 50,
        progress: 80,
        goalId: engineeringGoal.id,
      },
      {
        title: 'Code Coverage',
        measureType: 'MAINTAIN',
        unit: '%',
        startValue: 75,
        currentValue: 82,
        targetValue: 85,
        progress: 70,
        goalId: engineeringGoal.id,
      },
      // Dev goal measures
      {
        title: 'API Endpoints Completed',
        measureType: 'INCREASE_TO',
        unit: 'endpoints',
        startValue: 0,
        currentValue: 7,
        targetValue: 10,
        progress: 70,
        goalId: devGoal.id,
      },
      {
        title: 'API Response Latency',
        measureType: 'DECREASE_TO',
        unit: 'ms',
        startValue: 500,
        currentValue: 180,
        targetValue: 100,
        progress: 80,
        goalId: devGoal.id,
      },
    ],
  });

  console.log('Created measures');

  // Create Goal Links (alignment)
  await prisma.goalLink.createMany({
    data: [
      { parentGoalId: revenueGoal.id, childGoalId: salesGoal.id, contributionWeight: 0.6 },
      { parentGoalId: salesGoal.id, childGoalId: enterpriseGoal.id, contributionWeight: 0.7 },
      { parentGoalId: productGoal.id, childGoalId: engineeringGoal.id, contributionWeight: 0.8 },
      { parentGoalId: engineeringGoal.id, childGoalId: devGoal.id, contributionWeight: 0.25 },
    ],
  });

  console.log('Created goal links');

  // Create Goal Updates
  await prisma.goalUpdate.createMany({
    data: [
      {
        goalId: revenueGoal.id,
        authorId: ceo.id,
        content: 'Strong Q1 performance. EMEA is exceeding targets while APAC needs attention.',
      },
      {
        goalId: salesGoal.id,
        authorId: vpSales.id,
        content: 'Closed 3 major deals this week. Pipeline looking healthy for Q1 target.',
      },
      {
        goalId: devGoal.id,
        authorId: developer.id,
        content: 'Completed Claude API integration. Starting work on the caching layer.',
      },
    ],
  });

  console.log('Created goal updates');

  console.log('\n=== Seed Complete ===');
  console.log('\nDemo Users (password: demo123):');
  console.log('  - ceo@demo.com (CEO)');
  console.log('  - vp.sales@demo.com (VP Sales)');
  console.log('  - vp.engineering@demo.com (VP Engineering)');
  console.log('  - manager@demo.com (Sales Manager)');
  console.log('  - dev@demo.com (Developer)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
