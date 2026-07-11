import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { createWorkOrderFromFinding } from "@/lib/maintenance/work-order-factory";

import {
  createWorkOrder,
  listWorkOrders,
  updateWorkOrderStatus,
} from "@/services/work-order-repository";

import type { DiagnosticFinding } from "@/types/diagnostics";

const statusSchema = z.enum([
  "open",
  "assigned",
  "in-progress",
  "completed",
  "cancelled",
]);

export async function GET() {
  return NextResponse.json({
    success: true,

    workOrders: listWorkOrders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      finding: DiagnosticFinding;
    };

    const workOrder = createWorkOrder(createWorkOrderFromFinding(body.finding));

    return NextResponse.json(
      {
        success: true,
        workOrder,
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
            : "Work-order creation failed.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      workOrderId: string;
      status: string;
    };

    const status = statusSchema.parse(body.status);

    const workOrder = updateWorkOrderStatus(body.workOrderId, status);

    if (!workOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Work order was not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      workOrder,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error ? error.message : "Work-order update failed.",
      },
      {
        status: 400,
      },
    );
  }
}
