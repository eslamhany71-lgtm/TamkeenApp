
import React, { useState } from 'react';

interface CalculatorProps {
  onBack: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onBack }) => {
  const [display, setDisplay] = useState('0');
  
  const handleDigit = (digit: string) => {
    setDisplay(prev => prev === '0' ? digit : prev + digit);
  };

  const handleClear = () => setDisplay('0');

  const calculate = () => {
    try {
      // Basic eval for demo purposes
      // eslint-disable-next-line no-eval
      setDisplay(String(eval(display)));
    } catch {
      setDisplay('Error');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <button 
        onClick={onBack}
        className="mb-6 text-slate-600 hover:text-blue-600 flex items-center gap-2"
      >
        <i className="fa-solid fa-arrow-right"></i> العودة للرئيسية
      </button>

      <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-slate-800 p-4 rounded-xl mb-6 text-right text-white text-4xl font-mono overflow-hidden h-20 flex items-end justify-end">
          {display}
        </div>
        
        <div className="grid grid-cols-4 gap-3">
          {['7', '8', '9', '/'].map(btn => (
            <button key={btn} onClick={() => handleDigit(btn)} className="h-14 bg-slate-700 text-white rounded-xl hover:bg-slate-600 text-xl">{btn}</button>
          ))}
          {['4', '5', '6', '*'].map(btn => (
            <button key={btn} onClick={() => handleDigit(btn)} className="h-14 bg-slate-700 text-white rounded-xl hover:bg-slate-600 text-xl">{btn}</button>
          ))}
          {['1', '2', '3', '-'].map(btn => (
            <button key={btn} onClick={() => handleDigit(btn)} className="h-14 bg-slate-700 text-white rounded-xl hover:bg-slate-600 text-xl">{btn}</button>
          ))}
          <button onClick={handleClear} className="h-14 bg-red-600 text-white rounded-xl hover:bg-red-500 text-xl col-span-1">C</button>
          <button onClick={() => handleDigit('0')} className="h-14 bg-slate-700 text-white rounded-xl hover:bg-slate-600 text-xl">0</button>
          <button onClick={calculate} className="h-14 bg-blue-600 text-white rounded-xl hover:bg-blue-500 text-xl">=</button>
          <button onClick={() => handleDigit('+')} className="h-14 bg-slate-700 text-white rounded-xl hover:bg-slate-600 text-xl">+</button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
