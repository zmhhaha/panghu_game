import type { CaseDefinition } from "@tashuo/core";

const duplicates = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);

function validateReportRubric(definition: CaseDefinition): string[] {
  const errors: string[] = [];
  const rules = definition.reportRubric ?? [];
  const factIds = new Set(definition.facts.map((fact) => fact.id));
  const contentById = new Map(definition.contents.map((content) => [content.id, content]));
  const ruleFactIds = new Set(rules.map((rule) => rule.factId));
  for (const fact of definition.facts) {
    if (fact.importance === "critical" && !ruleFactIds.has(fact.id)) errors.push(`critical fact ${fact.id} requires an assessment rule`);
  }
  for (const factId of duplicates(rules.map((rule) => rule.factId))) errors.push(`duplicate assessment rule: ${factId}`);
  for (const rule of rules) {
    const label = `assessment ${rule.factId}`;
    if (!factIds.has(rule.factId)) errors.push(`${label} references unknown fact`);
    if (!["observation", "causal", "source"].includes(rule.kind)) errors.push(`${label} has invalid kind`);
    const evidenceById = new Map(rule.evidence.map((evidence) => [evidence.contentId, evidence]));
    for (const contentId of duplicates(rule.evidence.map((evidence) => evidence.contentId))) errors.push(`${label} duplicates evidence ${contentId}`);
    for (const evidence of rule.evidence) {
      const content = contentById.get(evidence.contentId);
      if (!content) errors.push(`${label} references unknown evidence ${evidence.contentId}`);
      if (!["record", "context", "claim"].includes(evidence.role)) errors.push(`${label} evidence ${evidence.contentId} has invalid role`);
      if (evidence.supportsJudgments !== undefined) {
        if (evidence.supportsJudgments.some((judgment) => !["true", "false", "partial"].includes(judgment))) errors.push(`${label} evidence ${evidence.contentId} has invalid supporting judgment`);
        for (const judgment of duplicates(evidence.supportsJudgments)) errors.push(`${label} evidence ${evidence.contentId} duplicates supporting judgment ${judgment}`);
        if (evidence.role === "claim" && evidence.supportsJudgments.length) errors.push(`${label} unverified claim ${evidence.contentId} cannot support a judgment`);
      }
      if (!evidence.originIds.length) errors.push(`${label} evidence ${evidence.contentId} requires origins`);
      for (const originId of duplicates(evidence.originIds)) errors.push(`${label} evidence ${evidence.contentId} duplicates origin ${originId}`);
      for (const originId of evidence.originIds) {
        if (!content?.evidenceOriginIds?.includes(originId)) errors.push(`${label} evidence ${evidence.contentId} does not contain origin ${originId}`);
      }
    }
    if (!rule.routes.length) errors.push(`${label} requires a sufficient evidence route`);
    for (const routeId of duplicates(rule.routes.map((route) => route.id))) errors.push(`${label} duplicates route ${routeId}`);
    for (const route of rule.routes) {
      const routeLabel = `${label} route ${route.id}`;
      if (!route.id.trim() || !route.explanation.trim()) errors.push(`${routeLabel} requires identity and explanation`);
      if (!route.contentIds.length) errors.push(`${routeLabel} requires content`);
      for (const contentId of duplicates(route.contentIds)) errors.push(`${routeLabel} duplicates content ${contentId}`);
      for (const contentId of route.contentIds) {
        if (!contentById.has(contentId)) errors.push(`${routeLabel} references unknown content ${contentId}`);
        if (!evidenceById.has(contentId)) errors.push(`${routeLabel} has no evidence mapping for ${contentId}`);
      }
      if (!route.contentIds.some((contentId) => evidenceById.get(contentId)?.role === "record")) errors.push(`${routeLabel} requires substantive record evidence`);
      if (!route.acceptedJudgments.length || route.acceptedJudgments.some((judgment) => !["true", "false", "partial"].includes(judgment))) errors.push(`${routeLabel} requires valid judgments`);
      for (const judgment of duplicates(route.acceptedJudgments)) errors.push(`${routeLabel} duplicates judgment ${judgment}`);
      const [low, high] = route.confidenceRange;
      if (route.confidenceRange.length !== 2 || !Number.isFinite(low) || !Number.isFinite(high) || low < 0 || low >= high || high > 100) errors.push(`${routeLabel} requires a finite increasing confidence range within 0..100`);
    }
    for (const contentId of duplicates(rule.counterContentIds ?? [])) errors.push(`${label} duplicates counter evidence ${contentId}`);
    for (const contentId of rule.counterContentIds ?? []) {
      if (!contentById.has(contentId)) errors.push(`${label} references unknown counter evidence ${contentId}`);
      if (!evidenceById.has(contentId)) errors.push(`${label} has no evidence mapping for counter content ${contentId}`);
    }
  }
  return errors;
}

