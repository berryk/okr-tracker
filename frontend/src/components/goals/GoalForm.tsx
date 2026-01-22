import React from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Switch,
  VStack,
  HStack,
  FormErrorMessage,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { Team } from '../../types';

interface GoalFormData {
  title: string;
  description: string;
  year: number;
  teamId: string;
  isStretch: boolean;
}

interface GoalFormProps {
  teams: Team[];
  onSubmit: (data: GoalFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<GoalFormData>;
}

const currentYear = new Date().getFullYear();

export default function GoalForm({ teams, onSubmit, isLoading, defaultValues }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormData>({
    defaultValues: {
      year: currentYear,
      isStretch: false,
      ...defaultValues,
    },
  });

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={4} align="stretch">
        <FormControl isRequired isInvalid={!!errors.title}>
          <FormLabel>Title</FormLabel>
          <Input
            {...register('title', { required: 'Title is required', maxLength: 200 })}
            placeholder="Enter goal title"
          />
          {errors.title && <FormErrorMessage>{errors.title.message}</FormErrorMessage>}
        </FormControl>

        <FormControl>
          <FormLabel>Description</FormLabel>
          <Textarea
            {...register('description')}
            placeholder="Describe your goal..."
            rows={3}
          />
        </FormControl>

        <HStack spacing={4}>
          <FormControl isRequired flex={1}>
            <FormLabel>Year</FormLabel>
            <Select {...register('year', { required: true, valueAsNumber: true })}>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl isRequired flex={1}>
            <FormLabel>Team</FormLabel>
            <Select {...register('teamId', { required: 'Team is required' })}>
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </FormControl>
        </HStack>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb={0}>Stretch Goal</FormLabel>
          <Switch {...register('isStretch')} colorScheme="purple" />
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          isLoading={isLoading}
          w="full"
        >
          Create Goal
        </Button>
      </VStack>
    </Box>
  );
}
