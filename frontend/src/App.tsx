import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';
import GoalMap from './pages/GoalMap';
import Teams from './pages/Teams';
import AIAssistant from './pages/AIAssistant';
import Reports from './pages/Reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="goals" element={<Goals />} />
                <Route path="goals/map" element={<GoalMap />} />
                <Route path="goals/:id" element={<GoalDetail />} />
                <Route path="teams" element={<Teams />} />
                <Route path="reports" element={<Reports />} />
                <Route path="ai" element={<AIAssistant />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;
