import useEvent from 'rc-util/lib/hooks/useEvent';
import * as React from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import channelUpdate from './channelUpdate';

type Updater<T> = T | ((origin: T) => T);

type UpdateCallbackFunc = VoidFunction;

type NotifyEffectUpdate = (callback: UpdateCallbackFunc) => void;

/**
 * Batcher for record any `useEffectState` need update.
 */
export function useBatcher() {
  // Updater Trigger
  const updateFuncRef = React.useRef<UpdateCallbackFunc[]>(null);

  // Notify update
  const notifyEffectUpdate: NotifyEffectUpdate = callback => {
    if (!updateFuncRef.current) {
      // 这里相当于也是一个批处理操作
      updateFuncRef.current = [];
      // 利用 messageChannel 触发一个宏任务来清空 待更新的任务队列
      channelUpdate(() => {
        unstable_batchedUpdates(() => {
          updateFuncRef.current.forEach(fn => {
            fn();
          });
          updateFuncRef.current = null;
        });
      });
    }

    updateFuncRef.current.push(callback);
  };

  return notifyEffectUpdate;
}

/**
 * Trigger state update by `useLayoutEffect` to save perf.
 */
export default function useEffectState<T extends string | number | object>(
  notifyEffectUpdate: NotifyEffectUpdate,
  defaultValue?: T,
): [T, (value: Updater<T>) => void] {
  // Value
  const [stateValue, setStateValue] = React.useState(defaultValue);

  // Set State
  const setEffectVal = useEvent((nextValue: Updater<T>) => {
    notifyEffectUpdate(() => {
      setStateValue(nextValue);
    });
  });

  return [stateValue, setEffectVal];
}
