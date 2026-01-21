import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Icon,
  Spinner,
  Center,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useGoalHierarchy, HierarchyGoal } from '../../api/goals';
import { GoalStatus } from '../../types';

const statusColors: Record<string, string> = {
  DRAFT: 'gray',
  ACTIVE: 'blue',
  ON_TRACK: 'green',
  AT_RISK: 'yellow',
  BEHIND: 'red',
  COMPLETED: 'green',
  CANCELLED: 'gray',
};

const levelColors: Record<string, string> = {
  CORPORATE: 'purple',
  EXECUTIVE: 'blue',
  DEPARTMENT: 'teal',
  TEAM: 'green',
  INDIVIDUAL: 'gray',
};

interface GoalNodeProps {
  goal: HierarchyGoal;
  isCurrent?: boolean;
  direction?: 'up' | 'down';
  onClick?: () => void;
}

function GoalNode({ goal, isCurrent, direction, onClick }: GoalNodeProps) {
  return (
    <Box
      p={3}
      bg={isCurrent ? 'blue.50' : 'white'}
      borderWidth={isCurrent ? 2 : 1}
      borderColor={isCurrent ? 'blue.500' : 'gray.200'}
      borderRadius="lg"
      cursor={!isCurrent ? 'pointer' : 'default'}
      onClick={!isCurrent ? onClick : undefined}
      _hover={!isCurrent ? { bg: 'gray.50', borderColor: 'blue.300' } : undefined}
      transition="all 0.2s"
      position="relative"
      w="100%"
    >
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between" align="start">
          <Box flex={1}>
            <Text fontWeight={isCurrent ? 'bold' : 'semibold'} fontSize="sm" noOfLines={2}>
              {goal.title}
            </Text>
            <HStack spacing={1} mt={1}>
              <Badge size="sm" colorScheme={levelColors[goal.team.level] || 'gray'}>
                {goal.team.name}
              </Badge>
              <Badge size="sm" colorScheme={statusColors[goal.status]}>
                {goal.status.replace('_', ' ')}
              </Badge>
            </HStack>
          </Box>
          <Text fontWeight="bold" fontSize="sm" color={goal.progress >= 70 ? 'green.500' : goal.progress >= 40 ? 'yellow.600' : 'red.500'}>
            {Math.round(goal.progress)}%
          </Text>
        </HStack>
        <Progress
          value={goal.progress}
          size="xs"
          colorScheme={goal.progress >= 70 ? 'green' : goal.progress >= 40 ? 'yellow' : 'red'}
          borderRadius="full"
        />
        <Text fontSize="xs" color="gray.500">
          {goal.owner.firstName} {goal.owner.lastName}
          {goal.contributionWeight && goal.contributionWeight < 1 && (
            <Tooltip label="Contribution weight to parent goal">
              <Text as="span" color="blue.500" ml={2}>
                ({Math.round(goal.contributionWeight * 100)}% contribution)
              </Text>
            </Tooltip>
          )}
        </Text>
      </VStack>
      {isCurrent && (
        <Badge
          position="absolute"
          top={-2}
          right={2}
          colorScheme="blue"
          fontSize="xs"
        >
          Current
        </Badge>
      )}
    </Box>
  );
}

interface ConnectorProps {
  direction: 'up' | 'down';
  label?: string;
}

function Connector({ direction, label }: ConnectorProps) {
  return (
    <VStack spacing={0} py={1}>
      <Box
        w="2px"
        h="20px"
        bg="gray.300"
      />
      <Center
        w={6}
        h={6}
        borderRadius="full"
        bg="gray.100"
        borderWidth={1}
        borderColor="gray.300"
      >
        <Icon
          as={direction === 'up' ? ChevronUpIcon : ChevronDownIcon}
          color="gray.500"
          boxSize={4}
        />
      </Center>
      {label && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {label}
        </Text>
      )}
      <Box
        w="2px"
        h="20px"
        bg="gray.300"
      />
    </VStack>
  );
}

interface AlignmentLadderProps {
  goalId: string;
}

export default function AlignmentLadder({ goalId }: AlignmentLadderProps) {
  const navigate = useNavigate();
  const { data: hierarchy, isLoading, error } = useGoalHierarchy(goalId);

  if (isLoading) {
    return (
      <Center p={8}>
        <Spinner size="lg" color="blue.500" />
      </Center>
    );
  }

  if (error || !hierarchy) {
    return (
      <Center p={4}>
        <Text color="gray.500">Unable to load hierarchy</Text>
      </Center>
    );
  }

  const { current, ancestors, descendants } = hierarchy;
  const hasHierarchy = ancestors.length > 0 || descendants.length > 0;

  if (!hasHierarchy) {
    return (
      <Box p={4} bg="gray.50" borderRadius="lg" textAlign="center">
        <Text color="gray.500" fontSize="sm">
          This goal is not linked to any other goals.
        </Text>
        <Text color="gray.400" fontSize="xs" mt={1}>
          Link this goal to a parent goal to show alignment.
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={0} align="stretch">
      {/* Ancestors (parent goals, going up) */}
      {ancestors.map((ancestor, index) => (
        <React.Fragment key={ancestor.id}>
          <GoalNode
            goal={ancestor}
            direction="up"
            onClick={() => navigate(`/goals/${ancestor.id}`)}
          />
          <Center>
            <Connector
              direction="down"
              label={index === ancestors.length - 1 ? 'contributes to' : undefined}
            />
          </Center>
        </React.Fragment>
      ))}

      {/* Current goal */}
      <GoalNode goal={current} isCurrent />

      {/* Descendants (child goals, going down) */}
      {descendants.map((descendant, index) => (
        <React.Fragment key={descendant.id}>
          <Center>
            <Connector
              direction="down"
              label={index === 0 ? 'supported by' : undefined}
            />
          </Center>
          <GoalNode
            goal={descendant}
            direction="down"
            onClick={() => navigate(`/goals/${descendant.id}`)}
          />
        </React.Fragment>
      ))}
    </VStack>
  );
}
