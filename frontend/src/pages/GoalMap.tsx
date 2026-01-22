import React, { useState, useMemo } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Card,
  CardBody,
  Text,
  Badge,
  Progress,
  Spinner,
  Center,
  Select,
  Icon,
  Tooltip,
  Avatar,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useGoalsMap } from '../api/goals';
import { Goal } from '../types';

const levelColors: Record<string, string> = {
  CORPORATE: 'purple',
  EXECUTIVE: 'blue',
  DEPARTMENT: 'teal',
  TEAM: 'green',
  INDIVIDUAL: 'gray',
};

const levelOrder = ['CORPORATE', 'EXECUTIVE', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'];

const statusColors: Record<string, string> = {
  DRAFT: 'gray',
  ACTIVE: 'blue',
  ON_TRACK: 'green',
  AT_RISK: 'yellow',
  BEHIND: 'red',
  COMPLETED: 'green',
  CANCELLED: 'gray',
};

// Type for goals with link info
type GoalWithLinks = Goal & {
  parentLinks: Array<{ parentGoalId: string; contributionWeight: number }>;
  childLinks: Array<{ childGoalId: string; contributionWeight: number }>;
};

// Generate year options
function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return [currentYear + 1, currentYear, currentYear - 1];
}

interface GoalNodeProps {
  goal: GoalWithLinks;
  childGoals: GoalWithLinks[];
  allGoals: Map<string, GoalWithLinks>;
  depth?: number;
  onNavigate: (id: string) => void;
}

