import React, { useState, useEffect } from 'react';
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
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  VStack,
  HStack,
  FormHelperText,
} from '@chakra-ui/react';
import { Measure } from '../../types';
import { useCreateMeasure, useUpdateMeasure } from '../../api/measures';

interface MeasureFormProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  measure?: Measure | null;
}

type MeasureType = 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';

const measureTypeLabels: Record<MeasureType, string> = {
  INCREASE_TO: 'Increase to',
  DECREASE_TO: 'Decrease to',
  MAINTAIN: 'Maintain at',
  MILESTONE: 'Milestone (yes/no)',
};

export default function MeasureForm({ isOpen, onClose, goalId, measure }: MeasureFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [measureType, setMeasureType] = useState<MeasureType>('INCREASE_TO');
  const [unit, setUnit] = useState('');
  const [startValue, setStartValue] = useState<number>(0);
  const [targetValue, setTargetValue] = useState<number>(100);

  const createMeasure = useCreateMeasure();
  const updateMeasure = useUpdateMeasure(goalId);

  const isEditing = !!measure;

  useEffect(() => {
    if (measure) {
      setTitle(measure.title);
      setDescription(measure.description || '');
      setMeasureType(measure.measureType);
      setUnit(measure.unit || '');
      setStartValue(measure.startValue);
      setTargetValue(measure.targetValue);
    } else {
      setTitle('');
      setDescription('');
      setMeasureType('INCREASE_TO');
      setUnit('');
      setStartValue(0);
      setTargetValue(100);
    }
  }, [measure, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    if (isEditing && measure) {
      await updateMeasure.mutateAsync({
        id: measure.id,
        title,
        description: description || undefined,
        targetValue,
      });
    } else {
      await createMeasure.mutateAsync({
        title,
        description: description || undefined,
        measureType,
        unit: unit || undefined,
        startValue,
        targetValue,
        goalId,
      });
    }

    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setMeasureType('INCREASE_TO');
    setUnit('');
    setStartValue(0);
    setTargetValue(100);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditing ? 'Edit Key Result' : 'Add Key Result'}</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Increase monthly active users"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional context about this key result..."
                rows={2}
              />
            </FormControl>

            {!isEditing && (
              <FormControl isRequired>
                <FormLabel>Measure Type</FormLabel>
                <Select
                  value={measureType}
                  onChange={(e) => setMeasureType(e.target.value as MeasureType)}
                >
                  {Object.entries(measureTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <FormHelperText>
                  {measureType === 'MILESTONE'
                    ? 'Binary achievement - either done or not done'
                    : 'Track progress toward a numeric target'}
                </FormHelperText>
              </FormControl>
            )}

            {measureType !== 'MILESTONE' && (
              <>
                <FormControl>
                  <FormLabel>Unit</FormLabel>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g., users, %, $, hours"
                    isDisabled={isEditing}
                  />
                </FormControl>

                <HStack spacing={4} w="100%">
                  {!isEditing && (
                    <FormControl>
                      <FormLabel>Start Value</FormLabel>
                      <NumberInput
                        value={startValue}
                        onChange={(_, val) => setStartValue(val || 0)}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>
                  )}

                  <FormControl isRequired>
                    <FormLabel>Target Value</FormLabel>
                    <NumberInput
                      value={targetValue}
                      onChange={(_, val) => setTargetValue(val || 0)}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                </HStack>
              </>
            )}

            {measureType === 'MILESTONE' && !isEditing && (
              <FormHelperText>
                For milestones, progress will be 0% until completed, then 100%.
              </FormHelperText>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={createMeasure.isPending || updateMeasure.isPending}
            isDisabled={!title.trim()}
          >
            {isEditing ? 'Save Changes' : 'Add Key Result'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
