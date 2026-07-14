import { create } from "zustand";

import { PLANT_SEQUENCE_STEPS } from "@/lib/enterprise/plant-sequence-engine";
import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";

import type { PlantSequenceStep } from "@/lib/enterprise/plant-sequence-engine";
import type {
  PlantSequenceEvent,
  PlantSequenceState,
} from "@/types/enterprise-plant";

const MAX_CHILLER_GROUPS = 4;
const SEQUENCE_INTERVAL_UTILIZATION = 0.85;

export type GroupSequenceDirection = "startup" | "shutdown";
export type GroupSequenceStatus = "queued" | "running" | "completed";

export interface CsvSequenceRequest {
  targetChillers: number;
  csvTimestamp: string;
  nextCsvTimestamp: string | null;
  csvIntervalSeconds: number;
  replayIntervalMilliseconds: number;
}

export interface GroupSequenceProgress {
  groupId: string;
  chillerId: string;
  direction: GroupSequenceDirection;
  status: GroupSequenceStatus;
  currentEquipment: string;
  currentAction: string;
  currentStepRemainingSeconds: number;
  elapsedSeconds: number;
  totalSeconds: number;
  csvTimestamp: string;
  nextCsvTimestamp: string | null;
}

interface PlannedSequenceStep extends PlantSequenceStep {
  groupNumber: number;
  direction: GroupSequenceDirection;
  durationSeconds: number;
  csvTimestamp: string;
}

interface PlantSequenceRuntime {
  active: boolean;
  completed: boolean;
  targetChillers: number;
  csvTimestamp: string | null;
  nextCsvTimestamp: string | null;
  csvIntervalSeconds: number;
  replayIntervalMilliseconds: number;
  simulatedSecondsPerRealMillisecond: number;
  plan: PlannedSequenceStep[];
  currentPlanIndex: number;
  currentStepElapsedSeconds: number;
  groupProgress: Record<string, GroupSequenceProgress>;
  events: string[];
  pendingRequest: CsvSequenceRequest | null;

  requestSequence: (request: CsvSequenceRequest) => void;
  tick: (realMilliseconds?: number) => void;
  reset: () => void;
}

const SHUTDOWN_SEQUENCE_STEPS: PlantSequenceStep[] = [
  {
    id: "shutdown-analysis",
    equipment: "Controller",
    action: "Confirming CSV stage-down demand",
    duration: 5,
  },
  {
    id: "shutdown-chiller",
    equipment: "Chiller Compressor",
    action: "Unloading and stopping compressor",
    duration: 30,
  },
  {
    id: "shutdown-starter",
    equipment: "Star Delta Starter",
    action: "Opening motor starter contactors",
    duration: 10,
  },
  {
    id: "shutdown-tower",
    equipment: "Cooling Tower",
    action: "Cooling-tower fan run-on and stop",
    duration: 20,
  },
  {
    id: "shutdown-condenser-pump",
    equipment: "Condenser Pump",
    action: "Condenser-water pump run-on and stop",
    duration: 20,
  },
  {
    id: "shutdown-primary-pump",
    equipment: "Primary CHW Pump",
    action: "Chilled-water pump run-on and stop",
    duration: 20,
  },
  {
    id: "shutdown-transformer",
    equipment: "Transformer",
    action: "Opening LV and incoming breakers",
    duration: 15,
  },
  {
    id: "shutdown-complete",
    equipment: "Controller",
    action: "Confirming group standby",
    duration: 5,
  },
];

function clampChillerCount(value: number): number {
  return Math.min(MAX_CHILLER_GROUPS, Math.max(0, Math.round(value)));
}

function suffix(groupNumber: number): string {
  return String(groupNumber).padStart(2, "0");
}

function groupId(groupNumber: number): string {
  return `GROUP-${suffix(groupNumber)}`;
}

function chillerId(groupNumber: number): string {
  return `CH-${suffix(groupNumber)}`;
}

function equipmentId(prefix: string, groupNumber: number): string {
  return `${prefix}-${suffix(groupNumber)}`;
}

function starterId(groupNumber: number): string {
  return `SD-CH-${suffix(groupNumber)}`;
}

function towerFanIds(groupNumber: number): string[] {
  return [1, 2].map(
    (fanNumber) =>
      `CT-${suffix(groupNumber)}-FAN-${String(fanNumber).padStart(2, "0")}`,
  );
}

