import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Progress,
  Spinner,
  Center,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useAvailableParents, useLinkGoals } from '../../api/goals';
import { Goal } from '../../types';

const levelColors: Record<string, string> = {
  CORPORATE: 'purple',
  EXECUTIVE: 'blue',
  DEPARTMENT: 'teal',
  TEAM: 'green',
  INDIVIDUAL: 'gray',
};

interface LinkGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
}

export default function LinkGoalModal({ isOpen, onClose, goalId, goalTitle }: LinkGoalModalProps) {
  const [search, setSearch] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const { data: availableGoals, isLoading } = useAvailableParents(goalId);
  const linkGoals = useLinkGoals();

  const filteredGoals = availableGoals?.filter((goal) =>
    goal.title.toLowerCase().includes(search.toLowerCase()) ||
    goal.team.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleLink = async () => {
    if (!selectedGoal) return;

    await linkGoals.mutateAsync({
      childGoalId: goalId,
      parentGoalId: selectedGoal.id,
    });

    setSelectedGoal(null);
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSelectedGoal(null);
    setSearch('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Link to Parent Goal
          <Text fontSize="sm" fontWeight="normal" color="gray.500" mt={1}>
            Select a goal that "{goalTitle}" contributes to
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search goals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>

            {isLoading ? (
              <Center p={8}>
                <Spinner size="lg" color="blue.500" />
              </Center>
            ) : filteredGoals.length === 0 ? (
              <Center p={8}>
                <Text color="gray.500">
                  {search ? 'No matching goals found' : 'No available goals to link to'}
                </Text>
              </Center>
            ) : (
              <VStack spacing={2} align="stretch" maxH="400px" overflowY="auto">
                {filteredGoals.map((goal) => (
                  <Box
                    key={goal.id}
                    p={3}
                    borderWidth={selectedGoal?.id === goal.id ? 2 : 1}
                    borderColor={selectedGoal?.id === goal.id ? 'blue.500' : 'gray.200'}
                    borderRadius="md"
                    cursor="pointer"
                    bg={selectedGoal?.id === goal.id ? 'blue.50' : 'white'}
                    onClick={() => setSelectedGoal(goal)}
                    _hover={{ borderColor: 'blue.300', bg: 'gray.50' }}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between" align="start">
                      <Box flex={1}>
                        <Text fontWeight="medium" fontSize="sm">
                          {goal.title}
                        </Text>
                        <HStack spacing={1} mt={1}>
                          <Badge size="sm" colorScheme={levelColors[goal.team.level] || 'gray'}>
                            {goal.team.name}
                          </Badge>
                          <Badge size="sm" variant="outline">
                            {goal.team.level}
                          </Badge>
                        </HStack>
                      </Box>
                      <Text fontWeight="bold" fontSize="sm">
                        {Math.round(goal.progress)}%
                      </Text>
                    </HStack>
                    <Progress
                      value={goal.progress}
                      size="xs"
                      colorScheme={goal.progress >= 70 ? 'green' : goal.progress >= 40 ? 'yellow' : 'red'}
                      borderRadius="full"
                      mt={2}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Owner: {goal.owner.firstName} {goal.owner.lastName}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleLink}
            isLoading={linkGoals.isPending}
            isDisabled={!selectedGoal}
          >
            Link Goal
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
