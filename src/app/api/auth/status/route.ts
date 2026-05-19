import { NextResponse } from "next/server";

import { isCredentialAuthConfigured } from "@/lib/auth/config";

export async function GET() {
  return NextResponse.json({
    credentialAuthEnabled: isCredentialAuthConfigured(),
  });
}
