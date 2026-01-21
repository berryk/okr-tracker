import React, { useState } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Button,
  HStack,
  Select,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Spinner,
  Center,
  Text,
  VStack,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useGoals, useCreateGoal } from '../api/goals';
import { useTeams } from '../api/teams';
import GoalCard from '../components/goals/GoalCard';
import GoalForm from '../components/goals/GoalForm';

const currentYear = new Date().getFullYear();
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].flatMap((q) =>
  [currentYear, currentYear + 1].map((y) => `${q}-${y}`)
);

export default function Goals() {
  const [selectedQuarter, setSelectedQuarter] = useState(
    `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${currentYear}`
  );
  const [selectedTeam, setSelectedTeam] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();

  const { data: goalsData, isLoading: goalsLoading } = useGoals({
    quarter: selectedQuarter,
    teamId: selectedTeam || undefined,
  });
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const createGoal = useCreateGoal();

  const handleCreateGoal = async (data: any) => {
    const [quarter, yearStr] = data.quarter.split('-');
    await createGoal.mutateAsync({
      ...data,
      quarter: data.quarter,
      year: parseInt(yearStr),
    });
    onClose();
  };

  if (goalsLoading || teamsLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  const goals = goalsData?.goals || [];

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between" wrap="wrap" gap={4}>
        <Heading size="lg">Goals</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onOpen}>
          New Goal
        </Button>
      </HStack>

      <HStack spacing={4} wrap="wrap">
        <Select
          w="auto"
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
        >
          {quarters.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </Select>

        <Select
          w="auto"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          placeholder="All Teams"
        >
          {teams?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </Select>
      </HStack>

      {goals.length === 0 ? (
        <Box bg="white" p={8} borderRadius="lg" textAlign="center">
          <Text color="gray.500">No goals found for the selected filters.</Text>
          <Button mt={4} colorScheme="blue" onClick={onOpen}>
            Create First Goal
          </Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </SimpleGrid>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Goal</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <GoalForm
              teams={teams || []}
              onSubmit={handleCreateGoal}
              isLoading={createGoal.isPending}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
