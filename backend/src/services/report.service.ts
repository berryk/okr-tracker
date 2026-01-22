import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface TeamProgress {
  teamId: string;
  teamName: string;
  teamLevel: string;
  totalGoals: number;
  completedGoals: number;
  atRiskGoals: number;
  avgProgress: number;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
    owner: string;
    measures: Array<{
      title: string;
      current: number;
      target: number;
      unit: string;
      progress: number;
    }>;
  }>;
}

interface QuarterlyReport {
  quarter: string;
  year: number;
  generatedAt: string;
  organization: string;
  summary: {
    totalGoals: number;
    avgProgress: number;
    byStatus: Record<string, number>;
    topPerforming: Array<{ title: string; progress: number; team: string }>;
    atRisk: Array<{ title: string; progress: number; team: string; owner: string }>;
  };
  teamBreakdown: TeamProgress[];
}

interface AnnualReport {
  year: number;
  generatedAt: string;
  organization: string;
  summary: {
    totalGoals: number;
    avgProgress: number;
    byStatus: Record<string, number>;
    byQuarter: Array<{ quarter: string; avgProgress: number; goalCount: number }>;
  };
  teamBreakdown: TeamProgress[];
  highlights: {
    completed: Array<{ title: string; team: string; owner: string }>;
    topProgress: Array<{ title: string; progress: number; team: string }>;
    needsAttention: Array<{ title: string; progress: number; team: string }>;
  };
}

export async function generateQuarterlyReport(
  organizationId: string,
  quarter: string
): Promise<QuarterlyReport> {
  // Parse quarter to get year
  const match = quarter.match(/^Q([1-4])-(\d{4})$/);
  if (!match) {
    throw new AppError(400, 'Invalid quarter format. Use Q1-2026 format.');
  }
  const year = parseInt(match[2]);

  // Get organization
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!org) {
    throw new AppError(404, 'Organization not found');
  }

  // Get all goals for the year with their measures for the specific quarter
  const goals = await prisma.goal.findMany({
    where: {
      team: { organizationId },
      year,
    },
    include: {
      team: { select: { id: true, name: true, level: true } },
      owner: { select: { firstName: true, lastName: true } },
      measures: {
        where: { quarter },
        select: {
          title: true,
          currentValue: true,
          targetValue: true,
          unit: true,
          progress: true,
        },
      },
    },
    orderBy: { progress: 'desc' },
  });

  // Calculate summary stats
  const totalGoals = goals.length;
  const avgProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;

  const byStatus: Record<string, number> = {};
  goals.forEach((g) => {
    byStatus[g.status] = (byStatus[g.status] || 0) + 1;
  });

  // Top performing goals (progress >= 70)
  const topPerforming = goals
    .filter((g) => g.progress >= 70)
    .slice(0, 5)
    .map((g) => ({
      title: g.title,
      progress: g.progress,
      team: g.team.name,
    }));

  // At risk goals
  const atRisk = goals
    .filter((g) => g.status === 'AT_RISK' || g.status === 'BEHIND' || g.progress < 40)
    .map((g) => ({
      title: g.title,
      progress: g.progress,
      team: g.team.name,
      owner: `${g.owner.firstName} ${g.owner.lastName}`,
    }));

  // Group by team
  const teamMap = new Map<string, TeamProgress>();
  goals.forEach((g) => {
    if (!teamMap.has(g.team.id)) {
      teamMap.set(g.team.id, {
        teamId: g.team.id,
        teamName: g.team.name,
        teamLevel: g.team.level,
        totalGoals: 0,
        completedGoals: 0,
        atRiskGoals: 0,
        avgProgress: 0,
        goals: [],
      });
    }
    const team = teamMap.get(g.team.id)!;
    team.totalGoals++;
    if (g.status === 'COMPLETED') team.completedGoals++;
    if (g.status === 'AT_RISK' || g.status === 'BEHIND') team.atRiskGoals++;
    team.goals.push({
      id: g.id,
      title: g.title,
      status: g.status,
      progress: g.progress,
      owner: `${g.owner.firstName} ${g.owner.lastName}`,
      measures: g.measures.map((m) => ({
        title: m.title,
        current: m.currentValue,
        target: m.targetValue,
        unit: m.unit || '',
        progress: m.progress,
      })),
    });
  });

  // Calculate team avg progress
  teamMap.forEach((team) => {
    team.avgProgress = team.totalGoals > 0
      ? Math.round(team.goals.reduce((sum, g) => sum + g.progress, 0) / team.totalGoals)
      : 0;
  });

  return {
    quarter,
    year,
    generatedAt: new Date().toISOString(),
    organization: org.name,
    summary: {
      totalGoals,
      avgProgress,
      byStatus,
      topPerforming,
      atRisk,
    },
    teamBreakdown: Array.from(teamMap.values()).sort((a, b) => {
      const levelOrder: Record<string, number> = { CORPORATE: 0, EXECUTIVE: 1, DEPARTMENT: 2, TEAM: 3, INDIVIDUAL: 4 };
      return (levelOrder[a.teamLevel] || 5) - (levelOrder[b.teamLevel] || 5);
    }),
  };
}

