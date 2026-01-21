/**
 * Demo seed data for OKR Tracker
 * Creates a realistic org hierarchy with cascading goals
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...');

  // ============ ORGANIZATION ============
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      domain: 'demo.com',
    },
  });

  // ============ TEAMS (Hierarchy) ============
  const corporate = await prisma.team.create({
    data: {
      name: 'Corporate',
      level: 'CORPORATE',
      organizationId: org.id,
    },
  });

  const salesDept = await prisma.team.create({
    data: {
      name: 'Sales',
      level: 'EXECUTIVE',
      organizationId: org.id,
      parentTeamId: corporate.id,
    },
  });

  const engineeringDept = await prisma.team.create({
    data: {
      name: 'Engineering',
      level: 'EXECUTIVE',
      organizationId: org.id,
      parentTeamId: corporate.id,
    },
  });

  const enterpriseSales = await prisma.team.create({
    data: {
      name: 'Enterprise Sales',
      level: 'DEPARTMENT',
      organizationId: org.id,
      parentTeamId: salesDept.id,
    },
  });

  const platformTeam = await prisma.team.create({
    data: {
      name: 'Platform Team',
      level: 'TEAM',
      organizationId: org.id,
      parentTeamId: engineeringDept.id,
    },
  });

  // ============ USERS ============
  const passwordHash = await hash('demo123', 10);

  const ceo = await prisma.user.create({
    data: {
      email: 'ceo@demo.com',
      name: 'Alex Chen',
      role: 'EXECUTIVE',
      organizationId: org.id,
      teamId: corporate.id,
      passwordHash,
    },
  });

  const vpSales = await prisma.user.create({
    data: {
      email: 'vp.sales@demo.com',
      name: 'Sarah Johnson',
      role: 'EXECUTIVE',
      organizationId: org.id,
      teamId: salesDept.id,
      managerId: ceo.id,
      passwordHash,
    },
  });

  const vpEngineering = await prisma.user.create({
    data: {
      email: 'vp.engineering@demo.com',
      name: 'Marcus Williams',
      role: 'EXECUTIVE',
      organizationId: org.id,
      teamId: engineeringDept.id,
      managerId: ceo.id,
      passwordHash,
    },
  });

  const salesManager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      name: 'Emily Rodriguez',
      role: 'MANAGER',
      organizationId: org.id,
      teamId: enterpriseSales.id,
      managerId: vpSales.id,
      passwordHash,
    },
  });

  const developer = await prisma.user.create({
    data: {
      email: 'dev@demo.com',
      name: 'Jordan Lee',
      role: 'CONTRIBUTOR',
      organizationId: org.id,
      teamId: platformTeam.id,
      managerId: vpEngineering.id,
      passwordHash,
    },
  });

  // ============ GOALS (Cascading Hierarchy) ============
  const quarter = 'Q1-2026';

  // Corporate Goal 1: Revenue
  const revenueGoal = await prisma.goal.create({
    data: {
      title: 'Grow Revenue 25% Year-over-Year',
      description: 'Achieve $100M ARR by end of Q1, representing 25% growth from Q1 2025',
      quarter,
      status: 'ACTIVE',
      teamId: corporate.id,
      ownerId: ceo.id,
      priority: 1,
    },
  });

  await prisma.measure.createMany({
    data: [
      {
        goalId: revenueGoal.id,
        title: 'Annual Recurring Revenue',
        unit: '$M',
        startValue: 80,
        currentValue: 88,
        targetValue: 100,
        measureType: 'INCREASE',
      },
      {
        goalId: revenueGoal.id,
        title: 'Net Revenue Retention',
        unit: '%',
        startValue: 110,
        currentValue: 115,
        targetValue: 120,
        measureType: 'INCREASE',
      },
    ],
  });

  // Sales Department Goal
  const salesGoal = await prisma.goal.create({
    data: {
      title: 'Close $50M in New Annual Contract Value',
      description: 'Win new business across enterprise and mid-market segments',
      quarter,
      status: 'ACTIVE',
      teamId: salesDept.id,
      ownerId: vpSales.id,
      priority: 1,
    },
  });

  await prisma.measure.createMany({
    data: [
      {
        goalId: salesGoal.id,
        title: 'New ACV Closed',
        unit: '$M',
        startValue: 0,
        currentValue: 32,
        targetValue: 50,
        measureType: 'INCREASE',
      },
      {
        goalId: salesGoal.id,
        title: 'Win Rate',
        unit: '%',
        startValue: 25,
        currentValue: 28,
        targetValue: 35,
        measureType: 'INCREASE',
      },
    ],
  });

  // Link sales goal to revenue goal
  await prisma.goalLink.create({
    data: {
      childGoalId: salesGoal.id,
      parentGoalId: revenueGoal.id,
      contributionWeight: 60,
    },
  });

  // Enterprise Sales Team Goal
  const enterpriseGoal = await prisma.goal.create({
    data: {
      title: 'Close 10 Enterprise Deals >$500K',
      description: 'Focus on Fortune 500 accounts with strategic value',
      quarter,
      status: 'ACTIVE',
      teamId: enterpriseSales.id,
      ownerId: salesManager.id,
      priority: 1,
    },
  });

  await prisma.measure.createMany({
    data: [
      {
        goalId: enterpriseGoal.id,
        title: 'Enterprise Deals Closed',
        unit: '#',
        startValue: 0,
        currentValue: 6,
        targetValue: 10,
        measureType: 'INCREASE',
      },
      {
        goalId: enterpriseGoal.id,
        title: 'Pipeline Coverage',
        unit: 'x',
        startValue: 2.5,
        currentValue: 3.2,
        targetValue: 4.0,
        measureType: 'INCREASE',
      },
    ],
  });

  // Link enterprise goal to sales goal
  await prisma.goalLink.create({
    data: {
      childGoalId: enterpriseGoal.id,
      parentGoalId: salesGoal.id,
      contributionWeight: 70,
    },
  });

  // Corporate Goal 2: Product
  const productGoal = await prisma.goal.create({
    data: {
      title: 'Launch Platform v2.0 with AI Features',
      description: 'Deliver next-generation platform with AI-powered automation',
      quarter,
      status: 'ACTIVE',
      teamId: corporate.id,
      ownerId: ceo.id,
      priority: 2,
    },
  });

  await prisma.measure.createMany({
    data: [
      {
        goalId: productGoal.id,
        title: 'Features Shipped',
        unit: '#',
        startValue: 0,
        currentValue: 8,
        targetValue: 12,
        measureType: 'INCREASE',
      },
      {
        goalId: productGoal.id,
        title: 'Customer Beta NPS',
        unit: 'score',
        startValue: 0,
        currentValue: 62,
        targetValue: 50,
        measureType: 'INCREASE',
      },
    ],
  });

  // Engineering Goal
  const engineeringGoal = await prisma.goal.create({
    data: {
      title: 'Deliver Core Platform Features On Schedule',
      description: 'Complete authentication, API, and AI integration milestones',
      quarter,
      status: 'ACTIVE',
      teamId: engineeringDept.id,
      ownerId: vpEngineering.id,
      priority: 1,
    },
  });

  await prisma.measure.createMany({
    data: [
      {
        goalId: engineeringGoal.id,
        title: 'Sprint Velocity',
        unit: 'points',
        startValue: 80,
        currentValue: 95,
        targetValue: 100,
        measureType: 'INCREASE',
      },
      {
        goalId: engineeringGoal.id,
        title: 'Code Coverage',
        unit: '%',
        startValue: 65,
        currentValue: 78,
        targetValue: 80,
        measureType: 'INCREASE',
      },
    ],
  });

  // Link engineering to product goal
  await prisma.goalLink.create({
    data: {
      childGoalId: engineeringGoal.id,
      parentGoalId: productGoal.id,
      contributionWeight: 80,
    },
  });

  // Individual Contributor Goal
  const devGoal = await prisma.goal.create({
    data: {
      title: 'Implement AI Integration Service',
      description: 'Build the LLM integration layer for goal suggestions and insights',
      quarter,
      status: 'ACTIVE',
      teamId: platformTeam.id,
      ownerId: developer.id,
      priority: 1,
    },
  });

  await prisma.measure.createMany({
    data: [
      {
        goalId: devGoal.id,
        title: 'API Endpoints Completed',
        unit: '#',
        startValue: 0,
        currentValue: 7,
        targetValue: 10,
        measureType: 'INCREASE',
      },
      {
        goalId: devGoal.id,
        title: 'Test Coverage',
        unit: '%',
        startValue: 0,
        currentValue: 85,
        targetValue: 90,
        measureType: 'INCREASE',
      },
      {
        goalId: devGoal.id,
        title: 'P95 Latency',
        unit: 'ms',
        startValue: 500,
        currentValue: 180,
        targetValue: 200,
        measureType: 'DECREASE',
      },
    ],
  });

  // Link dev goal to engineering goal
  await prisma.goalLink.create({
    data: {
      childGoalId: devGoal.id,
      parentGoalId: engineeringGoal.id,
      contributionWeight: 25,
    },
  });

  // ============ GOAL UPDATES ============
  await prisma.goalUpdate.createMany({
    data: [
      {
        goalId: revenueGoal.id,
        userId: ceo.id,
        content: 'Q1 off to a strong start. EMEA exceeding targets, APAC needs focus.',
        type: 'COMMENT',
      },
      {
        goalId: salesGoal.id,
        userId: vpSales.id,
        content: 'Closed Acme Corp deal for $2.5M. Pipeline looking healthy.',
        type: 'PROGRESS',
      },
      {
        goalId: devGoal.id,
        userId: developer.id,
        content: 'Completed Claude integration. Testing with real prompts now.',
        type: 'PROGRESS',
      },
    ],
  });

  console.log('✅ Demo data seeded successfully!');
  console.log('');
  console.log('Demo users:');
  console.log('  ceo@demo.com / demo123');
  console.log('  vp.sales@demo.com / demo123');
  console.log('  vp.engineering@demo.com / demo123');
  console.log('  manager@demo.com / demo123');
  console.log('  dev@demo.com / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
