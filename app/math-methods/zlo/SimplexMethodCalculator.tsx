'use client';

import React, { useState } from 'react';
import { format } from 'mathjs';

type Tableau = {
  headers: string[];
  matrix: number[][];
  basis: number[];
  pivot?: { row: number; col: number };
};

interface ConstraintInput {
  id: number;
  value: string;
}

const SimplexMethodCalculator: React.FC = () => {
  const [objective, setObjective] = useState('x1 + 2*x2');
  const [constraints, setConstraints] = useState<ConstraintInput[]>([
    { id: 1, value: '2*x1 + 3*x2 <= 12' },
    { id: 2, value: 'x1 + 5*x2 <= 15' },
  ]);
  const [results, setResults] = useState<React.ReactNode | null>(null);

  const handleAddConstraint = () => {
    setConstraints([...constraints, { id: Date.now(), value: '' }]);
  };

  const handleRemoveConstraint = (id: number) => {
    setConstraints(constraints.filter(c => c.id !== id));
  };

  const handleConstraintChange = (id: number, value: string) => {
    setConstraints(constraints.map(c => (c.id === id ? { ...c, value } : c)));
  };

  const calculate = () => {
    try {
      // 1. Parse Inputs and Standardize
      const allVars = new Set<string>();
      [objective, ...constraints.map(c => c.value)].forEach(str => {
        const matches = str.match(/x\d+/g);
        if (matches) {
          matches.forEach(v => allVars.add(v));
        }
      });

      const decisionVars = Array.from(allVars).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
      const slackVars = constraints.map((_, i) => `s${i + 1}`);
      const varHeaders = [...decisionVars, ...slackVars];
      const Cj = new Array(varHeaders.length).fill(0);

      // Parse objective function
      const objParts = objective.replace(/\s/g, '').split(/(?=[+-])/);
      objParts.forEach(part => {
        const match = part.match(/([+-]?\d*\.?\d*)\*?(x\d+)/);
        if (match) {
          const [, coeff, variable] = match;
          const value = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
          const index = varHeaders.indexOf(variable);
          if (index !== -1) Cj[index] = value;
        }
      });
      
      // Parse constraints and build matrix
      const matrix: number[][] = [];
      const basis: number[] = [];
      constraints.forEach((constraint, i) => {
        const row = new Array(varHeaders.length + 1).fill(0); // +1 for RHS
        const [lhs, rhsStr] = constraint.value.split(/<=/);
        row[row.length - 1] = parseFloat(rhsStr);
        
        const lhsParts = lhs.replace(/\s/g, '').split(/(?=[+-])/);
        lhsParts.forEach(part => {
            const match = part.match(/([+-]?\d*\.?\d*)\*?(x\d+)/);
            if (match) {
                const [, coeff, variable] = match;
                const value = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
                const index = varHeaders.indexOf(variable);
                if (index !== -1) row[index] = value;
            }
        });

        // Add slack variable
        const slackIndex = varHeaders.indexOf(slackVars[i]);
        row[slackIndex] = 1;
        basis.push(slackIndex);
        matrix.push(row);
      });

      let currentTableau: Tableau = { headers: ['Basis', ...varHeaders, 'RHS'], matrix, basis };
      const steps: Tableau[] = [];

      // 2. Iterative Process
      for (let iter = 0; iter < 20; iter++) { // Safety break
        const Zj = new Array(varHeaders.length + 1).fill(0);
        const Cj_Zj = new Array(varHeaders.length).fill(0);

        // Calculate Zj and Cj-Zj
        for (let j = 0; j < varHeaders.length; j++) {
            let sum = 0;
            for (let i = 0; i < currentTableau.matrix.length; i++) {
                sum += Cj[currentTableau.basis[i]] * currentTableau.matrix[i][j];
            }
            Zj[j] = sum;
            Cj_Zj[j] = Cj[j] - Zj[j];
        }
        Zj[Zj.length - 1] = currentTableau.basis.reduce((sum, basisIndex, i) => sum + Cj[basisIndex] * currentTableau.matrix[i][varHeaders.length], 0);

        const fullMatrix = currentTableau.matrix.map(row => [...row]);
        fullMatrix.push(Zj);
        fullMatrix.push([...Cj_Zj, NaN]); // Add NaN for RHS cell
        steps.push({ ...currentTableau, matrix: fullMatrix });
        
        // Check for optimality
        const max_Cj_Zj = Math.max(...Cj_Zj);
        if (max_Cj_Zj <= 0) break;

        // Find pivot column
        const pivotCol = Cj_Zj.indexOf(max_Cj_Zj);

        // Find pivot row
        let minRatio = Infinity;
        let pivotRow = -1;
        for (let i = 0; i < currentTableau.matrix.length; i++) {
            const pivotColValue = currentTableau.matrix[i][pivotCol];
            const rhsValue = currentTableau.matrix[i][varHeaders.length];
            if (pivotColValue > 1e-9) {
                const ratio = rhsValue / pivotColValue;
                if (ratio < minRatio) {
                    minRatio = ratio;
                    pivotRow = i;
                }
            }
        }

        if (pivotRow === -1) {
          throw new Error("Неограниченное решение.");
        }
        
        steps[steps.length - 1].pivot = { row: pivotRow, col: pivotCol + 1 }; // +1 to account for basis column

        // Perform pivot operation
        const newMatrix: number[][] = [];
        const pivotElement = currentTableau.matrix[pivotRow][pivotCol];
        const newPivotRowValues = currentTableau.matrix[pivotRow].map(val => val / pivotElement);

        for (let i = 0; i < currentTableau.matrix.length; i++) {
            if (i === pivotRow) {
                newMatrix.push(newPivotRowValues);
            } else {
                const pivotColCoeff = currentTableau.matrix[i][pivotCol];
                const newRow = currentTableau.matrix[i].map((val, j) => val - pivotColCoeff * newPivotRowValues[j]);
                newMatrix.push(newRow);
            }
        }
        const newBasis = [...currentTableau.basis];
        newBasis[pivotRow] = pivotCol;
        currentTableau = { headers: currentTableau.headers, matrix: newMatrix, basis: newBasis };
      }

      // 3. Format and Display Results
      const solution = `Оптимальное решение найдено.\nМаксимальное значение F = ${format(steps[steps.length-1].matrix[steps[steps.length-1].matrix.length-2][varHeaders.length], {notation: 'fixed', precision: 4})}\n`;
      const variables = varHeaders.map((v,i) => {
        const basisIndex = steps[steps.length-1].basis.indexOf(i);
        if(basisIndex !== -1) {
            return `${v} = ${format(steps[steps.length-1].matrix[basisIndex][varHeaders.length], {notation: 'fixed', precision: 4})}`
        }
        return `${v} = 0`;
      }).join(', ');
      
      setResults(
        <div>
          {steps.map((tableau, i) => (
            <div key={i} className="mb-6">
              <h4 className="font-semibold mb-2">Итерация {i + 1}</h4>
              <table className="table-auto border-collapse border border-gray-400 w-full text-center">
                <thead>
                  <tr>
                    {tableau.headers.map(h => <th key={h} className="border border-gray-300 p-2 bg-gray-100">{h}</th>)}
                    <th className="border border-gray-300 p-2 bg-gray-100">Cj</th>
                  </tr>
                </thead>
                <tbody>
                  {tableau.matrix.slice(0, tableau.matrix.length - 2).map((row, r_idx) => (
                    <tr key={r_idx}>
                      <td className="border border-gray-300 p-2 font-semibold bg-gray-50">{varHeaders[tableau.basis[r_idx]]}</td>
                      {row.map((cell, c_idx) => (
                        <td key={c_idx} className={`border border-gray-300 p-2 ${tableau.pivot?.row === r_idx && tableau.pivot?.col === c_idx ? 'bg-yellow-200' : ''}`}>
                          {format(cell, {notation: 'fixed', precision: 2})}
                        </td>
                      ))}
                      <td className="border border-gray-300 p-2 bg-gray-100">{Cj[tableau.basis[r_idx]]}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border border-gray-300 p-2 font-semibold bg-gray-50">Zj</td>
                    {tableau.matrix[tableau.matrix.length-2].map((cell, c_idx) => (
                      <td key={c_idx} className="border border-gray-300 p-2 font-semibold">{format(cell, {notation: 'fixed', precision: 2})}</td>
                    ))}
                    <td className="border border-gray-300 p-2 bg-gray-100"></td>
                  </tr>
                   <tr>
                    <td className="border border-gray-300 p-2 font-semibold bg-gray-50">Cj - Zj</td>
                    {tableau.matrix[tableau.matrix.length-1].map((cell, c_idx) => (
                      <td key={c_idx} className="border border-gray-300 p-2 font-semibold">{isNaN(cell) ? '' : format(cell, {notation: 'fixed', precision: 2})}</td>
                    ))}
                    <td className="border border-gray-300 p-2 bg-gray-100"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-md">
            <h4 className="font-bold text-green-800">Результат</h4>
            <p className="text-green-700 whitespace-pre-wrap">{solution}{variables}</p>
          </div>
        </div>
      );
    } catch (e) {
      setResults(<p className="text-red-500">{(e as Error).message}</p>);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Симплекс-метод</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Целевая функция (для максимизации)</label>
          <div className="flex items-center mt-1">
            <span className="text-gray-500 mr-2">F =</span>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., x1 + 2*x2"
            />
             <span className="ml-2 text-gray-500">→ max</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ограничения (в форме ≤)</label>
          <div className="space-y-2 mt-1">
            {constraints.map((constraint) => (
              <div key={constraint.id} className="flex items-center">
                <input
                  type="text"
                  value={constraint.value}
                  onChange={(e) => handleConstraintChange(constraint.id, e.target.value)}
                  className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 2*x1 + 3*x2 <= 12"
                />
                <button
                  onClick={() => handleRemoveConstraint(constraint.id)}
                  className="ml-2 p-2 text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddConstraint}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + Добавить ограничение
          </button>
        </div>
        <button
          onClick={calculate}
          className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Рассчитать
        </button>
      </div>
      {results && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Результаты</h3>
          <div className="mt-2 text-gray-700">{results}</div>
        </div>
      )}
    </div>
  );
};

export default SimplexMethodCalculator;
