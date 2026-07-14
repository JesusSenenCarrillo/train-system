export interface RouteCandidate {
  path: number[];
  totalDuration: number;
}

export class RerouteAlgorithm {
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
