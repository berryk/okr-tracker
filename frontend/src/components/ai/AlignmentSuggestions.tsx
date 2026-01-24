import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Spinner,
  Center,
  useToast,
} from '@chakra-ui/react';
import { LinkIcon, CheckIcon } from '@chakra-ui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSuggestAlignment } from '../../api/ai';
import { useLinkGoals } from '../../api/goals';

interface AlignmentSuggestionsProps {
  goalId: string;
  onLinkSuccess?: () => void;
}

export default function AlignmentSuggestions({
  goalId,
  onLinkSuccess,
}: AlignmentSuggestionsProps) {
  const { data: suggestions, isLoading, refetch } = useSuggestAlignment(goalId);
  const linkGoals = useLinkGoals();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [linkingGoalId, setLinkingGoalId] = useState<string | null>(null);
  const [linkedGoalIds, setLinkedGoalIds] = useState<Set<string>>(new Set());

  const handleLink = async (parentGoalId: string) => {
    setLinkingGoalId(parentGoalId);
    try {
      await linkGoals.mutateAsync({
        childGoalId: goalId,
        parentGoalId,
      });

      // Mark as linked
      setLinkedGoalIds((prev) => new Set([...prev, parentGoalId]));

      // Show success toast
      toast({
        title: 'Goal linked successfully',
        status: 'success',
        duration: 2000,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['goal-hierarchy', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });

      onLinkSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Failed to link goal',
        description: error?.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLinkingGoalId(null);
    }
  };

  if (isLoading) {
    return (
      <Center p={4}>
        <Spinner size="sm" color="purple.500" />
        <Text ml={2} fontSize="sm" color="gray.500">
          Finding alignment suggestions...
        </Text>
      </Center>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Box p={4} bg="gray.50" borderRadius="md" textAlign="center">
        <Text fontSize="sm" color="gray.500">
          No alignment suggestions available.
        </Text>
        <Button size="sm" mt={2} onClick={() => refetch()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Text fontWeight="semibold" fontSize="sm">
          AI-Suggested Alignments
        </Text>
        <Badge colorScheme="purple" fontSize="xs">
          {suggestions.length} found
        </Badge>
      </HStack>

      {suggestions.map((suggestion) => (
        <Box
          key={suggestion.goalId}
          p={3}
          bg="white"
          borderWidth={1}
          borderColor="gray.200"
          borderRadius="md"
          _hover={{ borderColor: 'purple.300', shadow: 'sm' }}
          transition="all 0.2s"
        >
          <HStack justify="space-between" align="start">
            <Box flex={1}>
              <Text fontWeight="medium" fontSize="sm">
                {suggestion.goalTitle}
              </Text>
              <HStack spacing={2} mt={1}>
                <Badge size="sm" colorScheme="blue">
                  {suggestion.teamName}
                </Badge>
                <Badge
                  size="sm"
                  colorScheme={
                    suggestion.relevance >= 0.8
                      ? 'green'
                      : suggestion.relevance >= 0.6
                      ? 'yellow'
                      : 'gray'
                  }
                >
                  {Math.round(suggestion.relevance * 100)}% match
                </Badge>
              </HStack>
              <Text fontSize="xs" color="gray.600" mt={2}>
                {suggestion.explanation}
              </Text>
            </Box>
            {linkedGoalIds.has(suggestion.goalId) ? (
              <Button
                size="sm"
                leftIcon={<CheckIcon />}
                colorScheme="green"
                variant="solid"
                isDisabled
              >
                Linked
              </Button>
            ) : (
              <Button
                size="sm"
                leftIcon={<LinkIcon />}
                colorScheme="purple"
                variant="outline"
                onClick={() => handleLink(suggestion.goalId)}
                isLoading={linkingGoalId === suggestion.goalId}
                isDisabled={linkingGoalId !== null}
              >
                Link
              </Button>
            )}
          </HStack>
        </Box>
      ))}
    </VStack>
  );
}
