import React, { useState } from 'react';

interface CounterProps {
  initialValue?: number;
  step?: number;
  title?: string;
}

interface CounterState {
  value: number;
  history: number[];
}

const Counter: React.FC<CounterProps> = ({ 
  initialValue = 0, 
  step = 1, 
  title = "Counter" 
}) => {
  const [state, setState] = useState<CounterState>({
    value: initialValue,
    history: [initialValue]
  });

  const increment = (): void => {
    const newValue = state.value + step;
    setState({
      value: newValue,
      history: [...state.history, newValue]
    });
  };

  const decrement = (): void => {
    const newValue = state.value - step;
    setState({
      value: newValue,
      history: [...state.history, newValue]
    });
  };

  const reset = (): void => {
    setState({
      value: initialValue,
      history: [initialValue]
    });
  };

  return (
    <div className="counter">
      <h2>{title}</h2>
      <div className="counter-display">
        <span className="counter-value">{state.value}</span>
      </div>
      <div className="counter-controls">
        <button onClick={decrement} type="button">
          - {step}
        </button>
        <button onClick={reset} type="button">
          Reset
        </button>
        <button onClick={increment} type="button">
          + {step}
        </button>
      </div>
      <div className="counter-history">
        <p>History: {state.history.join(' → ')}</p>
      </div>
    </div>
  );
};

export default Counter;