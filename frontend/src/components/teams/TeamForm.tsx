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
  VStack,
  FormHelperText,
} from '@chakra-ui/react';
import { Team } from '../../types';
import { useCreateTeam, useUpdateTeam, useTeams } from '../../api/teams';

interface TeamFormProps {
  isOpen: boolean;
  onClose: () => void;
  team?: Team | null;
}

type TeamLevel = 'CORPORATE' | 'EXECUTIVE' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';

const levelLabels: Record<TeamLevel, string> = {
  CORPORATE: 'Corporate (Top Level)',
  EXECUTIVE: 'Executive',
  DEPARTMENT: 'Department',
  TEAM: 'Team',
  INDIVIDUAL: 'Individual',
};

const levelOrder: TeamLevel[] = ['CORPORATE', 'EXECUTIVE', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'];

export default function TeamForm({ isOpen, onClose, team }: TeamFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<TeamLevel>('TEAM');
  const [parentId, setParentId] = useState<string>('');

  const { data: allTeams } = useTeams(true);
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const isEditing = !!team;

  // Filter available parent teams based on level
  const availableParents = allTeams?.filter((t) => {
    if (t.id === team?.id) return false; // Can't be own parent
    const parentLevelIndex = levelOrder.indexOf(t.level);
    const currentLevelIndex = levelOrder.indexOf(level);
    return parentLevelIndex < currentLevelIndex; // Parent must be higher level
  }) || [];

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
      setLevel(team.level);
      setParentId(team.parentId || '');
    } else {
      setName('');
      setDescription('');
      setLevel('TEAM');
      setParentId('');
    }
  }, [team, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    if (isEditing && team) {
      await updateTeam.mutateAsync({
        id: team.id,
        name,
        description: description || undefined,
        parentId: parentId || null,
      });
    } else {
      await createTeam.mutateAsync({
        name,
        description: description || undefined,
        level,
        parentId: parentId || undefined,
      });
    }

    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setLevel('TEAM');
    setParentId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditing ? 'Edit Team' : 'Create Team'}</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Team Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Engineering, Marketing, Product"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the team's purpose..."
                rows={2}
              />
            </FormControl>

            {!isEditing && (
              <FormControl isRequired>
                <FormLabel>Level</FormLabel>
                <Select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value as TeamLevel);
                    setParentId(''); // Reset parent when level changes
                  }}
                >
                  {levelOrder.map((l) => (
                    <option key={l} value={l}>
                      {levelLabels[l]}
                    </option>
                  ))}
                </Select>
                <FormHelperText>
                  Determines where this team sits in the organization hierarchy
                </FormHelperText>
              </FormControl>
            )}

            {level !== 'CORPORATE' && (
              <FormControl>
                <FormLabel>Parent Team</FormLabel>
                <Select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  placeholder="Select parent team (optional)"
                >
                  {availableParents.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.level})
                    </option>
                  ))}
                </Select>
                <FormHelperText>
                  Link this team to a higher-level team in your organization
                </FormHelperText>
              </FormControl>
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
            isLoading={createTeam.isPending || updateTeam.isPending}
            isDisabled={!name.trim()}
          >
            {isEditing ? 'Save Changes' : 'Create Team'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