export function validateCase(definition: CaseDefinition): string[] {
  const errors: string[] = [];
  const versionMatch = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(definition.version);
  if (!versionMatch) errors.push("case version must be a stable semantic version");
  const validMinute = (value: number) => Number.isFinite(value) && value >= 0 && value <= definition.durationMinutes;
  if (!Number.isFinite(definition.durationMinutes) || definition.durationMinutes <= 0) errors.push("case duration must be positive and finite");
  if (!Number.isFinite(definition.realSecondsPerGameMinute) || definition.realSecondsPerGameMinute <= 0) errors.push("case clock rate must be positive and finite");
  const factIds = new Set(definition.facts.map((fact) => fact.id));
  const sourceIds = new Set(definition.sources.map((source) => source.id));
  const contentIds = new Set(definition.contents.map((content) => content.id));
  const groupIds = new Set(definition.groups.map((group) => group.id));
  const materials = definition.materials ?? [];
  const accounts = definition.accounts ?? [];
  const leads = definition.publicLeads ?? [];
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const contentById = new Map(definition.contents.map((content) => [content.id, content]));
  const originIds = new Set(materials.map((material) => material.originId));
  for (const id of duplicates(definition.facts.map((fact) => fact.id))) errors.push(`duplicate fact: ${id}`);
  for (const id of duplicates(definition.sources.map((source) => source.id))) errors.push(`duplicate source: ${id}`);
  for (const id of duplicates(definition.contents.map((content) => content.id))) errors.push(`duplicate content: ${id}`);
  for (const id of duplicates(definition.groups.map((group) => group.id))) errors.push(`duplicate group: ${id}`);
  for (const id of duplicates(materials.map((material) => material.id))) errors.push(`duplicate material: ${id}`);
  for (const id of duplicates(accounts.map((account) => account.id))) errors.push(`duplicate account: ${id}`);
  for (const id of duplicates(leads.map((lead) => lead.id))) errors.push(`duplicate lead: ${id}`);
  for (const id of duplicates(accounts.flatMap((account) => account.initialComments.map((comment) => comment.id)))) errors.push(`duplicate initial comment: ${id}`);
  if (!materials.length || !accounts.length || !leads.length) errors.push("case requires materials, accounts and public leads");
  for (const material of materials) {
    if (!material.id.trim() || !material.title.trim() || !material.text.trim() || !material.originId.trim()) errors.push(`material ${material.id} requires identity, title, text and origin`);
    if (!validMinute(material.availableAtMinute)) errors.push(`material ${material.id} has invalid availability minute`);
    if (!material.sourceIds.length) errors.push(`material ${material.id} requires authorized sources`);
    for (const sourceId of material.sourceIds) if (!sourceIds.has(sourceId)) errors.push(`material ${material.id} references unknown source ${sourceId}`);
    for (const sourceId of duplicates(material.sourceIds)) errors.push(`material ${material.id} duplicates authorized source ${sourceId}`);
  }
  for (const source of definition.sources) for (const factId of source.knownFactIds) if (!factIds.has(factId)) errors.push(`source ${source.id} references unknown fact ${factId}`);
  for (const content of definition.contents) {
    if (!sourceIds.has(content.sourceId)) errors.push(`content ${content.id} references unknown source ${content.sourceId}`);
    if (!validMinute(content.publishedAtMinute)) errors.push(`content ${content.id} has invalid publish minute`);
    if ((content.kind === "tv_news" || content.kind === "newspaper") && content.commentsEnabled) errors.push(`traditional media ${content.id} cannot enable comments`);
    for (const claim of content.claims) if (!factIds.has(claim.factId)) errors.push(`content ${content.id} references unknown fact ${claim.factId}`);
    if (!content.title.trim() || !content.body.trim()) errors.push(`content ${content.id} requires title and authoring baseline`);
    if (!content.evidenceOriginIds?.length) errors.push(`content ${content.id} requires evidence origins`);
    for (const originId of content.evidenceOriginIds ?? []) {
      if (!originIds.has(originId)) errors.push(`content ${content.id} references unknown origin ${originId}`);
      else if (!materials.some((material) => material.originId === originId && material.sourceIds.includes(content.sourceId) && material.availableAtMinute <= content.publishedAtMinute)) errors.push(`content ${content.id} has no available authorized material for origin ${originId}`);
    }
    if ((content.kind === "tv_news" || content.kind === "newspaper") && !content.editorial) errors.push(`traditional media ${content.id} requires an editorial task`);
    if (content.editorial) {
      if (!content.editorial.instructions.trim() || !content.editorial.materialIds.length) errors.push(`editorial ${content.id} requires instructions and materials`);
      for (const materialId of content.editorial.materialIds) {
        const material = materialById.get(materialId);
        if (!material) errors.push(`editorial ${content.id} references unknown material ${materialId}`);
        else {
          if (!material.sourceIds.includes(content.sourceId)) errors.push(`editorial ${content.id} is not authorized for material ${materialId}`);
          if (material.availableAtMinute > content.publishedAtMinute) errors.push(`editorial ${content.id} uses future material ${materialId}`);
          if (!content.evidenceOriginIds?.includes(material.originId)) errors.push(`editorial ${content.id} omits origin ${material.originId}`);
        }
      }
    }
  }
  for (const account of accounts) {
    if (!account.id.trim() || !account.displayName.trim() || !account.description.trim()) errors.push(`account ${account.id} requires identity and description`);
    if (account.sourceId && !sourceIds.has(account.sourceId)) errors.push(`account ${account.id} references unknown source ${account.sourceId}`);
    for (const materialId of account.knownMaterialIds) {
      const material = materialById.get(materialId);
      if (!material) errors.push(`account ${account.id} references unknown material ${materialId}`);
      else if (!account.sourceId || !material.sourceIds.includes(account.sourceId)) errors.push(`account ${account.id} is not authorized for material ${materialId}`);
    }
    for (const comment of account.initialComments) {
      const content = contentById.get(comment.contentId);
      if (!content) errors.push(`initial comment ${comment.id} references unknown content ${comment.contentId}`);
      else {
        if (!content.commentsEnabled) errors.push(`initial comment ${comment.id} targets a closed comment section`);
        if (comment.publishedAtMinute < content.publishedAtMinute) errors.push(`initial comment ${comment.id} precedes its content`);
      }
      if (!validMinute(comment.publishedAtMinute) || !comment.text.trim()) errors.push(`initial comment ${comment.id} has invalid text or time`);
    }
  }
  for (const lead of leads) {
    const account = accountById.get(lead.accountId);
    const content = contentById.get(lead.contentId);
    if (!account) errors.push(`lead ${lead.id} references unknown account ${lead.accountId}`);
    if (!content) errors.push(`lead ${lead.id} references unknown content ${lead.contentId}`);
    else {
      if (!content.commentsEnabled) errors.push(`lead ${lead.id} targets a closed comment section`);
      if (lead.availableAtMinute < content.publishedAtMinute) errors.push(`lead ${lead.id} precedes its content`);
    }
    if (!lead.question.trim() || !lead.responseGuidance.trim() || !lead.unlockContentIds.length) errors.push(`lead ${lead.id} requires a question, response guidance and content`);
    const responseMaterialIds = lead.responseMaterialIds ?? [];
    if (!responseMaterialIds.length) errors.push(`lead ${lead.id} requires explicit response materials`);
    for (const materialId of duplicates(responseMaterialIds)) errors.push(`lead ${lead.id} duplicates response material ${materialId}`);
    for (const materialId of responseMaterialIds) {
      const material = materialById.get(materialId);
      if (!material) errors.push(`lead ${lead.id} references unknown response material ${materialId}`);
      else {
        if (!account?.knownMaterialIds.includes(materialId) || !account.sourceId || !material.sourceIds.includes(account.sourceId)) errors.push(`lead ${lead.id} is not authorized for response material ${materialId}`);
        if (material.availableAtMinute > lead.availableAtMinute) errors.push(`lead ${lead.id} uses future response material ${materialId}`);
      }
    }
    if (!validMinute(lead.availableAtMinute) || (lead.expiresAtMinute !== undefined && (!validMinute(lead.expiresAtMinute) || lead.expiresAtMinute <= lead.availableAtMinute))) errors.push(`lead ${lead.id} has invalid response window`);
    for (const prerequisiteId of lead.requiresLeadIds) {
      const prerequisite = leadById.get(prerequisiteId);
      if (!prerequisite) errors.push(`lead ${lead.id} references unknown prerequisite ${prerequisiteId}`);
      else if (lead.expiresAtMinute !== undefined && prerequisite.availableAtMinute >= lead.expiresAtMinute) errors.push(`lead ${lead.id} expires before prerequisite ${prerequisiteId} is available`);
    }
    for (const contentId of lead.unlockContentIds) {
      const unlocked = contentById.get(contentId);
      if (!unlocked) {
        errors.push(`lead ${lead.id} references unknown unlocked content ${contentId}`);
        continue;
      }
      for (const materialId of unlocked.editorial?.materialIds ?? []) {
        const material = materialById.get(materialId);
        if (material && material.availableAtMinute > lead.availableAtMinute) errors.push(`lead ${lead.id} unlocks unavailable editorial material ${materialId}`);
      }
      for (const originId of unlocked.evidenceOriginIds ?? []) {
        if (!responseMaterialIds.some((materialId) => materialById.get(materialId)?.originId === originId)) errors.push(`lead ${lead.id} omits response material for unlocked origin ${originId}`);
        if (account && !account.knownMaterialIds.some((materialId) => {
          const material = materialById.get(materialId);
          return material?.originId === originId && material.availableAtMinute <= lead.availableAtMinute && !!account.sourceId && material.sourceIds.includes(account.sourceId);
        })) errors.push(`lead ${lead.id} exceeds account knowledge for origin ${originId}`);
      }
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visitLead = (id: string): void => {
    if (visiting.has(id)) {
      errors.push(`cyclic lead prerequisites: ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of leadById.get(id)?.requiresLeadIds ?? []) if (leadById.has(prerequisite)) visitLead(prerequisite);
    visiting.delete(id);
    visited.add(id);
  };
  for (const lead of leads) visitLead(lead.id);
  for (const group of definition.groups) for (const factId of group.narrativeFactIds) if (!factIds.has(factId)) errors.push(`group ${group.id} references unknown fact ${factId}`);
  if (definition.stages[0]?.startsAtMinute !== 0) errors.push("first stage must start at minute 0");
  if (definition.stages.some((stage, index) => !validMinute(stage.startsAtMinute) || (index > 0 && stage.startsAtMinute <= definition.stages[index - 1]!.startsAtMinute))) errors.push("stages must be strictly ordered within the event duration");
  if (definition.contents.length === 0 || contentIds.size === 0 || groupIds.size === 0) errors.push("case requires content and groups");
  errors.push(...validateReportRubric(definition));
  return errors;
}

export function assertValidCase(definition: CaseDefinition): CaseDefinition {
  const errors = validateCase(definition);
  if (errors.length) throw new Error(`Invalid case ${definition.id}:\n${errors.join("\n")}`);
  return definition;
}
