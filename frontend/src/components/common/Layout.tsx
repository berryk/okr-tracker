import React from 'react';
import {
  Box,
  Flex,
  HStack,
  IconButton,
  useDisclosure,
  Stack,
  Container,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Button,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Goals', path: '/goals' },
  { label: 'Goal Map', path: '/goals/map' },
  { label: 'Teams', path: '/teams' },
  { label: 'AI Assistant', path: '/ai' },
];

function NavLink({ label, path }: { label: string; path: string }) {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Link to={path}>
      <Box
        px={3}
        py={2}
        rounded="md"
        bg={isActive ? 'blue.500' : 'transparent'}
        color={isActive ? 'white' : 'gray.600'}
        fontWeight={isActive ? 'semibold' : 'medium'}
        _hover={{ bg: isActive ? 'blue.600' : 'gray.100' }}
      >
        {label}
      </Box>
    </Link>
  );
}

export default function Layout() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user, logout } = useAuth();

  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" borderBottomWidth={1} borderColor="gray.200" px={4}>
        <Flex h={16} alignItems="center" justifyContent="space-between" maxW="7xl" mx="auto">
          <IconButton
            size="md"
            icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
            aria-label="Open Menu"
            display={{ md: 'none' }}
            onClick={isOpen ? onClose : onOpen}
          />
          <HStack spacing={8} alignItems="center">
            <Link to="/">
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                OKR Tracker
              </Text>
            </Link>
            <HStack as="nav" spacing={1} display={{ base: 'none', md: 'flex' }}>
              {navItems.map((item) => (
                <NavLink key={item.path} {...item} />
              ))}
            </HStack>
          </HStack>
          <Flex alignItems="center">
            <Menu>
              <MenuButton
                as={Button}
                rounded="full"
                variant="link"
                cursor="pointer"
                minW={0}
              >
                <Avatar
                  size="sm"
                  name={user ? `${user.firstName} ${user.lastName}` : 'User'}
                  src={user?.avatarUrl}
                />
              </MenuButton>
              <MenuList>
                <MenuItem isDisabled>
                  <Text fontWeight="semibold">
                    {user?.firstName} {user?.lastName}
                  </Text>
                </MenuItem>
                <MenuItem isDisabled fontSize="sm" color="gray.500">
                  {user?.email}
                </MenuItem>
                <MenuItem onClick={logout}>Sign Out</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>

        {isOpen && (
          <Box pb={4} display={{ md: 'none' }}>
            <Stack as="nav" spacing={2}>
              {navItems.map((item) => (
                <NavLink key={item.path} {...item} />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      <Container maxW="7xl" py={8}>
        <Outlet />
      </Container>
    </Box>
  );
}
