import prisma from '../config/database';
import { getLLMProvider } from './llm.service';
import { AppError } from '../middleware/errorHandler';

interface GoalSuggestion {
  improvedTitle: string;
  explanation: string;
  suggestedMeasures: Array<{
    title: string;
    type: string;
    target: number;
    unit: string;
  }>;
  suggestedParentId: string | null;
}

interface MeasureReview {
  score: number;
  assessment: {
    specific: { score: number; note: string };
    measurable: { score: number; note: string };
    achievable: { score: number; note: string };
    relevant: { score: number; note: string };
    timeBound: { score: number; note: string };
  };
  suggestions: string[];
  risks: string[];
  recommendations?: {
    improvedTitle?: string;
    improvedDescription?: string;
    suggestedTargetValue?: number;
    suggestedUnit?: string;
    suggestedMeasureType?: 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';
  };
}

interface AlignmentSuggestion {
  goalId: string;
  goalTitle: string;
  teamName: string;
  relevance: number;
  explanation: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Goal Writing Assistant
export async function suggestGoalImprovement(
  goalTitle: string,
  goalDescription: string | undefined,
  teamId: string,
  organizationId: string
): Promise<GoalSuggestion> {
  const llm = getLLMProvider();

  // Get team context and potential parent goals
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
    include: { parent: true },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  // Get potential parent goals from higher-level teams
  const parentGoals = await prisma.goal.findMany({
    where: {
      team: { organizationId },
      status: { in: ['ACTIVE', 'ON_TRACK', 'AT_RISK'] },
    },
    include: { team: { select: { name: true, level: true } } },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  const prompt = `You are an expert OKR coach helping improve goal quality.

Team context:
- Team: ${team.name} (${team.level} level)
- Parent team: ${team.parent?.name || 'None (top-level)'}

User's draft goal:
Title: "${goalTitle}"
${goalDescription ? `Description: "${goalDescription}"` : ''}

Available parent goals to potentially align to:
${parentGoals.map((g, i) => `${i + 1}. "${g.title}" (${g.team.name} - ${g.team.level})`).join('\n')}

Please provide:
1. An improved version of the goal title that is clearer, more inspiring, and action-oriented
2. A brief explanation of why the changes help
3. 3 suggested key results/measures with specific targets
4. The ID of the best parent goal to link to (or null if none fit well)

Respond in JSON format:
{
  "improvedTitle": "string",
  "explanation": "string",
  "suggestedMeasures": [
    { "title": "string", "type": "INCREASE_TO|DECREASE_TO|MAINTAIN|MILESTONE", "target": number, "unit": "string" }
  ],
  "suggestedParentId": "string or null"
}`;

  const response = await llm.complete(prompt, {
    maxTokens: 1024,
    temperature: 0.7,
    systemPrompt: 'You are an expert OKR coach. Always respond with valid JSON.',
  });

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Return a fallback if parsing fails
    return {
      improvedTitle: goalTitle,
      explanation: 'Unable to generate suggestions at this time.',
      suggestedMeasures: [],
      suggestedParentId: null,
    };
  }
}

// Measure Quality Review
export async function reviewMeasure(
  measureId: string,
  organizationId: string
): Promise<MeasureReview> {
  const llm = getLLMProvider();

  const measure = await prisma.measure.findFirst({
    where: { id: measureId, goal: { team: { organizationId } } },
    include: { goal: { select: { title: true, description: true } } },
  });

  if (!measure) {
    throw new AppError(404, 'Measure not found');
  }

  const prompt = `You are an expert OKR coach reviewing a key result for quality.

Goal: "${measure.goal.title}"
${measure.goal.description ? `Goal Description: "${measure.goal.description}"` : ''}

Key Result being reviewed:
- Title: "${measure.title}"
- Target: ${measure.targetValue} ${measure.unit || ''}
- Start Value: ${measure.startValue}
- Type: ${measure.measureType}
${measure.description ? `- Description: "${measure.description}"` : ''}

Evaluate this key result against SMART criteria:
- Specific: Is it clear what's being measured?
- Measurable: Can progress be objectively tracked?
- Achievable: Is the target realistic?
- Relevant: Does it actually indicate goal success?
- Time-bound: Is there a clear deadline?

Also consider:
- Is this a leading or lagging indicator?
- Could this metric be gamed?
- What might this miss?

Respond in JSON format:
{
  "score": number (1-10),
  "assessment": {
    "specific": { "score": number (1-10), "note": "string" },
    "measurable": { "score": number (1-10), "note": "string" },
    "achievable": { "score": number (1-10), "note": "string" },
    "relevant": { "score": number (1-10), "note": "string" },
    "timeBound": { "score": number (1-10), "note": "string" }
  },
  "suggestions": ["string"],
  "risks": ["string"]
}`;

  const response = await llm.complete(prompt, {
    maxTokens: 1024,
    temperature: 0.5,
    systemPrompt: 'You are an expert OKR coach. Always respond with valid JSON.',
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      score: 5,
      assessment: {
        specific: { score: 5, note: 'Unable to assess' },
        measurable: { score: 5, note: 'Unable to assess' },
        achievable: { score: 5, note: 'Unable to assess' },
        relevant: { score: 5, note: 'Unable to assess' },
        timeBound: { score: 5, note: 'Unable to assess' },
      },
      suggestions: ['Unable to generate suggestions at this time.'],
      risks: [],
    };
  }
}

// Draft Measure Review (before saving)
interface DraftMeasureInput {
  title: string;
  description?: string;
  measureType: 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';
  unit?: string;
  startValue: number;
  targetValue: number;
  goalId: string;
}

export async function reviewDraftMeasure(
  measure: DraftMeasureInput,
  organizationId: string
): Promise<MeasureReview> {
  const llm = getLLMProvider();

  const goal = await prisma.goal.findFirst({
    where: { id: measure.goalId, team: { organizationId } },
    select: { title: true, description: true },
  });

  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  const prompt = `You are an expert OKR coach reviewing a key result for quality.

Goal: "${goal.title}"
${goal.description ? `Goal Description: "${goal.description}"` : ''}

Key Result being reviewed:
- Title: "${measure.title}"
- Target: ${measure.targetValue} ${measure.unit || ''}
- Start Value: ${measure.startValue}
- Type: ${measure.measureType}
${measure.description ? `- Description: "${measure.description}"` : ''}

Evaluate this key result against SMART criteria:
- Specific: Is it clear what's being measured?
- Measurable: Can progress be objectively tracked?
- Achievable: Is the target realistic?
- Relevant: Does it actually indicate goal success?
- Time-bound: Is there a clear deadline?

Also consider:
- Is this a leading or lagging indicator?
- Could this metric be gamed?
- What might this miss?

IMPORTANT: If the score is less than 8, provide specific recommendations for how to make this key result SMART-compliant. Include improved values the user can apply directly.

Respond in JSON format:
{
  "score": number (1-10),
  "assessment": {
    "specific": { "score": number (1-10), "note": "string" },
    "measurable": { "score": number (1-10), "note": "string" },
    "achievable": { "score": number (1-10), "note": "string" },
    "relevant": { "score": number (1-10), "note": "string" },
    "timeBound": { "score": number (1-10), "note": "string" }
  },
  "suggestions": ["string"],
  "risks": ["string"],
  "recommendations": {
    "improvedTitle": "A clearer, more specific version of the title (only if improvement needed)",
    "improvedDescription": "A better description explaining what success looks like (only if improvement needed)",
    "suggestedTargetValue": number (only if current target seems off),
    "suggestedUnit": "A better unit of measurement (only if improvement needed)",
    "suggestedMeasureType": "INCREASE_TO|DECREASE_TO|MAINTAIN|MILESTONE (only if different type is more appropriate)"
  }
}`;

  const response = await llm.complete(prompt, {
    maxTokens: 1024,
    temperature: 0.5,
    systemPrompt: 'You are an expert OKR coach. Always respond with valid JSON.',
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      score: 5,
      assessment: {
        specific: { score: 5, note: 'Unable to assess' },
        measurable: { score: 5, note: 'Unable to assess' },
        achievable: { score: 5, note: 'Unable to assess' },
        relevant: { score: 5, note: 'Unable to assess' },
        timeBound: { score: 5, note: 'Unable to assess' },
      },
      suggestions: ['Unable to generate suggestions at this time.'],
      risks: [],
      recommendations: undefined,
    };
  }
}

// Alignment Suggestions
export async function suggestAlignment(
  goalId: string,
  organizationId: string
): Promise<AlignmentSuggestion[]> {
  const llm = getLLMProvider();

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, team: { organizationId } },
    include: { team: { select: { name: true, level: true } } },
  });

  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  // Get potential parent goals
  const potentialParents = await prisma.goal.findMany({
    where: {
      id: { not: goalId },
      team: { organizationId },
      year: goal.year,
      status: { in: ['ACTIVE', 'ON_TRACK', 'AT_RISK', 'DRAFT'] },
    },
    include: { team: { select: { id: true, name: true, level: true } } },
  });

  if (potentialParents.length === 0) {
    return [];
  }

  const prompt = `You are an expert OKR coach helping align goals.

Goal to align:
- Title: "${goal.title}"
- Team: ${goal.team.name} (${goal.team.level})
${goal.description ? `- Description: "${goal.description}"` : ''}

Potential parent goals to link to:
${potentialParents.map((g, i) => `${i + 1}. ID: "${g.id}" | "${g.title}" | Team: ${g.team.name} (${g.team.level})`).join('\n')}

Analyze which parent goals this objective could contribute to.
Consider semantic similarity, strategic fit, and how the child goal's success would drive the parent goal.

Respond in JSON format with the top 3 matches:
{
  "suggestions": [
    { "goalId": "string", "relevance": number (0-1), "explanation": "string" }
  ]
}`;

  const response = await llm.complete(prompt, {
    maxTokens: 1024,
    temperature: 0.5,
    systemPrompt: 'You are an expert OKR coach. Always respond with valid JSON.',
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]);

    // Enrich with goal details
    return parsed.suggestions
      .filter((s: any) => potentialParents.find((p) => p.id === s.goalId))
      .map((s: any) => {
        const parent = potentialParents.find((p) => p.id === s.goalId)!;
        return {
          goalId: s.goalId,
          goalTitle: parent.title,
          teamName: parent.team.name,
          relevance: s.relevance,
          explanation: s.explanation,
        };
      });
  } catch {
    return [];
  }
}

