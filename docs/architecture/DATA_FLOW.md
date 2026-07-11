# Data Flow

## Startup

1. Load system configuration.
2. Load design data and flight schedules.
3. Load the latest persisted state.
4. Hydrate the runtime state.
5. Start the virtual simulation engine.
6. Render the animated dashboard.

## LUMI command

1. Receive natural-language input.
2. Parse intent, target equipment, and requested value.
3. Validate limits and interlocks.
4. Update runtime state immediately.
5. Recalculate dependent HVAC values.
6. Update the user interface.
7. Save the command and resulting snapshot asynchronously.

## Persistence

Google Sheets stores persistent records and periodic snapshots. It is not used
as the second-by-second animation engine.
