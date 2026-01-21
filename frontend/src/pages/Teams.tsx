import React, { useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  Card,
  CardBody,
  Text,
  Badge,
  Spinner,
  Center,
  HStack,
  Button,
  Switch,
  FormControl,
  FormLabel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useDisclosure,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useTeams, useUpdateTeam, useDeleteTeam } from '../api/teams';
import { Team } from '../types';
import TeamForm from '../components/teams/TeamForm';

const levelColors: Record<string, string> = {
  CORPORATE: 'purple',
  EXECUTIVE: 'blue',
  DEPARTMENT: 'green',
  TEAM: 'teal',
  INDIVIDUAL: 'gray',
};

interface TeamNodeProps {
  team: Team & { children?: Team[] };
  depth?: number;
  onEdit: (team: Team) => void;
  onToggleActive: (team: Team) => void;
  onDelete: (team: Team) => void;
  showInactive: boolean;
}

function TeamNode({ team, depth = 0, onEdit, onToggleActive, onDelete, showInactive }: TeamNodeProps) {
  const isInactive = team.isActive === false;

  // Filter children based on showInactive flag
  const visibleChildren = team.children?.filter(
    (child) => showInactive || child.isActive !== false
  );

  return (
    <Box ml={depth * 6}>
      <Card
        mb={2}
        variant={depth === 0 ? 'filled' : 'outline'}
        opacity={isInactive ? 0.6 : 1}
        borderStyle={isInactive ? 'dashed' : 'solid'}
      >
        <CardBody py={3}>
          <HStack justify="space-between">
            <Box flex={1}>
              <HStack>
                <Text fontWeight="semibold">{team.name}</Text>
                {isInactive && (
                  <Badge colorScheme="red" variant="subtle">
                    Inactive
                  </Badge>
                )}
              </HStack>
              {team.description && (
                <Text fontSize="sm" color="gray.600">
                  {team.description}
                </Text>
              )}
            </Box>
            <HStack spacing={2}>
              <Badge colorScheme={levelColors[team.level]}>{team.level}</Badge>
              {team._count && (
                <>
                  <Badge variant="outline">{team._count.members} members</Badge>
                  <Badge variant="outline">{team._count.goals} goals</Badge>
                </>
              )}
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<ChevronDownIcon />}
                  variant="ghost"
                  size="sm"
                  aria-label="Options"
                />
                <MenuList>
                  <MenuItem icon={<EditIcon />} onClick={() => onEdit(team)}>
                    Edit
                  </MenuItem>
                  <MenuItem onClick={() => onToggleActive(team)}>
                    {isInactive ? 'Activate' : 'Deactivate'}
                  </MenuItem>
                  <MenuItem
                    icon={<DeleteIcon />}
                    color="red.500"
                    onClick={() => onDelete(team)}
                    isDisabled={
                      (team._count?.members || 0) > 0 ||
                      (team._count?.goals || 0) > 0 ||
                      (team._count?.children || 0) > 0
                    }
                  >
                    Delete
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </HStack>
        </CardBody>
      </Card>
      {visibleChildren && visibleChildren.length > 0 && (
        <Box borderLeftWidth={2} borderColor="gray.200" ml={3}>
          {visibleChildren.map((child) => (
            <TeamNode
              key={child.id}
              team={child as any}
              depth={depth + 1}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
              showInactive={showInactive}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function Teams() {
  const [showInactive, setShowInactive] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const { data: teams, isLoading } = useTeams(true); // Always fetch all, filter in UI
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const toast = useToast();

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Build hierarchy from flat list
  const buildHierarchy = (teams: Team[]): Team[] => {
    const teamMap = new Map(teams.map((t) => [t.id, { ...t, children: [] as Team[] }]));
    const rootTeams: Team[] = [];

    teams.forEach((team) => {
      const teamNode = teamMap.get(team.id)!;
      if (team.parentId) {
        const parent = teamMap.get(team.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(teamNode);
        } else {
          rootTeams.push(teamNode);
        }
      } else {
        rootTeams.push(teamNode);
      }
    });

    return rootTeams;
  };

  const hierarchy = teams ? buildHierarchy(teams) : [];
  const visibleHierarchy = showInactive
    ? hierarchy
    : hierarchy.filter((t) => t.isActive !== false);

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    onFormOpen();
  };

  const handleToggleActive = async (team: Team) => {
    const newStatus = team.isActive === false ? true : false;
    await updateTeam.mutateAsync({
      id: team.id,
      isActive: !newStatus ? false : true,
    });
    toast({
      title: newStatus ? 'Team activated' : 'Team deactivated',
      status: 'success',
      duration: 2000,
    });
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    try {
      await deleteTeam.mutateAsync(teamToDelete.id);
      toast({
        title: 'Team deleted',
        status: 'success',
        duration: 2000,
      });
    } catch (error: any) {
      toast({
        title: 'Cannot delete team',
        description: error.response?.data?.error || 'Team has members, goals, or child teams',
        status: 'error',
        duration: 4000,
      });
    }
    onDeleteClose();
    setTeamToDelete(null);
  };

  const handleFormClose = () => {
    setSelectedTeam(null);
    onFormClose();
  };

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="lg">Teams</Heading>
        <HStack spacing={4}>
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel htmlFor="show-inactive" mb={0} fontSize="sm">
              Show inactive
            </FormLabel>
            <Switch
              id="show-inactive"
              isChecked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
          </FormControl>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onFormOpen}>
            Add Team
          </Button>
        </HStack>
      </HStack>

      {visibleHierarchy.length > 0 ? (
        <Box>
          {visibleHierarchy.map((team) => (
            <TeamNode
              key={team.id}
              team={team as any}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteClick}
              showInactive={showInactive}
            />
          ))}
        </Box>
      ) : (
        <Card>
          <CardBody textAlign="center" py={8}>
            <Text color="gray.500" mb={4}>
              No teams found. Create your organization structure to get started.
            </Text>
            <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onFormOpen}>
              Create First Team
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Team Form Modal */}
      <TeamForm isOpen={isFormOpen} onClose={handleFormClose} team={selectedTeam} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete Team</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete "{teamToDelete?.name}"? This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                isLoading={deleteTeam.isPending}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
}
