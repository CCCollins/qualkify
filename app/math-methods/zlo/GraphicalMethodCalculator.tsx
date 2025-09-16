"use client"

import type React from "react"
import { useState } from "react"
import { evaluate } from "mathjs"
import { Chart } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
  type ChartDataset,
  ScatterController,
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
)

class Fraction {
  numerator: number
  denominator: number

  constructor(numerator: number, denominator = 1) {
    if (denominator === 0) throw new Error("Denominator cannot be zero")

    // Handle negative fractions
    if (denominator < 0) {
      numerator = -numerator
      denominator = -denominator
    }

    const gcd = this.gcd(Math.abs(numerator), Math.abs(denominator))
    this.numerator = numerator / gcd
    this.denominator = denominator / gcd
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b)
  }

  static fromDecimal(decimal: number, tolerance = 1e-6): Fraction {
    if (Math.abs(decimal) < tolerance) return new Fraction(0, 1)

    const sign = decimal < 0 ? -1 : 1
    decimal = Math.abs(decimal)

    const wholePart = Math.floor(decimal)
    const fractionalPart = decimal - wholePart

    if (fractionalPart < tolerance) {
      return new Fraction(sign * wholePart, 1)
    }

    // Use continued fractions algorithm
    let a = fractionalPart
    let h1 = 1,
      h2 = 0
    let k1 = 0,
      k2 = 1

    for (let i = 0; i < 20; i++) {
      const intPart = Math.floor(a)
      const h = intPart * h1 + h2
      const k = intPart * k1 + k2

      if (Math.abs(decimal - (wholePart + h / k)) < tolerance) {
        return new Fraction(sign * (wholePart * k + h), k)
      }

      a = 1 / (a - intPart)
      h2 = h1
      h1 = h
      k2 = k1
      k1 = k

      if (Math.abs(a - Math.floor(a)) < tolerance) break
    }

    return new Fraction(sign * (wholePart * k1 + h1), k1)
  }

  toString(): string {
    if (this.denominator === 1) return this.numerator.toString()
    if (this.numerator === 0) return "0"
    return `${this.numerator}/${this.denominator}`
  }

  toDecimal(): number {
    return this.numerator / this.denominator
  }

  add(other: Fraction): Fraction {
    return new Fraction(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    )
  }

  multiply(other: Fraction): Fraction {
    return new Fraction(this.numerator * other.numerator, this.denominator * other.denominator)
  }
}

const formatAsFraction = (value: number): string => {
  const fraction = Fraction.fromDecimal(value)
  return fraction.toString()
}

// --- Helper Types and Functions ---

type ParsedConstraint = {
  coeffs: number[]
  operator: "<=" | ">=" | "="
  rhs: number
}

type Point = { x: number; y: number }

const parseExpression = (expr: string, var1: string, var2: string): number[] => {
  const processedExpr = expr.replace(/(\d)([a-zA-Z])/g, "$1*$2")
  const termRegex = /([+-])?\s*(\d+\.?\d*)?\s*\*?\s*([a-zA-Z][a-zA-Z0-9_]*)/g
  const coeffs: { [key: string]: number } = { [var1]: 0, [var2]: 0 }
  const signedExpr =
    processedExpr.startsWith("+") || processedExpr.startsWith("-") ? processedExpr : `+${processedExpr}`
  let match
  while ((match = termRegex.exec(signedExpr)) !== null) {
    const [, sign, coeffStr, variable] = match
    if (variable !== var1 && variable !== var2) continue
    let coeff = Number.parseFloat(coeffStr || "1")
    if (sign === "-") {
      coeff = -coeff
    }
    coeffs[variable] += coeff
  }
  return [coeffs[var1], coeffs[var2]]
}

const parseConstraint = (str: string, var1: string, var2: string): ParsedConstraint | null => {
  const parts = str.split(/(<=|>=|=)/)
  if (parts.length < 3) return null
  const lhs = parts[0]
  const operator = parts[1].trim() as ParsedConstraint["operator"]
  const rhs = Number.parseFloat(parts[2].trim())
  if (isNaN(rhs)) return null
  const coeffs = parseExpression(lhs, var1, var2)
  return { coeffs, operator, rhs }
}

const solveLinearSystem = (c1: ParsedConstraint, c2: ParsedConstraint): Point | null => {
  const [a1, b1] = c1.coeffs
  const [a2, b2] = c2.coeffs
  const rhs1 = c1.rhs
  const rhs2 = c2.rhs
  const determinant = a1 * b2 - a2 * b1
  if (Math.abs(determinant) < 1e-9) {
    return null
  }
  const x = (b2 * rhs1 - b1 * rhs2) / determinant
  const y = (a1 * rhs2 - a2 * rhs1) / determinant
  return { x, y }
}

