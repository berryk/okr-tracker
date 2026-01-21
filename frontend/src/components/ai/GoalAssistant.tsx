import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Collapse,
  useDisclosure,
  Icon,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { useSuggestGoal, GoalSuggestion } from '../../api/ai';

// Custom sparkles icon since Chakra doesn't have one
function SparklesIconCustom() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
      <path d="M5 16L5.54 18.46L8 19L5.54 19.54L5 22L4.46 19.54L2 19L4.46 18.46L5 16Z" />
      <path d="M19 16L19.54 18.46L22 19L19.54 19.54L19 22L18.46 19.54L16 19L18.46 18.46L19 16Z" />
    </svg>
  );
}

interface GoalAssistantProps {
  title: string;
  description?: string;
  teamId: string;
  onApplySuggestion?: (suggestion: GoalSuggestion) => void;
}

export default function GoalAssistant({
  title,
  description,
  teamId,
  onApplySuggestion,
}: GoalAssistantProps) {
  const { isOpen, onToggle } = useDisclosure();
  const suggestGoal = useSuggestGoal();

  const handleGetSuggestion = () => {
    if (!title.trim() || !teamId) return;
    suggestGoal.mutate({ title, description, teamId });
    if (!isOpen) onToggle();
  };

  const suggestion = suggestGoal.data;

  return (
    <Box>
      <Button
        size="sm"
        variant="outline"
        colorScheme="purple"
        leftIcon={<SparklesIconCustom />}
        onClick={handleGetSuggestion}
        isLoading={suggestGoal.isPending}
        isDisabled={!title.trim() || !teamId}
      >
        AI Suggestions
      </Button>

      <Collapse in={isOpen && !!suggestion} animateOpacity>
        <Box
          mt={3}
          p={4}
          bg="purple.50"
          borderRadius="md"
          borderWidth={1}
          borderColor="purple.200"
        >
          <HStack mb={3}>
            <Icon as={SparklesIconCustom} color="purple.500" />
            <Text fontWeight="semibold" color="purple.700">
              AI Suggestion
            </Text>
          </HStack>

          {suggestion && (
            <VStack spacing={4} align="stretch">
              {/* Improved Title */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={1}>
                  Suggested Title
                </Text>
                <Text fontWeight="medium">{suggestion.improvedTitle}</Text>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  {suggestion.explanation}
                </Text>
              </Box>

              {/* Suggested Measures */}
              {suggestion.suggestedMeasures.length > 0 && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                    Suggested Key Results
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {suggestion.suggestedMeasures.map((measure, i) => (
                      <HStack
                        key={i}
                        p={2}
                        bg="white"
                        borderRadius="md"
                        borderWidth={1}
                        borderColor="purple.100"
                      >
                        <Badge colorScheme="purple" size="sm">
                          {measure.type.replace('_', ' ')}
                        </Badge>
                        <Text fontSize="sm" flex={1}>
                          {measure.title}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          Target: {measure.target} {measure.unit}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Apply Button */}
              {onApplySuggestion && (
                <HStack justify="flex-end" pt={2}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onToggle}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="purple"
                    leftIcon={<CheckIcon />}
                    onClick={() => {
                      onApplySuggestion(suggestion);
                      onToggle();
                    }}
                  >
                    Apply Suggestion
                  </Button>
                </HStack>
              )}
            </VStack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
