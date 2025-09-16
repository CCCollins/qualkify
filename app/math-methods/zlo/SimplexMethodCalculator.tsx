"use client"

import type React from "react"
import { useState } from "react"

type Tableau = {
  headers: string[]
  matrix: number[][]
  basis: number[]
  pivot?: { row: number; col: number }
}

interface ConstraintInput {
  id: number;
  value: string;
}

interface SimplexStep {
  tableau: Tableau;
  explanation: string;
  Cj: number[];
  Zj: number[];
  CjZj: number[];
}

interface OptimalSolution {
  value: number;
  variableValues: string;
}

interface CalculationResults {
  problemStatement: {
    objective: string;
    objectiveType: 'maximize' | 'minimize';
    constraints: ConstraintInput[];
  };
  steps: SimplexStep[];
  solution: OptimalSolution;
}

const gcd = (a: number, b: number): number => {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    ;[a, b] = [b, a % b]
  }
  return a
}

const toFraction = (decimal: number, tolerance = 1e-6): string => {
  if (Math.abs(decimal) < tolerance) return "0"

  const sign = decimal < 0 ? "-" : ""
  decimal = Math.abs(decimal)

  if (Math.abs(decimal - Math.round(decimal)) < tolerance) {
    return sign + Math.round(decimal).toString()
  }

  let denominator = 1
  let numerator = decimal

  while (Math.abs(numerator - Math.round(numerator)) > tolerance && denominator < 10000) {
    denominator++
    numerator = decimal * denominator
  }

  numerator = Math.round(numerator)
  const divisor = gcd(numerator, denominator)
  numerator /= divisor
  denominator /= divisor

  if (denominator === 1) {
    return sign + numerator.toString()
  }

  return sign + numerator + "/" + denominator
}