function GoalNode({ goal, childGoals, allGoals, depth = 0, onNavigate }: GoalNodeProps) {
  const hasChildren = childGoals.length > 0;

  return (
    <Box>
      <Card
        mb={2}
        cursor="pointer"
        onClick={() => onNavigate(goal.id)}
        _hover={{ borderColor: 'blue.300', shadow: 'md' }}
        transition="all 0.2s"
        borderWidth={1}
        borderColor="gray.200"
      >
        <CardBody py={3} px={4}>
          <HStack justify="space-between" align="start">
            <Box flex={1}>
              <HStack mb={1}>
                <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                  {goal.title}
                </Text>
              </HStack>
              <HStack spacing={2} flexWrap="wrap">
                <Badge size="sm" colorScheme={levelColors[goal.team.level]}>
                  {goal.team.name}
                </Badge>
                <Badge size="sm" colorScheme={statusColors[goal.status]}>
                  {goal.status.replace('_', ' ')}
                </Badge>
                {goal.isStretch && (
                  <Badge size="sm" colorScheme="purple">
                    Stretch
                  </Badge>
                )}
              </HStack>
            </Box>
            <VStack align="end" spacing={1}>
              <Text
                fontWeight="bold"
                fontSize="sm"
                color={
                  goal.progress >= 70
                    ? 'green.500'
                    : goal.progress >= 40
                    ? 'yellow.600'
                    : 'red.500'
                }
              >
                {Math.round(goal.progress)}%
              </Text>
              <Tooltip label={`${goal.owner.firstName} ${goal.owner.lastName}`}>
                <Avatar
                  size="xs"
                  name={`${goal.owner.firstName} ${goal.owner.lastName}`}
                  src={goal.owner.avatarUrl}
                />
              </Tooltip>
            </VStack>
          </HStack>
          <Progress
            value={goal.progress}
            size="xs"
            colorScheme={
              goal.progress >= 70 ? 'green' : goal.progress >= 40 ? 'yellow' : 'red'
            }
            borderRadius="full"
            mt={2}
          />
        </CardBody>
      </Card>

      {hasChildren && (
        <Box ml={6} pl={4} borderLeftWidth={2} borderColor="gray.200">
          <Center mb={2}>
            <HStack spacing={1} color="gray.400" fontSize="xs">
              <Icon as={ChevronDownIcon} />
              <Text>supported by</Text>
            </HStack>
          </Center>
          {childGoals.map((child) => {
            const grandChildren = Array.from(allGoals.values()).filter((g) =>
              g.parentLinks.some((l: { parentGoalId: string }) => l.parentGoalId === child.id)
            );
            return (
              <GoalNode
                key={child.id}
                goal={child}
                childGoals={grandChildren}
                allGoals={allGoals}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default function GoalMap() {
  const navigate = useNavigate();
  const yearOptions = getYearOptions();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data, isLoading } = useGoalsMap(selectedYear);

  // Organize goals by level and build tree structure
  const { rootGoals, goalsByLevel, allGoalsMap } = useMemo(() => {
    if (!data) {
      return {
        rootGoals: [] as GoalWithLinks[],
        goalsByLevel: {} as Record<string, GoalWithLinks[]>,
        allGoalsMap: new Map<string, GoalWithLinks>(),
      };
    }

    const allGoalsMap = new Map<string, GoalWithLinks>(
      data.goals.map((g) => [g.id, g as GoalWithLinks])
    );

    // Find root goals (goals with no parent links)
    const rootGoals = data.goals.filter((g) => g.parentLinks.length === 0) as GoalWithLinks[];

    // Group all goals by level for summary
    const goalsByLevel: Record<string, GoalWithLinks[]> = {};
    for (const level of levelOrder) {
      goalsByLevel[level] = data.goals.filter((g) => g.team.level === level) as GoalWithLinks[];
    }

    return { rootGoals, goalsByLevel, allGoalsMap };
  }, [data]);

  const handleNavigate = (id: string) => {
    navigate(`/goals/${id}`);
  };

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="lg">Goal Alignment Map</Heading>
        <Select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          w="150px"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </HStack>

      {/* Summary by level */}
      <HStack spacing={4} flexWrap="wrap">
        {levelOrder.map((level) => {
          const goals = goalsByLevel[level] || [];
          if (goals.length === 0) return null;
          const avgProgress =
            goals.reduce((sum, g) => sum + g.progress, 0) / goals.length;
          return (
            <Card key={level} flex="1" minW="150px">
              <CardBody py={3} px={4}>
                <HStack justify="space-between">
                  <Badge colorScheme={levelColors[level]}>{level}</Badge>
                  <Text fontWeight="bold" fontSize="sm">
                    {goals.length} goals
                  </Text>
                </HStack>
                <Progress
                  value={avgProgress}
                  size="sm"
                  colorScheme={
                    avgProgress >= 70 ? 'green' : avgProgress >= 40 ? 'yellow' : 'red'
                  }
                  borderRadius="full"
                  mt={2}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Avg: {Math.round(avgProgress)}%
                </Text>
              </CardBody>
            </Card>
          );
        })}
      </HStack>

      {/* Hierarchical tree view */}
      {rootGoals.length > 0 ? (
        <Box>
          <Text fontWeight="medium" mb={4} color="gray.600">
            Click any goal to view details and manage key results
          </Text>
          {rootGoals.map((goal) => {
            const childGoals = Array.from(allGoalsMap.values()).filter((g) =>
              g.parentLinks.some((l: { parentGoalId: string }) => l.parentGoalId === goal.id)
            );
            return (
              <GoalNode
                key={goal.id}
                goal={goal}
                childGoals={childGoals}
                allGoals={allGoalsMap}
                onNavigate={handleNavigate}
              />
            );
          })}
        </Box>
      ) : (
        <Card>
          <CardBody textAlign="center" py={8}>
            <Text color="gray.500">
              No goals found for {selectedYear}. Create goals to see them here.
            </Text>
          </CardBody>
        </Card>
      )}

      {/* Unlinked goals section */}
      {data && data.goals.filter((g) => g.parentLinks.length === 0 && g.childLinks.length === 0).length > 0 && (
        <Box>
          <Text fontWeight="medium" mb={3} color="gray.600">
            Unlinked Goals (not connected to hierarchy)
          </Text>
          <HStack spacing={3} flexWrap="wrap">
            {data.goals
              .filter((g) => g.parentLinks.length === 0 && g.childLinks.length === 0)
              .map((goal) => (
                <Card
                  key={goal.id}
                  cursor="pointer"
                  onClick={() => handleNavigate(goal.id)}
                  _hover={{ borderColor: 'orange.300', shadow: 'md' }}
                  borderWidth={1}
                  borderColor="orange.200"
                  borderStyle="dashed"
                  minW="250px"
                  maxW="300px"
                >
                  <CardBody py={2} px={3}>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                          {goal.title}
                        </Text>
                        <Badge size="sm" colorScheme={levelColors[goal.team.level]}>
                          {goal.team.name}
                        </Badge>
                      </VStack>
                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                        color={
                          goal.progress >= 70
                            ? 'green.500'
                            : goal.progress >= 40
                            ? 'yellow.600'
                            : 'red.500'
                        }
                      >
                        {Math.round(goal.progress)}%
                      </Text>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
          </HStack>
        </Box>
      )}
    </VStack>
  );
}
