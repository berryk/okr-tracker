import { getLLMProvider } from './llm.service';
import { extractTextFromPPTX } from './pptx.service';
import { logAIInteraction } from './ai.service';

export interface ExtractedKeyResult {
  title: string;
  measureType: 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';
  targetValue: number;
  unit?: string;
  startValue?: number;
}

export interface ExtractedOKR {
  objective: {
    title: string;
    description?: string;
  };
  keyResults: ExtractedKeyResult[];
  confidence: number;
  sourceSlide?: number;
}

export interface PPTXImportResult {
  extractedOKRs: ExtractedOKR[];
  rawText: string;
  warnings: string[];
}

/**
 * Extract OKRs from a PowerPoint file using LLM
 */
export async function extractOKRsFromPPTX(
  buffer: Buffer,
  userId: string
): Promise<PPTXImportResult> {
  // First extract text from the PowerPoint
  const { fullText } = await extractTextFromPPTX(buffer);

  const llm = getLLMProvider();

  const prompt = `You are an expert OKR analyst. Extract all Objectives and Key Results from the following presentation content.

Presentation content:
---
${fullText}
---

Instructions:
1. Identify clear Objectives (what to achieve) and their associated Key Results (how to measure success)
2. For each Key Result, determine:
   - measureType:
     - INCREASE_TO = grow/increase to a target value
     - DECREASE_TO = reduce/decrease to a target value
     - MAINTAIN = keep at a certain level
     - MILESTONE = binary completion (done/not done)
   - targetValue: a numeric target (use 100 for percentages, 1 for milestones)
   - unit: the unit of measurement if mentioned (%, $, count, users, etc.)
   - startValue: the starting/baseline value if mentioned
3. If a Key Result has no clear target, infer a reasonable one based on context
4. Include a confidence score (0.0-1.0) for each OKR based on how clear the extraction was
5. Include any warnings about ambiguous content

Look for patterns like:
- "Objective: ..." or "Goal: ..." followed by measures
- Bullet points under main items (often key results)
- Numeric targets with units
- Quarterly or annual targets

Respond in JSON format only:
{
  "okrs": [
    {
      "objective": {
        "title": "string - the objective statement",
        "description": "string or null - additional context"
      },
      "keyResults": [
        {
          "title": "string - the key result statement",
          "measureType": "INCREASE_TO|DECREASE_TO|MAINTAIN|MILESTONE",
          "targetValue": number,
          "unit": "string or null",
          "startValue": number or null
        }
      ],
      "confidence": number between 0 and 1,
      "sourceSlide": number or null
    }
  ],
  "warnings": ["string"]
}`;

  const response = await llm.complete(prompt, {
    maxTokens: 4096,
    temperature: 0.3, // Lower temperature for more deterministic extraction
    systemPrompt: 'You are an expert OKR analyst. Extract OKRs accurately and respond with valid JSON only.',
  });

  // Log the AI interaction
  await logAIInteraction(
    userId,
    'REPORT_GENERATION', // Using existing enum value for document processing
    prompt.substring(0, 500) + '...', // Truncate long prompt
    response.substring(0, 1000) + '...'
  );

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.okrs || !Array.isArray(parsed.okrs)) {
      throw new Error('Invalid response structure: missing okrs array');
    }

    if (parsed.okrs.length === 0) {
      return {
        extractedOKRs: [],
        rawText: fullText,
        warnings: ['No OKRs could be identified in the presentation. The content may not contain OKR-structured information.'],
      };
    }

    // Validate and normalize the extracted OKRs
    const extractedOKRs: ExtractedOKR[] = parsed.okrs.map((okr: any) => ({
      objective: {
        title: String(okr.objective?.title || 'Untitled Objective').substring(0, 200),
        description: okr.objective?.description ? String(okr.objective.description) : undefined,
      },
      keyResults: Array.isArray(okr.keyResults)
        ? okr.keyResults.map((kr: any) => ({
            title: String(kr.title || 'Untitled Key Result').substring(0, 200),
            measureType: validateMeasureType(kr.measureType),
            targetValue: typeof kr.targetValue === 'number' ? kr.targetValue : 100,
            unit: kr.unit ? String(kr.unit) : undefined,
            startValue: typeof kr.startValue === 'number' ? kr.startValue : undefined,
          }))
        : [],
      confidence: typeof okr.confidence === 'number' ? Math.min(1, Math.max(0, okr.confidence)) : 0.5,
      sourceSlide: typeof okr.sourceSlide === 'number' ? okr.sourceSlide : undefined,
    }));

    return {
      extractedOKRs,
      rawText: fullText,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch (error) {
    // If parsing fails, return helpful error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      extractedOKRs: [],
      rawText: fullText,
      warnings: [`Failed to extract OKRs: ${errorMessage}. Please try again or import manually.`],
    };
  }
}

function validateMeasureType(type: any): 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE' {
  const validTypes = ['INCREASE_TO', 'DECREASE_TO', 'MAINTAIN', 'MILESTONE'];
  if (typeof type === 'string' && validTypes.includes(type.toUpperCase())) {
    return type.toUpperCase() as 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';
  }
  return 'INCREASE_TO'; // Default
}
