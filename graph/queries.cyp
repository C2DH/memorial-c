// name: setup
// only once, set indexes
CREATE CONSTRAINT ON (mem:memo) ASSERT mem.uid  IS UNIQUE
CREATE CONSTRAINT ON (rec:record) ASSERT rec.uid  IS UNIQUE
CREATE CONSTRAINT ON (men:mention) ASSERT men.uid  IS UNIQUE
CREATE CONSTRAINT ON (ent:entity) ASSERT ent.uid  IS UNIQUE

// name: create_record
//
CREATE (rec:record {Project:'memorialc', uid:{record_uid}, type:{type}})
WITH rec
MATCH (mem:memo {Project:'memorialc', uid:{memo_uid}})
MERGE (rec)-[r:published_in]->(mem)
RETURN r


// name: create_mention
// registered mention of an enterprise in a record
MERGE (men:mention {Project:'memorialc', uid:{mention_uid}})
WITH men
MATCH (rec:record {Project:'memorialc', uid:{record_uid}})
MERGE (men)-[r:mentioned_in]->(rec)
return r

// name: merge_relationship_record_memo
//
MATCH (rec:record {Project:'memorialc', uid:{record_uid}}), (mem:memo {Project:'memorialc', uid:{memo_uid}})
MERGE (rec)-[r:published_in]->(mem)
RETURN r

// name: create_memo
//
CREATE (mem:memo {Project:'memorialc', uid:{memo_uid}})
  SET mem.year = {year}
RETURN mem

// name: create_location
//
MERGE (ent:entity:location {Project:'memorialc', uid:{entity_uid}})
  ON CREATE SET
    ent.name = {name}
WITH ent
  MATCH (rec:record {Project:'memorialc', uid:{record_uid}})
  MERGE (ent)-[r:appears_in]->(rec)
  ON CREATE SET
    r.splitpoints = {splitpoints}
RETURN r

// name: create_person
//
MERGE (ent:entity:person {Project:'memorialc', uid:{entity_uid}})
  ON CREATE SET
    ent.name = {name}
WITH ent
  MATCH (rec:record {Project:'memorialc', uid:{record_uid}})
  MERGE (ent)-[r:appears_in]->(rec)
  ON CREATE SET
    r.splitpoints = {splitpoints}
RETURN r

// name: create_organization
//
MERGE (ent:entity:organization {Project:'memorialc', uid:{entity_uid}})
  ON CREATE SET
    ent.name = {name}
WITH ent
  MATCH (rec:record {Project:'memorialc', uid:{record_uid}})
  MERGE (ent)-[r:appears_in]->(rec)
  ON CREATE SET
    r.splitpoints = {splitpoints}
RETURN r