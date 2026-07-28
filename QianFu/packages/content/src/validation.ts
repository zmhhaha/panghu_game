import type { CampaignDefinition } from "@qianfu/core";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const duplicateIds = (ids: string[]) => [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

export function validateCampaign(campaign: CampaignDefinition): ValidationResult {
  const errors: string[] = [];
  if (!/^[a-z0-9-]+$/.test(campaign.id)) errors.push("campaign.id must use lowercase letters, numbers and hyphens");
  if (!/^\d+\.\d+\.\d+$/.test(campaign.version)) errors.push("campaign.version must be semantic version format");
  if (Number.isNaN(Date.parse(campaign.startTime))) errors.push("campaign.startTime must be ISO date time");

  const locationIds = campaign.locations.map((item) => item.id);
  const characterIds = campaign.characters.map((item) => item.id);
  const intelIds = campaign.intel.map((item) => item.id);
  for (const [type, duplicates] of [
    ["location", duplicateIds(locationIds)], ["character", duplicateIds(characterIds)], ["intel", duplicateIds(intelIds)],
  ] as const) {
    for (const id of duplicates) errors.push(`duplicate ${type} id: ${id}`);
  }

  const locations = new Set(locationIds);
  const characters = new Set(characterIds);
  const intel = new Set(intelIds);
  for (const location of campaign.locations) {
    for (const [targetId, minutes] of Object.entries(location.travelMinutes)) {
      if (!locations.has(targetId)) errors.push(`location ${location.id} references unknown destination ${targetId}`);
      if (minutes <= 0 || minutes % 10 !== 0) errors.push(`travel time ${location.id} -> ${targetId} must be a positive multiple of 10`);
    }
  }
  for (const character of campaign.characters) {
    if (!locations.has(character.initialLocationId)) errors.push(`character ${character.id} has unknown initial location`);
    for (const schedule of character.schedule) {
      if (!locations.has(schedule.locationId)) errors.push(`character ${character.id} schedule has unknown location ${schedule.locationId}`);
      if (schedule.startMinute >= schedule.endMinute) errors.push(`character ${character.id} has invalid schedule interval`);
    }
  }
  for (const item of campaign.intel) {
    if (Number.isNaN(Date.parse(item.expiresAt))) errors.push(`intel ${item.id} has invalid expiresAt`);
    for (const characterId of item.sourceCharacterIds) {
      if (!characters.has(characterId)) errors.push(`intel ${item.id} references unknown source ${characterId}`);
    }
    for (const field of Object.keys(item.fieldLabels ?? {})) {
      if (!item.requiredFields.includes(field)) errors.push(`intel ${item.id} labels unknown field ${field}`);
    }
    for (const sourceId of Object.keys(item.sourceOrigins ?? {})) {
      if (!item.sourceCharacterIds.includes(sourceId)) errors.push(`intel ${item.id} maps origin for non-source ${sourceId}`);
    }
    for (const [sourceId, requirement] of Object.entries(item.sourceRequirements ?? {})) {
      if (!item.sourceCharacterIds.includes(sourceId)) errors.push(`intel ${item.id} configures requirements for non-source ${sourceId}`);
      if (requirement.familiarity < 0 || requirement.privateTrust < -100) errors.push(`intel ${item.id} has invalid source requirement for ${sourceId}`);
    }
  }
  for (const objective of campaign.objectives) {
    if (Number.isNaN(Date.parse(objective.deadline))) errors.push(`objective ${objective.id} has invalid deadline`);
    for (const intelId of objective.requiredIntelIds) {
      if (!intel.has(intelId)) errors.push(`objective ${objective.id} references unknown intel ${intelId}`);
    }
  }
  for (const leadId of duplicateIds((campaign.publicLeads ?? []).map((lead) => lead.id))) {
    errors.push(`duplicate public lead id: ${leadId}`);
  }
  for (const lead of campaign.publicLeads ?? []) {
    if (lead.trigger === "cover_work" && (!lead.profileId || !lead.workKind)) {
      errors.push(`public lead ${lead.id} requires profileId and workKind for cover_work`);
    }
    if (lead.trigger === "dialogue_discovery" && !lead.characterId) {
      errors.push(`public lead ${lead.id} requires characterId for dialogue_discovery`);
    }
    if (lead.characterId && !characters.has(lead.characterId)) errors.push(`public lead ${lead.id} references unknown source character ${lead.characterId}`);
    for (const locationId of lead.locationIds) {
      if (!locations.has(locationId)) errors.push(`public lead ${lead.id} references unknown location ${locationId}`);
    }
    for (const characterId of lead.characterIds) {
      if (!characters.has(characterId)) errors.push(`public lead ${lead.id} references unknown character ${characterId}`);
    }
  }
  const narrativeEventIds = (campaign.narrativeEvents ?? []).map((event) => event.id);
  for (const eventId of duplicateIds(narrativeEventIds)) errors.push(`duplicate narrative event id: ${eventId}`);
  const narrativeEvents = new Set(narrativeEventIds);
  for (const event of campaign.narrativeEvents ?? []) {
    const trigger = event.trigger;
    if (trigger.notBefore && Number.isNaN(Date.parse(trigger.notBefore))) errors.push(`narrative event ${event.id} has invalid notBefore`);
    if (trigger.type === "relationship" && !trigger.characterId) errors.push(`narrative event ${event.id} requires characterId for relationship trigger`);
    if (trigger.characterId && !characters.has(trigger.characterId)) errors.push(`narrative event ${event.id} references unknown trigger character ${trigger.characterId}`);
    for (const requiredEventId of trigger.requiredEventIds ?? []) {
      if (!narrativeEvents.has(requiredEventId)) errors.push(`narrative event ${event.id} requires unknown event ${requiredEventId}`);
    }
    for (const effect of event.effects.locations ?? []) {
      if (!locations.has(effect.locationId)) errors.push(`narrative event ${event.id} references unknown location ${effect.locationId}`);
    }
    for (const characterId of event.effects.introduceCharacterIds ?? []) {
      if (!characters.has(characterId)) errors.push(`narrative event ${event.id} introduces unknown character ${characterId}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidCampaign(campaign: CampaignDefinition): CampaignDefinition {
  const result = validateCampaign(campaign);
  if (!result.valid) throw new Error(`Invalid campaign:\n${result.errors.join("\n")}`);
  return campaign;
}
