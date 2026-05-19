import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = process.env.APP_PASSWORD ?? 'pulse';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
