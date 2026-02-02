import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { resumeText, roastResult } = await request.json();

    if (!resumeText || !roastResult) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const prompt = `You are an expert resume writer. Rewrite this resume to be significantly stronger, incorporating the feedback provided.

ORIGINAL RESUME:
${resumeText.substring(0, 10000)}

FEEDBACK SUMMARY:
- Overall Score: ${roastResult.overallScore}/100
- Main Issues: ${roastResult.roasts?.slice(0, 3).map((r: any) => r.title).join(', ')}
- Missing Keywords: ${roastResult.missingKeywords?.join(', ')}
- ATS Issues: ${roastResult.atsIssues?.join(', ')}

REWRITE RULES:
1. Keep ALL factual information (names, dates, companies, schools, degrees) exactly as provided
2. DO NOT invent or add any new jobs, skills, or achievements not mentioned
3. Rewrite bullet points to be action-oriented with implied metrics where reasonable
4. Add a compelling professional summary at the top
5. Improve formatting and structure for ATS compatibility
6. Incorporate missing keywords naturally where relevant
7. Use strong action verbs (Led, Architected, Drove, Spearheaded, etc.)

Respond with ONLY valid JSON in this exact format:
{
  "name": "<full name from resume>",
  "title": "<professional title/headline>",
  "contact": {
    "email": "<email if provided>",
    "phone": "<phone if provided>",
    "linkedin": "<linkedin if provided, or null>",
    "location": "<location if provided>"
  },
  "summary": "<2-3 sentence professional summary>",
  "experience": [
    {
      "company": "<company name>",
      "title": "<job title>",
      "dates": "<date range>",
      "bullets": ["<strong bullet 1>", "<strong bullet 2>", "<strong bullet 3>"]
    }
  ],
  "education": [
    {
      "school": "<school name>",
      "degree": "<degree>",
      "year": "<year>"
    }
  ],
  "skills": ["<skill1>", "<skill2>", "<skill3>"]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No response from AI');
    }

    let result;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse:', textContent.text);
      throw new Error('Failed to generate resume');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rebuild resume' },
      { status: 500 }
    );
  }
}
