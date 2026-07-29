import { COVER_PROFILES, type CampaignDefinition, type CoverProfileDefinition } from "@qianfu/core";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const duplicateIds = (ids: string[]) => [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

export interface CampaignReachabilityReport {
  profileId: CoverProfileDefinition["id"];
  reachableLocationIds: string[];
  reachableCharacterIds: string[];
  reachableIntelIds: string[];
  completableObjectiveIds: string[];
  unreachableLocationIds: string[];
  unreachableCharacterIds: string[];
  unreachableIntelIds: string[];
  unreachableObjectiveIds: string[];
}

export function analyzeCampaignReachability(campaign: CampaignDefinition): CampaignReachabilityReport[] {
  return COVER_PROFILES.map((profile) => {
    const report = analyzeProfileReachability(campaign, profile);
    const failureBlockedObjectives = campaign.objectives.filter((target) => {
      const targetSequence = target.sequence ?? 0;
      const priorFailures = new Set(campaign.objectives
        .filter((objective) => (objective.sequence ?? 0) < targetSequence)
        .map((objective) => objective.id));
      return priorFailures.size > 0
        && analyzeProfileReachability(campaign, profile, priorFailures).unreachableObjectiveIds.includes(target.id);
    }).map((objective) => objective.id);
    report.unreachableObjectiveIds = [...new Set([...report.unreachableObjectiveIds, ...failureBlockedObjectives])];
    return report;
  });
}

function analyzeProfileReachability(
  campaign: CampaignDefinition,
  profile: CoverProfileDefinition,
  forcedFailedObjectiveIds = new Set<string>(),
): CampaignReachabilityReport {
  const locations = new Set<string>([
    profile.startingLocationId,
    ...campaign.locations.filter((location) => location.radioSite?.initiallyAvailable).map((location) => location.id),
  ]);
  const knownCharacters = new Set(profile.initialContactCharacterIds);
  const reachableIntel = new Set<string>();
  const resolvedLeads = new Set<string>();
  const resolvedEvents = new Set<string>();
  const unlockedObjectives = new Set<string>();
  const settledObjectives = new Set<string>();
  const completableObjectives = new Set<string>();
  const appliedObjectiveEffects = new Set<string>();

  const isContactable = (characterId: string) => {
    if (!knownCharacters.has(characterId)) return false;
    const character = campaign.characters.find((item) => item.id === characterId);
    return Boolean(character && [character.initialLocationId, ...character.schedule.map((entry) => entry.locationId)].some((id) => locations.has(id)));
  };
  const applyLead = (lead: NonNullable<CampaignDefinition["publicLeads"]>[number]) => {
    for (const locationId of lead.locationIds) locations.add(locationId);
    for (const characterId of lead.characterIds) knownCharacters.add(characterId);
    resolvedLeads.add(lead.id);
  };

  let changed = true;
  while (changed) {
    changed = false;
    const before = [locations.size, knownCharacters.size, reachableIntel.size, resolvedLeads.size, resolvedEvents.size, unlockedObjectives.size, settledObjectives.size, completableObjectives.size].join(":");

    for (const objective of campaign.objectives) {
      if ((objective.unlockAfterObjectiveIds ?? []).every((id) => settledObjectives.has(id))) {
        unlockedObjectives.add(objective.id);
        if (forcedFailedObjectiveIds.has(objective.id)) settledObjectives.add(objective.id);
      }
    }

    for (const lead of campaign.publicLeads ?? []) {
      if (resolvedLeads.has(lead.id) || (lead.profileIds?.length && !lead.profileIds.includes(profile.id))) continue;
      if (lead.trigger === "cover_work") {
        if (lead.profileId === profile.id) applyLead(lead);
        continue;
      }
      const sourceCanRevealIntel = campaign.intel.some((intel) => reachableIntel.has(intel.id) && intel.sourceCharacterIds.includes(lead.characterId ?? ""));
      if (lead.characterId && isContactable(lead.characterId) && sourceCanRevealIntel) applyLead(lead);
    }

    for (const intel of campaign.intel) {
      const owners = campaign.objectives.filter((objective) => objective.requiredIntelIds.includes(intel.id));
      const unlocked = owners.length === 0 || owners.some((objective) => unlockedObjectives.has(objective.id));
      if (unlocked && intel.sourceCharacterIds.some(isContactable)) reachableIntel.add(intel.id);
    }

    for (const objective of campaign.objectives) {
      if (!forcedFailedObjectiveIds.has(objective.id)
        && unlockedObjectives.has(objective.id)
        && objective.requiredIntelIds.every((id) => reachableIntel.has(id))) {
        completableObjectives.add(objective.id);
        settledObjectives.add(objective.id);
      }
      if (!completableObjectives.has(objective.id) || appliedObjectiveEffects.has(objective.id)) continue;
      for (const locationId of objective.completionEffects?.unlockLocationIds ?? []) locations.add(locationId);
      for (const characterId of objective.completionEffects?.introduceCharacterIds ?? []) knownCharacters.add(characterId);
      const interrogatorId = objective.completionEffects?.interrogation?.interrogatorCharacterId;
      if (interrogatorId) knownCharacters.add(interrogatorId);
      appliedObjectiveEffects.add(objective.id);
    }

    for (const event of campaign.narrativeEvents ?? []) {
      if (resolvedEvents.has(event.id)) continue;
      const trigger = event.trigger;
      if (!(trigger.requiredEventIds ?? []).every((id) => resolvedEvents.has(id))) continue;
      if (!(trigger.requiredLeadIds ?? []).every((id) => resolvedLeads.has(id))) continue;
      if (!(trigger.requiredCompletedObjectiveIds ?? []).every((id) => completableObjectives.has(id))) continue;
      if (trigger.type === "relationship" && (!trigger.characterId || !isContactable(trigger.characterId))) continue;
      if (event.effects.contact && !isContactable(event.effects.contact.characterId)) continue;
      for (const effect of event.effects.locations ?? []) {
        if (effect.stage === "accessible") locations.add(effect.locationId);
      }
      for (const characterId of event.effects.introduceCharacterIds ?? []) knownCharacters.add(characterId);
      resolvedEvents.add(event.id);
    }

    const after = [locations.size, knownCharacters.size, reachableIntel.size, resolvedLeads.size, resolvedEvents.size, unlockedObjectives.size, settledObjectives.size, completableObjectives.size].join(":");
    changed = before !== after;
  }

  const reachableCharacters = campaign.characters.filter((character) => isContactable(character.id)).map((character) => character.id);
  const reachableLocationIds = campaign.locations.filter((location) => locations.has(location.id)).map((location) => location.id);
  const reachableIntelIds = campaign.intel.filter((intel) => reachableIntel.has(intel.id)).map((intel) => intel.id);
  const completableObjectiveIds = campaign.objectives.filter((objective) => completableObjectives.has(objective.id)).map((objective) => objective.id);
  return {
    profileId: profile.id,
    reachableLocationIds,
    reachableCharacterIds: reachableCharacters,
    reachableIntelIds,
    completableObjectiveIds,
    unreachableLocationIds: campaign.locations.map((location) => location.id).filter((id) => !locations.has(id)),
    unreachableCharacterIds: campaign.characters.map((character) => character.id).filter((id) => !reachableCharacters.includes(id)),
    unreachableIntelIds: campaign.intel.map((intel) => intel.id).filter((id) => !reachableIntel.has(id)),
    unreachableObjectiveIds: campaign.objectives.map((objective) => objective.id).filter((id) => !completableObjectives.has(id)),
  };
}

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
  const objectiveIds = campaign.objectives.map((item) => item.id);
  for (const id of duplicateIds(objectiveIds)) errors.push(`duplicate objective id: ${id}`);
  const objectives = new Set(objectiveIds);
  for (const location of campaign.locations) {
    for (const [targetId, minutes] of Object.entries(location.travelMinutes)) {
      if (!locations.has(targetId)) errors.push(`location ${location.id} references unknown destination ${targetId}`);
      if (minutes <= 0 || minutes % 10 !== 0) errors.push(`travel time ${location.id} -> ${targetId} must be a positive multiple of 10`);
    }
    if (location.radioSite?.requiresRecruitedCharacterId && !characters.has(location.radioSite.requiresRecruitedCharacterId)) {
      errors.push(`radio site ${location.id} requires unknown character ${location.radioSite.requiresRecruitedCharacterId}`);
    }
    if (location.radioSite && location.radioSite.baseRisk < 0) errors.push(`radio site ${location.id} has invalid base risk`);
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
    for (const dependencyId of objective.unlockAfterObjectiveIds ?? []) {
      if (!objectives.has(dependencyId)) errors.push(`objective ${objective.id} depends on unknown objective ${dependencyId}`);
      if (dependencyId === objective.id) errors.push(`objective ${objective.id} cannot depend on itself`);
    }
    for (const characterId of objective.completionEffects?.introduceCharacterIds ?? []) {
      if (!characters.has(characterId)) errors.push(`objective ${objective.id} introduces unknown character ${characterId}`);
    }
    for (const locationId of objective.completionEffects?.unlockLocationIds ?? []) {
      if (!locations.has(locationId)) errors.push(`objective ${objective.id} unlocks unknown location ${locationId}`);
    }
    const interrogatorId = objective.completionEffects?.interrogation?.interrogatorCharacterId;
    if (interrogatorId && !characters.has(interrogatorId)) errors.push(`objective ${objective.id} uses unknown interrogator ${interrogatorId}`);
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
    for (const profileId of lead.profileIds ?? []) {
      if (!COVER_PROFILES.some((profile) => profile.id === profileId)) errors.push(`public lead ${lead.id} references unknown cover profile ${profileId}`);
    }
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
  const publicLeads = new Set((campaign.publicLeads ?? []).map((lead) => lead.id));
  for (const event of campaign.narrativeEvents ?? []) {
    const trigger = event.trigger;
    if (trigger.notBefore && Number.isNaN(Date.parse(trigger.notBefore))) errors.push(`narrative event ${event.id} has invalid notBefore`);
    if (trigger.type === "relationship" && !trigger.characterId) errors.push(`narrative event ${event.id} requires characterId for relationship trigger`);
    if (trigger.characterId && !characters.has(trigger.characterId)) errors.push(`narrative event ${event.id} references unknown trigger character ${trigger.characterId}`);
    for (const requiredEventId of trigger.requiredEventIds ?? []) {
      if (!narrativeEvents.has(requiredEventId)) errors.push(`narrative event ${event.id} requires unknown event ${requiredEventId}`);
    }
    for (const requiredLeadId of trigger.requiredLeadIds ?? []) {
      if (!publicLeads.has(requiredLeadId)) errors.push(`narrative event ${event.id} requires unknown public lead ${requiredLeadId}`);
    }
    for (const objectiveId of trigger.requiredCompletedObjectiveIds ?? []) {
      if (!objectives.has(objectiveId)) errors.push(`narrative event ${event.id} requires unknown objective ${objectiveId}`);
    }
    if ((trigger.minInvestigationPressure ?? 0) < 0 || (trigger.maxInvestigationPressure ?? 100) > 100 || (trigger.minInvestigationPressure ?? 0) > (trigger.maxInvestigationPressure ?? 100)) {
      errors.push(`narrative event ${event.id} has invalid investigation pressure range`);
    }
    for (const effect of event.effects.locations ?? []) {
      if (!locations.has(effect.locationId)) errors.push(`narrative event ${event.id} references unknown location ${effect.locationId}`);
    }
    for (const characterId of event.effects.introduceCharacterIds ?? []) {
      if (!characters.has(characterId)) errors.push(`narrative event ${event.id} introduces unknown character ${characterId}`);
    }
    const contact = event.effects.contact;
    if (contact && !characters.has(contact.characterId)) errors.push(`narrative event ${event.id} contacts unknown character ${contact.characterId}`);
    if (contact && (contact.responseWindowMinutes < 10 || contact.responseWindowMinutes % 10 !== 0)) errors.push(`narrative event ${event.id} has invalid contact response window`);
  }
  if (errors.length === 0) {
    for (const report of analyzeCampaignReachability(campaign)) {
      for (const locationId of report.unreachableLocationIds) errors.push(`cover profile ${report.profileId} cannot reach location ${locationId}`);
      for (const characterId of report.unreachableCharacterIds) errors.push(`cover profile ${report.profileId} cannot reach character ${characterId}`);
      for (const intelId of report.unreachableIntelIds) errors.push(`cover profile ${report.profileId} cannot reach intel ${intelId}`);
      for (const objectiveId of report.unreachableObjectiveIds) errors.push(`cover profile ${report.profileId} cannot complete objective ${objectiveId}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidCampaign(campaign: CampaignDefinition): CampaignDefinition {
  const result = validateCampaign(campaign);
  if (!result.valid) throw new Error(`Invalid campaign:\n${result.errors.join("\n")}`);
  return campaign;
}
