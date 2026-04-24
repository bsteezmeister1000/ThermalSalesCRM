import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { SourceAdapter } from "@/lib/domain/adapters/base";
import { getAdapters } from "@/lib/domain/adapters/registry";
import { detectChangedFields } from "@/lib/domain/ingestion/change-detection";
import { scoreLead } from "@/lib/domain/scoring/engine";
import type {
  CompletenessStats,
  ConnectorSyncResult,
  IngestionResult,
  NormalizedOrganizationInput,
  NormalizedPermitInput,
  RawSourceRecord
} from "@/lib/domain/types";
import { updateSourceSyncStatus } from "@/lib/repositories/source-repository";

function canonicalHash(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url").slice(0, 48);
}

function normalizeDomain(value?: string) {
  if (!value) return undefined;
  try {
    const url = value.startsWith("http") ? value : `https://${value}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function now() {
  return new Date();
}

function freshnessFromSync(timestamp?: Date | null) {
  if (!timestamp) return "unknown" as const;
  const ageHours = (Date.now() - timestamp.getTime()) / 36e5;
  if (ageHours <= 48) return "fresh" as const;
  if (ageHours <= 24 * 14) return "aging" as const;
  return "stale" as const;
}

async function recordDiagnosticIssue(input: {
  sourceId?: string;
  permitId?: string;
  organizationId?: string;
  issueType:
    | "source_drift"
    | "builder_duplicate"
    | "missing_builder_contact"
    | "transformation_mismatch"
    | "abnormal_row_drop"
    | "parse_quality_drop"
    | "stale_source"
    | "inactive_source"
    | "mock_source"
    | "duplicate_risk"
    | "incomplete_record"
    | "suspicious_zero_results";
  severity?: "info" | "warning" | "critical";
  title: string;
  detail?: string;
  metricsJson?: Record<string, unknown>;
}) {
  return prisma.dataQualityIssue.create({
    data: {
      sourceId: input.sourceId,
      permitId: input.permitId,
      organizationId: input.organizationId,
      issueType: input.issueType,
      severity: input.severity ?? "warning",
      title: input.title,
      detail: input.detail,
      metricsJson: input.metricsJson as Prisma.InputJsonValue | undefined
    }
  });
}

async function clearOpenSourceDiagnostics(sourceId: string) {
  await prisma.dataQualityIssue.updateMany({
    where: {
      sourceId,
      status: "open",
      issueType: {
        in: [
          "source_drift",
          "abnormal_row_drop",
          "parse_quality_drop",
          "stale_source",
          "inactive_source",
          "mock_source",
          "duplicate_risk",
          "suspicious_zero_results",
          "transformation_mismatch"
        ]
      }
    },
    data: {
      status: "resolved",
      resolvedAt: now()
    }
  });
}

async function upsertRawRecord(sourceId: string, record: RawSourceRecord) {
  return prisma.rawRecord.upsert({
    where: {
      sourceId_sourceRecordKey_canonicalHash: {
        sourceId,
        sourceRecordKey: record.sourceRecordKey,
        canonicalHash: canonicalHash(record.payload)
      }
    },
    update: {
      fetchedAt: now(),
      sourceUpdatedAt: record.sourceUpdatedAt ?? now(),
      rawPayloadJson: record.payload as Prisma.InputJsonValue,
      rawText: record.rawText,
      sourceUrl: record.sourceUrl,
      contentType: record.contentType,
      dataOrigin: record.dataOrigin ?? "live",
      lastSeenAt: now()
    },
    create: {
      sourceId,
      sourceRecordKey: record.sourceRecordKey,
      fetchedAt: now(),
      sourceUpdatedAt: record.sourceUpdatedAt ?? now(),
      rawPayloadJson: record.payload as Prisma.InputJsonValue,
      rawText: record.rawText,
      canonicalHash: canonicalHash(record.payload),
      parseStatus: "parsed",
      sourceUrl: record.sourceUrl,
      contentType: record.contentType,
      dataOrigin: record.dataOrigin ?? "live",
      firstSeenAt: now(),
      lastSeenAt: now()
    }
  });
}

async function upsertOrganization(input: {
  normalizedName: string;
  name: string;
  type: Prisma.OrganizationCreateInput["type"];
  confidence: number;
  website?: string;
  phone?: string;
  email?: string;
  aliases?: string[];
}) {
  return prisma.organization.upsert({
    where: { normalizedName: input.normalizedName },
    update: {
      name: input.name,
      type: input.type,
      confidence: Math.max(input.confidence, 40),
      website: input.website ?? undefined,
      normalizedDomain: normalizeDomain(input.website),
      phone: input.phone ?? undefined,
      email: input.email ?? undefined,
      aliasesJson: input.aliases?.length ? Array.from(new Set(input.aliases)) : undefined,
      lastSeenAt: now()
    },
    create: {
      name: input.name,
      normalizedName: input.normalizedName,
      type: input.type,
      confidence: Math.max(input.confidence, 40),
      website: input.website,
      normalizedDomain: normalizeDomain(input.website),
      phone: input.phone,
      email: input.email,
      aliasesJson: input.aliases?.length ? Array.from(new Set(input.aliases)) : [input.name],
      lastSeenAt: now()
    }
  });
}

async function upsertOrganizationDirectoryRecord(
  sourceId: string,
  organizationId: string,
  input: NormalizedOrganizationInput
) {
  return prisma.organizationSourceRecord.upsert({
    where: {
      sourceId_sourceRecordKey_canonicalHash: {
        sourceId,
        sourceRecordKey: input.sourceRecordKey,
        canonicalHash: canonicalHash({
          rawCompanyName: input.rawCompanyName,
          street: input.street,
          city: input.city,
          state: input.state,
          zip: input.zip,
          phone: input.phone,
          email: input.email,
          website: input.website
        })
      }
    },
    update: {
      organizationId,
      rawCompanyName: input.rawCompanyName,
      normalizedCompanyName: input.normalizedCompanyName,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      website: input.website,
      street: input.street,
      city: input.city,
      state: input.state,
      zip: input.zip,
      serviceArea: input.serviceArea,
      sourceUrl: input.sourceUrl,
      sourceConfidence: input.sourceConfidence,
      ingestionMethod: input.ingestionMethod,
      dataOrigin: input.dataOrigin ?? "live",
      rawPayloadJson: input.provenance as Prisma.InputJsonValue,
      completenessJson: {
        hasPhone: Boolean(input.phone),
        hasEmail: Boolean(input.email),
        hasWebsite: Boolean(input.website),
        hasAddress: Boolean(input.street && input.city)
      } as Prisma.InputJsonValue,
      lastSeenAt: now()
    },
    create: {
      sourceId,
      organizationId,
      sourceRecordKey: input.sourceRecordKey,
      canonicalHash: canonicalHash({
        rawCompanyName: input.rawCompanyName,
        street: input.street,
        city: input.city,
        state: input.state,
        zip: input.zip,
        phone: input.phone,
        email: input.email,
        website: input.website
      }),
      rawCompanyName: input.rawCompanyName,
      normalizedCompanyName: input.normalizedCompanyName,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      website: input.website,
      street: input.street,
      city: input.city,
      state: input.state,
      zip: input.zip,
      serviceArea: input.serviceArea,
      sourceUrl: input.sourceUrl,
      sourceConfidence: input.sourceConfidence,
      ingestionMethod: input.ingestionMethod,
      dataOrigin: input.dataOrigin ?? "live",
      rawPayloadJson: input.provenance as Prisma.InputJsonValue,
      completenessJson: {
        hasPhone: Boolean(input.phone),
        hasEmail: Boolean(input.email),
        hasWebsite: Boolean(input.website),
        hasAddress: Boolean(input.street && input.city)
      } as Prisma.InputJsonValue,
      firstSeenAt: now(),
      lastSeenAt: now()
    }
  });
}

async function upsertOrganizationContactMethods(organizationId: string, input: NormalizedOrganizationInput) {
  for (const contactMethod of input.contactMethods ?? []) {
    await prisma.organizationContactMethod.upsert({
      where: {
        organizationId_type_value: {
          organizationId,
          type: contactMethod.type,
          value: contactMethod.value
        }
      },
      update: {
        normalizedValue: contactMethod.normalizedValue,
        verificationStatus: contactMethod.verificationStatus,
        confidence: contactMethod.confidence,
        source: contactMethod.source,
        sourceUrl: contactMethod.sourceUrl,
        dataOrigin: input.dataOrigin ?? "live",
        provenanceJson: input.provenance as Prisma.InputJsonValue,
        lastVerifiedAt: now()
      },
      create: {
        organizationId,
        type: contactMethod.type,
        value: contactMethod.value,
        normalizedValue: contactMethod.normalizedValue,
        verificationStatus: contactMethod.verificationStatus,
        confidence: contactMethod.confidence,
        source: contactMethod.source,
        sourceUrl: contactMethod.sourceUrl,
        dataOrigin: input.dataOrigin ?? "live",
        provenanceJson: input.provenance as Prisma.InputJsonValue,
        isPrimary: contactMethod.type === "website",
        lastVerifiedAt: now()
      }
    });
  }

  if (input.contactName) {
    await prisma.personContact.upsert({
      where: {
        organizationId_normalizedEmail: {
          organizationId,
          normalizedEmail: input.email?.toLowerCase() ?? `${organizationId}:${input.contactName.toLowerCase()}`
        }
      },
      update: {
        fullName: input.contactName,
        roleTitle: "Public directory contact",
        email: input.email ?? undefined,
        normalizedEmail: input.email?.toLowerCase() ?? `${organizationId}:${input.contactName.toLowerCase()}`,
        phone: input.phone ?? undefined,
        source: "directory_ingestion",
        sourceUrl: input.sourceUrl,
        provenanceJson: input.provenance as Prisma.InputJsonValue,
        confidence: input.sourceConfidence,
        lastVerifiedAt: now()
      },
      create: {
        organizationId,
        fullName: input.contactName,
        roleTitle: "Public directory contact",
        email: input.email,
        normalizedEmail: input.email?.toLowerCase() ?? `${organizationId}:${input.contactName.toLowerCase()}`,
        phone: input.phone,
        source: "directory_ingestion",
        sourceUrl: input.sourceUrl,
        provenanceJson: input.provenance as Prisma.InputJsonValue,
        confidence: input.sourceConfidence,
        lastVerifiedAt: now()
      }
    });
  }
}

async function upsertNormalizedPermit(sourceId: string, permit: NormalizedPermitInput, rawRecordId?: string) {
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
      const organization = await upsertOrganization({
        normalizedName: orgInput.normalizedName,
        name: orgInput.name,
        type: orgInput.type,
        confidence: orgInput.confidence,
        aliases: [orgInput.name]
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
      lastSeenAt: now(),
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
      firstSeenAt: now(),
      lastSeenAt: now(),
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
      observedAt: now()
    },
    create: {
      permitId: permitRecord.id,
      rawRecordId,
      snapshotHash: canonicalHash(snapshotPayload),
      normalizedDataJson: snapshotPayload as Prisma.InputJsonValue,
      confidence: permit.sourceConfidence,
      observedAt: now()
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
          changedAt: now(),
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
      lastActivityAt: now(),
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
      firstSeenAt: now(),
      lastActivityAt: now(),
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
      activityAt: now(),
      actor: "system",
      detail: `Permit ${permitRecord.permitNumber ?? permitRecord.id} synced from ${sourceId}`
    }
  });

  return { permitRecord, leadId: lead.id };
}

async function upsertNormalizedOrganization(sourceId: string, organizationInput: NormalizedOrganizationInput) {
  const organization = await upsertOrganization({
    normalizedName: organizationInput.normalizedCompanyName,
    name: organizationInput.rawCompanyName,
    type: organizationInput.organizationType,
    confidence: organizationInput.sourceConfidence,
    website: organizationInput.website,
    phone: organizationInput.phone,
    email: organizationInput.email,
    aliases: [organizationInput.rawCompanyName]
  });

  await upsertOrganizationDirectoryRecord(sourceId, organization.id, organizationInput);
  await upsertOrganizationContactMethods(organization.id, organizationInput);

  return organization;
}

async function refreshBuilderDiagnostics(sourceId?: string) {
  if (sourceId) {
    await prisma.dataQualityIssue.updateMany({
      where: {
        sourceId,
        status: "open",
        issueType: {
          in: ["builder_duplicate", "missing_builder_contact"]
        }
      },
      data: {
        status: "resolved",
        resolvedAt: now()
      }
    });
  }

  const duplicateCandidates = await prisma.organization.groupBy({
    by: ["phone"],
    _count: { _all: true },
    where: {
      phone: { not: null },
      type: { in: ["builder", "general_contractor", "subcontractor", "developer"] }
    },
    having: {
      phone: {
        _count: { gt: 1 }
      }
    }
  });

  for (const candidate of duplicateCandidates) {
    const organizations = await prisma.organization.findMany({
      where: { phone: candidate.phone ?? undefined },
      take: 5
    });

    for (const organization of organizations) {
      await recordDiagnosticIssue({
        sourceId,
        organizationId: organization.id,
        issueType: "builder_duplicate",
        severity: "warning",
        title: "Builder duplicate review",
        detail: `Shared phone ${candidate.phone} appears across ${candidate._count._all} organizations.`,
        metricsJson: {
          sharedPhone: candidate.phone,
          organizationCount: candidate._count._all,
          organizations: organizations.map((item) => item.name)
        }
      });
    }
  }

  const highValueBuildersWithoutContacts = await prisma.organization.findMany({
    where: {
      type: { in: ["builder", "general_contractor", "developer"] },
      leadLinks: {
        some: {
          lead: {
            overallScore: { gte: 70 }
          }
        }
      },
      contactMethods: {
        none: {
          type: { in: ["phone", "email", "website"] }
        }
      }
    },
    include: {
      leadLinks: {
        include: {
          lead: true
        },
        take: 5
      }
    }
  });

  for (const organization of highValueBuildersWithoutContacts) {
    await recordDiagnosticIssue({
      sourceId,
      organizationId: organization.id,
      issueType: "missing_builder_contact",
      severity: "warning",
      title: "High-value builder missing usable contact info",
      detail: `${organization.name} is attached to active opportunities but has no public phone, email, or website on record.`,
      metricsJson: {
        linkedLeadCount: organization.leadLinks.length,
        leadScores: organization.leadLinks.map((link) => link.lead.overallScore)
      }
    });
  }
}

async function applySourceDriftDiagnostics(
  source: { id: string; name: string; rowCountLastSync: number; parseErrorRate: number; activeStatus: string },
  syncResult: ConnectorSyncResult
) {
  await clearOpenSourceDiagnostics(source.id);

  if (source.activeStatus !== "active") {
    await recordDiagnosticIssue({
      sourceId: source.id,
      issueType: "inactive_source",
      severity: "info",
      title: "Source is not currently active",
      detail: `${source.name} is registered but not marked active for automated collection.`
    });
  }

  if (!syncResult.rawRecords.length) {
    await recordDiagnosticIssue({
      sourceId: source.id,
      issueType: "suspicious_zero_results",
      severity: "critical",
      title: "Source returned zero records",
      detail: "The source returned zero records during sync and should be reviewed for drift or blocking."
    });
  }

  if (source.rowCountLastSync > 0 && syncResult.rawRecords.length < Math.floor(source.rowCountLastSync * 0.4)) {
    await recordDiagnosticIssue({
      sourceId: source.id,
      issueType: "abnormal_row_drop",
      severity: "critical",
      title: "Row count dropped sharply",
      detail: `Previous sync had ${source.rowCountLastSync} rows; latest sync has ${syncResult.rawRecords.length}.`,
      metricsJson: {
        previousRowCount: source.rowCountLastSync,
        currentRowCount: syncResult.rawRecords.length
      }
    });
    await recordDiagnosticIssue({
      sourceId: source.id,
      issueType: "source_drift",
      severity: "warning",
      title: "Source drift suspected",
      detail: "Source structure or availability may have changed enough to reduce captured rows."
    });
  }

  if ((syncResult.completeness.parseErrorRate ?? 0) >= 20 || syncResult.parsingErrors.length > 0) {
    await recordDiagnosticIssue({
      sourceId: source.id,
      issueType: "parse_quality_drop",
      severity: "warning",
      title: "Parse quality dropped",
      detail: "Parse errors or malformed rows exceeded the warning threshold.",
      metricsJson: {
        parseErrorRate: syncResult.completeness.parseErrorRate,
        parseErrors: syncResult.parsingErrors.map((issue) => issue.message)
      }
    });
  }

  if ((syncResult.completeness.percentWithAddress ?? 0) < 40 && syncResult.organizations.length) {
    await recordDiagnosticIssue({
      sourceId: source.id,
      issueType: "transformation_mismatch",
      severity: "warning",
      title: "Builder directory completeness dropped",
      detail: "Too many organization rows are missing address fields after normalization.",
      metricsJson: syncResult.completeness as unknown as Record<string, unknown>
    });
  }
}

export async function ingestSourceByKey(sourceKey: string): Promise<IngestionResult> {
  const adapter = getAdapters().find((candidate) => candidate.definition.key === sourceKey) as SourceAdapter | undefined;
  if (!adapter) {
    throw new Error(`Unknown adapter: ${sourceKey}`);
  }

  const source = await prisma.source.findFirstOrThrow({
    where: { adapterKey: sourceKey }
  });

  const startedAt = now();
  await updateSourceSyncStatus(source.id, {
    checkedAt: startedAt,
    lastAttemptedSyncAt: startedAt,
    lastRunAt: startedAt
  });

  const errors: string[] = [];
  let rawRecordsWritten = 0;
  let permitsUpserted = 0;
  let organizationsUpserted = 0;
  let contactsUpserted = 0;
  let leadsUpserted = 0;
  let syncResult: ConnectorSyncResult | undefined;

  try {
    const fetched = await adapter.fetchSourceData();
    const parsed = await adapter.parseRawRecords(fetched);
    syncResult = await adapter.validateRecords(await adapter.normalizeRecords(parsed));

    const rawRecordIdsByKey = new Map<string, string>();

    for (const rawRecord of syncResult.rawRecords) {
      const stored = await upsertRawRecord(source.id, rawRecord);
      rawRecordsWritten += 1;
      rawRecordIdsByKey.set(rawRecord.sourceRecordKey, stored.id);
    }

    for (const permit of syncResult.permits) {
      const rawRecordId = permit.permitNumber ? rawRecordIdsByKey.get(permit.permitNumber) : undefined;
      await upsertNormalizedPermit(source.id, permit, rawRecordId);
      permitsUpserted += 1;
      leadsUpserted += 1;
    }

    for (const organizationInput of syncResult.organizations) {
      await upsertNormalizedOrganization(source.id, organizationInput);
      organizationsUpserted += 1;
      contactsUpserted += organizationInput.contactMethods?.length ?? 0;
    }

    if (adapter.upsertRecords) {
      await adapter.upsertRecords(syncResult);
    }

    await applySourceDriftDiagnostics(source, syncResult);
    await refreshBuilderDiagnostics(source.id);

    const latestSyncTime = now();
    await updateSourceSyncStatus(source.id, {
      checkedAt: latestSyncTime,
      scrapedAt: syncResult.rawRecords.length ? latestSyncTime : null,
      lastAttemptedSyncAt: startedAt,
      lastSuccessfulSyncAt: latestSyncTime,
      lastRunAt: startedAt,
      lastSuccessAt: latestSyncTime,
      lastFailureAt: null,
      healthStatus: syncResult.sourceHealth.status,
      freshnessStatus: freshnessFromSync(latestSyncTime),
      rowCountLastSync: syncResult.rawRecords.length,
      parseErrorRate: syncResult.completeness.parseErrorRate,
      sourceConfidence: syncResult.sourceHealth.sourceConfidence ?? 50,
      completenessStatsJson: syncResult.completeness as unknown as Record<string, unknown>,
      lastFailureReason: null,
      latestSourceHash: canonicalHash({
        rawRecords: syncResult.rawRecords.map((record) => record.sourceRecordKey),
        summary: syncResult.syncSummary
      }),
      latestSyncSummaryJson: syncResult.syncSummary,
      consecutiveFailures: 0
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown source sync error";
    errors.push(message);

    const failedAt = now();
    await updateSourceSyncStatus(source.id, {
      checkedAt: failedAt,
      lastAttemptedSyncAt: startedAt,
      lastRunAt: startedAt,
      lastFailureAt: failedAt,
      healthStatus: "failed",
      freshnessStatus: "failed",
      lastFailureReason: message,
      consecutiveFailures: source.consecutiveFailures + 1
    });

    await recordDiagnosticIssue({
      sourceId: source.id,
      issueType: "source_drift",
      severity: "critical",
      title: "Source sync failed",
      detail: message
    });
  }

  const finishedAt = now();
  await prisma.syncJobRun.create({
    data: {
      sourceId: source.id,
      jobKey: `${sourceKey}:${finishedAt.toISOString()}`,
      jobType: "daily_source_poll",
      status: errors.length ? "failed" : "succeeded",
      triggerMode: "scheduled",
      startedAt,
      finishedAt,
      rowsDiscovered: syncResult?.rawRecords.length ?? 0,
      rowsFetched: syncResult?.rawRecords.length ?? 0,
      rowsParsed: (syncResult?.permits.length ?? 0) + (syncResult?.organizations.length ?? 0),
      rowsInserted: permitsUpserted + organizationsUpserted,
      rowsUpdated: 0,
      errorMessage: errors.join("\n") || null,
      errorDetailsJson: errors.length
        ? ({ errors, parsingErrors: syncResult?.parsingErrors } as Prisma.InputJsonValue)
        : undefined,
      metadataJson: {
        adapter: sourceKey,
        completeness: syncResult?.completeness,
        organizations: organizationsUpserted,
        contacts: contactsUpserted
      }
    }
  });

  return {
    sourceId: source.id,
    discovered: syncResult?.rawRecords.length ?? 0,
    rawRecordsWritten,
    permitsUpserted,
    organizationsUpserted,
    contactsUpserted,
    leadsUpserted,
    errors
  };
}

export async function runSourceDiagnostics() {
  const sources = await prisma.source.findMany({
    include: {
      _count: {
        select: {
          organizationSourceRecords: true,
          rawRecords: true,
          permits: true,
          diagnostics: true
        }
      }
    }
  });

  const summary = {
    activeSources: sources.filter((source) => source.activeStatus === "active").length,
    inactiveSources: sources.filter((source) => source.activeStatus !== "active").length,
    staleSources: sources.filter((source) => source.freshnessStatus === "stale").length,
    failedSources: sources.filter((source) => source.healthStatus === "failed").length,
    mockSources: sources.filter((source) => {
      const details = source.healthDetailsJson as Record<string, unknown> | null;
      return details?.message === "Fixture-backed monthly report adapter is available.";
    }).length,
    sourcesNeedingReview: sources.filter((source) => source._count.diagnostics > 0).length
  };

  return {
    summary,
    sources: sources.map((source) => ({
      adapterKey: source.adapterKey,
      name: source.name,
      activeStatus: source.activeStatus,
      accessMethod: source.accessMethod,
      healthStatus: source.healthStatus,
      freshnessStatus: source.freshnessStatus,
      lastAttemptedSyncAt: source.lastAttemptedSyncAt,
      lastSuccessfulSyncAt: source.lastSuccessfulSyncAt,
      rowCountLastSync: source.rowCountLastSync,
      parseErrorRate: source.parseErrorRate,
      completenessStats: source.completenessStatsJson,
      latestFailureReason: source.lastFailureReason,
      openDiagnostics: source._count.diagnostics
    }))
  };
}