export async function generateAnnualReport(
  organizationId: string,
  year: number
): Promise<AnnualReport> {
  // Get organization
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!org) {
    throw new AppError(404, 'Organization not found');
  }

  // Get all goals for the year
  const goals = await prisma.goal.findMany({
    where: {
      team: { organizationId },
      year,
    },
    include: {
      team: { select: { id: true, name: true, level: true } },
      owner: { select: { firstName: true, lastName: true } },
      measures: {
        select: {
          title: true,
          quarter: true,
          currentValue: true,
          targetValue: true,
          unit: true,
          progress: true,
        },
      },
    },
    orderBy: { progress: 'desc' },
  });

  // Calculate summary stats
  const totalGoals = goals.length;
  const avgProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;

  const byStatus: Record<string, number> = {};
  goals.forEach((g) => {
    byStatus[g.status] = (byStatus[g.status] || 0) + 1;
  });

  // Calculate progress by quarter based on measures
  const quarterMap = new Map<string, { total: number; count: number }>();
  goals.forEach((g) => {
    g.measures.forEach((m) => {
      if (!quarterMap.has(m.quarter)) {
        quarterMap.set(m.quarter, { total: 0, count: 0 });
      }
      const q = quarterMap.get(m.quarter)!;
      q.total += m.progress;
      q.count++;
    });
  });

  const byQuarter = Array.from(quarterMap.entries())
    .map(([quarter, data]) => ({
      quarter,
      avgProgress: data.count > 0 ? Math.round(data.total / data.count) : 0,
      goalCount: data.count,
    }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));

  // Group by team
  const teamMap = new Map<string, TeamProgress>();
  goals.forEach((g) => {
    if (!teamMap.has(g.team.id)) {
      teamMap.set(g.team.id, {
        teamId: g.team.id,
        teamName: g.team.name,
        teamLevel: g.team.level,
        totalGoals: 0,
        completedGoals: 0,
        atRiskGoals: 0,
        avgProgress: 0,
        goals: [],
      });
    }
    const team = teamMap.get(g.team.id)!;
    team.totalGoals++;
    if (g.status === 'COMPLETED') team.completedGoals++;
    if (g.status === 'AT_RISK' || g.status === 'BEHIND') team.atRiskGoals++;
    team.goals.push({
      id: g.id,
      title: g.title,
      status: g.status,
      progress: g.progress,
      owner: `${g.owner.firstName} ${g.owner.lastName}`,
      measures: g.measures.map((m) => ({
        title: m.title,
        current: m.currentValue,
        target: m.targetValue,
        unit: m.unit || '',
        progress: m.progress,
      })),
    });
  });

  // Calculate team avg progress
  teamMap.forEach((team) => {
    team.avgProgress = team.totalGoals > 0
      ? Math.round(team.goals.reduce((sum, g) => sum + g.progress, 0) / team.totalGoals)
      : 0;
  });

  // Highlights
  const completed = goals
    .filter((g) => g.status === 'COMPLETED')
    .map((g) => ({
      title: g.title,
      team: g.team.name,
      owner: `${g.owner.firstName} ${g.owner.lastName}`,
    }));

  const topProgress = goals
    .filter((g) => g.status !== 'COMPLETED')
    .slice(0, 5)
    .map((g) => ({
      title: g.title,
      progress: g.progress,
      team: g.team.name,
    }));

  const needsAttention = goals
    .filter((g) => g.status === 'AT_RISK' || g.status === 'BEHIND' || g.progress < 30)
    .map((g) => ({
      title: g.title,
      progress: g.progress,
      team: g.team.name,
    }));

  return {
    year,
    generatedAt: new Date().toISOString(),
    organization: org.name,
    summary: {
      totalGoals,
      avgProgress,
      byStatus,
      byQuarter,
    },
    teamBreakdown: Array.from(teamMap.values()).sort((a, b) => {
      const levelOrder: Record<string, number> = { CORPORATE: 0, EXECUTIVE: 1, DEPARTMENT: 2, TEAM: 3, INDIVIDUAL: 4 };
      return (levelOrder[a.teamLevel] || 5) - (levelOrder[b.teamLevel] || 5);
    }),
    highlights: {
      completed,
      topProgress,
      needsAttention,
    },
  };
}

