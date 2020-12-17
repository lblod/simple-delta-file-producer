import { LOG_DELTA_REWRITE } from './config.js';
import { querySudo as query } from '@lblod/mu-auth-sudo';

const ignoredTypes = [
  'http://mu.semte.ch/vocabularies/ext/SyncTask',
];

/**
 * Rewrites the incoming delta to a delta relevant for the mandatee export
 */
export async function enrichDeltaFile(deltaFile) {
  const enrichedDelta = [];
  for (let changeSet of deltaFile.delta) {

    const updated = {inserts: [], deletes: []};

    if (LOG_DELTA_REWRITE)
      console.log(`Rewriting inserted changeSet containing ${changeSet.inserts.length} triples`);
    updated.inserts.push(...await rewriteTriples(changeSet.inserts));

    if (LOG_DELTA_REWRITE)
      console.log(`Rewriting deleted changeSet containing ${changeSet.deletes.length} triples`);
    updated.deletes.push(...await rewriteTriples(changeSet.deletes));

    if (updated.inserts.length || updated.deletes.length)
      enrichedDelta.push(updated);
  }
  deltaFile.delta = enrichedDelta;
}

/**
 * Rewrites the given triples so that it only contains the ones relevant to mandatee.
 *
 * For now this only includes ignoring a fixed set of types defined in the variable "ignoredTypes"
 */
async function rewriteTriples(triples) {
  let cleared = [];
  for (let triple of triples) {
    if (await isTripleCleared(triple)) {
      cleared.push(triple);
    }
  }
  return cleared;
}

/**
 * Returns if the given triple is not to be ignored
 *
 * TODO: Handle better the case of deleted triples, for which the type could already be deleted from
 *       the db.
 */
async function isTripleCleared(triple) {
  let cleared = true;
  for (let type of ignoredTypes) {
    cleared = !(await hasType(triple, type));
  }
  return cleared;
}

/**
 * @returns if the given triple is of the given type.
 */
async function hasType(triple, type) {
  const result = await query(`
    SELECT * WHERE {
      <${triple.subject.value}> a <${type}> ;
                                ?p ?o .
    }
  `);
  return result.results.bindings.length !== 0;
}