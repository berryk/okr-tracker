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
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  VStack,
  HStack,
  Text,
  Progress,
  Box,
  Divider,
  Badge,
  Spinner,
  Center,
  Avatar,
} from '@chakra-ui/react';
import { Measure } from '../../types';
import { useRecordMeasureUpdate, useMeasureHistory } from '../../api/measures';

interface MeasureProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  measure: Measure;
  goalId: string;
}

export default function MeasureProgressModal({
  isOpen,
  onClose,
  measure,
  goalId,
}: MeasureProgressModalProps) {
  const [value, setValue] = useState<number>(measure.currentValue);
  const [note, setNote] = useState('');

  const recordUpdate = useRecordMeasureUpdate(goalId);
  const { data: history, isLoading: historyLoading } = useMeasureHistory(measure.id);

  const calculateProgress = (current: number) => {
    if (measure.measureType === 'MILESTONE') {
      return current >= measure.targetValue ? 100 : 0;
    }
    const range = measure.targetValue - measure.startValue;
    if (range === 0) return 100;
    const progress = ((current - measure.startValue) / range) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const newProgress = calculateProgress(value);

  const handleSubmit = async () => {
    await recordUpdate.mutateAsync({
      measureId: measure.id,
      value,
      note: note.trim() || undefined,
    });
    setNote('');
    onClose();
  };

  const handleClose = () => {
    setValue(measure.currentValue);
    setNote('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Update Progress
          <Text fontSize="sm" fontWeight="normal" color="gray.500" mt={1}>
            {measure.title}
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Current Status */}
            <Box p={4} bg="gray.50" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">Current Progress</Text>
                <Badge colorScheme={measure.progress >= 70 ? 'green' : measure.progress >= 40 ? 'yellow' : 'red'}>
                  {Math.round(measure.progress)}%
                </Badge>
              </HStack>
              <Progress
                value={measure.progress}
                colorScheme={measure.progress >= 70 ? 'green' : measure.progress >= 40 ? 'yellow' : 'red'}
                borderRadius="full"
                mb={2}
              />
              <HStack justify="space-between" fontSize="sm" color="gray.600">
                <Text>Start: {measure.startValue} {measure.unit}</Text>
                <Text>Current: {measure.currentValue} {measure.unit}</Text>
                <Text>Target: {measure.targetValue} {measure.unit}</Text>
              </HStack>
            </Box>

            {/* New Value Input */}
            <FormControl>
              <FormLabel>New Value</FormLabel>
              <HStack>
                <NumberInput
                  value={value}
                  onChange={(_, val) => setValue(isNaN(val) ? 0 : val)}
                  flex={1}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                {measure.unit && (
                  <Text color="gray.500" minW="60px">
                    {measure.unit}
                  </Text>
                )}
              </HStack>
            </FormControl>

            {/* Preview */}
            {value !== measure.currentValue && (
              <Box p={4} bg="blue.50" borderRadius="md" borderWidth={1} borderColor="blue.200">
                <Text fontWeight="medium" mb={2}>Preview</Text>
                <Progress
                  value={newProgress}
                  colorScheme={newProgress >= 70 ? 'green' : newProgress >= 40 ? 'yellow' : 'red'}
                  borderRadius="full"
                  mb={2}
                />
                <HStack justify="space-between" fontSize="sm">
                  <Text color="gray.600">
                    {measure.currentValue} → {value} {measure.unit}
                  </Text>
                  <Text fontWeight="bold" color={newProgress >= 70 ? 'green.600' : newProgress >= 40 ? 'yellow.600' : 'red.600'}>
                    {Math.round(newProgress)}%
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Note */}
            <FormControl>
              <FormLabel>Note (optional)</FormLabel>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add context about this update..."
                rows={2}
              />
            </FormControl>

            <Divider />

            {/* History */}
            <Box>
              <Text fontWeight="medium" mb={3}>Update History</Text>
              {historyLoading ? (
                <Center p={4}>
                  <Spinner size="sm" />
                </Center>
              ) : history && history.length > 0 ? (
                <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
                  {history.map((update) => (
                    <HStack key={update.id} p={2} bg="gray.50" borderRadius="md" fontSize="sm">
                      <Avatar size="xs" name={`${update.author.firstName} ${update.author.lastName}`} />
                      <Box flex={1}>
                        <HStack justify="space-between">
                          <Text fontWeight="medium">
                            {update.value} {measure.unit}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {new Date(update.createdAt).toLocaleDateString()}
                          </Text>
                        </HStack>
                        {update.note && (
                          <Text color="gray.600" fontSize="xs">{update.note}</Text>
                        )}
                      </Box>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text color="gray.500" fontSize="sm">No updates recorded yet.</Text>
              )}
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={recordUpdate.isPending}
            isDisabled={value === measure.currentValue}
          >
            Record Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
