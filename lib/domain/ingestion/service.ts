import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getAdapters } from "@/lib/domain/adapters/registry";
import { detectChangedFields } from "@/lib/domain/ingestion/change-detection";
import { normalizeAddress } from "@/lib/domain/normalization/address";
import { normalizeOrganizationName } from "@/lib/domain/normalization/organization";
import { scoreLead } from "@/lib/domain/scoring/engine";
import type { IngestionResult, NormalizedPermitInput } from "@/lib/domain/types";

function canonicalHash(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url").slice(0, 48);
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (character === "\"") {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsvRows(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Paste a header row and at least one permit row.");
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>(
      (row, header, index) => ({
        ...row,
        [header]: values[index] ?? ""
      }),
      { _line: String(rowIndex + 2) }
    );
  });
}

function getRowValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function parseDateValue(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseNumberValue(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/[$,]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.includes("@") ? trimmed : undefined;
}

function manualRowToPermit(
  sourceKey: string,
  row: Record<string, string>
): NormalizedPermitInput {
  const permitNumber = getRowValue(row, ["permit_number", "permit no", "permit", "permit_id"]);
  const address1 = getRowValue(row, ["address", "address1", "site_address", "property_address"]);
  const city = getRowValue(row, ["city"]) ?? "";
  const state = getRowValue(row, ["state"]) ?? "IA";
  const zip = getRowValue(row, ["zip", "zipcode", "postal_code"]);
  const builderName = getRowValue(row, [
    "builder_name",
    "builder",
    "contractor",
    "contractor_name",
    "applicant",
    "owner"
  ]);

  if (!permitNumber && !address1) {
    throw new Error(`Line ${row._line}: include at least a permit_number or address.`);
  }

  const normalizedAddress = address1
    ? normalizeAddress({ address1, city, state, zip })
    : undefined;
  const normalizedKey = `${sourceKey}:manual:${permitNumber ?? normalizedAddress?.normalizedKey ?? `${address1}-${city}`}`.toLowerCase();

  return {
    normalizedKey,
    permitNumber,
    permitType: getRowValue(row, ["permit_type", "type"]),
    workClass: getRowValue(row, ["work_class", "class", "work"]),
    issueDate: parseDateValue(getRowValue(row, ["issue_date", "issued", "date"])),
    applicationDate: parseDateValue(getRowValue(row, ["application_date", "applied"])),
    status: getRowValue(row, ["status"]),
    address1,
    city,
    state,
    zip,
    parcelNumber: getRowValue(row, ["parcel_number", "parcel", "pin"]),
    projectName: getRowValue(row, ["project_name", "project"]),
    projectDescription: getRowValue(row, ["project_description", "description", "scope"]),
    valuation: parseNumberValue(getRowValue(row, ["valuation", "value", "project_value"])),
    permitUrl: getRowValue(row, ["permit_url", "url", "source_url"]),
    sourceConfidence: 62,
    provenance: {
      adapter: sourceKey,
      lineage: "manual_csv_import",
      sourceLine: row._line,
      rawPermitNumber: permitNumber
    },
    property:
      address1 && normalizedAddress
        ? {
            normalizedAddressKey: normalizedAddress.normalizedKey,
            address1,
            city,
            state,
            zip,
            parcelNumber: getRowValue(row, ["parcel_number", "parcel", "pin"]),
            subdivision: getRowValue(row, ["subdivision"]),
            neighborhood: getRowValue(row, ["neighborhood"]),
            dwellingType: getRowValue(row, ["dwelling_type"]),
            assessorUrl: getRowValue(row, ["assessor_url"])
          }
        : undefined,
    organizations: builderName
      ? [
          {
            name: builderName,
            normalizedName: normalizeOrganizationName(builderName),
            type: "builder",
            relationshipType: "builder",
            confidence: 68
          }
        ]
      : [],
    reviewFlags: builderName
      ? [{ flag: "parse_uncertainty", detail: "Imported from manually reviewed CSV." }]
      : [
          { flag: "missing_builder", detail: "No builder/contractor column found in manual import row." },
          { flag: "parse_uncertainty", detail: "Imported from manually reviewed CSV." }
        ]
  };
}

async function upsertNormalizedPermit(
  sourceId: string,
  permit: NormalizedPermitInput,
  rawRecordId?: string
) {
  let propertyId: string | undefined;

  if (permit.property) {
    const property = await prisma.property.upsert({
      where: { normalizedAddressKey: permit.property.normalizedAddressKey },
      update: {
        address1: permit.property.address1,
        city: permit.property.city,
        state: permit.property.state,
        zip: permit.property.zip,
        parcelNumber: permit.property.parcelNumber,
        subdivision: permit.property.subdivision,
        neighborhood: permit.property.neighborhood,
        assessedValue: permit.property.assessedValue,
        landValue: permit.property.landValue,
        improvementValue: permit.property.improvementValue,
        yearBuilt: permit.property.yearBuilt,
        dwellingType: permit.property.dwellingType,
        assessorUrl: permit.property.assessorUrl
      },
      create: {
        normalizedAddressKey: permit.property.normalizedAddressKey,
        address1: permit.property.address1,
        city: permit.property.city,
        state: permit.property.state,
        zip: permit.property.zip,
        parcelNumber: permit.property.parcelNumber,
        subdivision: permit.property.subdivision,
        neighborhood: permit.property.neighborhood,
        assessedValue: permit.property.assessedValue,
        landValue: permit.property.landValue,
        improvementValue: permit.property.improvementValue,
        yearBuilt: permit.property.yearBuilt,
        dwellingType: permit.property.dwellingType,
        assessorUrl: permit.property.assessorUrl
      }
    });
    propertyId = property.id;
  }

  let primaryOrgId: string | undefined;
  if (permit.organizations?.length) {
    for (const orgInput of permit.organizations) {
      const organization = await prisma.organization.upsert({
        where: { normalizedName: orgInput.normalizedName },
        update: {
          name: orgInput.name,
          type: orgInput.type,
          confidence: orgInput.confidence
        },
        create: {
          name: orgInput.name,
          normalizedName: orgInput.normalizedName,
          type: orgInput.type,
          confidence: orgInput.confidence,
          aliasesJson: [orgInput.name]
        }
      });

      if (!primaryOrgId) {
        primaryOrgId = organization.id;
      }

      if (orgInput.contacts?.length) {
        for (const contactInput of orgInput.contacts) {
          const fullName = contactInput.fullName.trim();
          if (!fullName) {
            continue;
          }

          const email = normalizeEmail(contactInput.email);
          const contactData = {
            fullName,
            firstName: contactInput.firstName,
            lastName: contactInput.lastName,
            roleTitle: contactInput.roleTitle,
            email,
            normalizedEmail: email,
            phone: contactInput.phone,
            source: contactInput.source ?? "ingestion",
            sourceUrl: contactInput.sourceUrl,
            provenanceJson: contactInput.provenance as Prisma.InputJsonValue | undefined,
            confidence: contactInput.confidence ?? orgInput.confidence,
            lastVerifiedAt: new Date()
          };

          if (email) {
            await prisma.personContact.upsert({
              where: {
                organizationId_normalizedEmail: {
                  organizationId: organization.id,
                  normalizedEmail: email
                }
              },
              update: contactData,
              create: {
                organizationId: organization.id,
                ...contactData
              }
            });
          } else {
            const existingContact = await prisma.personContact.findFirst({
              where: {
                organizationId: organization.id,
                fullName,
                source: contactData.source
              }
            });

            if (existingContact) {
              await prisma.personContact.update({
                where: { id: existingContact.id },
                data: contactData
              });
            } else {
              await prisma.personContact.create({
                data: {
                  organizationId: organization.id,
                  ...contactData
                }
              });
            }
          }
        }
      }
    }
  }

  const previousPermit = await prisma.permit.findUnique({
    where: { normalizedKey: permit.normalizedKey }
  });

  const permitRecord = await prisma.permit.upsert({
    where: { normalizedKey: permit.normalizedKey },
    update: {
      sourceId,
      permitNumber: permit.permitNumber,
      permitNumberNormalized: permit.permitNumber?.toLowerCase() ?? null,
      permitType: permit.permitType,
      workClass: permit.workClass,
      issueDate: permit.issueDate,
      applicationDate: permit.applicationDate,
      status: permit.status,
      statusNormalized: permit.status?.toLowerCase() ?? null,
      address1: permit.address1,
      address2: permit.address2,
      city: permit.city,
      state: permit.state,
      zip: permit.zip,
      parcelNumber: permit.parcelNumber,
      projectName: permit.projectName,
      projectDescription: permit.projectDescription,
      valuation: permit.valuation,
      permitUrl: permit.permitUrl,
      sourceConfidence: permit.sourceConfidence,
      provenanceJson: permit.provenance as Prisma.InputJsonValue,
      reviewRequired: (permit.sourceConfidence ?? 0) < 60,
      lastSeenAt: new Date(),
      propertyId
    },
    create: {
      normalizedKey: permit.normalizedKey,
      sourceId,
      permitNumber: permit.permitNumber,
      permitNumberNormalized: permit.permitNumber?.toLowerCase() ?? null,
      permitType: permit.permitType,
      workClass: permit.workClass,
      issueDate: permit.issueDate,
      applicationDate: permit.applicationDate,
      status: permit.status,
      statusNormalized: permit.status?.toLowerCase() ?? null,
      address1: permit.address1,
      address2: permit.address2,
      city: permit.city,
      state: permit.state,
      zip: permit.zip,
      parcelNumber: permit.parcelNumber,
      projectName: permit.projectName,
      projectDescription: permit.projectDescription,
      valuation: permit.valuation,
      permitUrl: permit.permitUrl,
      sourceConfidence: permit.sourceConfidence,
      provenanceJson: permit.provenance as Prisma.InputJsonValue,
      reviewRequired: (permit.sourceConfidence ?? 0) < 60,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      propertyId
    }
  });

  const snapshotPayload = {
    permitNumber: permitRecord.permitNumber,
    permitType: permitRecord.permitType,
    workClass: permitRecord.workClass,
    issueDate: permitRecord.issueDate?.toISOString() ?? null,
    applicationDate: permitRecord.applicationDate?.toISOString() ?? null,
    status: permitRecord.status,
    address1: permitRecord.address1,
    city: permitRecord.city,
    state: permitRecord.state,
    zip: permitRecord.zip,
    parcelNumber: permitRecord.parcelNumber,
    projectName: permitRecord.projectName,
    projectDescription: permitRecord.projectDescription,
    valuation: permitRecord.valuation?.toString() ?? null,
    propertyId,
    sourceConfidence: permitRecord.sourceConfidence
  };

  await prisma.permitSnapshot.upsert({
    where: {
      permitId_snapshotHash: {
        permitId: permitRecord.id,
        snapshotHash: canonicalHash(snapshotPayload)
      }
    },
    update: {
      rawRecordId,
      normalizedDataJson: snapshotPayload as Prisma.InputJsonValue,
      confidence: permit.sourceConfidence,
      observedAt: new Date()
    },
    create: {
      permitId: permitRecord.id,
      rawRecordId,
      snapshotHash: canonicalHash(snapshotPayload),
      normalizedDataJson: snapshotPayload as Prisma.InputJsonValue,
      confidence: permit.sourceConfidence,
      observedAt: new Date()
    }
  });

  let changedExistingPermit = false;

  if (previousPermit) {
    const previousComparable = {
      permitNumber: previousPermit.permitNumber,
      permitType: previousPermit.permitType,
      workClass: previousPermit.workClass,
      issueDate: previousPermit.issueDate?.toISOString() ?? null,
      status: previousPermit.status,
      address1: previousPermit.address1,
      parcelNumber: previousPermit.parcelNumber,
      valuation: previousPermit.valuation?.toString() ?? null
    };
    const nextComparable = {
      permitNumber: permitRecord.permitNumber,
      permitType: permitRecord.permitType,
      workClass: permitRecord.workClass,
      issueDate: permitRecord.issueDate?.toISOString() ?? null,
      status: permitRecord.status,
      address1: permitRecord.address1,
      parcelNumber: permitRecord.parcelNumber,
      valuation: permitRecord.valuation?.toString() ?? null
    };
    const diff = detectChangedFields(previousComparable, nextComparable);
    changedExistingPermit = diff.hasChanges;
    if (diff.hasChanges) {
      await prisma.changeLog.create({
        data: {
          entityType: "Permit",
          entityId: permitRecord.id,
          changedFieldsJson: diff.changedFields,
          previousValueJson: previousComparable as Prisma.InputJsonValue,
          newValueJson: nextComparable as Prisma.InputJsonValue,
          changedAt: new Date(),
          actor: "ingestion",
          sourceRawRecordId: rawRecordId
        }
      });
    }
  }

  const builderActivePermitCount = primaryOrgId
    ? await prisma.leadOrganizationLink.count({
        where: {
          organizationId: primaryOrgId,
          relationshipType: "builder"
        }
      })
    : 0;

  const neighborhoodActivityCount =
    permit.property?.subdivision || permit.property?.neighborhood
      ? await prisma.property.count({
          where: {
            OR: [
              { subdivision: permit.property?.subdivision ?? undefined },
              { neighborhood: permit.property?.neighborhood ?? undefined }
            ]
          }
        })
      : 0;

  const scored = scoreLead({
    permit: permitRecord,
    builderActivePermitCount,
    neighborhoodActivityCount
  });

  const lead = await prisma.lead.upsert({
    where: { permitId: permitRecord.id },
    update: {
      propertyId,
      primaryOrgId,
      leadType: scored.leadType,
      insulationFitScore: scored.insulationFitScore,
      revenuePotentialScore: scored.revenuePotentialScore,
      relationshipScore: scored.relationshipScore,
      freshnessScore: scored.freshnessScore,
      overallScore: scored.overallScore,
      recommendedAction: scored.recommendedAction,
      lastActivityAt: new Date(),
      confidence: permit.sourceConfidence,
      scoreExplanationJson: scored.reasons
    },
    create: {
      permitId: permitRecord.id,
      propertyId,
      primaryOrgId,
      leadType: scored.leadType,
      insulationFitScore: scored.insulationFitScore,
      revenuePotentialScore: scored.revenuePotentialScore,
      relationshipScore: scored.relationshipScore,
      freshnessScore: scored.freshnessScore,
      overallScore: scored.overallScore,
      recommendedAction: scored.recommendedAction,
      firstSeenAt: new Date(),
      lastActivityAt: new Date(),
      confidence: permit.sourceConfidence,
      scoreExplanationJson: scored.reasons
    }
  });

  if (permit.organizations?.length) {
    for (const orgInput of permit.organizations) {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { normalizedName: orgInput.normalizedName }
      });
      await prisma.leadOrganizationLink.upsert({
        where: {
          leadId_organizationId_relationshipType: {
            leadId: lead.id,
            organizationId: org.id,
            relationshipType: orgInput.relationshipType
          }
        },
        update: {
          confidence: orgInput.confidence
        },
        create: {
          leadId: lead.id,
          organizationId: org.id,
          relationshipType: orgInput.relationshipType,
          confidence: orgInput.confidence
        }
      });
    }
  }

  if (permit.reviewFlags?.length) {
    for (const reviewFlag of permit.reviewFlags) {
      const existingFlag = await prisma.reviewFlag.findFirst({
        where: {
          leadId: lead.id,
          flag: reviewFlag.flag,
          detail: reviewFlag.detail,
          resolvedAt: null
        }
      });

      if (!existingFlag) {
        await prisma.reviewFlag.create({
          data: {
            leadId: lead.id,
            flag: reviewFlag.flag,
            detail: reviewFlag.detail
          }
        });
      }
    }
  }

  if (!previousPermit || changedExistingPermit) {
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: "updated",
        activityAt: new Date(),
        actor: "system",
        detail: previousPermit
          ? `Permit ${permitRecord.permitNumber ?? permitRecord.id} updated from source.`
          : `Permit ${permitRecord.permitNumber ?? permitRecord.id} ingested.`
      }
    });
  }

  return {
    created: !previousPermit,
    updated: Boolean(previousPermit && changedExistingPermit),
    unchanged: Boolean(previousPermit && !changedExistingPermit)
  };
}

