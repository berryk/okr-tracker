import React, { useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Select,
  Button,
  Card,
  CardBody,
  CardHeader,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Badge,
  Spinner,
  Center,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Divider,
  Textarea,
  useClipboard,
} from '@chakra-ui/react';
import { useQuarterlyReport, useAnnualReport, downloadReportAsText } from '../api/reports';

const currentYear = new Date().getFullYear();
const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'green';
    case 'ON_TRACK': return 'blue';
    case 'ACTIVE': return 'blue';
    case 'AT_RISK': return 'orange';
    case 'BEHIND': return 'red';
    case 'DRAFT': return 'gray';
    case 'CANCELLED': return 'gray';
    default: return 'gray';
  }
}

function QuarterlyReportView() {
  const [selectedQuarter, setSelectedQuarter] = useState(`Q${currentQuarter}-${currentYear}`);
  const { data: report, isLoading, error } = useQuarterlyReport(selectedQuarter);
  const [textReport, setTextReport] = useState('');
  const [isLoadingText, setIsLoadingText] = useState(false);
  const { hasCopied, onCopy } = useClipboard(textReport);
  const toast = useToast();

  const years = [currentYear - 1, currentYear, currentYear + 1];
  const quarters = years.flatMap((y) =>
    ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => `${q}-${y}`)
  );

  const handleExportText = async () => {
    setIsLoadingText(true);
    try {
      const text = await downloadReportAsText('quarterly', selectedQuarter);
      setTextReport(text);
      toast({
        title: 'Report generated',
        description: 'You can now copy the text or download it',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingText(false);
    }
  };

  if (isLoading) {
    return (
      <Center h="300px">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (error || !report) {
    return (
      <Center h="300px">
        <Text color="gray.500">No data available for {selectedQuarter}</Text>
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <Select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
          maxW="200px"
        >
          {quarters.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </Select>
        <Button
          colorScheme="blue"
          variant="outline"
          onClick={handleExportText}
          isLoading={isLoadingText}
        >
          Export for PowerPoint
        </Button>
      </HStack>

      {textReport && (
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="sm">PowerPoint-Ready Text</Heading>
              <Button size="sm" onClick={onCopy}>
                {hasCopied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <Textarea
              value={textReport}
              readOnly
              rows={15}
              fontFamily="mono"
              fontSize="sm"
            />
          </CardBody>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Objectives</StatLabel>
              <StatNumber>{report.summary.totalGoals}</StatNumber>
              <StatHelpText>{selectedQuarter}</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Average Progress</StatLabel>
              <StatNumber>{report.summary.avgProgress}%</StatNumber>
              <Progress
                value={report.summary.avgProgress}
                size="sm"
                colorScheme={report.summary.avgProgress >= 70 ? 'green' : report.summary.avgProgress >= 40 ? 'yellow' : 'red'}
                mt={2}
              />
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Completed</StatLabel>
              <StatNumber color="green.500">{report.summary.byStatus['COMPLETED'] || 0}</StatNumber>
              <StatHelpText>Objectives achieved</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>At Risk</StatLabel>
              <StatNumber color="orange.500">{report.summary.atRisk.length}</StatNumber>
              <StatHelpText>Need attention</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <Card>
          <CardHeader>
            <Heading size="sm">Top Performing</Heading>
          </CardHeader>
          <CardBody>
            {report.summary.topPerforming.length === 0 ? (
              <Text color="gray.500">No high performers yet</Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {report.summary.topPerforming.map((g, i) => (
                  <HStack key={i} justify="space-between">
                    <Box>
                      <Text fontWeight="medium" fontSize="sm">{g.title}</Text>
                      <Text fontSize="xs" color="gray.500">{g.team}</Text>
                    </Box>
                    <Badge colorScheme="green">{g.progress}%</Badge>
                  </HStack>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="sm">At Risk</Heading>
          </CardHeader>
          <CardBody>
            {report.summary.atRisk.length === 0 ? (
              <Text color="gray.500">No at-risk objectives</Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {report.summary.atRisk.map((g, i) => (
                  <HStack key={i} justify="space-between">
                    <Box>
                      <Text fontWeight="medium" fontSize="sm">{g.title}</Text>
                      <Text fontSize="xs" color="gray.500">{g.team} - {g.owner}</Text>
                    </Box>
                    <Badge colorScheme="red">{g.progress}%</Badge>
                  </HStack>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardHeader>
          <Heading size="sm">Team Breakdown</Heading>
        </CardHeader>
        <CardBody>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Team</Th>
                <Th isNumeric>Objectives</Th>
                <Th isNumeric>Completed</Th>
                <Th isNumeric>At Risk</Th>
                <Th isNumeric>Avg Progress</Th>
              </Tr>
            </Thead>
            <Tbody>
              {report.teamBreakdown.map((team) => (
                <Tr key={team.teamId}>
                  <Td>
                    <Text fontWeight="medium">{team.teamName}</Text>
                    <Text fontSize="xs" color="gray.500">{team.teamLevel}</Text>
                  </Td>
                  <Td isNumeric>{team.totalGoals}</Td>
                  <Td isNumeric color="green.500">{team.completedGoals}</Td>
                  <Td isNumeric color={team.atRiskGoals > 0 ? 'orange.500' : 'inherit'}>
                    {team.atRiskGoals}
                  </Td>
                  <Td isNumeric>
                    <HStack justify="flex-end">
                      <Progress
                        value={team.avgProgress}
                        size="sm"
                        w="60px"
                        colorScheme={team.avgProgress >= 70 ? 'green' : team.avgProgress >= 40 ? 'yellow' : 'red'}
                      />
                      <Text>{team.avgProgress}%</Text>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </VStack>
  );
}

function AnnualReportView() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { data: report, isLoading, error } = useAnnualReport(selectedYear);
  const [textReport, setTextReport] = useState('');
  const [isLoadingText, setIsLoadingText] = useState(false);
  const { hasCopied, onCopy } = useClipboard(textReport);
  const toast = useToast();

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const handleExportText = async () => {
    setIsLoadingText(true);
    try {
      const text = await downloadReportAsText('annual', String(selectedYear));
      setTextReport(text);
      toast({
        title: 'Report generated',
        description: 'You can now copy the text or download it',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingText(false);
    }
  };

  if (isLoading) {
    return (
      <Center h="300px">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (error || !report) {
    return (
      <Center h="300px">
        <Text color="gray.500">No data available for {selectedYear}</Text>
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <Select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          maxW="150px"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Button
          colorScheme="blue"
          variant="outline"
          onClick={handleExportText}
          isLoading={isLoadingText}
        >
          Export for PowerPoint
        </Button>
      </HStack>

      {textReport && (
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="sm">PowerPoint-Ready Text</Heading>
              <Button size="sm" onClick={onCopy}>
                {hasCopied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <Textarea
              value={textReport}
              readOnly
              rows={15}
              fontFamily="mono"
              fontSize="sm"
            />
          </CardBody>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Objectives</StatLabel>
              <StatNumber>{report.summary.totalGoals}</StatNumber>
              <StatHelpText>{selectedYear} Annual</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Average Progress</StatLabel>
              <StatNumber>{report.summary.avgProgress}%</StatNumber>
              <Progress
                value={report.summary.avgProgress}
                size="sm"
                colorScheme={report.summary.avgProgress >= 70 ? 'green' : report.summary.avgProgress >= 40 ? 'yellow' : 'red'}
                mt={2}
              />
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Completed</StatLabel>
              <StatNumber color="green.500">{report.highlights.completed.length}</StatNumber>
              <StatHelpText>Year to date</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Needs Attention</StatLabel>
              <StatNumber color="orange.500">{report.highlights.needsAttention.length}</StatNumber>
              <StatHelpText>Below target</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {report.summary.byYear.length > 0 && (
        <Card>
          <CardHeader>
            <Heading size="sm">Progress by Year</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              {report.summary.byYear.map((y) => (
                <Box key={y.year} textAlign="center">
                  <Text fontWeight="medium">{y.year}</Text>
                  <Text fontSize="2xl" fontWeight="bold">{y.avgProgress}%</Text>
                  <Text fontSize="sm" color="gray.500">{y.goalCount} key results</Text>
                  <Progress
                    value={y.avgProgress}
                    size="sm"
                    colorScheme={y.avgProgress >= 70 ? 'green' : y.avgProgress >= 40 ? 'yellow' : 'red'}
                    mt={2}
                  />
                </Box>
              ))}
            </SimpleGrid>
          </CardBody>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <Card>
          <CardHeader>
            <Heading size="sm">Completed Objectives</Heading>
          </CardHeader>
          <CardBody>
            {report.highlights.completed.length === 0 ? (
              <Text color="gray.500">No completed objectives yet</Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {report.highlights.completed.map((g, i) => (
                  <Box key={i}>
                    <Text fontWeight="medium" fontSize="sm">{g.title}</Text>
                    <Text fontSize="xs" color="gray.500">{g.team} - {g.owner}</Text>
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="sm">Needs Attention</Heading>
          </CardHeader>
          <CardBody>
            {report.highlights.needsAttention.length === 0 ? (
              <Text color="gray.500">All objectives on track!</Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {report.highlights.needsAttention.map((g, i) => (
                  <HStack key={i} justify="space-between">
                    <Box>
                      <Text fontWeight="medium" fontSize="sm">{g.title}</Text>
                      <Text fontSize="xs" color="gray.500">{g.team}</Text>
                    </Box>
                    <Badge colorScheme="red">{g.progress}%</Badge>
                  </HStack>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardHeader>
          <Heading size="sm">Team Breakdown</Heading>
        </CardHeader>
        <CardBody>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Team</Th>
                <Th isNumeric>Objectives</Th>
                <Th isNumeric>Completed</Th>
                <Th isNumeric>At Risk</Th>
                <Th isNumeric>Avg Progress</Th>
              </Tr>
            </Thead>
            <Tbody>
              {report.teamBreakdown.map((team) => (
                <Tr key={team.teamId}>
                  <Td>
                    <Text fontWeight="medium">{team.teamName}</Text>
                    <Text fontSize="xs" color="gray.500">{team.teamLevel}</Text>
                  </Td>
                  <Td isNumeric>{team.totalGoals}</Td>
                  <Td isNumeric color="green.500">{team.completedGoals}</Td>
                  <Td isNumeric color={team.atRiskGoals > 0 ? 'orange.500' : 'inherit'}>
                    {team.atRiskGoals}
                  </Td>
                  <Td isNumeric>
                    <HStack justify="flex-end">
                      <Progress
                        value={team.avgProgress}
                        size="sm"
                        w="60px"
                        colorScheme={team.avgProgress >= 70 ? 'green' : team.avgProgress >= 40 ? 'yellow' : 'red'}
                      />
                      <Text>{team.avgProgress}%</Text>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </VStack>
  );
}

export default function Reports() {
  return (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Reports</Heading>
      <Text color="gray.600">
        Generate progress reports for quarterly reviews or annual summaries.
        Export to text format for easy copy-paste into PowerPoint.
      </Text>

      <Tabs colorScheme="blue">
        <TabList>
          <Tab>Quarterly Report</Tab>
          <Tab>Annual Report</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <QuarterlyReportView />
          </TabPanel>
          <TabPanel px={0}>
            <AnnualReportView />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}
