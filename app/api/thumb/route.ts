import { NextResponse } from 'next/server';

export async function GET() {
  // Your logic here (e.g. remove inactive rooms, cleanup DB, etc.)
  console.log('Running thumb API endpoint');

  // Return a NextResponse to indicate success
  return NextResponse.json({ message: 'Thumbnail generation complete' });
}