import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Avatar,
  Box,
  Badge,
  Spinner,
  Center,
  Divider,
} from '@chakra-ui/react';
import { Measure } from '../../types';
import { useMeasureHistory } from '../../api/measures';

interface MeasureHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  measure: Measure;
}

export default function MeasureHistoryModal({
  isOpen,
  onClose,
  measure,
}: MeasureHistoryModalProps) {
  const { data: history, isLoading } = useMeasureHistory(measure.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Update History
          <Text fontSize="sm" fontWeight="normal" color="gray.500" mt={1}>
            {measure.title}
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* Current Status */}
            <Box p={4} bg="blue.50" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">Current Status</Text>
                <Badge colorScheme={measure.progress >= 70 ? 'green' : measure.progress >= 40 ? 'yellow' : 'red'}>
                  {Math.round(measure.progress)}%
                </Badge>
              </HStack>
              <HStack justify="space-between" fontSize="sm" color="gray.600">
                <Text>Start: {measure.startValue} {measure.unit}</Text>
                <Text fontWeight="bold">Current: {measure.currentValue} {measure.unit}</Text>
                <Text>Target: {measure.targetValue} {measure.unit}</Text>
              </HStack>
            </Box>

            <Divider />

            {/* History Log */}
            <Text fontWeight="semibold" fontSize="md">Update Log</Text>

            {isLoading ? (
              <Center p={8}>
                <Spinner size="md" color="blue.500" />
              </Center>
            ) : history && history.length > 0 ? (
              <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                {history.map((update, index) => (
                  <Box
                    key={update.id}
                    p={4}
                    bg="gray.50"
                    borderRadius="md"
                    borderLeftWidth={3}
                    borderLeftColor={index === 0 ? 'blue.400' : 'gray.300'}
                  >
                    <HStack justify="space-between" mb={2}>
                      <HStack>
                        <Avatar
                          size="sm"
                          name={`${update.author.firstName} ${update.author.lastName}`}
                        />
                        <Box>
                          <Text fontWeight="medium" fontSize="sm">
                            {update.author.firstName} {update.author.lastName}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {new Date(update.createdAt).toLocaleString()}
                          </Text>
                        </Box>
                      </HStack>
                      <Badge
                        colorScheme="blue"
                        fontSize="md"
                        px={3}
                        py={1}
                      >
                        {update.value} {measure.unit}
                      </Badge>
                    </HStack>
                    {update.note && (
                      <Text fontSize="sm" color="gray.600" mt={2} pl={10}>
                        {update.note}
                      </Text>
                    )}
                  </Box>
                ))}
              </VStack>
            ) : (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">No updates recorded yet.</Text>
                <Text color="gray.400" fontSize="sm" mt={1}>
                  Updates will appear here when progress is recorded.
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
