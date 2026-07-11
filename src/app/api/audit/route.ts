import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import {
  appendAuditRecord,
  listAuditRecords,
} from "@/services/audit-repository";

import type { AuditRecord } from "@/types/operations";

export async function GET() {
  return NextResponse.json({
    success: true,
    records: listAuditRecords(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AuditRecord>;

    const record: AuditRecord = {
      auditId: body.auditId ?? randomUUID(),

      timestamp: body.timestamp ?? new Date().toISOString(),

      actor: body.actor ?? "Operator",

      source: body.source ?? "dashboard",

      action: body.action ?? "UNKNOWN_ACTION",

      module: body.module ?? "Unknown",

      recordId: body.recordId ?? null,

      oldValue: body.oldValue ?? null,

      newValue: body.newValue ?? null,

      result: body.result ?? "success",

      details: body.details ?? "",
    };

    appendAuditRecord(record);

    return NextResponse.json(
      {
        success: true,
        record,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Audit record creation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
