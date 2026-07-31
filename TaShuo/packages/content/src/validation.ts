import type { CaseDefinition } from "@tashuo/core";

const duplicates = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);

export function validateCase(definition: CaseDefinition): string[] {
  const errors: string[] = [];
  const factIds = new Set(definition.facts.map((fact) => fact.id));
  const sourceIds = new Set(definition.sources.map((source) => source.id));
  const contentIds = new Set(definition.contents.map((content) => content.id));
  const groupIds = new Set(definition.groups.map((group) => group.id));
  for (const id of duplicates(definition.facts.map((fact) => fact.id))) errors.push(`duplicate fact: ${id}`);
  for (const id of duplicates(definition.sources.map((source) => source.id))) errors.push(`duplicate source: ${id}`);
  for (const id of duplicates(definition.contents.map((content) => content.id))) errors.push(`duplicate content: ${id}`);
  for (const id of duplicates(definition.groups.map((group) => group.id))) errors.push(`duplicate group: ${id}`);
  for (const source of definition.sources) for (const factId of source.knownFactIds) if (!factIds.has(factId)) errors.push(`source ${source.id} references unknown fact ${factId}`);
  for (const content of definition.contents) {
    if (!sourceIds.has(content.sourceId)) errors.push(`content ${content.id} references unknown source ${content.sourceId}`);
    if (content.publishedAtMinute < 0 || content.publishedAtMinute > definition.durationMinutes) errors.push(`content ${content.id} has invalid publish minute`);
    if ((content.kind === "tv_news" || content.kind === "newspaper") && content.commentsEnabled) errors.push(`traditional media ${content.id} cannot enable comments`);
    for (const claim of content.claims) if (!factIds.has(claim.factId)) errors.push(`content ${content.id} references unknown fact ${claim.factId}`);
  }
  for (const group of definition.groups) for (const factId of group.narrativeFactIds) if (!factIds.has(factId)) errors.push(`group ${group.id} references unknown fact ${factId}`);
  if (definition.stages[0]?.startsAtMinute !== 0) errors.push("first stage must start at minute 0");
  if (definition.contents.length === 0 || contentIds.size === 0 || groupIds.size === 0) errors.push("case requires content and groups");
  return errors;
}

export function assertValidCase(definition: CaseDefinition): CaseDefinition {
  const errors = validateCase(definition);
  if (errors.length) throw new Error(`Invalid case ${definition.id}:\n${errors.join("\n")}`);
  return definition;
}