function jobTypeForFrequency(crawlFrequencyMinutes?: number | null) {
  if (!crawlFrequencyMinutes) {
    return "source_poll";
  }

  if (crawlFrequencyMinutes >= 60 * 24 * 28) {
    return "monthly_source_poll";
  }

  if (crawlFrequencyMinutes >= 60 * 24 * 7) {
    return "weekly_source_poll";
  }

  return "daily_source_poll";
}

export async function ingestSourceByKey(
  sourceKey: string,
  options?: {
    triggerMode?: "scheduled" | "manual";
  }
): Promise<IngestionResult> {
  const adapter = getAdapters().find((candidate) => candidate.definition.key === sourceKey);
  if (!adapter) {
    throw new Error(`Unknown adapter: ${sourceKey}`);
  }

  const source = await prisma.source.findFirstOrThrow({
    where: { adapterKey: sourceKey }
  });

  const discovered = await adapter.fetchIndex();
  const errors: string[] = [];
  let rawRecordsWritten = 0;
  let permitsUpserted = 0;
  let permitsInserted = 0;
  let permitsUpdated = 0;
  let leadsUpserted = 0;

  await prisma.source.update({
    where: { id: source.id },
    data: { lastRunAt: new Date() }
  });

  for (const record of discovered) {
    try {
      const detail = adapter.fetchDetail
        ? await adapter.fetchDetail(record)
        : {
            payload: record.metadata ?? {},
            rawText: JSON.stringify(record.metadata ?? {}),
            sourceUrl: record.indexUrl
          };

      const rawRecord = await prisma.rawRecord.upsert({
        where: {
          sourceId_sourceRecordKey_canonicalHash: {
            sourceId: source.id,
            sourceRecordKey: record.sourceRecordKey,
            canonicalHash: canonicalHash(detail.payload)
          }
        },
        update: {
          fetchedAt: new Date(),
          sourceUpdatedAt: new Date(),
          rawPayloadJson: detail.payload as Prisma.InputJsonValue,
          rawText: detail.rawText,
          sourceUrl: detail.sourceUrl,
          lastSeenAt: new Date(),
          parseStatus: "parsed"
        },
        create: {
          sourceId: source.id,
          sourceRecordKey: record.sourceRecordKey,
          fetchedAt: new Date(),
          sourceUpdatedAt: new Date(),
          rawPayloadJson: detail.payload as Prisma.InputJsonValue,
          rawText: detail.rawText,
          canonicalHash: canonicalHash(detail.payload),
          parseStatus: "parsed",
          sourceUrl: detail.sourceUrl,
          firstSeenAt: new Date(),
          lastSeenAt: new Date()
        }
      });
      rawRecordsWritten += 1;

      const permits = await adapter.parse(detail, record);
      for (const permit of permits) {
        const upsertResult = await upsertNormalizedPermit(source.id, permit, rawRecord.id);
        permitsUpserted += 1;
        permitsInserted += upsertResult.created ? 1 : 0;
        permitsUpdated += upsertResult.updated ? 1 : 0;
        leadsUpserted += 1;
      }
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `Unknown ingest error for ${record.sourceRecordKey}`
      );
    }
  }

  await prisma.source.update({
    where: { id: source.id },
    data: {
      lastSuccessAt: errors.length ? source.lastSuccessAt : new Date(),
      lastFailureAt: errors.length ? new Date() : source.lastFailureAt,
      consecutiveFailures: errors.length ? { increment: 1 } : 0,
      healthStatus: errors.length ? "degraded" : "healthy"
    }
  });

  await prisma.syncJobRun.create({
    data: {
      sourceId: source.id,
      jobKey: `${sourceKey}:${new Date().toISOString()}`,
      jobType: jobTypeForFrequency(source.crawlFrequencyMinutes),
      status: errors.length ? "failed" : "succeeded",
      triggerMode: options?.triggerMode ?? "scheduled",
      startedAt: new Date(),
      finishedAt: new Date(),
      rowsDiscovered: discovered.length,
      rowsFetched: discovered.length,
      rowsParsed: permitsUpserted,
      rowsInserted: permitsInserted,
      rowsUpdated: permitsUpdated,
      errorMessage: errors.join("\n") || null,
      metadataJson: {
        adapter: sourceKey
      }
    }
  });

  return {
    sourceId: source.id,
    discovered: discovered.length,
    rawRecordsWritten,
    permitsUpserted,
    leadsUpserted,
    errors
  };
}

