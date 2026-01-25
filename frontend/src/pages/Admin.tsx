import React from 'react';
import {
  Box,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
  IconButton,
  useToast,
  Skeleton,
  Text,
  HStack,
  VStack,
  Card,
  CardBody,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { NotAllowedIcon, CheckIcon } from '@chakra-ui/icons';
import { useUsers, useUpdateUserRole, useToggleUserActive, useUpdateUserTeam, User } from '../api/users';
import { useTeams } from '../api/teams';
import { useAuth } from '../context/AuthContext';

const roleColors: Record<string, string> = {
  ADMIN: 'red',
  EXECUTIVE: 'purple',
  MANAGER: 'blue',
  CONTRIBUTOR: 'gray',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  EXECUTIVE: 'Executive',
  MANAGER: 'Manager',
  CONTRIBUTOR: 'Contributor',
};

export default function Admin() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, error } = useUsers();
  const { data: teams } = useTeams();
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  const updateTeam = useUpdateUserTeam();
  const toast = useToast();

  const handleRoleChange = async (userId: string, newRole: User['role']) => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole });
      toast({
        title: 'Role updated',
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: 'Failed to update role',
        description: (err as Error).message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleToggleActive = async (userId: string, userName: string, isActive: boolean) => {
    try {
      await toggleActive.mutateAsync(userId);
      toast({
        title: isActive ? 'User deactivated' : 'User activated',
        description: `${userName} has been ${isActive ? 'deactivated' : 'activated'}`,
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: 'Failed to update user status',
        description: (err as Error).message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleTeamChange = async (userId: string, teamId: string) => {
    try {
      await updateTeam.mutateAsync({ userId, teamId: teamId || null });
      toast({
        title: 'Team updated',
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: 'Failed to update team',
        description: (err as Error).message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          You do not have permission to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Administration</Heading>
          <Text color="gray.600">Manage users, roles, and permissions</Text>
        </Box>

        <Card>
          <CardBody>
            <Heading size="md" mb={4}>User Management</Heading>

            {error ? (
              <Alert status="error">
                <AlertIcon />
                Failed to load users
              </Alert>
            ) : isLoading ? (
              <VStack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height="50px" width="100%" />
                ))}
              </VStack>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Email</Th>
                      <Th>Team</Th>
                      <Th>Role</Th>
                      <Th>Status</Th>
                      <Th>Last Login</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {users?.map((user) => (
                      <Tr key={user.id} opacity={user.isActive ? 1 : 0.6}>
                        <Td>
                          <Text fontWeight="medium">
                            {user.firstName} {user.lastName}
                          </Text>
                        </Td>
                        <Td>{user.email}</Td>
                        <Td>
                          <Select
                            size="sm"
                            value={user.teamId || ''}
                            onChange={(e) => handleTeamChange(user.id, e.target.value)}
                            width="150px"
                            isDisabled={updateTeam.isPending}
                          >
                            <option value="">No Team</option>
                            {teams?.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </Select>
                        </Td>
                        <Td>
                          {user.id === currentUser?.id ? (
                            <Badge colorScheme={roleColors[user.role]}>
                              {roleLabels[user.role]}
                            </Badge>
                          ) : (
                            <Select
                              size="sm"
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as User['role'])}
                              width="130px"
                              isDisabled={updateRole.isPending}
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="EXECUTIVE">Executive</option>
                              <option value="MANAGER">Manager</option>
                              <option value="CONTRIBUTOR">Contributor</option>
                            </Select>
                          )}
                        </Td>
                        <Td>
                          <Badge colorScheme={user.isActive ? 'green' : 'gray'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </Td>
                        <Td>
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            {user.id !== currentUser?.id && (
                              <IconButton
                                aria-label={user.isActive ? 'Deactivate user' : 'Activate user'}
                                icon={user.isActive ? <NotAllowedIcon /> : <CheckIcon />}
                                size="sm"
                                colorScheme={user.isActive ? 'red' : 'green'}
                                variant="ghost"
                                onClick={() => handleToggleActive(user.id, `${user.firstName} ${user.lastName}`, user.isActive)}
                                isLoading={toggleActive.isPending}
                                title={user.isActive ? 'Deactivate user' : 'Activate user'}
                              />
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}
