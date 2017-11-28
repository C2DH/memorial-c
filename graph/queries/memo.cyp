// name: get_nodes
//
MATCH (mem:memorialc:memo)
RETURN mem
LIMIT {limit}

// name: merge
//
MERGE (mem:memorialc:memo {uid:{uid}})
SET mem.year = {year}
RETURN mem
