import { useCallback, useState } from 'react';
import type { TaskInfo, WSMessage } from '../types';
import { INITIAL_TASKS } from '../data/onChainData';

interface UseTasksOptions {
  send: (msg: Record<string, unknown>) => void;
}

export interface ClaimResult {
  rewardSol: number;
  txHash: string;
  task: TaskInfo;
}

export interface UseTasksReturn {
  tasks: TaskInfo[];
  refresh: () => void;
  create: (params: Record<string, unknown>) => void;
  cancel: (taskId: string) => void;
  claim: (taskId: string, workerName?: string) => ClaimResult | null;
}

export function useTasks({ send }: UseTasksOptions): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskInfo[]>(INITIAL_TASKS);

  const refresh = useCallback(() => {
    send({ type: 'tasks.list' });
  }, [send]);

  const create = useCallback((params: Record<string, unknown>) => {
    const rewardStr =
      typeof params.reward === 'number'
        ? `${params.reward} SOL`
        : typeof params.reward === 'string' && params.reward
        ? params.reward.includes('SOL') ? params.reward : `${params.reward} SOL`
        : '0 SOL';

    const optimisticTask: TaskInfo = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      description: (params.description as string) || 'New Task',
      reward: rewardStr,
      status: 'open',
      creator: 'tetsuo',
      worker: undefined,
    };
    setTasks((prev) => [optimisticTask, ...prev]);
    send({ type: 'tasks.create', payload: { params } });
  }, [send]);

  const cancel = useCallback((taskId: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'cancelled' } : t));
    send({ type: 'tasks.cancel', payload: { taskId } });
  }, [send]);

  const claim = useCallback((taskId: string, workerName = 'agenc-quant-executor.sol') => {
    let result: ClaimResult | null = null;
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let randomSig = '';
    for (let i = 0; i < 44; i++) {
      randomSig += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const txHash = `5Kq${randomSig.slice(0, 8)}...JuP8`;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const match = t.reward?.match(/([\d.]+)\s*SOL/i);
          const rewardSol = match ? parseFloat(match[1]) : 0.25;
          const updated: TaskInfo = {
            ...t,
            status: 'completed',
            worker: `${workerName} (Agent Claimed)`,
          };
          result = {
            rewardSol,
            txHash,
            task: updated,
          };
          return updated;
        }
        return t;
      })
    );

    send({
      type: 'tasks.claim',
      payload: { taskId, worker: workerName, txHash },
    });

    return result;
  }, [send]);

  const handleMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'tasks.list') {
      const incoming = (msg.payload as TaskInfo[]) ?? [];
      if (incoming.length > 0) {
        setTasks(incoming);
      }
    }
  }, []);

  return { tasks, refresh, create, cancel, claim, handleMessage } as UseTasksReturn & { handleMessage: (msg: WSMessage) => void };
}
