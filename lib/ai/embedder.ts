import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log('=== EMBEDDING START ===')
    console.log('Text length:', text.length)
    console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY)
    console.log('OpenAI API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 7))

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    console.log('Embedding generated successfully, length:', response.data[0].embedding.length)
    return response.data[0].embedding
  } catch (error) {
    console.error('=== EMBEDDING ERROR ===')
    console.error('Error generating embedding:', error)
    console.error('Error type:', typeof error)
    console.error('Error properties:', error && typeof error === 'object' ? Object.keys(error) : 'N/A')

    // Provide specific error messages based on OpenAI error types
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      console.error('OpenAI HTTP Status:', status)
      if (status === 429) {
        throw new Error('OpenAI quota exceeded. Please check your billing and usage limits at https://platform.openai.com/usage')
      } else if (status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key configuration.')
      } else if (status === 400) {
        throw new Error('Invalid request to OpenAI. Please check your text content.')
      }
    }

    throw new Error(`Failed to generate embedding: ${error?.message}. Please check your OpenAI configuration.`)
  }
}

export async function generateAnswer(
  question: string,
  context: string[]
): Promise<{ answer: string; confidence: number; sources: string[] }> {
  try {
    console.log('=== ANSWER GENERATION START ===')
    console.log('Question:', question.substring(0, 100))
    console.log('Context chunks:', context.length)
    console.log('Total context length:', context.join('').length)

    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context.

Rules:
- Only use information from the provided context
- If the context doesn't contain enough information, say "I don't have enough information to answer this question"
- Be concise and helpful
- Always cite your sources when possible
- If you're not confident in your answer, indicate this

Context: ${context.join('\n\n')}`

    console.log('Calling OpenAI chat completion...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.1,
      max_tokens: 500,
    })

    const answer = response.choices[0].message.content || 'I cannot answer this question.'
    console.log('Answer received:', answer.substring(0, 100) + '...')

    const confidence = calculateConfidence(answer, context)
    const sources = extractSources(context)

    console.log('=== ANSWER GENERATION SUCCESS ===')
    console.log('Final confidence:', confidence)
    return { answer, confidence, sources }
  } catch (error) {
    console.error('=== ANSWER GENERATION ERROR ===')
    console.error('Error generating answer:', error)
    console.error('Error type:', typeof error)
    console.error('Error properties:', error && typeof error === 'object' ? Object.keys(error) : 'N/A')

    // Provide specific error messages based on OpenAI error types
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      console.error('OpenAI HTTP Status:', status)
      if (status === 429) {
        throw new Error('OpenAI quota exceeded. Please check your billing and usage limits at https://platform.openai.com/usage')
      } else if (status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key configuration.')
      } else if (status === 400) {
        throw new Error('Invalid request to OpenAI. Please check your question.')
      }
    }

    throw new Error(`Failed to generate answer: ${error?.message}. Please check your OpenAI configuration.`)
  }
}

function calculateConfidence(answer: string, context: string[]): number {
  if (answer.includes("I don't have enough information") || 
      answer.includes("I cannot answer")) {
    return 0.3
  }
  
  const contextLength = context.join('').length
  const answerLength = answer.length
  
  if (contextLength < 100) return 0.4
  if (answerLength < 50) return 0.5
  
  return Math.min(0.9, 0.6 + (contextLength / 10000) * 0.3)
}

function extractSources(context: string[]): string[] {
  return context.map((_, index) => `Source ${index + 1}`)
}
