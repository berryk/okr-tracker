import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Progress,
  Spinner,
  Icon,
  Collapse,
  useDisclosure,
  Tooltip,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
import { useReviewMeasure, MeasureReview } from '../../api/ai';

interface MeasureReviewPanelProps {
  measureId: string;
  measureTitle: string;
}

function ScoreBadge({ score }: { score: number }) {
  const colorScheme = score >= 8 ? 'green' : score >= 6 ? 'yellow' : 'red';
  return (
    <Badge colorScheme={colorScheme} fontSize="sm">
      {score}/10
    </Badge>
  );
}

function CriteriaRow({
  label,
  score,
  note,
}: {
  label: string;
  score: number;
  note: string;
}) {
  return (
    <HStack justify="space-between" py={1}>
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
  );
}

export default function MeasureReviewPanel({
  measureId,
  measureTitle,
}: MeasureReviewPanelProps) {
  const { isOpen, onToggle } = useDisclosure();
  const reviewMeasure = useReviewMeasure();

  const handleReview = () => {
    reviewMeasure.mutate(measureId);
    if (!isOpen) onToggle();
  };

  const review = reviewMeasure.data;

  return (
    <Box>
      <Button
        size="xs"
        variant="ghost"
        colorScheme="purple"
        onClick={handleReview}
        isLoading={reviewMeasure.isPending}
      >
        AI Review
      </Button>

      <Collapse in={isOpen && !!review} animateOpacity>
        <Box
          mt={2}
          p={3}
          bg="purple.50"
          borderRadius="md"
          borderWidth={1}
          borderColor="purple.200"
        >
          {review && (
            <VStack spacing={3} align="stretch">
              {/* Overall Score */}
              <HStack justify="space-between">
                <Text fontWeight="semibold" fontSize="sm">
                  SMART Score
                </Text>
                <ScoreBadge score={review.score} />
              </HStack>

              {/* SMART Criteria */}
              <Box>
                <CriteriaRow
                  label="Specific"
                  score={review.assessment.specific.score}
                  note={review.assessment.specific.note}
                />
                <CriteriaRow
                  label="Measurable"
                  score={review.assessment.measurable.score}
                  note={review.assessment.measurable.note}
                />
                <CriteriaRow
                  label="Achievable"
                  score={review.assessment.achievable.score}
                  note={review.assessment.achievable.note}
                />
                <CriteriaRow
                  label="Relevant"
                  score={review.assessment.relevant.score}
                  note={review.assessment.relevant.note}
                />
                <CriteriaRow
                  label="Time-bound"
                  score={review.assessment.timeBound.score}
                  note={review.assessment.timeBound.note}
                />
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
                    Risks to Consider
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

              <Button size="xs" variant="ghost" onClick={onToggle}>
                Close
              </Button>
            </VStack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