function setGroupState(
  groupNumber: number,
  patch: {
    status?: "starting" | "stopping" | "running" | "standby";
    currentStep?: string;
    message?: string;
    required?: boolean;
    selected?: boolean;
    lastCompletedStep?: string;
  },
): void {
  useEnterprisePlantStore.setState((state) => ({
    groups: state.groups.map((group) =>
      group.groupId === groupId(groupNumber)
        ? {
            ...group,
            ...patch,
          }
        : group,
    ),
  }));
}

function sequenceStateForStep(step: PlannedSequenceStep): PlantSequenceState {
  if (step.direction === "shutdown") {
    return "stopping-group";
  }

  const states = {
    load: "calculating-demand",
    transformer: "energizing-transformer",
    "chw-pump": "starting-primary-pump",
    flow: "proving-evaporator-flow",
    "condenser-pump": "starting-condenser-pump",
    tower: "staging-cooling-towers",
    "star-delta": "starting-star-delta",
    chiller: "starting-chiller",
    ahu: "running",
  } as const;

  return states[step.id as keyof typeof states] ?? "running";
}

function eventCategory(
  step: PlannedSequenceStep,
): PlantSequenceEvent["category"] {
  if (step.equipment === "Transformer") return "transformer";
  if (step.equipment.includes("Pump")) return "pump";
  if (step.equipment === "Cooling Tower") return "cooling-tower";
  if (step.equipment === "Star Delta Starter") return "starter";
  if (step.equipment === "Chiller Compressor") return "chiller";

  return "plant";
}

function eventEquipmentId(step: PlannedSequenceStep): string {
  switch (step.equipment) {
    case "Controller":
      return groupId(step.groupNumber);

    case "Transformer":
      return equipmentId("TR", step.groupNumber);

    case "Primary CHW Pump":
      return equipmentId("PCHWP", step.groupNumber);

    case "Flow Sensor":
      return `${equipmentId("PCHWP", step.groupNumber)}-FLOW`;

    case "Condenser Pump":
      return equipmentId("CWP", step.groupNumber);

    case "Cooling Tower":
      return equipmentId("CT", step.groupNumber);

    case "Star Delta Starter":
      return starterId(step.groupNumber);

    case "Chiller Compressor":
      return chillerId(step.groupNumber);

    case "AHU":
      return `AHU-${suffix(step.groupNumber)}`;

    default:
      return `${groupId(step.groupNumber)}-${step.id}`;
  }
}

function appendEvent(
  step: PlannedSequenceStep,
  result: PlantSequenceEvent["result"],
  message: string,
): void {
  const timestamp = new Date().toISOString();

  const sequenceId =
    `CSV-${step.csvTimestamp}-` +
    `${groupId(step.groupNumber)}-${step.direction}`;

  /*
   * This ID is deterministic for one CSV row, group, step and result.
   * Repeated runtime calls therefore cannot append the same event twice.
   */
  const eventId = `${sequenceId}-${step.id}-${result}`;

  const event: PlantSequenceEvent = {
    id: eventId,
    timestamp,
    sequenceId,
    equipmentId: eventEquipmentId(step),
    category: eventCategory(step),
    action: step.action,
    result,
    source: "automatic",
    message:
      `${groupId(step.groupNumber)} · ` +
      `${new Date(step.csvTimestamp).toLocaleTimeString()} · ${message}`,
  };

  useEnterprisePlantStore.setState((state) => {
    const duplicate = state.sequenceEvents.some(
      (existingEvent) => existingEvent.id === eventId,
    );

    if (duplicate) {
      return {
        sequenceEvents: state.sequenceEvents,
      };
    }

    return {
      sequenceEvents: [...state.sequenceEvents, event].slice(-200),
    };
  });
}

function beginStep(step: PlannedSequenceStep): void {
  const mode = step.direction === "startup" ? "startup" : "shutdown";

  setGroupState(step.groupNumber, {
    status: step.direction === "startup" ? "starting" : "stopping",
    currentStep: step.action,
    message: `CSV ${mode}: ${step.action}.`,
    required: step.direction === "startup",
    selected: true,
  });

  useEnterprisePlantStore.setState({
    sequenceState: sequenceStateForStep(step),
    currentSequenceMessage:
      `${groupId(step.groupNumber)} ${mode}: ${step.action} ` +
      `(${step.durationSeconds}s simulated).`,
    failedSequenceStep: null,
  });

  appendEvent(step, "information", `${step.action} started.`);
}

