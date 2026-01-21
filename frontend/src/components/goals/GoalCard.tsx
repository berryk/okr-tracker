import React from 'react';
import {
  Box,
  Badge,
  Text,
  HStack,
  VStack,
  Avatar,
  Progress,
  Flex,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { Goal, GoalStatus } from '../../types';

const statusColors: Record<GoalStatus, string> = {
  DRAFT: 'gray',
  ACTIVE: 'blue',
  ON_TRACK: 'green',
  AT_RISK: 'yellow',
  BEHIND: 'red',
  COMPLETED: 'green',
  CANCELLED: 'gray',
};

interface GoalCardProps {
  goal: Goal;
}

export default function GoalCard({ goal }: GoalCardProps) {
  return (
    <Link to={`/goals/${goal.id}`}>
      <Box
        bg="white"
        p={5}
        borderRadius="lg"
        borderWidth={1}
        borderColor="gray.200"
        _hover={{ shadow: 'md', borderColor: 'blue.200' }}
        transition="all 0.2s"
      >
        <VStack align="stretch" spacing={3}>
          <Flex justify="space-between" align="start">
            <Box flex={1}>
              <Text fontWeight="semibold" fontSize="md" noOfLines={2}>
                {goal.title}
              </Text>
              <HStack spacing={2} mt={1}>
                <Badge colorScheme={statusColors[goal.status]} size="sm">
                  {goal.status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" size="sm">
                  {goal.quarter}
                </Badge>
                {goal.isStretch && (
                  <Badge colorScheme="purple" size="sm">
                    Stretch
                  </Badge>
                )}
              </HStack>
            </Box>
          </Flex>

          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm" color="gray.600">
                Progress
              </Text>
              <Text fontSize="sm" fontWeight="semibold">
                {Math.round(goal.progress)}%
              </Text>
            </Flex>
            <Progress
              value={goal.progress}
              size="sm"
              colorScheme={goal.progress >= 70 ? 'green' : goal.progress >= 40 ? 'yellow' : 'red'}
              borderRadius="full"
            />
          </Box>

          <Flex justify="space-between" align="center">
            <HStack spacing={2}>
              <Avatar
                size="xs"
                name={`${goal.owner.firstName} ${goal.owner.lastName}`}
                src={goal.owner.avatarUrl}
              />
              <Text fontSize="sm" color="gray.600">
                {goal.owner.firstName} {goal.owner.lastName}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {goal.team.name}
            </Text>
          </Flex>

          {goal.measures && goal.measures.length > 0 && (
            <Text fontSize="xs" color="gray.500">
              {goal.measures.length} key result{goal.measures.length !== 1 ? 's' : ''}
            </Text>
          )}
        </VStack>
      </Box>
    </Link>
  );
}