// Generate a simple text format suitable for copy-paste to PowerPoint
export function formatReportForPowerPoint(report: QuarterlyReport | AnnualReport): string {
  const isQuarterly = 'quarter' in report;
  const lines: string[] = [];

  // Title
  if (isQuarterly) {
    lines.push(`${report.organization} - ${(report as QuarterlyReport).quarter} OKR Progress Report`);
  } else {
    lines.push(`${report.organization} - ${report.year} Annual OKR Report`);
  }
  lines.push('='.repeat(60));
  lines.push('');

  // Summary Section
  lines.push('EXECUTIVE SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(`Total Objectives: ${report.summary.totalGoals}`);
  lines.push(`Average Progress: ${report.summary.avgProgress}%`);
  lines.push('');
  lines.push('Status Breakdown:');
  Object.entries(report.summary.byStatus).forEach(([status, count]) => {
    const statusLabel = status.replace(/_/g, ' ');
    lines.push(`  - ${statusLabel}: ${count}`);
  });
  lines.push('');

  // Top Performing (quarterly) or Highlights (annual)
  if (isQuarterly) {
    const qReport = report as QuarterlyReport;
    if (qReport.summary.topPerforming.length > 0) {
      lines.push('TOP PERFORMING OBJECTIVES');
      lines.push('-'.repeat(40));
      qReport.summary.topPerforming.forEach((g, i) => {
        lines.push(`${i + 1}. ${g.title}`);
        lines.push(`   Team: ${g.team} | Progress: ${g.progress}%`);
      });
      lines.push('');
    }

    if (qReport.summary.atRisk.length > 0) {
      lines.push('OBJECTIVES AT RISK');
      lines.push('-'.repeat(40));
      qReport.summary.atRisk.forEach((g, i) => {
        lines.push(`${i + 1}. ${g.title}`);
        lines.push(`   Team: ${g.team} | Owner: ${g.owner} | Progress: ${g.progress}%`);
      });
      lines.push('');
    }
  } else {
    const aReport = report as AnnualReport;

    if (aReport.summary.byQuarter.length > 0) {
      lines.push('PROGRESS BY QUARTER');
      lines.push('-'.repeat(40));
      aReport.summary.byQuarter.forEach((q) => {
        lines.push(`  ${q.quarter}: ${q.avgProgress}% avg (${q.goalCount} key results)`);
      });
      lines.push('');
    }

    if (aReport.highlights.completed.length > 0) {
      lines.push('COMPLETED OBJECTIVES');
      lines.push('-'.repeat(40));
      aReport.highlights.completed.forEach((g, i) => {
        lines.push(`${i + 1}. ${g.title}`);
        lines.push(`   Team: ${g.team} | Owner: ${g.owner}`);
      });
      lines.push('');
    }

    if (aReport.highlights.needsAttention.length > 0) {
      lines.push('NEEDS ATTENTION');
      lines.push('-'.repeat(40));
      aReport.highlights.needsAttention.forEach((g, i) => {
        lines.push(`${i + 1}. ${g.title}`);
        lines.push(`   Team: ${g.team} | Progress: ${g.progress}%`);
      });
      lines.push('');
    }
  }

  // Team Breakdown
  lines.push('TEAM BREAKDOWN');
  lines.push('-'.repeat(40));
  report.teamBreakdown.forEach((team) => {
    lines.push('');
    lines.push(`${team.teamName.toUpperCase()} (${team.teamLevel})`);
    lines.push(`Objectives: ${team.totalGoals} | Completed: ${team.completedGoals} | At Risk: ${team.atRiskGoals}`);
    lines.push(`Average Progress: ${team.avgProgress}%`);
    lines.push('');
    team.goals.forEach((g) => {
      lines.push(`  • ${g.title}`);
      lines.push(`    Status: ${g.status.replace(/_/g, ' ')} | Progress: ${g.progress}% | Owner: ${g.owner}`);
      if (g.measures.length > 0) {
        lines.push('    Key Results:');
        g.measures.forEach((m) => {
          lines.push(`      - ${m.title}: ${m.current}/${m.target} ${m.unit} (${m.progress}%)`);
        });
      }
    });
  });

  lines.push('');
  lines.push('='.repeat(60));
  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`);

  return lines.join('\n');
}
