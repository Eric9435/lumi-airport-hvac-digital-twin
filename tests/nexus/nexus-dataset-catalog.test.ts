import { describe, expect, it } from "vitest";

import {
  loadNexusDatasetCatalog,
  loadNexusDatasetManifest,
} from "../../src/lib/nexus/datasets/nexus-dataset-catalog";

describe("LUMI Nexus dataset catalog", () => {
  it("loads all operational dataset manifest records", () => {
    const records = loadNexusDatasetManifest();

    expect(records).toHaveLength(10);

    expect(records.map((record) => record.filename)).toEqual(
      expect.arrayContaining([
        "yia-power-distribution-24h-10min.csv",
        "yia-emergency-power-24h-10min.csv",
        "yia-energy-utilities-24h-10min.csv",
        "yia-safety-systems-24h-10min.csv",
        "yia-passenger-flow-24h-10min.csv",
        "yia-flight-operations-24h-10min.csv",
        "yia-baggage-operations-24h-10min.csv",
        "yia-airport-environment-24h-10min.csv",
        "yia-building-infrastructure-24h-10min.csv",
        "yia-platform-health-24h-10min.csv",
      ]),
    );
  });

  it("validates the complete synchronized dataset bundle", () => {
    const catalog = loadNexusDatasetCatalog();

    expect(catalog.status).toBe("ready");

    expect(catalog.datasetCount).toBe(10);

    expect(catalog.validDatasetCount).toBe(10);

    expect(catalog.intervalMinutes).toBe(10);

    expect(catalog.snapshotCount).toBe(144);

    expect(catalog.totalRows).toBe(12816);

    expect(catalog.errors).toEqual([]);
  });

  it("confirms every dataset covers the 24-hour replay period", () => {
    const catalog = loadNexusDatasetCatalog();

    for (const dataset of catalog.datasets) {
      expect(dataset.exists).toBe(true);

      expect(dataset.rowCountValid).toBe(true);

      expect(dataset.startTimestampPresent).toBe(true);

      expect(dataset.endTimestampPresent).toBe(true);

      expect(dataset.valid).toBe(true);

      expect(dataset.startTimestamp).toBe("2026-07-15T00:00:00.000Z");

      expect(dataset.endTimestamp).toBe("2026-07-15T23:50:00.000Z");
    }
  });

  it("keeps the current runtime classified as simulated", () => {
    const catalog = loadNexusDatasetCatalog();

    expect(catalog.dataOrigin).toBe("simulated");

    expect(catalog.physicalControlEnabled).toBe(false);
  });
});
