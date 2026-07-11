import { NextResponse } from "next/server";

import { currentSecuritySession } from "@/lib/security/api-auth";

export async function GET() {
  const session = await currentSecuritySession();

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        session: null,
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    authenticated: true,
    session,
  });
}