function completeStartupStep(step: PlannedSequenceStep): void {
  const groupNumber = step.groupNumber;

  switch (step.id) {
    case "transformer":
      useEnterprisePlantStore
        .getState()
        .startEquipment(equipmentId("TR", groupNumber));
      break;

    case "chw-pump":
      useEnterprisePlantStore
        .getState()
        .startEquipment(equipmentId("PCHWP", groupNumber));
      useEnterprisePlantStore.setState((state) => ({
        primaryPumps: state.primaryPumps.map((pump) =>
          pump.id === equipmentId("PCHWP", groupNumber)
            ? { ...pump, flowProven: false }
            : pump,
        ),
      }));
      break;

    case "flow":
      useEnterprisePlantStore.setState((state) => ({
        primaryPumps: state.primaryPumps.map((pump) =>
          pump.id === equipmentId("PCHWP", groupNumber)
            ? { ...pump, flowProven: true }
            : pump,
        ),
      }));
      break;

    case "condenser-pump":
      useEnterprisePlantStore
        .getState()
        .startEquipment(equipmentId("CWP", groupNumber));
      break;

    case "tower":
      for (const fanId of towerFanIds(groupNumber)) {
        useEnterprisePlantStore.getState().startEquipment(fanId);
      }
      break;

    case "star-delta":
      useEnterprisePlantStore.getState().startEquipment(starterId(groupNumber));
      break;

    case "chiller":
      setGroupState(groupNumber, {
        status: "running",
        required: true,
        selected: true,
        currentStep: "Chiller running",
        lastCompletedStep: "Delta proven and compressor available",
        message: "CSV startup sequence completed for this group.",
      });
      break;

    case "ahu":
      setGroupState(groupNumber, {
        status: "running",
        required: true,
        selected: true,
        currentStep: "Running",
        lastCompletedStep: "AHU enable command issued",
        message: "CSV startup sequence and AHU enable completed.",
      });
      break;

    default:
      break;
  }
}

function completeShutdownStep(step: PlannedSequenceStep): void {
  const groupNumber = step.groupNumber;

  switch (step.id) {
    case "shutdown-chiller":
      setGroupState(groupNumber, {
        status: "stopping",
        currentStep: "Compressor stopped; hydronic run-on active",
      });
      break;

    case "shutdown-starter":
      useEnterprisePlantStore.getState().stopEquipment(starterId(groupNumber));
      break;

    case "shutdown-tower":
      for (const fanId of towerFanIds(groupNumber)) {
        useEnterprisePlantStore.getState().stopEquipment(fanId);
      }
      break;

    case "shutdown-condenser-pump":
      useEnterprisePlantStore
        .getState()
        .stopEquipment(equipmentId("CWP", groupNumber));
      break;

    case "shutdown-primary-pump":
      useEnterprisePlantStore
        .getState()
        .stopEquipment(equipmentId("PCHWP", groupNumber));
      break;

    case "shutdown-transformer":
      useEnterprisePlantStore
        .getState()
        .stopEquipment(equipmentId("TR", groupNumber));
      break;

    case "shutdown-complete":
      setGroupState(groupNumber, {
        status: "standby",
        required: false,
        selected: false,
        currentStep: "Standby",
        lastCompletedStep: "CSV shutdown sequence completed",
        message: "Available for the next CSV stage-up request.",
      });
      break;

    default:
      break;
  }
}

function completeStep(step: PlannedSequenceStep): void {
  if (step.direction === "startup") {
    completeStartupStep(step);
  } else {
    completeShutdownStep(step);
  }

  appendEvent(step, "success", `${step.action} completed.`);
}

function buildPlan(
  currentChillers: number,
  targetChillers: number,
  csvIntervalSeconds: number,
  csvTimestamp: string,
): PlannedSequenceStep[] {
  const direction: GroupSequenceDirection =
    targetChillers > currentChillers ? "startup" : "shutdown";

  const groupNumbers =
    direction === "startup"
      ? Array.from(
          { length: targetChillers - currentChillers },
          (_, index) => currentChillers + index + 1,
        )
      : Array.from(
          { length: currentChillers - targetChillers },
          (_, index) => currentChillers - index,
        );

  const sourceSteps =
    direction === "startup" ? PLANT_SEQUENCE_STEPS : SHUTDOWN_SEQUENCE_STEPS;
  const baseTotalSeconds =
    groupNumbers.length *
    sourceSteps.reduce((total, step) => total + step.duration, 0);
  const availableSeconds = Math.max(
    1,
    csvIntervalSeconds * SEQUENCE_INTERVAL_UTILIZATION,
  );
  const scale =
    baseTotalSeconds > availableSeconds
      ? availableSeconds / baseTotalSeconds
      : 1;

  return groupNumbers.flatMap((groupNumber) =>
    sourceSteps.map((step) => ({
      ...step,
      groupNumber,
      direction,
      durationSeconds: Math.max(1, Math.round(step.duration * scale)),
      csvTimestamp,
    })),
  );
}