const isPointFeasible = (point: Point, constraints: ParsedConstraint[]): boolean => {
  const tolerance = 1e-9
  if (point.x < -tolerance || point.y < -tolerance) return false
  for (const constraint of constraints) {
    const { coeffs, operator, rhs } = constraint
    const val = coeffs[0] * point.x + coeffs[1] * point.y
    let isFeasible = false
    switch (operator) {
      case "<=":
        isFeasible = val <= rhs + tolerance
        break
      case ">=":
        isFeasible = val >= rhs - tolerance
        break
      case "=":
        isFeasible = Math.abs(val - rhs) < tolerance
        break
    }
    if (!isFeasible) return false
  }
  return true
}

interface ConstraintInput {
  id: number
  value: string
}

const GraphicalMethodCalculator: React.FC = () => {
  const [objective, setObjective] = useState("6x + 5y")
  const [objectiveType, setObjectiveType] = useState<"maximize" | "minimize">("maximize")
  const [constraints, setConstraints] = useState<ConstraintInput[]>([
    { id: 1, value: "3x + 2y <= 10" },
    { id: 2, value: "4x + y <= 8" },
    { id: 3, value: "x >= 0" },
    { id: 4, value: "y >= 0" },
  ])
  const [results, setResults] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData<"line" | "scatter"> | null>(null)
  const [variableNames, setVariableNames] = useState<[string, string]>(["x", "y"])

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
    setChartData(null)

    const allInputs = [objective, ...constraints.map((c) => c.value)]
    const detectedVars = new Set<string>()
    const varRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g
    allInputs.forEach((input) => {
      const lhs = input.split(/(<=|>=|=)/)[0]
      const matches = lhs.match(varRegex)
      if (matches) {
        matches.forEach((v) => detectedVars.add(v))
      }
    })

    const sortedVars = Array.from(detectedVars).sort()
    if (sortedVars.length > 2) {
      setResults(`Ошибка: Графический метод поддерживает только две переменные. Найдено: ${sortedVars.join(", ")}`)
      return
    }
    if (sortedVars.length < 2) {
      setResults(`Ошибка: Графический метод требует две переменные. Найдено: ${sortedVars.join(", ")}`)
      return
    }
    const [var1, var2] = sortedVars as [string, string]
    setVariableNames([var1, var2])

    const parsedConstraints = constraints
      .map((c) => parseConstraint(c.value, var1, var2))
      .filter((c): c is ParsedConstraint => c !== null)

    if (parsedConstraints.length < 2) {
      setResults("Ошибка: необходимо как минимум два ограничения.")
      return
    }

    const intersectionPoints: Point[] = []
    const extendedConstraints = [
      ...parsedConstraints,
      { coeffs: [1, 0], operator: ">=" as const, rhs: 0 }, // x >= 0
      { coeffs: [0, 1], operator: ">=" as const, rhs: 0 }, // y >= 0
    ]

    for (let i = 0; i < extendedConstraints.length; i++) {
      for (let j = i + 1; j < extendedConstraints.length; j++) {
        const point = solveLinearSystem(extendedConstraints[i], extendedConstraints[j])
        if (point) {
          intersectionPoints.push(point)
        }
      }
    }

    const feasiblePoints = intersectionPoints.filter((p) => isPointFeasible(p, parsedConstraints))

    const uniqueFeasiblePoints = feasiblePoints.reduce<Point[]>((acc, point) => {
      if (!acc.some((p) => Math.abs(p.x - point.x) < 1e-9 && Math.abs(p.y - point.y) < 1e-9)) {
        acc.push(point)
      }
      return acc
    }, [])

    if (uniqueFeasiblePoints.length === 0) {
      setResults("Не удалось найти допустимых угловых точек. Область может быть неограниченной или не существует.")
      return
    }

    let optimalPoint: Point | null = null
    let optimalValue = objectiveType === "maximize" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY

    uniqueFeasiblePoints.forEach((point) => {
      try {
        const scope = { [var1]: point.x, [var2]: point.y }
        const value = evaluate(objective, scope)
        if (objectiveType === "maximize" && value > optimalValue) {
          optimalValue = value
          optimalPoint = point
        } else if (objectiveType === "minimize" && value < optimalValue) {
          optimalValue = value
          optimalPoint = point
        }
      } catch (error) {
        setResults(`Ошибка при вычислении целевой функции: ${error instanceof Error ? error.message : String(error)}`)
        return
      }
    })

    let steps = "Шаг 1. Поиск точек пересечения ограничений\n\n"

    // Show intersection calculations
    const constraintPairs: Array<[ParsedConstraint, ParsedConstraint, string, string]> = []
    for (let i = 0; i < extendedConstraints.length; i++) {
      for (let j = i + 1; j < extendedConstraints.length; j++) {
        const c1 = extendedConstraints[i]
        const c2 = extendedConstraints[j]
        const label1 =
          i < parsedConstraints.length ? `Ограничение ${i + 1}` : i === parsedConstraints.length ? "x ≥ 0" : "y ≥ 0"
        const label2 =
          j < parsedConstraints.length ? `Ограничение ${j + 1}` : j === parsedConstraints.length ? "x ≥ 0" : "y ≥ 0"
        constraintPairs.push([c1, c2, label1, label2])
      }
    }

    constraintPairs.forEach(([c1, c2, label1, label2]) => {
      const [a1, b1] = c1.coeffs
      const [a2, b2] = c2.coeffs
      const rhs1 = c1.rhs
      const rhs2 = c2.rhs

      steps += `Пересечение: ${label1} и ${label2}\n`
      steps += `Система уравнений:\n`
      steps += `  ${formatAsFraction(a1)}${var1} + ${formatAsFraction(b1)}${var2} = ${formatAsFraction(rhs1)}\n`
      steps += `  ${formatAsFraction(a2)}${var1} + ${formatAsFraction(b2)}${var2} = ${formatAsFraction(rhs2)}\n`

      const determinant = a1 * b2 - a2 * b1
      if (Math.abs(determinant) < 1e-9) {
        steps += `  Определитель = 0, прямые параллельны\n\n`
      } else {
        steps += `  Определитель Δ = ${formatAsFraction(a1)} × ${formatAsFraction(b2)} - ${formatAsFraction(a2)} × ${formatAsFraction(b1)} = ${formatAsFraction(determinant)}\n`
        const x = (b2 * rhs1 - b1 * rhs2) / determinant
        const y = (a1 * rhs2 - a2 * rhs1) / determinant
        steps += `  ${var1} = (${formatAsFraction(b2)} × ${formatAsFraction(rhs1)} - ${formatAsFraction(b1)} × ${formatAsFraction(rhs2)}) / ${formatAsFraction(determinant)} = ${formatAsFraction(x)}\n`
        steps += `  ${var2} = (${formatAsFraction(a1)} × ${formatAsFraction(rhs2)} - ${formatAsFraction(a2)} × ${formatAsFraction(rhs1)}) / ${formatAsFraction(determinant)} = ${formatAsFraction(y)}\n`
        steps += `  Точка пересечения: (${formatAsFraction(x)}, ${formatAsFraction(y)})\n\n`
      }
    })

    steps += "Шаг 2. Проверка допустимости точек\n\n"
    intersectionPoints.forEach((point) => {
      steps += `Точка (${formatAsFraction(point.x)}, ${formatAsFraction(point.y)}):\n`

      // Check non-negativity
      if (point.x < -1e-9 || point.y < -1e-9) {
        steps += `  ❌ Не удовлетворяет условию неотрицательности\n\n`
        return
      }

      let feasible = true
      parsedConstraints.forEach((constraint, i) => {
        const { coeffs, operator, rhs } = constraint
        const val = coeffs[0] * point.x + coeffs[1] * point.y
        steps += `  Ограничение ${i + 1}: ${formatAsFraction(coeffs[0])} × ${formatAsFraction(point.x)} + ${formatAsFraction(coeffs[1])} × ${formatAsFraction(point.y)} = ${formatAsFraction(val)}`

        let satisfied = false
        switch (operator) {
          case "<=":
            satisfied = val <= rhs + 1e-9
            steps += ` ${satisfied ? "≤" : ">"} ${formatAsFraction(rhs)} ${satisfied ? "✓" : "❌"}\n`
            break
          case ">=":
            satisfied = val >= rhs - 1e-9
            steps += ` ${satisfied ? "≥" : "<"} ${formatAsFraction(rhs)} ${satisfied ? "✓" : "❌"}\n`
            break
          case "=":
            satisfied = Math.abs(val - rhs) < 1e-9
            steps += ` ${satisfied ? "=" : "≠"} ${formatAsFraction(rhs)} ${satisfied ? "✓" : "❌"}\n`
            break
        }

        if (!satisfied) feasible = false
      })

      if (feasible) {
        steps += `  ✅ Точка допустима\n\n`
      } else {
        steps += `  ❌ Точка недопустима\n\n`
      }
    })

    steps += "Шаг 3. Вычисление целевой функции в угловых точках\n\n"
    steps += `Целевая функция: F = ${objective}\n\n`

    uniqueFeasiblePoints.forEach((point) => {
      const scope = { [var1]: point.x, [var2]: point.y }
      const value = evaluate(objective, scope)
      const objCoeffs = parseExpression(objective, var1, var2)

      steps += `F(${formatAsFraction(point.x)}, ${formatAsFraction(point.y)}) = ${formatAsFraction(objCoeffs[0])} × ${formatAsFraction(point.x)} + ${formatAsFraction(objCoeffs[1])} × ${formatAsFraction(point.y)}\n`
      steps += `  = ${formatAsFraction(objCoeffs[0] * point.x)} + ${formatAsFraction(objCoeffs[1] * point.y)} = ${formatAsFraction(value)}\n\n`
    })

    if (
      optimalPoint &&
      typeof (optimalPoint as Point).x === "number" &&
      typeof (optimalPoint as Point).y === "number"
    ) {
      steps += `Шаг 4. Оптимальное решение\n\n`
      steps += `${objectiveType === "maximize" ? "Максимальное" : "Минимальное"} значение целевой функции:\n`
      steps += `F* = ${formatAsFraction(optimalValue)}\n`
      steps += `Достигается в точке: (${formatAsFraction((optimalPoint as Point).x)}, ${formatAsFraction((optimalPoint as Point).y)})\n`
      steps += `\nОтвет: ${var1}* = ${formatAsFraction((optimalPoint as Point).x)}, ${var2}* = ${formatAsFraction((optimalPoint as Point).y)}, F* = ${formatAsFraction(optimalValue)}`

      setResults(steps)
      generateChartData(parsedConstraints, uniqueFeasiblePoints, optimalPoint, objective, variableNames)
    } else {
      steps += "\nНе удалось найти оптимальное решение."
      setResults(steps)
    }
  }

  const generateChartData = (
    constraints: ParsedConstraint[],
    feasiblePoints: Point[],
    optimalPoint: Point | null,
    objective: string,
    variableNames: [string, string],
  ) => {
    const allPoints: Point[] = [...feasiblePoints]
    if (optimalPoint) {
      allPoints.push(optimalPoint)
    }

    const xMax = allPoints.length > 0 ? Math.max(...(allPoints as Point[]).map((p: Point) => p.x)) * 1.2 + 5 : 5
    const yMax = allPoints.length > 0 ? Math.max(...(allPoints as Point[]).map((p: Point) => p.y)) * 1.2 + 5 : 5

    const datasets: ChartDataset<"line" | "scatter">[] = constraints.map((c, i) => {
      const [a, b] = c.coeffs
      const rhs = c.rhs
      let p1: Point, p2: Point

      if (Math.abs(b) > 1e-9) {
        p1 = { x: 0, y: rhs / b }
        p2 = { x: xMax, y: (rhs - a * xMax) / b }
      } else {
        p1 = { x: rhs / a, y: 0 }
        p2 = { x: rhs / a, y: yMax }
      }
      return {
        label: `Ограничение ${i + 1}`,
        data: [p1, p2],
        borderColor: `hsl(${i * 60}, 70%, 50%)`,
        borderWidth: 2,
        fill: false,
        tension: 0,
        pointRadius: 0,
        type: "line" as const,
      }
    })

    if (feasiblePoints.length > 1) {
      const sortedFeasiblePoints = [...feasiblePoints].sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x))
      datasets.push({
        label: "Допустимая область",
        data: [...sortedFeasiblePoints, sortedFeasiblePoints[0]].map((p: Point) => ({ x: p.x, y: p.y })),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderWidth: 1,
        fill: true,
        pointRadius: 0,
        type: "line" as const,
      })
    }

    datasets.push({
      label: "Угловые точки",
      data: feasiblePoints.map((p: Point) => ({ x: p.x, y: p.y })),
      backgroundColor: "rgba(255, 99, 132, 1)",
      pointRadius: 5,
      type: "scatter" as const,
    })

    if (optimalPoint) {
      datasets.push({
        label: "Оптимальная точка",
        data: [{ x: optimalPoint.x, y: optimalPoint.y }],
        backgroundColor: "rgba(54, 162, 235, 1)",
        pointRadius: 7,
        pointStyle: "rectRot",
        type: "scatter" as const,
      })
    }

    // Add gradient vector
    const objCoeffs = parseExpression(objective, variableNames[0], variableNames[1])
    const gradientMagnitude = Math.sqrt(objCoeffs[0] ** 2 + objCoeffs[1] ** 2)
    if (gradientMagnitude > 1e-9) {
      const scale = Math.min(xMax, yMax) / gradientMagnitude / 4 // Scale to be 1/4 of the smaller axis length
      const gradientEndPoint = {
        x: objCoeffs[0] * scale,
        y: objCoeffs[1] * scale,
      }
      datasets.push({
        label: "Вектор градиента (F)",
        data: [{ x: 0, y: 0 }, gradientEndPoint] as Point[],
        borderColor: "rgba(156, 39, 176, 0.8)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: [0, 8],
        pointStyle: ["circle", "triangle"],
        pointBackgroundColor: "rgba(156, 39, 176, 0.8)",
        type: "line" as const,
      })
    }

    setChartData({ datasets })
  }

  const chartOptions: ChartOptions<"line" | "scatter"> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: window?.innerWidth < 768 ? 1 : 1.5,
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: window?.innerWidth < 768 ? 10 : 12,
          },
        },
      },
      title: {
        display: true,
        text: "Графическое представление решения",
        font: {
          size: window?.innerWidth < 768 ? 12 : 14,
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        position: "bottom",
        title: {
          display: true,
          text: variableNames[0],
          font: {
            size: window?.innerWidth < 768 ? 10 : 12,
          },
        },
        min: 0,
        ticks: {
          font: {
            size: window?.innerWidth < 768 ? 9 : 11,
          },
        },
      },
      y: {
        type: "linear",
        title: {
          display: true,
          text: variableNames[1],
          font: {
            size: window?.innerWidth < 768 ? 10 : 12,
          },
        },
        min: 0,
        ticks: {
          font: {
            size: window?.innerWidth < 768 ? 9 : 11,
          },
        },
      },
    },
  }

  return (
    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-lg w-full flex flex-col space-y-4 sm:space-y-8">
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-8 items-stretch">
        <div className="space-y-3 sm:space-y-4 bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200 flex flex-col">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 text-gray-800">Параметры задачи</h2>
          <div className="flex-grow space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Целевая функция</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
                <span className="text-gray-500 sm:mr-2 text-sm">F =</span>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="flex-grow p-3 sm:p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="например: 2*x1 + 3*x2"
                />
                <select
                  value={objectiveType}
                  onChange={(e) => setObjectiveType(e.target.value as "maximize" | "minimize")}
                  className="sm:ml-2 p-3 sm:p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                >
                  <option value="maximize">→ max</option>
                  <option value="minimize">→ min</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ограничения</label>
              <div className="space-y-2">
                {constraints.map((constraint) => (
                  <div key={constraint.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={constraint.value}
                      onChange={(e) => handleConstraintChange(constraint.id, e.target.value)}
                      className="flex-grow p-3 sm:p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder="например: x1 + x2 <= 8"
                    />
                    <button
                      onClick={() => handleRemoveConstraint(constraint.id)}
                      className="p-3 sm:p-2 text-red-500 hover:text-red-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={handleAddConstraint} className="mt-3 text-sm text-blue-600 hover:text-blue-800 p-2">
                + Добавить ограничение
              </button>
            </div>
          </div>
          <button
            onClick={calculate}
            className="w-full bg-blue-600 text-white font-bold py-3 sm:py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-auto min-h-[44px] transition-colors"
          >
            Рассчитать
          </button>
        </div>

        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200 flex-grow flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
          {chartData ? (
            <div className="w-full h-full">
              <Chart
                type="line"
                data={chartData as ChartData<"line" | "scatter">}
                options={{ ...chartOptions, maintainAspectRatio: false }}
              />
            </div>
          ) : (
            <div className="text-center text-gray-500 p-4">
              <p className="text-sm sm:text-base">График появится здесь после расчета.</p>
            </div>
          )}
        </div>
      </div>

      {results && (
        <div className="p-4 sm:p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Подробное решение</h3>
          <div
            className="text-gray-700 whitespace-pre-wrap bg-white p-3 sm:p-4 rounded-md border text-xs sm:text-sm overflow-x-auto"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }}
          >
            {results}
          </div>
        </div>
      )}
    </div>
  )
}

export default GraphicalMethodCalculator
