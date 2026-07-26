export interface RouteCandidate {
  path: number[];
  totalDuration: number;
}

export class RerouteAlgorithm {
  /**
   * Finds up to three alternative paths through an unweighted directed graph
   * using a breadth-first search that avoids revisiting nodes.
   *
   * @param graph - Adjacency list where each key is a node and the value is the list of reachable nodes.
   * @param start - The node id to start the search from.
   * @param goal - The node id to reach.
   * @returns A list of route candidates ordered by discovery order. Each candidate contains the
   *          full node path and a total duration (currently one unit per edge).
   */
  static findAlternatives(graph: Record<number, number[]>, start: number, goal: number): RouteCandidate[] {
    const queue = [{ path: [start], totalDuration: 0 }];
    const results: RouteCandidate[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      if (current.path[current.path.length - 1] === goal) {
        results.push(current);
        if (results.length >= 3) break;
        continue;
      }

      for (const next of graph[current.path[current.path.length - 1]] || []) {
        if (!current.path.includes(next)) {
          queue.push({ path: [...current.path, next], totalDuration: current.totalDuration + 1 });
        }
      }
    }

    return results;
  }
}
