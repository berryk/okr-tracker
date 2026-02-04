import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Select,
  VStack,
  HStack,
  Text,
  Box,
  Alert,
  AlertIcon,
  useToast,
  Progress,
  Divider,
  Badge,
} from '@chakra-ui/react';
import { useAuth } from '../../context/AuthContext';
import { useTeams } from '../../api/teams';
import { useAnalyzePPTX, useCreateFromPPTX, ExtractedOKR } from '../../api/import';
import FileDropzone from '../common/FileDropzone';
import OKRReviewList from './OKRReviewList';

interface PPTXImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4;

export default function PPTXImportModal({ isOpen, onClose, onSuccess }: PPTXImportModalProps) {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const toast = useToast();

  // State
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [extractedOKRs, setExtractedOKRs] = useState<ExtractedOKR[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [teamId, setTeamId] = useState('');
  const [year, setYear] = useState(currentYear);

  // Queries and mutations
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const analyzeMutation = useAnalyzePPTX();
  const createMutation = useCreateFromPPTX();

  const years = [currentYear - 1, currentYear, currentYear + 1];

  const resetForm = () => {
    setStep(1);
    setFile(null);
    setExtractedOKRs([]);
    setWarnings([]);
    setTeamId('');
    setYear(currentYear);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      const result = await analyzeMutation.mutateAsync(file);
      setExtractedOKRs(result.extractedOKRs);
      setWarnings(result.warnings);

      if (result.extractedOKRs.length === 0) {
        toast({
          title: 'No OKRs Found',
          description: 'Could not identify OKRs in this presentation. Please try a different file.',
          status: 'warning',
          duration: 5000,
        });
      } else {
        setStep(2);
      }
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: (error as Error).message || 'Failed to analyze the PowerPoint file',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleCreate = async () => {
    if (!teamId || !user) return;

    try {
      const okrsToCreate = extractedOKRs.map((okr) => ({
        objective: okr.objective,
        keyResults: okr.keyResults,
      }));

      const goals = await createMutation.mutateAsync({
        teamId,
        ownerId: user.id,
        year,
        okrs: okrsToCreate,
      });

      toast({
        title: 'Import Successful',
        description: `Created ${goals.length} objective(s) with key results`,
        status: 'success',
        duration: 3000,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: (error as Error).message || 'Failed to create OKRs',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const totalKeyResults = extractedOKRs.reduce((sum, okr) => sum + okr.keyResults.length, 0);

  const renderStepIndicator = () => (
    <Box mb={4}>
      <HStack spacing={2} mb={2}>
        {[1, 2, 3, 4].map((s) => (
          <Box
            key={s}
            flex={1}
            h={1}
            borderRadius="full"
            bg={step >= s ? 'blue.500' : 'gray.200'}
          />
        ))}
      </HStack>
      <Text fontSize="sm" color="gray.600">
        Step {step} of 4:{' '}
        {step === 1 && 'Upload PowerPoint'}
        {step === 2 && 'Configure Import'}
        {step === 3 && 'Review OKRs'}
        {step === 4 && 'Confirm'}
      </Text>
    </Box>
  );

  const renderStep1 = () => (
    <VStack spacing={4} align="stretch">
      <Text>Upload a PowerPoint presentation containing OKRs to extract and import them.</Text>
      <FileDropzone
        accept=".pptx"
        maxSize={10 * 1024 * 1024}
        onFile={handleFileSelect}
        label="Drop PowerPoint file here or click to browse"
        disabled={analyzeMutation.isPending}
      />
      {file && (
        <Alert status="info">
          <AlertIcon />
          Ready to analyze: {file.name}
        </Alert>
      )}
    </VStack>
  );

  const renderStep2 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="success">
        <AlertIcon />
        Found {extractedOKRs.length} objective(s) with {totalKeyResults} key result(s)
      </Alert>

      {warnings.length > 0 && (
        <Alert status="warning">
          <AlertIcon />
          <Box>
            {warnings.map((warning, i) => (
              <Text key={i}>{warning}</Text>
            ))}
          </Box>
        </Alert>
      )}

      <FormControl isRequired>
        <FormLabel>Team</FormLabel>
        <Select
          placeholder="Select team..."
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          isDisabled={teamsLoading}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({team.level})
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Year</FormLabel>
        <Select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Owner</FormLabel>
        <Text color="gray.600">
          {user?.firstName} {user?.lastName} (you)
        </Text>
      </FormControl>
    </VStack>
  );

  const renderStep3 = () => (
    <VStack spacing={4} align="stretch">
      <Text fontSize="sm" color="gray.600">
        Review and edit the extracted OKRs before importing. You can modify titles, key results, and
        remove items that shouldn't be imported.
      </Text>
      <Box maxH="400px" overflowY="auto">
        <OKRReviewList okrs={extractedOKRs} onChange={setExtractedOKRs} />
      </Box>
    </VStack>
  );

  const renderStep4 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info">
        <AlertIcon />
        Ready to create {extractedOKRs.length} objective(s) with {totalKeyResults} key result(s)
      </Alert>

      <Box p={4} bg="gray.50" borderRadius="md">
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <Text fontWeight="medium">Team:</Text>
            <Text>{teams.find((t) => t.id === teamId)?.name}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontWeight="medium">Year:</Text>
            <Text>{year}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontWeight="medium">Owner:</Text>
            <Text>
              {user?.firstName} {user?.lastName}
            </Text>
          </HStack>
          <Divider />
          <HStack justify="space-between">
            <Text fontWeight="medium">Objectives:</Text>
            <Badge colorScheme="blue">{extractedOKRs.length}</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontWeight="medium">Key Results:</Text>
            <Badge colorScheme="green">{totalKeyResults}</Badge>
          </HStack>
        </VStack>
      </Box>

      <Text fontSize="sm" color="gray.500">
        All objectives will be created with DRAFT status.
      </Text>
    </VStack>
  );

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!file;
      case 2:
        return !!teamId;
      case 3:
        return extractedOKRs.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 1) {
      handleAnalyze();
    } else if (step < 4) {
      setStep((s) => (s + 1) as Step);
    } else {
      handleCreate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="700px">
        <ModalHeader>Import from PowerPoint</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {renderStepIndicator()}

          {analyzeMutation.isPending && (
            <Box mb={4}>
              <Text fontSize="sm" color="gray.600" mb={2}>
                Analyzing PowerPoint and extracting OKRs...
              </Text>
              <Progress size="sm" isIndeterminate colorScheme="blue" />
            </Box>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            {step > 1 && (
              <Button variant="ghost" onClick={handleBack} isDisabled={createMutation.isPending}>
                Back
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleNext}
              isLoading={analyzeMutation.isPending || createMutation.isPending}
              isDisabled={!canProceed()}
            >
              {step === 1 && 'Analyze'}
              {step === 2 && 'Review OKRs'}
              {step === 3 && 'Continue'}
              {step === 4 && `Import ${extractedOKRs.length} Objective(s)`}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
