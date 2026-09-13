'use client';

import { useState } from 'react';
import { SubmissionContent, SubmissionEntity, SubmissionRelationship, EntityKind, RelationshipType } from '@/lib/types';

const ENTITY_KINDS: EntityKind[] = ['class', 'interface', 'enum'];
const RELATIONSHIP_TYPES: RelationshipType[] = ['inherits', 'implements', 'composes', 'aggregates', 'uses'];

function emptyEntity(): SubmissionEntity {
  return { name: '', kind: 'class', responsibilities: [''] };
}

function emptyRelationship(): SubmissionRelationship {
  return { from: '', to: '', type: 'uses' };
}

export function SolutionEditor({
  onSubmit,
  submitting,
  serverIssues,
}: {
  onSubmit: (content: SubmissionContent) => Promise<void>;
  submitting: boolean;
  serverIssues: string[] | null;
}) {
  const [entities, setEntities] = useState<SubmissionEntity[]>([emptyEntity()]);
  const [relationships, setRelationships] = useState<SubmissionRelationship[]>([]);
  const [rationale, setRationale] = useState('');
  const [localIssues, setLocalIssues] = useState<string[]>([]);

  function updateEntity(index: number, patch: Partial<SubmissionEntity>) {
    setEntities((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function updateResponsibility(entityIndex: number, respIndex: number, value: string) {
    setEntities((prev) =>
      prev.map((e, i) =>
        i === entityIndex ? { ...e, responsibilities: e.responsibilities.map((r, ri) => (ri === respIndex ? value : r)) } : e,
      ),
    );
  }

  function addResponsibility(entityIndex: number) {
    setEntities((prev) => prev.map((e, i) => (i === entityIndex ? { ...e, responsibilities: [...e.responsibilities, ''] } : e)));
  }

  function removeResponsibility(entityIndex: number, respIndex: number) {
    setEntities((prev) =>
      prev.map((e, i) => (i === entityIndex ? { ...e, responsibilities: e.responsibilities.filter((_, ri) => ri !== respIndex) } : e)),
    );
  }

  function addEntity() {
    setEntities((prev) => [...prev, emptyEntity()]);
  }

  function removeEntity(index: number) {
    setEntities((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRelationship(index: number, patch: Partial<SubmissionRelationship>) {
    setRelationships((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRelationship() {
    setRelationships((prev) => [...prev, emptyRelationship()]);
  }

  function removeRelationship(index: number) {
    setRelationships((prev) => prev.filter((_, i) => i !== index));
  }

  function validateLocally(): string[] {
    const issues: string[] = [];
    if (entities.length === 0) issues.push('Add at least one class or interface.');
    for (const e of entities) {
      if (!e.name.trim()) issues.push('Every entity needs a name.');
      if (e.responsibilities.filter((r) => r.trim()).length === 0) {
        issues.push(`"${e.name || 'An entity'}" needs at least one responsibility.`);
      }
    }
    if (rationale.trim().length < 10) issues.push('Add a short rationale explaining your key design decisions.');
    return issues;
  }

  async function handleSubmit() {
    const issues = validateLocally();
    setLocalIssues(issues);
    if (issues.length > 0) return;

    const content: SubmissionContent = {
      entities: entities.map((e) => ({ ...e, responsibilities: e.responsibilities.filter((r) => r.trim()) })),
      relationships: relationships.filter((r) => r.from && r.to),
      rationale,
    };
    await onSubmit(content);
  }

  const allIssues = [...localIssues, ...(serverIssues ?? [])];

  return (
    <div>
      <div className="panel">
        <h3>Your design</h3>

        {allIssues.length > 0 && (
          <div className="error-banner">
            Fix the following before submitting:
            <ul>
              {allIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {entities.map((entity, ei) => (
          <div className="entity-card" key={ei}>
            <div className="entity-card-head">
              <input
                className="entity-name-input"
                placeholder="EntityName"
                value={entity.name}
                onChange={(e) => updateEntity(ei, { name: e.target.value })}
              />
              <select className="kind-select" value={entity.kind} onChange={(e) => updateEntity(ei, { kind: e.target.value as EntityKind })}>
                {ENTITY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button className="icon-btn" onClick={() => removeEntity(ei)} aria-label="Remove entity" type="button">
                ✕
              </button>
            </div>
            {entity.responsibilities.map((resp, ri) => (
              <div className="responsibility-row" key={ri}>
                <input
                  className="responsibility-input"
                  placeholder="Responsibility (what this entity is in charge of)"
                  value={resp}
                  onChange={(e) => updateResponsibility(ei, ri, e.target.value)}
                />
                <button className="icon-btn" onClick={() => removeResponsibility(ei, ri)} aria-label="Remove responsibility" type="button">
                  ✕
                </button>
              </div>
            ))}
            <button className="btn btn-quiet" onClick={() => addResponsibility(ei)} type="button">
              + Responsibility
            </button>
          </div>
        ))}

        <button className="btn btn-secondary" onClick={addEntity} type="button">
          + Add class / interface
        </button>

        <h3 style={{ marginTop: 28 }}>Relationships</h3>
        {relationships.map((rel, ri) => (
          <div className="relationship-row" key={ri}>
            <input placeholder="From entity" value={rel.from} onChange={(e) => updateRelationship(ri, { from: e.target.value })} />
            <select value={rel.type} onChange={(e) => updateRelationship(ri, { type: e.target.value as RelationshipType })}>
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input placeholder="To entity" value={rel.to} onChange={(e) => updateRelationship(ri, { to: e.target.value })} />
            <button className="icon-btn" onClick={() => removeRelationship(ri)} aria-label="Remove relationship" type="button">
              ✕
            </button>
          </div>
        ))}
        <button className="btn btn-secondary" onClick={addRelationship} type="button">
          + Add relationship
        </button>

        <h3 style={{ marginTop: 28 }}>Rationale</h3>
        <p className="history-meta">
          Explain your key decisions and trade-offs — this is where you justify choices that aren&apos;t obvious from the diagram alone.
        </p>
        <textarea
          className="rationale-textarea"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="e.g. I modeled PricingStrategy as an interface because the requirements mention fees varying by vehicle size and duration..."
        />

        <div className="form-actions">
          <button className="btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
