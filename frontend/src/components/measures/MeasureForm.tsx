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
  Box,
  Badge,
  Progress,
  Text,
  Collapse,
  Divider,
  List,
  ListItem,
  ListIcon,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
import { Measure } from '../../types';
import { useCreateMeasure, useUpdateMeasure } from '../../api/measures';
import { useReviewDraftMeasure, MeasureReview } from '../../api/ai';

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

const currentYear = new Date().getFullYear();
const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

export default function MeasureForm({ isOpen, onClose, goalId, measure }: MeasureFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quarter, setQuarter] = useState(`Q${currentQuarter}-${currentYear}`);
  const [measureType, setMeasureType] = useState<MeasureType>('INCREASE_TO');
  const [unit, setUnit] = useState('');
  const [startValue, setStartValue] = useState<number>(0);
  const [targetValue, setTargetValue] = useState<number>(100);

  const createMeasure = useCreateMeasure();
  const updateMeasure = useUpdateMeasure(goalId);
  const reviewDraftMeasure = useReviewDraftMeasure();
  const [review, setReview] = useState<MeasureReview | null>(null);
  const [showReview, setShowReview] = useState(false);

  const isEditing = !!measure;

  useEffect(() => {
    if (measure) {
      setTitle(measure.title);
      setDescription(measure.description || '');
      setQuarter(measure.quarter);
      setMeasureType(measure.measureType);
      setUnit(measure.unit || '');
      setStartValue(measure.startValue);
      setTargetValue(measure.targetValue);
    } else {
      setTitle('');
      setDescription('');
      setQuarter(`Q${currentQuarter}-${currentYear}`);
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
        quarter,
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
    setQuarter(`Q${currentQuarter}-${currentYear}`);
    setMeasureType('INCREASE_TO');
    setUnit('');
    setStartValue(0);
    setTargetValue(100);
    setReview(null);
    setShowReview(false);
    onClose();
  };

  const handleSmartCheck = async () => {
    if (!title.trim()) return;

    const result = await reviewDraftMeasure.mutateAsync({
      title,
      description: description || undefined,
      measureType,
      unit: unit || undefined,
      startValue,
      targetValue,
      goalId,
    });

    setReview(result);
    setShowReview(true);
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
                <FormLabel>Quarter</FormLabel>
                <Select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                >
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q) =>
                    [currentYear, currentYear + 1].map((y) => (
                      <option key={`${q}-${y}`} value={`${q}-${y}`}>
                        {q} {y}
                      </option>
                    ))
                  )}
                </Select>
                <FormHelperText>
                  Which quarter is this key result for?
                </FormHelperText>
              </FormControl>
            )}

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

            {/* SMART Check Section */}
            {!isEditing && (
              <>
                <Divider />
                <Box w="100%">
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="medium" fontSize="sm">SMART Check</Text>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      variant="outline"
                      onClick={handleSmartCheck}
                      isLoading={reviewDraftMeasure.isPending}
                      isDisabled={!title.trim()}
                    >
                      Check SMART
                    </Button>
                  </HStack>

                  <Collapse in={showReview && !!review} animateOpacity>
                    {review && (
                      <Box
                        p={4}
                        bg="purple.50"
                        borderRadius="md"
                        borderWidth={1}
                        borderColor="purple.200"
                      >
                        <VStack spacing={3} align="stretch">
                          {/* Overall Score */}
                          <HStack justify="space-between">
                            <Text fontWeight="semibold" fontSize="sm">
                              Overall SMART Score
                            </Text>
                            <Badge
                              colorScheme={review.score >= 8 ? 'green' : review.score >= 6 ? 'yellow' : 'red'}
                              fontSize="sm"
                            >
                              {review.score}/10
                            </Badge>
                          </HStack>

                          {/* SMART Criteria */}
                          <Box>
                            {Object.entries({
                              Specific: review.assessment.specific,
                              Measurable: review.assessment.measurable,
                              Achievable: review.assessment.achievable,
                              Relevant: review.assessment.relevant,
                              'Time-bound': review.assessment.timeBound,
                            }).map(([label, { score, note }]) => (
                              <HStack key={label} justify="space-between" py={1}>
                                <Tooltip label={note} placement="top">
                                  <HStack cursor="help">
                                    <Text fontSize="sm" fontWeight="medium">
                                      {label}
                                    </Text>
                                    <Icon as={InfoIcon} boxSize={3} color="gray.400" />
                                  </HStack>
                                </Tooltip>
                                <HStack>
                                  <Progress
                                    value={score * 10}
                                    size="sm"
                                    w="60px"
                                    colorScheme={score >= 8 ? 'green' : score >= 6 ? 'yellow' : 'red'}
                                    borderRadius="full"
                                  />
                                  <Text fontSize="sm" w="30px" textAlign="right">
                                    {score}/10
                                  </Text>
                                </HStack>
                              </HStack>
                            ))}
                          </Box>

                          {/* Suggestions */}
                          {review.suggestions.length > 0 && (
                            <Box>
                              <Text fontSize="xs" fontWeight="semibold" color="gray.600" mb={1}>
                                Suggestions
                              </Text>
                              <List spacing={1}>
                                {review.suggestions.map((suggestion, i) => (
                                  <ListItem key={i} fontSize="xs" display="flex" alignItems="flex-start">
                                    <ListIcon as={CheckCircleIcon} color="green.500" mt={0.5} />
                                    {suggestion}
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}

                          {/* Risks */}
                          {review.risks.length > 0 && (
                            <Box>
                              <Text fontSize="xs" fontWeight="semibold" color="gray.600" mb={1}>
                                Risks
                              </Text>
                              <List spacing={1}>
                                {review.risks.map((risk, i) => (
                                  <ListItem key={i} fontSize="xs" display="flex" alignItems="flex-start">
                                    <ListIcon as={WarningIcon} color="orange.500" mt={0.5} />
                                    {risk}
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}

                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setShowReview(false)}
                          >
                            Hide
                          </Button>
                        </VStack>
                      </Box>
                    )}
                  </Collapse>
                </Box>
              </>
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
