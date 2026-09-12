import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import { sortTaskDependencyDag } from "../queries";

describe("task DAG dependency resolution & topological sorting", () => {
  it("sorts linear parent-to-child chain in correct execution order", () => {
    const taskA = Keypair.generate().publicKey;
    const taskB = Keypair.generate().publicKey; // depends on A
    const taskC = Keypair.generate().publicKey; // depends on B

    const result = sortTaskDependencyDag([
      { taskPda: taskC, dependsOn: taskB },
      { taskPda: taskB, dependsOn: taskA },
      { taskPda: taskA, dependsOn: null },
    ]);

    expect(result.hasCycle).toBe(false);
    expect(result.sortedTaskPdas).toHaveLength(3);
    const indexA = result.sortedTaskPdas.findIndex((p) => p.equals(taskA));
    const indexB = result.sortedTaskPdas.findIndex((p) => p.equals(taskB));
    const indexC = result.sortedTaskPdas.findIndex((p) => p.equals(taskC));

    expect(indexA).toBeLessThan(indexB);
    expect(indexB).toBeLessThan(indexC);
  });

  it("sorts diamond dependency DAG with multiple parents correctly", () => {
    const root = Keypair.generate().publicKey;
    const branch1 = Keypair.generate().publicKey; // depends on root
    const branch2 = Keypair.generate().publicKey; // depends on root
    const sink = Keypair.generate().publicKey; // depends on branch1 (and implicitly branch2)

    const result = sortTaskDependencyDag([
      { taskPda: sink, dependsOn: branch1 },
      { taskPda: branch1, dependsOn: root },
      { taskPda: branch2, dependsOn: root },
      { taskPda: root, dependsOn: null },
    ]);

    expect(result.hasCycle).toBe(false);
    expect(result.sortedTaskPdas).toHaveLength(4);

    const indexRoot = result.sortedTaskPdas.findIndex((p) => p.equals(root));
    const indexB1 = result.sortedTaskPdas.findIndex((p) => p.equals(branch1));
    const indexB2 = result.sortedTaskPdas.findIndex((p) => p.equals(branch2));
    const indexSink = result.sortedTaskPdas.findIndex((p) => p.equals(sink));

    expect(indexRoot).toBeLessThan(indexB1);
    expect(indexRoot).toBeLessThan(indexB2);
    expect(indexB1).toBeLessThan(indexSink);
  });

  it("detects 3-node circular dependency and returns cycle nodes", () => {
    const task1 = Keypair.generate().publicKey;
    const task2 = Keypair.generate().publicKey;
    const task3 = Keypair.generate().publicKey;

    const result = sortTaskDependencyDag([
      { taskPda: task1, dependsOn: task3 },
      { taskPda: task2, dependsOn: task1 },
      { taskPda: task3, dependsOn: task2 },
    ]);

    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodes).toBeDefined();
    expect(result.cycleNodes!.length).toBe(3);
  });

  it("detects self-referential cycle", () => {
    const selfTask = Keypair.generate().publicKey;

    const result = sortTaskDependencyDag([
      { taskPda: selfTask, dependsOn: selfTask },
    ]);

    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodes).toHaveLength(1);
    expect(result.cycleNodes![0].equals(selfTask)).toBe(true);
  });

  it("handles independent disconnected root tasks gracefully", () => {
    const root1 = Keypair.generate().publicKey;
    const root2 = Keypair.generate().publicKey;
    const root3 = Keypair.generate().publicKey;

    const result = sortTaskDependencyDag([
      { taskPda: root1, dependsOn: null },
      { taskPda: root2, dependsOn: null },
      { taskPda: root3, dependsOn: null },
    ]);

    expect(result.hasCycle).toBe(false);
    expect(result.sortedTaskPdas).toHaveLength(3);
  });
});
