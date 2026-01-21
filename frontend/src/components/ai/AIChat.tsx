import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Avatar,
  Spinner,
  IconButton,
} from '@chakra-ui/react';
import { ArrowUpIcon } from '@chakra-ui/icons';
import { useChat, ChatMessage } from '../../api/ai';
import { useAuth } from '../../context/AuthContext';

export default function AIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chat = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chat.isPending) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await chat.mutateAsync(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "How are we doing on our goals this quarter?",
    "Which goals are at risk?",
    "Show me goals with the most progress",
    "What teams are performing well?",
  ];

  return (
    <VStack h="100%" spacing={0}>
      {/* Messages */}
      <Box flex={1} w="100%" overflowY="auto" p={4}>
        {messages.length === 0 ? (
          <VStack spacing={4} py={8}>
            <Text fontSize="lg" fontWeight="medium" color="gray.600">
              Ask me anything about your OKRs
            </Text>
            <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
              I can help you understand progress, find at-risk goals, generate summaries, and more.
            </Text>
            <VStack spacing={2} mt={4}>
              <Text fontSize="xs" color="gray.400" textTransform="uppercase">
                Try asking
              </Text>
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => {
                    setInput(q);
                  }}
                >
                  {q}
                </Button>
              ))}
            </VStack>
          </VStack>
        ) : (
          <VStack spacing={4} align="stretch">
            {messages.map((msg, i) => (
              <HStack
                key={i}
                align="start"
                justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              >
                {msg.role === 'assistant' && (
                  <Avatar
                    size="sm"
                    name="AI"
                    bg="purple.500"
                    color="white"
                    fontSize="xs"
                  />
                )}
                <Box
                  maxW="70%"
                  p={3}
                  borderRadius="lg"
                  bg={msg.role === 'user' ? 'blue.500' : 'gray.100'}
                  color={msg.role === 'user' ? 'white' : 'gray.800'}
                >
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {msg.content}
                  </Text>
                </Box>
                {msg.role === 'user' && (
                  <Avatar
                    size="sm"
                    name={user ? `${user.firstName} ${user.lastName}` : 'User'}
                    src={user?.avatarUrl}
                  />
                )}
              </HStack>
            ))}
            {chat.isPending && (
              <HStack align="start">
                <Avatar
                  size="sm"
                  name="AI"
                  bg="purple.500"
                  color="white"
                  fontSize="xs"
                />
                <Box p={3} borderRadius="lg" bg="gray.100">
                  <Spinner size="sm" color="purple.500" />
                </Box>
              </HStack>
            )}
            <div ref={messagesEndRef} />
          </VStack>
        )}
      </Box>

      {/* Input */}
      <Box w="100%" p={4} borderTopWidth={1} borderColor="gray.200" bg="white">
        <HStack>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your OKRs..."
            size="md"
            borderRadius="full"
            disabled={chat.isPending}
          />
          <IconButton
            aria-label="Send"
            icon={<ArrowUpIcon />}
            colorScheme="purple"
            borderRadius="full"
            onClick={handleSend}
            isLoading={chat.isPending}
            isDisabled={!input.trim()}
          />
        </HStack>
      </Box>
    </VStack>
  );
}
