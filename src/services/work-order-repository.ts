import type { MaintenanceWorkOrder } from "@/types/diagnostics";

const workOrders: MaintenanceWorkOrder[] = [];

export function listWorkOrders(): MaintenanceWorkOrder[] {
  return [...workOrders];
}

export function createWorkOrder(
  workOrder: MaintenanceWorkOrder,
): MaintenanceWorkOrder {
  workOrders.unshift(workOrder);

  return workOrder;
}

export function updateWorkOrderStatus(
  workOrderId: string,
  status: MaintenanceWorkOrder["status"],
): MaintenanceWorkOrder | null {
  const workOrder = workOrders.find(
    (record) => record.workOrderId === workOrderId,
  );

  if (!workOrder) {
    return null;
  }

  workOrder.status = status;

  if (status === "in-progress" && !workOrder.actualStart) {
    workOrder.actualStart = new Date().toISOString();
  }

  if (status === "completed") {
    workOrder.completedAt = new Date().toISOString();
  }

  return workOrder;
}