function createProgress(
  plan: PlannedSequenceStep[],
  request: CsvSequenceRequest,
): Record<string, GroupSequenceProgress> {
  const progress: Record<string, GroupSequenceProgress> = {};

  for (const step of plan) {
    const id = groupId(step.groupNumber);

    if (progress[id]) {
      progress[id].totalSeconds += step.durationSeconds;
      continue;
    }

    progress[id] = {
      groupId: id,
      chillerId: chillerId(step.groupNumber),
      direction: step.direction,
      status: "queued",
      currentEquipment: "Controller",
      currentAction: "Queued for CSV sequence",
      currentStepRemainingSeconds: 0,
      elapsedSeconds: 0,
      totalSeconds: step.durationSeconds,
      csvTimestamp: request.csvTimestamp,
      nextCsvTimestamp: request.nextCsvTimestamp,
    };
  }

  return progress;
}

export const usePlantSequenceRuntime = create<PlantSequenceRuntime>(
  (set, get) => ({
    active: false,
    completed: false,
    targetChillers: 0,
    csvTimestamp: null,
    nextCsvTimestamp: null,
    csvIntervalSeconds: 0,
    replayIntervalMilliseconds: 0,
    simulatedSecondsPerRealMillisecond: 0,
    plan: [],
    currentPlanIndex: 0,
    currentStepElapsedSeconds: 0,
    groupProgress: {},
    events: [],
    pendingRequest: null,

    requestSequence: (rawRequest) => {
      const request: CsvSequenceRequest = {
        ...rawRequest,
        targetChillers: clampChillerCount(rawRequest.targetChillers),
        csvIntervalSeconds: Math.max(1, rawRequest.csvIntervalSeconds),
        replayIntervalMilliseconds: Math.max(
          1,
          rawRequest.replayIntervalMilliseconds,
        ),
      };

      if (get().active) {
        set({ pendingRequest: request });
        return;
      }

      const currentChillers = useEnterprisePlantStore
        .getState()
        .groups.filter((group) => group.status === "running").length;
      const plan = buildPlan(
        currentChillers,
        request.targetChillers,
        request.csvIntervalSeconds,
        request.csvTimestamp,
      );
      const timing =
        request.csvIntervalSeconds / request.replayIntervalMilliseconds;

      if (plan.length === 0) {
        useEnterprisePlantStore.setState({
          sequenceState: request.targetChillers > 0 ? "running" : "idle",
          currentSequenceMessage:
            `CSV ${new Date(request.csvTimestamp).toLocaleTimeString()}: ` +
            `target remains ${request.targetChillers}; no staging change required.`,
          lastCompletedStep: "CSV target maintained",
          failedSequenceStep: null,
        });

        set({
          active: false,
          completed: true,
          targetChillers: request.targetChillers,
          csvTimestamp: request.csvTimestamp,
          nextCsvTimestamp: request.nextCsvTimestamp,
          csvIntervalSeconds: request.csvIntervalSeconds,
          replayIntervalMilliseconds: request.replayIntervalMilliseconds,
          simulatedSecondsPerRealMillisecond: timing,
          plan: [],
          currentPlanIndex: 0,
          currentStepElapsedSeconds: 0,
          groupProgress: {},
          pendingRequest: null,
        });
        return;
      }

      const progress = createProgress(plan, request);
      const firstStep = plan[0];
      progress[groupId(firstStep.groupNumber)] = {
        ...progress[groupId(firstStep.groupNumber)],
        status: "running",
        currentEquipment: firstStep.equipment,
        currentAction: firstStep.action,
        currentStepRemainingSeconds: firstStep.durationSeconds,
      };

      beginStep(firstStep);

      set({
        active: true,
        completed: false,
        targetChillers: request.targetChillers,
        csvTimestamp: request.csvTimestamp,
        nextCsvTimestamp: request.nextCsvTimestamp,
        csvIntervalSeconds: request.csvIntervalSeconds,
        replayIntervalMilliseconds: request.replayIntervalMilliseconds,
        simulatedSecondsPerRealMillisecond: timing,
        plan,
        currentPlanIndex: 0,
        currentStepElapsedSeconds: 0,
        groupProgress: progress,
        events: [
          ...get().events,
          `${request.csvTimestamp} | target ${request.targetChillers} | ${plan.length} staged steps`,
        ].slice(-500),
        pendingRequest: null,
      });
    },

    tick: (realMilliseconds = 100) => {
      let requestAfterCompletion: CsvSequenceRequest | null = null;

      set((state) => {
        if (!state.active || state.plan.length === 0) {
          return state;
        }

        let advanceSeconds = Math.max(
          0,
          realMilliseconds * state.simulatedSecondsPerRealMillisecond,
        );
        let currentPlanIndex = state.currentPlanIndex;
        let currentStepElapsedSeconds = state.currentStepElapsedSeconds;
        const groupProgress: Record<string, GroupSequenceProgress> = {};

        for (const [id, progress] of Object.entries(state.groupProgress)) {
          groupProgress[id] = { ...progress };
        }

        const events = [...state.events];

        while (advanceSeconds > 0 && currentPlanIndex < state.plan.length) {
          const step = state.plan[currentPlanIndex];
          const stepRemaining = Math.max(
            0,
            step.durationSeconds - currentStepElapsedSeconds,
          );
          const consumed = Math.min(advanceSeconds, stepRemaining);
          const id = groupId(step.groupNumber);
          const progress = groupProgress[id];

          currentStepElapsedSeconds += consumed;
          advanceSeconds -= consumed;

          if (progress) {
            progress.status = "running";
            progress.currentEquipment = step.equipment;
            progress.currentAction = step.action;
            progress.elapsedSeconds = Math.min(
              progress.totalSeconds,
              progress.elapsedSeconds + consumed,
            );
            progress.currentStepRemainingSeconds = Math.max(
              0,
              Math.ceil(step.durationSeconds - currentStepElapsedSeconds),
            );
          }

          if (currentStepElapsedSeconds + 1e-9 < step.durationSeconds) {
            break;
          }

          completeStep(step);
          events.push(
            `${state.csvTimestamp ?? "CSV"} | ${id} | ${step.action} completed`,
          );
          currentPlanIndex += 1;
          currentStepElapsedSeconds = 0;

          const nextStep = state.plan[currentPlanIndex];

          if (!nextStep || nextStep.groupNumber !== step.groupNumber) {
            if (progress) {
              progress.status = "completed";
              progress.currentStepRemainingSeconds = 0;
              progress.currentAction =
                step.direction === "startup"
                  ? "Group startup completed"
                  : "Group shutdown completed";
            }
          }

          if (nextStep) {
            const nextProgress = groupProgress[groupId(nextStep.groupNumber)];

            if (nextProgress) {
              nextProgress.status = "running";
              nextProgress.currentEquipment = nextStep.equipment;
              nextProgress.currentAction = nextStep.action;
              nextProgress.currentStepRemainingSeconds =
                nextStep.durationSeconds;
            }

            beginStep(nextStep);
          }
        }

        if (currentPlanIndex >= state.plan.length) {
          useEnterprisePlantStore.setState({
            sequenceState: state.targetChillers > 0 ? "running" : "idle",
            currentSequenceMessage:
              `CSV staged transition completed: ${state.targetChillers} ` +
              `chiller group(s) now match ${new Date(
                state.csvTimestamp ?? Date.now(),
              ).toLocaleTimeString()} demand.`,
            lastCompletedStep: "CSV staged transition completed",
            failedSequenceStep: null,
          });

          requestAfterCompletion = state.pendingRequest;

          return {
            ...state,
            active: false,
            completed: true,
            currentPlanIndex,
            currentStepElapsedSeconds: 0,
            groupProgress,
            events: events.slice(-500),
            pendingRequest: null,
          };
        }

        return {
          ...state,
          currentPlanIndex,
          currentStepElapsedSeconds,
          groupProgress,
          events: events.slice(-500),
        };
      });

      if (requestAfterCompletion) {
        get().requestSequence(requestAfterCompletion);
      }
    },

    reset: () => {
      useEnterprisePlantStore.setState({
        sequenceState: "idle",
        currentSequenceMessage:
          "CSV plant sequence reset. Waiting for the next replay snapshot.",
        failedSequenceStep: null,
      });

      set({
        active: false,
        completed: false,
        targetChillers: 0,
        csvTimestamp: null,
        nextCsvTimestamp: null,
        csvIntervalSeconds: 0,
        replayIntervalMilliseconds: 0,
        simulatedSecondsPerRealMillisecond: 0,
        plan: [],
        currentPlanIndex: 0,
        currentStepElapsedSeconds: 0,
        groupProgress: {},
        events: [],
        pendingRequest: null,
      });
    },
  }),
);
