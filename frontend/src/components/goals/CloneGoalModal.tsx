import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Select,
  Switch,
  VStack,
  Text,
  Box,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { useGoalsForCloning, useCloneGoal } from '../../api/goals';
import { useTeams } from '../../api/teams';
import { Goal } from '../../types';

interface CloneGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (goal: Goal) => void;
}

export default function CloneGoalModal({ isOpen, onClose, onSuccess }: CloneGoalModalProps) {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [sourceYear, setSourceYear] = useState(currentYear);
  const [sourceGoalId, setSourceGoalId] = useState('');
  const [targetTeamId, setTargetTeamId] = useState('');
  const [targetYear, setTargetYear] = useState(currentYear);
  const [includeMeasures, setIncludeMeasures] = useState(true);
  const [targetQuarter, setTargetQuarter] = useState(`Q${currentQuarter}-${currentYear}`);

  const { data: goals = [], isLoading: goalsLoading } = useGoalsForCloning(sourceYear);
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const cloneGoal = useCloneGoal();
  const toast = useToast();

  const selectedGoal = goals.find((g) => g.id === sourceGoalId);

  const handleClone = async () => {
    if (!sourceGoalId || !targetTeamId) {
      toast({
        title: 'Please select a goal and team',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      const clonedGoal = await cloneGoal.mutateAsync({
        sourceGoalId,
        targetTeamId,
        year: targetYear,
        includeMeasures,
        newQuarter: includeMeasures ? targetQuarter : undefined,
      });

      toast({
        title: 'Goal cloned successfully',
        description: `Created: ${clonedGoal.title}`,
        status: 'success',
        duration: 3000,
      });

      onSuccess?.(clonedGoal);
      onClose();
      resetForm();
    } catch (error) {
      toast({
        title: 'Failed to clone goal',
        description: (error as Error).message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const resetForm = () => {
    setSourceGoalId('');
    setTargetTeamId('');
    setIncludeMeasures(true);
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => `${q}-${targetYear}`);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Clone Objective</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Source Year</FormLabel>
              <Select
                value={sourceYear}
                onChange={(e) => {
                  setSourceYear(parseInt(e.target.value));
                  setSourceGoalId('');
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Select Objective to Clone</FormLabel>
              <Select
                placeholder="Select an objective..."
                value={sourceGoalId}
                onChange={(e) => setSourceGoalId(e.target.value)}
                isDisabled={goalsLoading}
              >
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title} ({goal.team?.name})
                  </option>
                ))}
              </Select>
            </FormControl>

            {selectedGoal && (
              <Box p={3} bg="gray.50" borderRadius="md">
                <Text fontWeight="medium">{selectedGoal.title}</Text>
                <Text fontSize="sm" color="gray.600">{selectedGoal.description}</Text>
                <Badge mt={2} colorScheme="blue">{selectedGoal.team?.name}</Badge>
                {selectedGoal.measures && selectedGoal.measures.length > 0 && (
                  <Text fontSize="sm" mt={2}>
                    {selectedGoal.measures.length} key result(s) will be copied
                  </Text>
                )}
              </Box>
            )}

            <FormControl>
              <FormLabel>Target Team</FormLabel>
              <Select
                placeholder="Select target team..."
                value={targetTeamId}
                onChange={(e) => setTargetTeamId(e.target.value)}
                isDisabled={teamsLoading}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.level})
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Target Year</FormLabel>
              <Select
                value={targetYear}
                onChange={(e) => {
                  setTargetYear(parseInt(e.target.value));
                  setTargetQuarter(`Q${currentQuarter}-${e.target.value}`);
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb={0}>Include Key Results</FormLabel>
              <Switch
                isChecked={includeMeasures}
                onChange={(e) => setIncludeMeasures(e.target.checked)}
              />
            </FormControl>

            {includeMeasures && (
              <FormControl>
                <FormLabel>Key Results Quarter</FormLabel>
                <Select
                  value={targetQuarter}
                  onChange={(e) => setTargetQuarter(e.target.value)}
                >
                  {quarters.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </Select>
              </FormControl>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleClone}
            isLoading={cloneGoal.isPending}
            isDisabled={!sourceGoalId || !targetTeamId}
          >
            Clone Objective
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
