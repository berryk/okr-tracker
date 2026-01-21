import React from 'react';
import {
  Box,
  Heading,
  Card,
  CardBody,
} from '@chakra-ui/react';
import AIChat from '../components/ai/AIChat';

export default function AIAssistant() {
  return (
    <Box h="calc(100vh - 180px)">
      <Heading size="lg" mb={4}>
        AI Assistant
      </Heading>
      <Card h="calc(100% - 50px)">
        <CardBody p={0} h="100%">
          <AIChat />
        </CardBody>
      </Card>
    </Box>
  );
}
