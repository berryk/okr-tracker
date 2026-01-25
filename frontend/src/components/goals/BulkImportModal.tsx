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
  Textarea,
  VStack,
  Text,
  Box,
  Alert,
  AlertIcon,
  useToast,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { useBulkImportGoals, BulkImportGoal } from '../../api/goals';
import { useTeams } from '../../api/teams';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const currentYear = new Date().getFullYear();

  const [teamId, setTeamId] = useState('');
  const [year, setYear] = useState(currentYear);
  const [rawInput, setRawInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedGoals, setParsedGoals] = useState<BulkImportGoal[]>([]);

  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const bulkImport = useBulkImportGoals();
  const toast = useToast();

  const parseInput = (input: string) => {
    setParseError(null);
    setParsedGoals([]);

    if (!input.trim()) {
      return;
    }

    try {
      const goals: BulkImportGoal[] = [];
      const lines = input.trim().split('\n');
      let currentGoal: BulkImportGoal | null = null;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Check if this is a key result line (starts with - or *)
        if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
          if (!currentGoal) {
            throw new Error('Key result found before any objective. Add an objective first.');
          }

          // Parse key result: "- Title, Type, Target, Unit"
          const krText = trimmedLine.substring(1).trim();
          const parts = krText.split(',').map((p) => p.trim());

          if (parts.length < 3) {
            throw new Error(`Invalid key result format: "${krText}". Expected: "Title, Type, Target, [Unit]"`);
          }

          const [title, typeStr, targetStr, unit] = parts;
          const measureType = typeStr.toUpperCase().replace(/ /g, '_') as 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';

          if (!['INCREASE_TO', 'DECREASE_TO', 'MAINTAIN', 'MILESTONE'].includes(measureType)) {
            throw new Error(`Invalid measure type: "${typeStr}". Use: INCREASE_TO, DECREASE_TO, MAINTAIN, or MILESTONE`);
          }

          const targetValue = parseFloat(targetStr);
          if (isNaN(targetValue)) {
            throw new Error(`Invalid target value: "${targetStr}". Must be a number.`);
          }

          currentGoal.measures = currentGoal.measures || [];
          currentGoal.measures.push({
            title,
            measureType,
            targetValue,
            unit: unit || undefined,
          });
        } else {
          // This is an objective line
          // Format: "Title" or "Title, Description"
          const parts = trimmedLine.split(',').map((p) => p.trim());
          currentGoal = {
            title: parts[0],
            description: parts.length > 1 ? parts.slice(1).join(', ') : undefined,
            measures: [],
          };
          goals.push(currentGoal);
        }
      }

      if (goals.length === 0) {
        throw new Error('No objectives found in input');
      }

      setParsedGoals(goals);
    } catch (error) {
      setParseError((error as Error).message);
    }
  };

  const handleImport = async () => {
    if (!teamId || parsedGoals.length === 0) {
      toast({
        title: 'Please select a team and enter objectives',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      const goals = await bulkImport.mutateAsync({
        teamId,
        year,
        goals: parsedGoals,
      });

      toast({
        title: 'Import successful',
        description: `Created ${goals.length} objective(s)`,
        status: 'success',
        duration: 3000,
      });

      onSuccess?.();
      onClose();
      resetForm();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: (error as Error).message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const resetForm = () => {
    setRawInput('');
    setParsedGoals([]);
    setParseError(null);
    setTeamId('');
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];

  const exampleFormat = `Increase Revenue by 20%
- Annual Recurring Revenue, INCREASE_TO, 100, $M
- Net Revenue Retention, MAINTAIN, 120, %

Launch Mobile App
- App Store Rating, INCREASE_TO, 4.5, stars
- Monthly Active Users, INCREASE_TO, 50000, users`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Bulk Import Objectives</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Team</FormLabel>
              <Select
                placeholder="Select team..."
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
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
              <FormLabel>Year</FormLabel>
              <Select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </FormControl>

            <Accordion allowToggle>
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <Box flex="1" textAlign="left" fontSize="sm" color="blue.600">
                    View format instructions
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4} px={0}>
                  <Box bg="gray.50" p={3} borderRadius="md" fontSize="sm">
                    <Text fontWeight="medium" mb={2}>Format:</Text>
                    <Text mb={2}>Each objective on a new line. Key results start with "-" or "*":</Text>
                    <Code display="block" whiteSpace="pre-wrap" p={2} bg="white" borderRadius="md">
                      {exampleFormat}
                    </Code>
                    <Text mt={2} fontSize="xs" color="gray.600">
                      Key Result format: Title, Type (INCREASE_TO/DECREASE_TO/MAINTAIN/MILESTONE), Target, [Unit]
                    </Text>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>

            <FormControl>
              <FormLabel>Paste Objectives and Key Results</FormLabel>
              <Textarea
                placeholder={`Paste your objectives here...\n\nExample:\n${exampleFormat}`}
                value={rawInput}
                onChange={(e) => {
                  setRawInput(e.target.value);
                  parseInput(e.target.value);
                }}
                rows={10}
                fontFamily="mono"
                fontSize="sm"
              />
            </FormControl>

            {parseError && (
              <Alert status="error">
                <AlertIcon />
                {parseError}
              </Alert>
            )}

            {parsedGoals.length > 0 && (
              <Box p={3} bg="green.50" borderRadius="md">
                <Text fontWeight="medium" color="green.700">
                  Parsed {parsedGoals.length} objective(s):
                </Text>
                {parsedGoals.map((goal, i) => (
                  <Box key={i} mt={2} pl={2} borderLeft="2px solid" borderColor="green.300">
                    <Text fontWeight="medium">{goal.title}</Text>
                    {goal.measures && goal.measures.length > 0 && (
                      <Text fontSize="sm" color="gray.600">
                        {goal.measures.length} key result(s)
                      </Text>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleImport}
            isLoading={bulkImport.isPending}
            isDisabled={!teamId || parsedGoals.length === 0 || !!parseError}
          >
            Import {parsedGoals.length} Objective(s)
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
