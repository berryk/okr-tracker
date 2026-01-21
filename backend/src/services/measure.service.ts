import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateMeasureInput, UpdateMeasureInput } from '../types';
import { MeasureType } from '@prisma/client';

export async function createMeasure(data: CreateMeasureInput, organizationId: string) {
  // Verify the goal exists and belongs to the organization
  const goal = await prisma.goal.findFirst({
    where: {
      id: data.goalId,
      team: { organizationId },
    },
  });

  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  const measure = await prisma.measure.create({
    data: {
      title: data.title,
      description: data.description,
      measureType: data.measureType as MeasureType,
      unit: data.unit,
      startValue: data.startValue || 0,
      currentValue: data.startValue || 0,
      targetValue: data.targetValue,
      goalId: data.goalId,
    },
  });

  return measure;
}

export async function updateMeasure(
  measureId: string,
  data: UpdateMeasureInput,
  organizationId: string
) {
  const existingMeasure = await prisma.measure.findFirst({
    where: {
      id: measureId,
      goal: { team: { organizationId } },
    },
  });

  if (!existingMeasure) {
    throw new AppError(404, 'Measure not found');
  }

  const measure = await prisma.measure.update({
    where: { id: measureId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.currentValue !== undefined && { currentValue: data.currentValue }),
      ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
    },
  });

  // Recalculate progress
  const progress = calculateProgress(
    measure.measureType,
    measure.startValue,
    measure.currentValue,
    measure.targetValue
  );

  const updatedMeasure = await prisma.measure.update({
    where: { id: measureId },
    data: { progress },
  });

  // Update the parent goal's progress based on all measures
  await updateGoalProgress(updatedMeasure.goalId);

  return updatedMeasure;
}

export async function deleteMeasure(measureId: string, organizationId: string) {
  const measure = await prisma.measure.findFirst({
    where: {
      id: measureId,
      goal: { team: { organizationId } },
    },
  });

  if (!measure) {
    throw new AppError(404, 'Measure not found');
  }

  await prisma.measure.delete({
    where: { id: measureId },
  });

  // Update the parent goal's progress
  await updateGoalProgress(measure.goalId);
}

export async function recordMeasureUpdate(
  measureId: string,
  value: number,
  note: string | undefined,
  authorId: string,
  organizationId: string
) {
  const measure = await prisma.measure.findFirst({
    where: {
      id: measureId,
      goal: { team: { organizationId } },
    },
  });

  if (!measure) {
    throw new AppError(404, 'Measure not found');
  }

  // Create the update record
  const update = await prisma.measureUpdate.create({
    data: {
      measureId,
      value,
      note,
      authorId,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Update the measure's current value
  const progress = calculateProgress(
    measure.measureType,
    measure.startValue,
    value,
    measure.targetValue
  );

  await prisma.measure.update({
    where: { id: measureId },
    data: {
      currentValue: value,
      progress,
    },
  });

  // Update the parent goal's progress
  await updateGoalProgress(measure.goalId);

  return update;
}

function calculateProgress(
  measureType: MeasureType,
  startValue: number,
  currentValue: number,
  targetValue: number
): number {
  if (measureType === 'MILESTONE') {
    return currentValue >= targetValue ? 100 : 0;
  }

  const range = Math.abs(targetValue - startValue);
  if (range === 0) return 100;

  let progress: number;

  if (measureType === 'INCREASE_TO') {
    progress = ((currentValue - startValue) / range) * 100;
  } else if (measureType === 'DECREASE_TO') {
    progress = ((startValue - currentValue) / range) * 100;
  } else {
    // MAINTAIN - how close we are to the target
    const deviation = Math.abs(currentValue - targetValue);
    const maxDeviation = range || 1;
    progress = Math.max(0, (1 - deviation / maxDeviation) * 100);
  }

  return Math.min(100, Math.max(0, progress));
}

async function updateGoalProgress(goalId: string) {
  const measures = await prisma.measure.findMany({
    where: { goalId },
  });

  if (measures.length === 0) {
    return;
  }

  const avgProgress = measures.reduce((sum, m) => sum + m.progress, 0) / measures.length;

  // Determine status based on progress
  let status: string;
  if (avgProgress >= 100) {
    status = 'COMPLETED';
  } else if (avgProgress >= 70) {
    status = 'ON_TRACK';
  } else if (avgProgress >= 40) {
    status = 'AT_RISK';
  } else {
    status = 'BEHIND';
  }

  await prisma.goal.update({
    where: { id: goalId },
    data: {
      progress: avgProgress,
      status: status as any,
    },
  });
}

export async function getMeasureHistory(measureId: string, organizationId: string) {
  const measure = await prisma.measure.findFirst({
    where: {
      id: measureId,
      goal: { team: { organizationId } },
    },
    include: {
      updates: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!measure) {
    throw new AppError(404, 'Measure not found');
  }

  return measure.updates;
}