export async function runDueAutomatedSources(now: Date = new Date()) {
  const adapters = getAdapters().filter((adapter) => adapter.definition.automationMode === "automated");
  const results: Array<{
    sourceKey: string;
    ran: boolean;
    reason?: string;
    result?: IngestionResult;
  }> = [];

  for (const adapter of adapters) {
    const source = await prisma.source.findUnique({
      where: { adapterKey: adapter.definition.key }
    });

    if (!source || !source.enabled || !source.supportsAutomation) {
      results.push({
        sourceKey: adapter.definition.key,
        ran: false,
        reason: "Source is missing or disabled."
      });
      continue;
    }

    const frequency = source.crawlFrequencyMinutes ?? adapter.definition.crawlFrequencyMinutes ?? 60 * 24;
    const lastRunAt = source.lastRunAt;
    const dueAt = lastRunAt ? new Date(lastRunAt.getTime() + frequency * 60 * 1000) : null;

    if (dueAt && dueAt > now) {
      results.push({
        sourceKey: adapter.definition.key,
        ran: false,
        reason: `Next run is due at ${dueAt.toISOString()}.`
      });
      continue;
    }

    results.push({
      sourceKey: adapter.definition.key,
      ran: true,
      result: await ingestSourceByKey(adapter.definition.key, { triggerMode: "scheduled" })
    });
  }

  return results;
}

