import { parseOfficeAsync } from 'officeparser';

export interface PPTXContent {
  fullText: string;
  slideCount: number;
}

/**
 * Extract text content from a PowerPoint (.pptx) file buffer
 */
export async function extractTextFromPPTX(buffer: Buffer): Promise<PPTXContent> {
  try {
    const text = await parseOfficeAsync(buffer, {
      outputErrorToConsole: false,
    });

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in presentation');
    }

    // Estimate slide count by counting common slide separators
    // officeparser returns text with slides separated by newlines
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const slideCount = Math.max(1, Math.ceil(lines.length / 5)); // Rough estimate

    return {
      fullText: text.trim(),
      slideCount,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('No text content')) {
        throw error;
      }
      throw new Error(`Unable to parse PowerPoint file: ${error.message}`);
    }
    throw new Error('Unable to parse PowerPoint file. File may be corrupted.');
  }
}
