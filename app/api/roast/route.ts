import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple in-memory rate limiting (use Redis for production scale)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimit.entries()) {
    if (now > record.resetTime) rateLimit.delete(ip);
  }
}, 60000);

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const { resumeText } = await request.json();

    // Validation
    if (!resumeText || typeof resumeText !== 'string') {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
    }

    const trimmed = resumeText.trim();

    if (trimmed.length < 100) {
      return NextResponse.json({ error: 'Resume is too short. Please provide more content.' }, { status: 400 });
    }

    if (trimmed.length > 15000) {
      return NextResponse.json({ error: 'Resume is too long. Please shorten to under 15,000 characters.' }, { status: 400 });
    }

    // Sanitize - remove potential prompt injection attempts
    const sanitized = trimmed
      .replace(/```/g, '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .substring(0, 15000);

    const prompt = `You are a brutally honest but helpful resume reviewer. Analyze this resume and provide actionable feedback.

RESUME:
${sanitized}

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "overallScore": <number 0-100>,
  "verdict": "<short 3-5 word verdict like 'Needs Serious Work' or 'Strong Foundation'>",
  "summary": "<2-3 sentence overall assessment>",
  "roasts": [
    {
      "severity": "<critical|major|minor|suggestion>",
      "title": "<short title>",
      "issue": "<what's wrong>",
      "fix": "<specific actionable fix>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "missingKeywords": ["<keyword 1>", "<keyword 2>"],
  "atsScore": <number 0-100>,
  "atsIssues": ["<issue 1>", "<issue 2>"],
  "rewrittenBullets": [
    {
      "original": "<weak bullet from resume>",
      "improved": "<stronger version with metrics/impact>"
    }
  ]
}

Rules:
- Be brutally honest but constructive
- Include 4-6 roasts ordered by severity
- Include 2-4 strengths (find something positive)
- Include 3-5 missing keywords relevant to their apparent field
- Rewrite 2-3 of the weakest bullets to show improvement
- ATS score based on formatting, keywords, structure
- Overall score: 0-40 poor, 41-60 needs work, 61-80 good, 81-100 excellent`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    let result;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse response:', textContent.text);
      throw new Error('Failed to parse analysis');
    }

    // Validate response structure
    if (typeof result.overallScore !== 'number' || !result.roasts || !Array.isArray(result.roasts)) {
      throw new Error('Invalid response structure');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