export async function ingestManualCsvImport(input: {
  sourceId: string;
  csv: string;
  actor?: string;
}): Promise<IngestionResult> {
  const source = await prisma.source.findUniqueOrThrow({
    where: { id: input.sourceId }
  });

  const rows = parseCsvRows(input.csv);
  const errors: string[] = [];
  let rawRecordsWritten = 0;
  let permitsUpserted = 0;
  let permitsInserted = 0;
  let permitsUpdated = 0;
  let leadsUpserted = 0;

  await prisma.source.update({
    where: { id: source.id },
    data: { lastRunAt: new Date() }
  });

  for (const row of rows) {
    try {
      const permit = manualRowToPermit(source.adapterKey, row);
      const sourceRecordKey =
        permit.permitNumber ?? `${permit.address1 ?? "manual"}:${row._line}`;
      const payload = { ...row, importMode: "manual_csv" };

      const rawRecord = await prisma.rawRecord.upsert({
        where: {
          sourceId_sourceRecordKey_canonicalHash: {
            sourceId: source.id,
            sourceRecordKey,
            canonicalHash: canonicalHash(payload)
          }
        },
        update: {
          fetchedAt: new Date(),
          sourceUpdatedAt: new Date(),
          rawPayloadJson: payload as Prisma.InputJsonValue,
          rawText: JSON.stringify(row),
          sourceUrl: permit.permitUrl,
          lastSeenAt: new Date(),
          parseStatus: "parsed",
          confidence: permit.sourceConfidence
        },
        create: {
          sourceId: source.id,
          sourceRecordKey,
          fetchedAt: new Date(),
          sourceUpdatedAt: new Date(),
          rawPayloadJson: payload as Prisma.InputJsonValue,
          rawText: JSON.stringify(row),
          canonicalHash: canonicalHash(payload),
          parseStatus: "parsed",
          sourceUrl: permit.permitUrl,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          confidence: permit.sourceConfidence,
          lineageJson: {
            importMode: "manual_csv",
            actor: input.actor ?? "web"
          }
        }
      });

      rawRecordsWritten += 1;
      const upsertResult = await upsertNormalizedPermit(source.id, permit, rawRecord.id);
      permitsUpserted += 1;
      permitsInserted += upsertResult.created ? 1 : 0;
      permitsUpdated += upsertResult.updated ? 1 : 0;
      leadsUpserted += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Line ${row._line}: unknown import error.`);
    }
  }

  await prisma.source.update({
    where: { id: source.id },
    data: {
      lastSuccessAt: errors.length === rows.length ? source.lastSuccessAt : new Date(),
      lastFailureAt: errors.length ? new Date() : source.lastFailureAt,
      consecutiveFailures: errors.length ? { increment: 1 } : 0
    }
  });

  await prisma.syncJobRun.create({
    data: {
      sourceId: source.id,
      jobKey: `manual-csv:${source.adapterKey}:${new Date().toISOString()}`,
      jobType: "manual_csv_import",
      status: errors.length === rows.length ? "failed" : "succeeded",
      triggerMode: "manual",
      startedAt: new Date(),
      finishedAt: new Date(),
      rowsDiscovered: rows.length,
      rowsFetched: rawRecordsWritten,
      rowsParsed: permitsUpserted,
      rowsInserted: permitsInserted,
      rowsUpdated: permitsUpdated,
      errorMessage: errors.join("\n") || null,
      metadataJson: {
        adapter: source.adapterKey,
        importMode: "manual_csv",
        actor: input.actor ?? "web"
      }
    }
  });

  return {
    sourceId: source.id,
    discovered: rows.length,
    rawRecordsWritten,
    permitsUpserted,
    leadsUpserted,
    errors
  };
}