// Progress Summary Generator
export async function generateProgressSummary(
  goalId: string,
  organizationId: string
): Promise<string> {
  const llm = getLLMProvider();

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, team: { organizationId } },
    include: {
      measures: true,
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { author: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  // Calculate weeks elapsed
  const startDate = new Date(goal.createdAt);
  const now = new Date();
  const weeksElapsed = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

  const prompt = `Generate a brief executive summary of OKR progress.

Goal: "${goal.title}"
Status: ${goal.status}
Overall Progress: ${goal.progress}%
Time elapsed: ~${weeksElapsed} weeks

Key Results:
${goal.measures.map((m) => `- ${m.title}: ${m.currentValue}/${m.targetValue} ${m.unit || ''} (${Math.round(m.progress)}%)`).join('\n') || 'No key results defined'}

Recent updates:
${goal.updates.map((u) => `- ${u.author.firstName}: "${u.content}"`).join('\n') || 'No recent updates'}

Write a 2-3 sentence executive summary highlighting: overall status, key wins or progress, main risks or blockers, and any recommended actions.
Keep it concise and actionable.`;

  const response = await llm.complete(prompt, {
    maxTokens: 256,
    temperature: 0.7,
    systemPrompt: 'You are a business analyst generating concise executive summaries.',
  });

  return response.trim();
}

// Natural Language Chat
export async function chat(
  messages: ChatMessage[],
  organizationId: string
): Promise<string> {
  const llm = getLLMProvider();

  // Get context about the organization's OKRs
  const [goalStats, recentGoals] = await Promise.all([
    prisma.goal.groupBy({
      by: ['status'],
      where: { team: { organizationId } },
      _count: true,
    }),
    prisma.goal.findMany({
      where: { team: { organizationId } },
      include: {
        team: { select: { name: true, level: true } },
        measures: { select: { title: true, progress: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  const context = `You are an AI assistant helping users understand and manage their OKRs.

Current OKR Summary for this organization:
- Total goals by status: ${goalStats.map((s) => `${s.status}: ${s._count}`).join(', ')}

Recent/Active Goals:
${recentGoals.map((g) => `- "${g.title}" (${g.team.name}) - ${g.status} - ${Math.round(g.progress)}% complete`).join('\n')}

The user may ask questions about their goals, request summaries, or ask for advice.
Be helpful, specific, and reference actual data when possible.`;

  // Build conversation
  const conversationHistory = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const prompt = `${context}

Conversation:
${conversationHistory}

Respond helpfully to the user's most recent message.`;

  const response = await llm.complete(prompt, {
    maxTokens: 1024,
    temperature: 0.7,
    systemPrompt: 'You are a helpful OKR assistant. Be concise but thorough.',
  });

  return response.trim();
}

// Store AI interaction for analytics
export async function logAIInteraction(
  userId: string,
  interactionType: string,
  prompt: string,
  response: string,
  entityType?: string,
  entityId?: string
) {
  try {
    await prisma.aIInteraction.create({
      data: {
        userId,
        type: interactionType as any,
        prompt,
        response,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        tokens: 0, // TODO: Track actual token usage
        latencyMs: 0, // TODO: Track actual latency
        entityType,
        entityId,
      },
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to log AI interaction:', error);
  }
}
