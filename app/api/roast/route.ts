import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { resumeText, targetRole } = await request.json();

    if (!resumeText) {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
    }

    const prompt = `You are a brutally honest resume reviewer with the personality of Gordon Ramsay mixed with a seasoned recruiter. Your job is to "roast" this resume while providing genuinely helpful feedback.

The candidate is targeting: ${targetRole}

RESUME:
${resumeText}

Analyze this resume and respond with a JSON object (no markdown, just pure JSON) in this exact format:
{
  "overallScore": <number 0-100>,
  "verdict": "<one catchy line verdict, like 'This resume needs CPR' or 'Not bad, but not getting callbacks either'>",
  "summary": "<2-3 sentence overall assessment, be direct but constructive>",
  "roasts": [
    {
      "severity": "<critical|major|minor|suggestion>",
      "title": "<short punchy title like 'Vague Impact Statements'>",
      "issue": "<what's wrong, be specific and quote the problematic text if applicable>",
      "fix": "<exactly how to fix it with a concrete example>"
    }
  ],
  "strengths": ["<what's actually good about this resume>"],
  "missingKeywords": ["<keywords this resume should have for the target role but doesn't>"],
  "quantificationOpportunities": ["<specific places where numbers could be added, e.g., 'The project management bullet - add team size, budget, or timeline'>"],
  "atsScore": <number 0-100 for ATS compatibility>,
  "atsIssues": ["<specific ATS problems like 'Tables detected', 'Missing standard sections', etc.>"],
  "rewrittenBullets": [
    {
      "original": "<a weak bullet from the resume>",
      "improved": "<your rewritten version with better action verbs, quantification, and impact>"
    }
  ]
}

Guidelines for roasting:
- Be specific - quote actual text from the resume
- Provide 4-8 roasts covering different issues
- Include 2-4 strengths (find something good to say)
- Rewrite 2-4 of the weakest bullets
- For missingKeywords, suggest 5-8 relevant terms for the target role
- Be harsh but fair - the goal is to help them improve
- Score should reflect reality: <40 needs major work, 40-60 mediocre, 60-80 good, 80+ excellent

Return ONLY valid JSON, no other text.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textContent.text);
      throw new Error('Failed to parse analysis results');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error roasting resume:', error);
    return NextResponse.json(
      { error: 'Failed to analyze resume', details: (error as Error).message },
      { status: 500 }
    );
  }
}
