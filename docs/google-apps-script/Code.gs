const SPREADSHEET_ID =
  PropertiesService
    .getScriptProperties()
    .getProperty("SPREADSHEET_ID");

const API_KEY =
  PropertiesService
    .getScriptProperties()
    .getProperty("API_KEY");

const SHEETS = {
  flights: "Flight_Schedule",
  state: "System_State",
  commands: "Control_Commands",
  snapshots: "State_Snapshots",
};

function doPost(e) {
  try {
    const request = JSON.parse(
      e.postData.contents,
    );

    validateApiKey(request.apiKey);

    let data;

    switch (request.action) {
      case "getTodayFlights":
        data = getTodayFlights(
          request.payload,
        );
        break;

      case "savePlantSnapshot":
        data = savePlantSnapshot(
          request.payload,
        );
        break;

      case "saveCommandLog":
        data = saveCommandLog(
          request.payload,
        );
        break;

      default:
        throw new Error(
          "Unsupported action: " +
            request.action,
        );
    }

    return jsonResponse({
      success: true,
      requestId: request.requestId,
      timestamp:
        new Date().toISOString(),
      data,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      timestamp:
        new Date().toISOString(),
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}

function validateApiKey(apiKey) {
  if (!API_KEY) {
    return;
  }

  if (apiKey !== API_KEY) {
    throw new Error("Unauthorized request.");
  }
}

function spreadsheet() {
  if (!SPREADSHEET_ID) {
    throw new Error(
      "SPREADSHEET_ID is not configured.",
    );
  }

  return SpreadsheetApp.openById(
    SPREADSHEET_ID,
  );
}

function getOrCreateSheet(
  name,
  headers,
) {
  const file = spreadsheet();

  let sheet =
    file.getSheetByName(name);

  if (!sheet) {
    sheet = file.insertSheet(name);
  }

  if (
    sheet.getLastRow() === 0 &&
    headers.length > 0
  ) {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getTodayFlights(payload) {
  const date =
    payload && payload.date
      ? payload.date
      : Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          "yyyy-MM-dd",
        );

  const sheet = getOrCreateSheet(
    SHEETS.flights,
    flightHeaders(),
  );

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      flightHeaders().length,
    )
    .getValues();

  return rows
    .map(rowToFlight)
    .filter(
      flight =>
        flight.date === date,
    );
}

function savePlantSnapshot(payload) {
  const headers = [
    "Snapshot ID",
    "Timestamp",
    "Source",
    "State JSON",
  ];

  const sheet = getOrCreateSheet(
    SHEETS.snapshots,
    headers,
  );

  sheet.appendRow([
    payload.snapshotId,
    payload.timestamp,
    payload.source,
    JSON.stringify(payload.state),
  ]);

  return {
    snapshotId:
      payload.snapshotId,
    saved: true,
  };
}

function saveCommandLog(payload) {
  const headers = [
    "Command ID",
    "Requested At",
    "Requested By",
    "Command Source",
    "Raw Command",
    "Action",
    "Equipment ID",
    "Parameter",
    "Old Value",
    "Requested Value",
    "Unit",
    "Reason",
    "Approval Required",
    "Approval Status",
    "Execution Status",
    "Result Message",
    "Executed At",
  ];

  const sheet = getOrCreateSheet(
    SHEETS.commands,
    headers,
  );

  sheet.appendRow([
    payload.commandId,
    payload.requestedAt,
    payload.requestedBy,
    payload.commandSource,
    payload.rawCommand,
    payload.action,
    payload.equipmentId,
    payload.parameter,
    payload.oldValue,
    payload.requestedValue,
    payload.unit,
    payload.reason,
    payload.approvalRequired,
    payload.approvalStatus,
    payload.executionStatus,
    payload.resultMessage,
    payload.executedAt,
  ]);

  return {
    commandId:
      payload.commandId,
    saved: true,
  };
}

function flightHeaders() {
  return [
    "Flight ID",
    "Date",
    "Flight Number",
    "Airline",
    "Movement Type",
    "Scheduled Time",
    "Estimated Time",
    "Actual Time",
    "Terminal",
    "Gate",
    "Aircraft Type",
    "Expected Passengers",
    "Actual Passengers",
    "Status",
    "Linked Zone IDs",
    "Remarks",
  ];
}

function rowToFlight(row) {
  return {
    flightId: String(row[0] || ""),
    date: formatSheetDate(row[1]),
    flightNumber:
      String(row[2] || ""),
    airline:
      String(row[3] || ""),
    movementType:
      String(row[4] || "")
        .toLowerCase(),
    scheduledTime:
      formatSheetTime(row[5]),
    estimatedTime:
      row[6]
        ? formatSheetTime(row[6])
        : null,
    actualTime:
      row[7]
        ? formatSheetTime(row[7])
        : null,
    terminal:
      String(row[8] || ""),
    gate:
      String(row[9] || ""),
    aircraftType:
      String(row[10] || ""),
    expectedPassengers:
      Number(row[11] || 0),
    actualPassengers:
      row[12] === "" ||
      row[12] == null
        ? null
        : Number(row[12]),
    status:
      String(row[13] || "scheduled")
        .toLowerCase(),
    linkedZoneIds:
      String(row[14] || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean),
    remarks:
      String(row[15] || ""),
  };
}

function formatSheetDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
  }

  return String(value || "");
}

function formatSheetTime(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "HH:mm",
    );
  }

  return String(value || "");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(
      JSON.stringify(payload),
    )
    .setMimeType(
      ContentService.MimeType.JSON,
    );
}
