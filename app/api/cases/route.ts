import { NextRequest, NextResponse } from 'next/server';
import { getAllCases, searchCases } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const p          = request.nextUrl.searchParams;
    const query      = p.get('q')      || '';
    const status     = p.get('status') || '';
    const limit      = Math.min(parseInt(p.get('limit')  || '60'), 100);
    const offset     = parseInt(p.get('offset') || '0');

    const cases = (query || status)
      ? await searchCases(query, { status: status || undefined })
      : await getAllCases(limit, offset);

    return NextResponse.json({ success: true, data: cases, count: cases.length });
  } catch (error) {
    console.error('GET /api/cases error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stories' }, { status: 500 });
  }
}
