import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Progress,
  Avatar,
  Card,
  CardHeader,
  CardBody,
  Button,
  Textarea,
  Spinner,
  Center,
  Divider,
  SimpleGrid,
  IconButton,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from '@chakra-ui/react';
import { ArrowBackIcon, LinkIcon, AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoal, useAddGoalUpdate } from '../api/goals';
import { GoalStatus, Measure } from '../types';
import AlignmentLadder from '../components/goals/AlignmentLadder';
import LinkGoalModal from '../components/goals/LinkGoalModal';
import MeasureForm from '../components/measures/MeasureForm';
import MeasureProgressModal from '../components/measures/MeasureProgressModal';
import { useDeleteMeasure } from '../api/measures';
import ProgressSummary from '../components/ai/ProgressSummary';
import MeasureReviewPanel from '../components/ai/MeasureReviewPanel';
import AlignmentSuggestions from '../components/ai/AlignmentSuggestions';

const statusColors: Record<GoalStatus, string> = {
  DRAFT: 'gray',
  ACTIVE: 'blue',
  ON_TRACK: 'green',
  AT_RISK: 'yellow',
  BEHIND: 'red',
  COMPLETED: 'green',
  CANCELLED: 'gray',
};

export default function GoalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: goal, isLoading } = useGoal(id!);
  const addUpdate = useAddGoalUpdate();
  const deleteMeasure = useDeleteMeasure(id!);
  const [newUpdate, setNewUpdate] = useState('');
  const [selectedMeasure, setSelectedMeasure] = useState<Measure | null>(null);
  const { isOpen: isLinkOpen, onOpen: onLinkOpen, onClose: onLinkClose } = useDisclosure();
  const { isOpen: isMeasureFormOpen, onOpen: onMeasureFormOpen, onClose: onMeasureFormClose } = useDisclosure();
  const { isOpen: isProgressOpen, onOpen: onProgressOpen, onClose: onProgressClose } = useDisclosure();

  const handleEditMeasure = (measure: Measure) => {
    setSelectedMeasure(measure);
    onMeasureFormOpen();
  };

  const handleUpdateProgress = (measure: Measure) => {
    setSelectedMeasure(measure);
    onProgressOpen();
  };

  const handleDeleteMeasure = async (measure: Measure) => {
    if (window.confirm(`Delete "${measure.title}"? This cannot be undone.`)) {
      await deleteMeasure.mutateAsync(measure.id);
      toast({
        title: 'Key result deleted',
        status: 'success',
        duration: 2000,
      });
    }
  };

  const handleMeasureFormClose = () => {
    setSelectedMeasure(null);
    onMeasureFormClose();
  };

  const handleProgressClose = () => {
    setSelectedMeasure(null);
    onProgressClose();
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim() || !id) return;
    await addUpdate.mutateAsync({ goalId: id, content: newUpdate });
    setNewUpdate('');
  };

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (!goal) {
    return (
      <Center h="400px">
        <Text>Goal not found</Text>
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <IconButton
          aria-label="Back"
          icon={<ArrowBackIcon />}
          variant="ghost"
          onClick={() => navigate(-1)}
        />
        <Box flex={1}>
          <Heading size="lg">{goal.title}</Heading>
          <HStack spacing={2} mt={2}>
            <Badge colorScheme={statusColors[goal.status]} size="lg">
              {goal.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">{goal.year}</Badge>
            {goal.isStretch && <Badge colorScheme="purple">Stretch</Badge>}
          </HStack>
        </Box>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
        {/* Left column - Overview and Key Results */}
        <VStack spacing={4} align="stretch">
          <Card>
            <CardHeader>
              <Heading size="sm">Overview</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {goal.description && <Text color="gray.600">{goal.description}</Text>}

                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="medium">Progress</Text>
                    <Text fontWeight="bold">{Math.round(goal.progress)}%</Text>
                  </HStack>
                  <Progress
                    value={goal.progress}
                    colorScheme={
                      goal.progress >= 70 ? 'green' : goal.progress >= 40 ? 'yellow' : 'red'
                    }
                    borderRadius="full"
                  />
                </Box>

                <Divider />

                <HStack justify="space-between">
                  <Text color="gray.600">Owner</Text>
                  <HStack>
                    <Avatar
                      size="sm"
                      name={`${goal.owner.firstName} ${goal.owner.lastName}`}
                      src={goal.owner.avatarUrl}
                    />
                    <Text>
                      {goal.owner.firstName} {goal.owner.lastName}
                    </Text>
                  </HStack>
                </HStack>

                <HStack justify="space-between">
                  <Text color="gray.600">Team</Text>
                  <Text>{goal.team.name}</Text>
                </HStack>

                <Divider />

                {/* AI Progress Summary */}
                <ProgressSummary goalId={id!} />
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="sm">Key Results ({goal.measures?.length || 0})</Heading>
                <Button
                  size="sm"
                  leftIcon={<AddIcon />}
                  colorScheme="blue"
                  variant="outline"
                  onClick={onMeasureFormOpen}
                >
                  Add
                </Button>
              </HStack>
            </CardHeader>
            <CardBody>
              {goal.measures && goal.measures.length > 0 ? (
                <VStack spacing={4} align="stretch">
                  {goal.measures.map((measure) => (
                    <Box
                      key={measure.id}
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                      _hover={{ bg: 'gray.100' }}
                      transition="all 0.2s"
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="medium" flex={1}>{measure.title}</Text>
                        <HStack spacing={1}>
                          <Text fontSize="sm" color="gray.600">
                            {measure.currentValue} / {measure.targetValue} {measure.unit}
                          </Text>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              icon={<EditIcon />}
                              size="xs"
                              variant="ghost"
                              aria-label="Options"
                            />
                            <MenuList>
                              <MenuItem onClick={() => handleUpdateProgress(measure)}>
                                Update Progress
                              </MenuItem>
                              <MenuItem onClick={() => handleEditMeasure(measure)}>
                                Edit Details
                              </MenuItem>
                              <MenuItem
                                color="red.500"
                                onClick={() => handleDeleteMeasure(measure)}
                              >
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </HStack>
                      </HStack>
                      <Progress
                        value={measure.progress}
                        size="sm"
                        colorScheme={
                          measure.progress >= 70
                            ? 'green'
                            : measure.progress >= 40
                            ? 'yellow'
                            : 'red'
                        }
                        borderRadius="full"
                        cursor="pointer"
                        onClick={() => handleUpdateProgress(measure)}
                      />
                      <HStack justify="space-between" mt={1}>
                        <HStack spacing={2}>
                          <Text fontSize="xs" color="gray.500">
                            {measure.measureType.replace('_', ' ').toLowerCase()}
                          </Text>
                          <MeasureReviewPanel measureId={measure.id} measureTitle={measure.title} />
                        </HStack>
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          color={
                            measure.progress >= 70
                              ? 'green.500'
                              : measure.progress >= 40
                              ? 'yellow.600'
                              : 'red.500'
                          }
                        >
                          {Math.round(measure.progress)}%
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Box textAlign="center" py={4}>
                  <Text color="gray.500" mb={2}>No key results defined yet.</Text>
                  <Button
                    size="sm"
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={onMeasureFormOpen}
                  >
                    Add Key Result
                  </Button>
                </Box>
              )}
            </CardBody>
          </Card>
        </VStack>

        {/* Middle column - Alignment Hierarchy */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="sm">Goal Alignment</Heading>
              <Button
                size="sm"
                leftIcon={<LinkIcon />}
                variant="outline"
                colorScheme="blue"
                onClick={onLinkOpen}
              >
                Link Goal
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <AlignmentLadder goalId={id!} />

              <Divider />

              {/* AI Alignment Suggestions */}
              <AlignmentSuggestions goalId={id!} onLinkSuccess={onLinkClose} />
            </VStack>
          </CardBody>
        </Card>

        {/* Right column - Updates */}
        <Card>
          <CardHeader>
            <Heading size="sm">Updates</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Textarea
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  placeholder="Add an update..."
                  rows={3}
                />
                <Button
                  mt={2}
                  colorScheme="blue"
                  size="sm"
                  onClick={handleAddUpdate}
                  isLoading={addUpdate.isPending}
                  isDisabled={!newUpdate.trim()}
                >
                  Post Update
                </Button>
              </Box>

              <Divider />

              {goal.updates && goal.updates.length > 0 ? (
                <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                  {goal.updates.map((update) => (
                    <Box key={update.id} p={3} bg="gray.50" borderRadius="md">
                      <HStack mb={2}>
                        <Avatar
                          size="xs"
                          name={`${update.author.firstName} ${update.author.lastName}`}
                          src={update.author.avatarUrl}
                        />
                        <Text fontWeight="medium" fontSize="sm">
                          {update.author.firstName} {update.author.lastName}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(update.createdAt).toLocaleDateString()}
                        </Text>
                      </HStack>
                      <Text fontSize="sm">{update.content}</Text>
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Text color="gray.500" textAlign="center">
                  No updates yet.
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Link Goal Modal */}
      <LinkGoalModal
        isOpen={isLinkOpen}
        onClose={onLinkClose}
        goalId={id!}
        goalTitle={goal.title}
      />

      {/* Measure Form Modal */}
      <MeasureForm
        isOpen={isMeasureFormOpen}
        onClose={handleMeasureFormClose}
        goalId={id!}
        measure={selectedMeasure}
      />

      {/* Measure Progress Modal */}
      {selectedMeasure && (
        <MeasureProgressModal
          isOpen={isProgressOpen}
          onClose={handleProgressClose}
          measure={selectedMeasure}
          goalId={id!}
        />
      )}
    </VStack>
  );
}
