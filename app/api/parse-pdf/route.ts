import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // PDF parsing is now handled client-side
  return NextResponse.json(
    { error: 'PDF parsing has moved to client-side. Please refresh the page.' },
    { status: 400 }
  );
}
