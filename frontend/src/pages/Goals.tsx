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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { AddIcon, ChevronDownIcon, CopyIcon, DownloadIcon } from '@chakra-ui/icons';
import { useGoals, useCreateGoal } from '../api/goals';
import { useTeams } from '../api/teams';
import GoalCard from '../components/goals/GoalCard';
import GoalForm from '../components/goals/GoalForm';
import CloneGoalModal from '../components/goals/CloneGoalModal';
import BulkImportModal from '../components/goals/BulkImportModal';

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

export default function Goals() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTeam, setSelectedTeam] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isCloneOpen, onOpen: onCloneOpen, onClose: onCloneClose } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();

  const { data: goalsData, isLoading: goalsLoading } = useGoals({
    year: selectedYear,
    teamId: selectedTeam || undefined,
  });
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const createGoal = useCreateGoal();

  const handleCreateGoal = async (data: any) => {
    await createGoal.mutateAsync({
      title: data.title,
      description: data.description,
      year: data.year,
      teamId: data.teamId,
      isStretch: data.isStretch,
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
        <Heading size="lg">Objectives</Heading>
        <HStack spacing={2}>
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline">
              More Actions
            </MenuButton>
            <MenuList>
              <MenuItem icon={<CopyIcon />} onClick={onCloneOpen}>
                Clone from Template
              </MenuItem>
              <MenuItem icon={<DownloadIcon />} onClick={onImportOpen}>
                Bulk Import
              </MenuItem>
            </MenuList>
          </Menu>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onOpen}>
            New Objective
          </Button>
        </HStack>
      </HStack>

      <HStack spacing={4} wrap="wrap">
        <Select
          w="auto"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
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
          <ModalHeader>Create New Objective</ModalHeader>
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

      <CloneGoalModal
        isOpen={isCloneOpen}
        onClose={onCloneClose}
      />

      <BulkImportModal
        isOpen={isImportOpen}
        onClose={onImportClose}
      />
    </VStack>
  );
}
