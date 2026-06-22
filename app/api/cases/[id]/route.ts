import { NextRequest, NextResponse } from 'next/server';
import { getCaseById, getCaseUpdates, addCaseUpdate } from '@/lib/db';

// Next 14: params is a plain object. Next 15: params is a Promise.
type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const id = params.id;
    const caseData = await getCaseById(id);

    if (!caseData) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
    }

    const updates = await getCaseUpdates(id);
    return NextResponse.json({ success: true, data: { ...caseData, updates } });
  } catch (error) {
    console.error('GET /api/cases/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch story' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const id = params.id;
    const { updateText, sourceUrl, updateDate } = await request.json();

    if (!updateText) {
      return NextResponse.json({ success: false, error: 'updateText is required' }, { status: 400 });
    }

    const update = await addCaseUpdate(id, {
      updateText,
      sourceUrl,
      updateDate: updateDate ? new Date(updateDate) : new Date(),
    });

    return NextResponse.json({ success: true, data: update });
  } catch (error) {
    console.error('POST /api/cases/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add update' }, { status: 500 });
  }
}
