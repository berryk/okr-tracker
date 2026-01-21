import React from 'react';
import {
  Box,
  Text,
  Button,
  Skeleton,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useProgressSummary } from '../../api/ai';

interface ProgressSummaryProps {
  goalId: string;
}

export default function ProgressSummary({ goalId }: ProgressSummaryProps) {
  const [enabled, setEnabled] = React.useState(false);
  const { data: summary, isLoading, refetch } = useProgressSummary(goalId, enabled);

  if (!enabled) {
    return (
      <Button
        size="sm"
        variant="outline"
        colorScheme="purple"
        onClick={() => setEnabled(true)}
        leftIcon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
          </svg>
        }
      >
        Generate AI Summary
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Box p={3} bg="purple.50" borderRadius="md">
        <Skeleton height="20px" mb={2} />
        <Skeleton height="20px" width="80%" />
      </Box>
    );
  }

  return (
    <Box p={3} bg="purple.50" borderRadius="md" borderWidth={1} borderColor="purple.200">
      <HStack justify="space-between" mb={2}>
        <HStack>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--chakra-colors-purple-500)' }}>
            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
          </svg>
          <Text fontSize="sm" fontWeight="semibold" color="purple.700">
            AI Summary
          </Text>
        </HStack>
        <Button
          size="xs"
          variant="ghost"
          leftIcon={<RepeatIcon />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </HStack>
      <Text fontSize="sm" color="gray.700">
        {summary}
      </Text>
    </Box>
  );
}
