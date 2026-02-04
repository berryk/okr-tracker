import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Select,
  Badge,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  FormControl,
  FormLabel,
  Button,
  Divider,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import { ExtractedOKR, ExtractedKeyResult } from '../../api/import';

interface OKRReviewListProps {
  okrs: ExtractedOKR[];
  onChange: (okrs: ExtractedOKR[]) => void;
}

export default function OKRReviewList({ okrs, onChange }: OKRReviewListProps) {
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge colorScheme="green">High Confidence</Badge>;
    }
    if (confidence >= 0.5) {
      return <Badge colorScheme="yellow">Medium Confidence</Badge>;
    }
    return <Badge colorScheme="red">Low Confidence</Badge>;
  };

  const updateObjective = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...okrs];
    updated[index] = {
      ...updated[index],
      objective: {
        ...updated[index].objective,
        [field]: value,
      },
    };
    onChange(updated);
  };

  const updateKeyResult = (
    okrIndex: number,
    krIndex: number,
    field: keyof ExtractedKeyResult,
    value: string | number
  ) => {
    const updated = [...okrs];
    updated[okrIndex] = {
      ...updated[okrIndex],
      keyResults: updated[okrIndex].keyResults.map((kr, i) =>
        i === krIndex ? { ...kr, [field]: value } : kr
      ),
    };
    onChange(updated);
  };

  const removeObjective = (index: number) => {
    onChange(okrs.filter((_, i) => i !== index));
  };

  const removeKeyResult = (okrIndex: number, krIndex: number) => {
    const updated = [...okrs];
    updated[okrIndex] = {
      ...updated[okrIndex],
      keyResults: updated[okrIndex].keyResults.filter((_, i) => i !== krIndex),
    };
    onChange(updated);
  };

  const addKeyResult = (okrIndex: number) => {
    const updated = [...okrs];
    updated[okrIndex] = {
      ...updated[okrIndex],
      keyResults: [
        ...updated[okrIndex].keyResults,
        {
          title: '',
          measureType: 'INCREASE_TO',
          targetValue: 100,
          unit: '%',
        },
      ],
    };
    onChange(updated);
  };

  if (okrs.length === 0) {
    return (
      <Box p={4} textAlign="center" color="gray.500">
        No OKRs extracted from the PowerPoint file.
      </Box>
    );
  }

  return (
    <Accordion allowMultiple defaultIndex={okrs.map((_, i) => i)}>
      {okrs.map((okr, okrIndex) => (
        <AccordionItem key={okrIndex} border="1px solid" borderColor="gray.200" borderRadius="md" mb={3}>
          <AccordionButton _hover={{ bg: 'gray.50' }}>
            <Box flex="1" textAlign="left">
              <HStack spacing={2}>
                <Text fontWeight="medium" noOfLines={1}>
                  {okr.objective.title || 'Untitled Objective'}
                </Text>
                {getConfidenceBadge(okr.confidence)}
                <Badge variant="outline">{okr.keyResults.length} KRs</Badge>
              </HStack>
            </Box>
            <AccordionIcon />
          </AccordionButton>

          <AccordionPanel pb={4}>
            <VStack spacing={4} align="stretch">
              {/* Objective fields */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="medium" fontSize="sm" color="gray.600">
                    Objective
                  </Text>
                  <IconButton
                    aria-label="Remove objective"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => removeObjective(okrIndex)}
                  />
                </HStack>
                <VStack spacing={3} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="sm">Title</FormLabel>
                    <Input
                      value={okr.objective.title}
                      onChange={(e) => updateObjective(okrIndex, 'title', e.target.value)}
                      placeholder="Objective title"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Description (optional)</FormLabel>
                    <Textarea
                      value={okr.objective.description || ''}
                      onChange={(e) => updateObjective(okrIndex, 'description', e.target.value)}
                      placeholder="Additional context..."
                      rows={2}
                    />
                  </FormControl>
                </VStack>
              </Box>

              <Divider />

              {/* Key Results */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="medium" fontSize="sm" color="gray.600">
                    Key Results ({okr.keyResults.length})
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<FiPlus />}
                    onClick={() => addKeyResult(okrIndex)}
                  >
                    Add KR
                  </Button>
                </HStack>

                <VStack spacing={3} align="stretch">
                  {okr.keyResults.map((kr, krIndex) => (
                    <Box
                      key={krIndex}
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="medium" color="gray.600">
                          Key Result {krIndex + 1}
                        </Text>
                        <IconButton
                          aria-label="Remove key result"
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => removeKeyResult(okrIndex, krIndex)}
                        />
                      </HStack>

                      <VStack spacing={2} align="stretch">
                        <FormControl>
                          <FormLabel fontSize="xs">Title</FormLabel>
                          <Input
                            size="sm"
                            value={kr.title}
                            onChange={(e) =>
                              updateKeyResult(okrIndex, krIndex, 'title', e.target.value)
                            }
                            placeholder="Key result title"
                          />
                        </FormControl>

                        <HStack spacing={2}>
                          <FormControl flex={1}>
                            <FormLabel fontSize="xs">Type</FormLabel>
                            <Select
                              size="sm"
                              value={kr.measureType}
                              onChange={(e) =>
                                updateKeyResult(okrIndex, krIndex, 'measureType', e.target.value)
                              }
                            >
                              <option value="INCREASE_TO">Increase To</option>
                              <option value="DECREASE_TO">Decrease To</option>
                              <option value="MAINTAIN">Maintain</option>
                              <option value="MILESTONE">Milestone</option>
                            </Select>
                          </FormControl>

                          <FormControl flex={1}>
                            <FormLabel fontSize="xs">Target</FormLabel>
                            <NumberInput
                              size="sm"
                              value={kr.targetValue}
                              onChange={(_, value) =>
                                updateKeyResult(okrIndex, krIndex, 'targetValue', value || 0)
                              }
                            >
                              <NumberInputField />
                            </NumberInput>
                          </FormControl>

                          <FormControl flex={1}>
                            <FormLabel fontSize="xs">Unit</FormLabel>
                            <Input
                              size="sm"
                              value={kr.unit || ''}
                              onChange={(e) =>
                                updateKeyResult(okrIndex, krIndex, 'unit', e.target.value)
                              }
                              placeholder="%"
                            />
                          </FormControl>
                        </HStack>
                      </VStack>
                    </Box>
                  ))}

                  {okr.keyResults.length === 0 && (
                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                      No key results. Click "Add KR" to add one.
                    </Text>
                  )}
                </VStack>
              </Box>
            </VStack>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