const SimplexMethodCalculator: React.FC = () => {
  const [objective, setObjective] = useState('5y + 9x');
  const [objectiveType, setObjectiveType] = useState<'maximize' | 'minimize'>('maximize');
  const [constraints, setConstraints] = useState<ConstraintInput[]>([
    { id: 1, value: '2y + 5x <= 12' },
    { id: 2, value: '3y + 5x <= 15' },
  ]);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddConstraint = () => {
    setConstraints([...constraints, { id: Date.now(), value: "" }])
  }

  const handleRemoveConstraint = (id: number) => {
    setConstraints(constraints.filter((c) => c.id !== id))
  }

  const handleConstraintChange = (id: number, value: string) => {
    setConstraints(constraints.map((c) => (c.id === id ? { ...c, value } : c)))
  }

  const calculate = () => {
    try {
      setError(null);
      const varRegex = /[a-zA-Z][\w]*/g
      const allVars = new Set<string>()
      ;[objective, ...constraints.map((c) => c.value)].forEach((str) => {
        const matches = str.match(varRegex)
        if (matches) {
          const filteredMatches = matches.filter((m) => !["sqrt", "pow", "exp", "log", "sin", "cos", "tan"].includes(m))
          filteredMatches.forEach((v) => allVars.add(v))
        }
      })

      const decisionVars = Array.from(allVars).sort()

      const activeConstraints = constraints.filter((c) => {
        const constraintText = c.value.trim()
        if (!constraintText) return false
        for (const varName of decisionVars) {
          const nonNegativityPattern = new RegExp(`^\\s*${varName}\\s*>=\\s*0\\s*$`)
          if (nonNegativityPattern.test(constraintText)) {
            return false
          }
        }
        return true
      })

      const slackVars = activeConstraints.map((_, i) => `s${i + 1}`)
      const varHeaders = [...decisionVars, ...slackVars]
      const Cj = new Array(varHeaders.length).fill(0)

      const parseTerms = (str: string): Map<string, number> => {
        const terms = new Map<string, number>()
        const processed = str
          .replace(/\s/g, "")
          .replace(/(?=[+-])/g, " ")
          .trim()
        const parts = processed.split(" ")

        for (const part of parts) {
          const match = part.match(/([+-]?\d*\.?\d*)\*?([a-zA-Z][\w]*)/)
          if (match) {
            const [, coeffStr, variable] = match
            if (decisionVars.includes(variable)) {
              const value =
                coeffStr === "" || coeffStr === "+" ? 1 : coeffStr === "-" ? -1 : Number.parseFloat(coeffStr)
              terms.set(variable, (terms.get(variable) || 0) + value)
            }
          }
        }
        return terms
      }

      const objTerms = parseTerms(objective)
      objTerms.forEach((coeff, variable) => {
        const index = decisionVars.indexOf(variable)
        if (index !== -1) {
          Cj[index] = objectiveType === "minimize" ? -coeff : coeff
        }
      })

      const matrix: number[][] = []
      const basis: number[] = []
      activeConstraints.forEach((constraint, i) => {
        const parts = constraint.value.split(/<=|≤/)
        if (parts.length !== 2 || parts[1].trim() === "") {
          throw new Error(`Неверный формат ограничения: "${constraint.value}". Пожалуйста, используйте оператор <=.`)
        }
        const [lhs, rhsStr] = parts

        const row = new Array(varHeaders.length + 1).fill(0)
        row[row.length - 1] = Number.parseFloat(rhsStr)

        const constraintTerms = parseTerms(lhs)
        constraintTerms.forEach((coeff, variable) => {
          const index = decisionVars.indexOf(variable)
          if (index !== -1) {
            row[index] = coeff
          }
        })

        const slackIndex = varHeaders.indexOf(slackVars[i])
        row[slackIndex] = 1
        basis.push(slackIndex)
        matrix.push(row)
      })

      let currentTableau: Tableau = { headers: ['Базис', ...varHeaders, 'ПЧ'], matrix, basis };
      const steps: SimplexStep[] = [];

      for (let iter = 0; iter < 20; iter++) {
        const Zj = new Array(varHeaders.length + 1).fill(0)
        const Cj_Zj = new Array(varHeaders.length).fill(0)

        // Calculate Zj and Cj-Zj with detailed explanations
        for (let j = 0; j < varHeaders.length; j++) {
          let sum = 0
          for (let i = 0; i < currentTableau.matrix.length; i++) {
            sum += Cj[currentTableau.basis[i]] * currentTableau.matrix[i][j]
          }
          Zj[j] = sum
          Cj_Zj[j] = Cj[j] - Zj[j]
        }
        Zj[Zj.length - 1] = currentTableau.basis.reduce(
          (sum, basisIndex, i) => sum + Cj[basisIndex] * currentTableau.matrix[i][varHeaders.length],
          0,
        )

        const fullMatrix = currentTableau.matrix.map((row) => [...row])
        fullMatrix.push(Zj)
        fullMatrix.push([...Cj_Zj, Number.NaN])

        let explanation = `Итерация ${iter + 1}:\n\n`
        explanation += `1. Вычисление строки Zj:\n`
        for (let j = 0; j < varHeaders.length; j++) {
          const calculations = currentTableau.basis
            .map((basisIndex, i) => `${toFraction(Cj[basisIndex])} × ${toFraction(currentTableau.matrix[i][j])}`)
            .join(" + ")
          explanation += `   Z${j + 1} = ${calculations} = ${toFraction(Zj[j])}\n`
        }

        explanation += `\n2. Вычисление строки Cj - Zj:\n`
        for (let j = 0; j < varHeaders.length; j++) {
          explanation += `   C${j + 1} - Z${j + 1} = ${toFraction(Cj[j])} - ${toFraction(Zj[j])} = ${toFraction(Cj_Zj[j])}\n`
        }

        steps.push({
          tableau: { ...currentTableau, matrix: fullMatrix },
          explanation,
          Cj: [...Cj],
          Zj: [...Zj],
          CjZj: [...Cj_Zj],
        })

        // Check for optimality
        const max_Cj_Zj = Math.max(...Cj_Zj)
        if (max_Cj_Zj <= 1e-9) {
          steps[steps.length - 1].explanation +=
            `\n3. Проверка оптимальности: Все элементы строки Cj - Zj ≤ 0, решение оптимально.`
          break
        }

        // Find pivot column
        const pivotCol = Cj_Zj.indexOf(max_Cj_Zj)
        steps[steps.length - 1].explanation +=
          `\n3. Выбор ведущего столбца: Максимальный элемент Cj - Zj = ${toFraction(max_Cj_Zj)} в столбце ${varHeaders[pivotCol]}`

        // Find pivot row using minimum ratio test
        let minRatio = Number.POSITIVE_INFINITY
        let pivotRow = -1
        steps[steps.length - 1].explanation += `\n\n4. Критерий минимального отношения:\n`

        for (let i = 0; i < currentTableau.matrix.length; i++) {
          const pivotColValue = currentTableau.matrix[i][pivotCol]
          const rhsValue = currentTableau.matrix[i][varHeaders.length]
          if (pivotColValue > 1e-9) {
            const ratio = rhsValue / pivotColValue
            steps[steps.length - 1].explanation +=
              `   ${varHeaders[currentTableau.basis[i]]}: ${toFraction(rhsValue)} / ${toFraction(pivotColValue)} = ${toFraction(ratio)}\n`
            if (ratio < minRatio) {
              minRatio = ratio
              pivotRow = i
            }
          }
        }

        if (pivotRow === -1) {
          throw new Error("Неограниченное решение.")
        }

        steps[steps.length - 1].explanation +=
          `\n   Минимальное отношение: ${toFraction(minRatio)} в строке ${varHeaders[currentTableau.basis[pivotRow]]}`
        steps[steps.length - 1].explanation +=
          `\n   Ведущий элемент: ${toFraction(currentTableau.matrix[pivotRow][pivotCol])} на пересечении строки ${varHeaders[currentTableau.basis[pivotRow]]} и столбца ${varHeaders[pivotCol]}`

        steps[steps.length - 1].tableau.pivot = { row: pivotRow, col: pivotCol + 1 }

        // Perform pivot operation with detailed explanation
        const newMatrix: number[][] = []
        const pivotElement = currentTableau.matrix[pivotRow][pivotCol]
        const newPivotRowValues = currentTableau.matrix[pivotRow].map((val) => val / pivotElement)

        steps[steps.length - 1].explanation += `\n\n5. Преобразование симплекс-таблицы:\n`
        steps[steps.length - 1].explanation +=
          `   Новая ведущая строка: каждый элемент делим на ведущий элемент ${toFraction(pivotElement)}\n`

        for (let i = 0; i < currentTableau.matrix.length; i++) {
          if (i === pivotRow) {
            newMatrix.push(newPivotRowValues)
          } else {
            const pivotColCoeff = currentTableau.matrix[i][pivotCol]
            const newRow = currentTableau.matrix[i].map((val, j) => val - pivotColCoeff * newPivotRowValues[j])
            newMatrix.push(newRow)
            if (Math.abs(pivotColCoeff) > 1e-9) {
              steps[steps.length - 1].explanation +=
                `   Строка ${varHeaders[currentTableau.basis[i]]}: вычитаем ${toFraction(pivotColCoeff)} × (новая ведущая строка)\n`
            }
          }
        }
        const newBasis = [...currentTableau.basis]
        newBasis[pivotRow] = pivotCol
        currentTableau = { headers: currentTableau.headers, matrix: newMatrix, basis: newBasis }
      }

      const finalStep = steps[steps.length - 1];
      const finalZj = finalStep.Zj[varHeaders.length];
      const optimalValue = objectiveType === 'minimize' ? -finalZj : finalZj;

      const solutionVars = varHeaders
        .map((v, i) => {
          const basisIndex = finalStep.tableau.basis.indexOf(i);
          if (basisIndex !== -1) {
            return `${v} = ${toFraction(finalStep.tableau.matrix[basisIndex][varHeaders.length])}`;
          }
          return `${v} = 0`;
        })
        .join(', ');

      setResults({
        problemStatement: {
          objective,
          objectiveType,
          constraints: constraints.filter((c) => c.value.trim()),
        },
        steps,
        solution: {
          value: optimalValue,
          variableValues: solutionVars,
        },
      });

    } catch (e) {
      setError((e as Error).message);
      setResults(null);
    }
  };

  const varHeaders =
    results && results.steps.length > 0
      ? results.steps[0].tableau.headers.slice(1, -1)
      : [];

  return (
    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-lg w-full max-w-6xl">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">Симплекс-метод</h2>
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Целевая функция</label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 text-sm">F =</span>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="flex-1 min-w-0 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="например: x1 + 2*x2"
            />
            <select
              value={objectiveType}
              onChange={(e) => setObjectiveType(e.target.value as "maximize" | "minimize")}
              className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
            >
              <option value="maximize">→ max</option>
              <option value="minimize">→ min</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ограничения (в форме ≤)</label>
          <p className="text-xs text-gray-500 mb-2">
            Примечание: Условия неотрицательности (например, x ≥ 0) вводить не нужно, они учитываются автоматически.
          </p>
          <div className="space-y-2">
            {constraints.map((constraint) => (
              <div key={constraint.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={constraint.value}
                  onChange={(e) => handleConstraintChange(constraint.id, e.target.value)}
                  className="flex-grow min-w-0 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="например: 2*x1 + 3*x2 <= 12"
                />
                <button
                  onClick={() => handleRemoveConstraint(constraint.id)}
                  className="p-2 text-red-500 hover:text-red-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleAddConstraint} className="mt-3 text-sm text-blue-600 hover:text-blue-800 p-2">
            + Добавить ограничение
          </button>
        </div>
        <button
          onClick={calculate}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] transition-colors"
        >
          Рассчитать
        </button>
      </div>
      {error && (
         <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600">{error}</p>
         </div>
      )}

      {results && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
            Пошаговое решение симплекс-методом
          </h3>
          <div className="space-y-4 sm:space-y-6">
            {/* Блок постановки задачи */}
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-bold text-blue-800 mb-2 text-sm sm:text-base">Постановка задачи:</h4>
              <p className="text-blue-700 text-sm sm:text-base mb-1">
                <strong>Целевая функция:</strong> F = {results.problemStatement.objective} → {results.problemStatement.objectiveType === "maximize" ? "max" : "min"}
              </p>
              <p className="text-blue-700 text-sm sm:text-base mb-1">
                <strong>Ограничения:</strong>
              </p>
              <ul className="list-disc list-inside text-blue-700 ml-2 sm:ml-4 text-sm sm:text-base">
                {results.problemStatement.constraints.map((constraint, i) => (
                  <li key={i} className="break-all">
                    {constraint.value}
                  </li>
                ))}
              </ul>
            </div>

            {/* Итерация по шагам */}
            {results.steps.map((step, i) => (
              <div key={i} className="border border-gray-300 rounded-lg p-2 sm:p-4">
                <div className="mb-3 sm:mb-4">
                  <div className="whitespace-pre-line text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 sm:p-3 rounded overflow-x-auto">
                    {step.explanation}
                  </div>
                </div>
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="table-auto border-collapse border border-gray-400 w-full text-center text-sm">
                    {/* ... (логика рендеринга таблицы остается такой же, но теперь данные берутся из `step`) ... */}
                    <thead>
                      <tr>
                        {step.tableau.headers.map((h) => (
                          <th key={h} className="border border-gray-300 p-2 bg-gray-100 font-semibold">{h}</th>
                        ))}
                        <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Cj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {step.tableau.matrix.slice(0, step.tableau.matrix.length - 2).map((row, r_idx) => (
                        <tr key={r_idx}>
                          <td className="border border-gray-300 p-2 font-semibold bg-gray-50">
                            {varHeaders[step.tableau.basis[r_idx]]}
                          </td>
                          {row.map((cell, c_idx) => (
                            <td key={c_idx} className={`border border-gray-300 p-2 ${step.tableau.pivot?.row === r_idx && step.tableau.pivot?.col === c_idx + 1 ? "bg-yellow-200 font-bold" : ""}`}>
                              {toFraction(cell)}
                            </td>
                          ))}
                          <td className="border border-gray-300 p-2 bg-gray-100">
                            {toFraction(step.Cj[step.tableau.basis[r_idx]])}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50">
                        <td className="border border-gray-300 p-2 font-semibold">Zj</td>
                        {step.Zj.slice(0, -1).map((cell, c_idx) => (
                          <td key={c_idx} className="border border-gray-300 p-2 font-semibold">{toFraction(cell)}</td>
                        ))}
                        <td className="border border-gray-300 p-2 font-semibold">{toFraction(step.Zj[step.Zj.length - 1])}</td>
                        <td className="border border-gray-300 p-2 bg-gray-100"></td>
                      </tr>
                      <tr className="bg-green-50">
                        <td className="border border-gray-300 p-2 font-semibold">Cj - Zj</td>
                        {step.CjZj.map((cell, c_idx) => (
                          <td key={c_idx} className="border border-gray-300 p-2 font-semibold">{toFraction(cell)}</td>
                        ))}
                        <td className="border border-gray-300 p-2"></td>
                        <td className="border border-gray-300 p-2 bg-gray-100"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Блок с финальным решением */}
            <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-md">
              <h4 className="font-bold text-green-800 mb-2">Оптимальное решение:</h4>
              <p className="text-green-700">
                <strong>{results.problemStatement.objectiveType === "minimize" ? "Минимальное" : "Максимальное"} значение:</strong> F ={" "}
                {toFraction(results.solution.value)}
              </p>
              <p className="text-green-700">
                <strong>Значения переменных:</strong> {results.solution.variableValues}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplexMethodCalculator
