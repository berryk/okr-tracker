import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, name });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="md" py={20}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" color="blue.600">
            OKR Tracker
          </Heading>
          <Text color="gray.600" mt={2}>
            Enter your details to get started
          </Text>
        </Box>

        <Box bg="white" p={8} borderRadius="lg" shadow="sm" borderWidth={1}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Your Name</FormLabel>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                w="full"
                isLoading={isLoading}
              >
                Continue
              </Button>
            </VStack>
          </form>
        </Box>

        <Text textAlign="center" fontSize="sm" color="gray.500">
          New users will be automatically registered
        </Text>
      </VStack>
    </Container>
  );
}
