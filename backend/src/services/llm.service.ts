import Anthropic from '@anthropic-ai/sdk';

// LLM Provider abstraction
interface LLMProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

// Anthropic Claude implementation
class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const { maxTokens = 1024, temperature = 0.7, systemPrompt } = options;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt || 'You are a helpful OKR coaching assistant.',
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    throw new Error('Unexpected response type from LLM');
  }
}

// Mock provider for development/testing without API key
class MockProvider implements LLMProvider {
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    // Return mock responses based on prompt content
    if (prompt.includes('improve this goal')) {
      return JSON.stringify({
        improvedTitle: "Achieve industry-leading customer satisfaction in Q1",
        explanation: "Made the goal more specific and inspiring with a clear timeframe.",
        suggestedMeasures: [
          { title: "Increase NPS score to 70+", type: "INCREASE_TO", target: 70, unit: "points" },
          { title: "Achieve CSAT rating of 4.5/5", type: "INCREASE_TO", target: 4.5, unit: "rating" },
          { title: "Reduce average response time to under 4 hours", type: "DECREASE_TO", target: 4, unit: "hours" }
        ],
        suggestedParentId: null
      });
    }

    if (prompt.includes('SMART criteria')) {
      return JSON.stringify({
        score: 7,
        assessment: {
          specific: { score: 8, note: "Clear metric defined" },
          measurable: { score: 9, note: "Quantifiable target" },
          achievable: { score: 6, note: "Target may be ambitious" },
          relevant: { score: 8, note: "Aligns with goal" },
          timeBound: { score: 7, note: "Inherits quarter deadline" }
        },
        suggestions: [
          "Consider adding interim milestones",
          "Add a quality metric alongside quantity"
        ],
        risks: ["Could incentivize short-term gains"]
      });
    }

    if (prompt.includes('suggest parent goals')) {
      return JSON.stringify({
        suggestions: [
          { goalId: "mock-1", relevance: 0.9, explanation: "Strong strategic alignment" },
          { goalId: "mock-2", relevance: 0.7, explanation: "Related business area" }
        ]
      });
    }

    if (prompt.includes('executive summary') || prompt.includes('progress')) {
      return "Progress is on track at 65% completion with 4 weeks remaining. Key wins include strong performance in core metrics. Main risk is timeline pressure on the final deliverable. Recommend focusing resources on critical path items.";
    }

    return "I'm a mock AI assistant. Configure ANTHROPIC_API_KEY for real responses.";
  }
}

// Factory function to get the appropriate provider
function createProvider(): LLMProvider {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider();
  }
  console.warn('ANTHROPIC_API_KEY not set, using mock LLM provider');
  return new MockProvider();
}

// Singleton instance
let provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!provider) {
    provider = createProvider();
  }
  return provider;
}

export { LLMProvider, CompletionOptions };
