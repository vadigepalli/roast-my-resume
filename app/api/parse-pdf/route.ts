import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // For simplicity, we'll use a basic approach
    // In production, you'd use pdf-parse or similar
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try to dynamically import pdf-parse
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return NextResponse.json({ text: data.text });
    } catch (pdfError) {
      // If pdf-parse fails, return an error
      console.error('PDF parsing error:', pdfError);
      return NextResponse.json(
        { error: 'Could not parse PDF. Please paste your resume text instead.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
