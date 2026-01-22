import React from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  VStack,
  HStack,
  Progress,
  Card,
  CardBody,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { useGoals } from '../api/goals';
import { useAuth } from '../context/AuthContext';
import GoalCard from '../components/goals/GoalCard';

const currentYear = new Date().getFullYear();

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGoals({ year: currentYear, limit: 6 });

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  const goals = data?.goals || [];
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED').length;
  const atRiskGoals = goals.filter((g) => g.status === 'AT_RISK' || g.status === 'BEHIND').length;
  const avgProgress = totalGoals
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;

  return (
    <VStack spacing={8} align="stretch">
      <Box>
        <Heading size="lg">Welcome back, {user?.firstName}!</Heading>
        <Text color="gray.600" mt={1}>
          Here's your {currentYear} OKR overview
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Goals</StatLabel>
              <StatNumber>{totalGoals}</StatNumber>
              <StatHelpText>{currentYear}</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Completed</StatLabel>
              <StatNumber color="green.500">{completedGoals}</StatNumber>
              <StatHelpText>
                {totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}% done
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>At Risk</StatLabel>
              <StatNumber color={atRiskGoals > 0 ? 'red.500' : 'gray.500'}>
                {atRiskGoals}
              </StatNumber>
              <StatHelpText>Need attention</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Avg Progress</StatLabel>
              <StatNumber>{avgProgress}%</StatNumber>
              <Progress
                value={avgProgress}
                size="sm"
                colorScheme={avgProgress >= 70 ? 'green' : avgProgress >= 40 ? 'yellow' : 'red'}
                mt={2}
                borderRadius="full"
              />
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Box>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Recent Goals</Heading>
        </HStack>
        {goals.length === 0 ? (
          <Card>
            <CardBody>
              <Text color="gray.500" textAlign="center">
                No goals found for {currentYear}. Create your first goal!
              </Text>
            </CardBody>
          </Card>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </VStack>
  );
}
