import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getAdapters } from "@/lib/domain/adapters/registry";
import { detectChangedFields } from "@/lib/domain/ingestion/change-detection";
import { scoreLead } from "@/lib/domain/scoring/engine";
import type { IngestionResult, NormalizedPermitInput } from "@/lib/domain/types";

function canonicalHash(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url").slice(0, 48);
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
        latitude: permit.property.latitude,
        longitude: permit.property.longitude,
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
        latitude: permit.property.latitude,
        longitude: permit.property.longitude,
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
      await prisma.reviewFlag.create({
        data: {
          leadId: lead.id,
          flag: reviewFlag.flag,
          detail: reviewFlag.detail
        }
      });
    }
  }

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      activityType: "updated",
      activityAt: new Date(),
      actor: "system",
      detail: `Permit ${permitRecord.permitNumber ?? permitRecord.id} ingested`
    }
  });
}

export async function ingestSourceByKey(sourceKey: string): Promise<IngestionResult> {
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
        await upsertNormalizedPermit(source.id, permit, rawRecord.id);
        permitsUpserted += 1;
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
      jobType: "daily_source_poll",
      status: errors.length ? "failed" : "succeeded",
      triggerMode: "scheduled",
      startedAt: new Date(),
      finishedAt: new Date(),
      rowsDiscovered: discovered.length,
      rowsFetched: discovered.length,
      rowsParsed: permitsUpserted,
      rowsInserted: permitsUpserted,
      rowsUpdated: 0,
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
