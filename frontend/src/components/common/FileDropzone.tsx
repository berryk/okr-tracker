import React, { useCallback, useState, useRef } from 'react';
import {
  Box,
  Text,
  VStack,
  Icon,
  Input,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiUploadCloud, FiFile } from 'react-icons/fi';

interface FileDropzoneProps {
  accept: string;
  maxSize?: number;
  onFile: (file: File) => void;
  disabled?: boolean;
  label?: string;
}

export default function FileDropzone({
  accept,
  maxSize = 10 * 1024 * 1024,
  onFile,
  disabled = false,
  label = 'Drop file here or click to browse',
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const dragOverBg = useColorModeValue('blue.50', 'blue.900');
  const dragOverBorder = useColorModeValue('blue.400', 'blue.300');

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file extension
      const acceptedExtensions = accept.split(',').map((ext) => ext.trim().toLowerCase());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!acceptedExtensions.includes(fileExtension)) {
        return `Invalid file type. Accepted: ${accept}`;
      }

      // Check file size
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / 1024 / 1024);
        return `File too large. Maximum size: ${maxSizeMB}MB`;
      }

      return null;
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }

      setError(null);
      setSelectedFile(file);
      onFile(file);
    },
    [validateFile, onFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Box>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        display="none"
      />
      <Box
        border="2px dashed"
        borderColor={isDragOver ? dragOverBorder : error ? 'red.400' : borderColor}
        borderRadius="lg"
        bg={isDragOver ? dragOverBg : bgColor}
        p={8}
        textAlign="center"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.6 : 1}
        transition="all 0.2s"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        _hover={
          disabled
            ? {}
            : {
                borderColor: dragOverBorder,
                bg: dragOverBg,
              }
        }
      >
        <VStack spacing={3}>
          {selectedFile ? (
            <>
              <Icon as={FiFile} boxSize={10} color="green.500" />
              <Text fontWeight="medium">{selectedFile.name}</Text>
              <Text fontSize="sm" color="gray.500">
                {formatFileSize(selectedFile.size)}
              </Text>
            </>
          ) : (
            <>
              <Icon as={FiUploadCloud} boxSize={10} color="gray.400" />
              <Text fontWeight="medium">{label}</Text>
              <Text fontSize="sm" color="gray.500">
                Accepted: {accept} (max {Math.round(maxSize / 1024 / 1024)}MB)
              </Text>
            </>
          )}
        </VStack>
      </Box>
      {error && (
        <Text color="red.500" fontSize="sm" mt={2}>
          {error}
        </Text>
      )}
    </Box>
  );
}
