"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { TbSmartHome, TbCylinder, TbBox } from "react-icons/tb"

// --- Класс дробей ---
class Fraction {
  numerator: number
  denominator: number

  constructor(val: number | string | Fraction, den = 1) {
    if (val instanceof Fraction) {
      this.numerator = val.numerator
      this.denominator = val.denominator
      return
    }

    if (typeof val === "string") {
      val = val.trim()
      if (val.includes("/")) {
        const [n, d] = val.split("/")
        this.numerator = Number.parseFloat(n)
        this.denominator = Number.parseFloat(d)
      } else if (val.includes(".")) {
        const v = Number.parseFloat(val)
        const len = val.split(".")[1]?.length || 0
        const factor = Math.pow(10, len)
        this.numerator = Math.round(v * factor)
        this.denominator = factor
      } else {
        this.numerator = Number.parseFloat(val) || 0
        this.denominator = 1
      }
    } else {
      this.numerator = val
      this.denominator = den
    }

    if (this.denominator === 0) throw new Error("Деление на ноль")
    if (this.denominator < 0) {
      this.numerator = -this.numerator
      this.denominator = -this.denominator
    }

    const common = this.gcd(Math.abs(Math.round(this.numerator)), Math.abs(Math.round(this.denominator)))
    if (common > 1 && Number.isInteger(this.numerator) && Number.isInteger(this.denominator)) {
      this.numerator /= common
      this.denominator /= common
    }
  }

  private gcd(a: number, b: number): number {
    a = Math.round(a)
    b = Math.round(b)
    return b === 0 ? a : this.gcd(b, a % b)
  }

  add(other: Fraction | number): Fraction {
    const o = new Fraction(other)
    return new Fraction(
      this.numerator * o.denominator + o.numerator * this.denominator,
      this.denominator * o.denominator,
    )
  }
  sub(other: Fraction | number): Fraction {
    const o = new Fraction(other)
    return new Fraction(
      this.numerator * o.denominator - o.numerator * this.denominator,
      this.denominator * o.denominator,
    )
  }
  mul(other: Fraction | number): Fraction {
    const o = new Fraction(other)
    return new Fraction(this.numerator * o.numerator, this.denominator * o.denominator)
  }
  div(other: Fraction | number): Fraction {
    const o = new Fraction(other)
    if (o.numerator === 0) throw new Error("Деление на ноль")
    return new Fraction(this.numerator * o.denominator, this.denominator * o.numerator)
  }
  neg(): Fraction {
    return new Fraction(-this.numerator, this.denominator)
  }
  sqrt(): number {
    return Math.sqrt(this.toNumber())
  }
  pow(n: number): Fraction {
    return new Fraction(Math.pow(this.numerator, n), Math.pow(this.denominator, n))
  }
  toNumber(): number {
    return this.numerator / this.denominator
  }
  isZero(): boolean {
    return Math.abs(this.numerator) < 1e-9
  }
  isNegative(): boolean {
    return this.numerator < 0
  }
  isPositive(): boolean {
    return this.numerator > 0
  }
  abs(): Fraction {
    return new Fraction(Math.abs(this.numerator), this.denominator)
  }

  toString(): string {
    if (this.denominator === 1) return `${this.numerator}`
    if (Math.abs(this.denominator) > 1000) {
      return this.toNumber()
        .toFixed(4)
        .replace(/\.?0+$/, "")
    }
    return `${this.numerator}/${this.denominator}`
  }
}

// --- Типы ---
interface CriticalPoint {
  x1: Fraction
  x2: Fraction
  lambda: Fraction
  type: "max" | "min" | "saddle" | "unknown"
  fValue: Fraction
  d2L: string
  hessianAnalysis: string[]
}

interface SolutionResult {
  lagrangian: string
  partialDerivatives: string[]
  systemSolution: string[]
  criticalPoints: CriticalPoint[]
  conclusion: string
}

// Коэффициенты квадратичной функции: Ax1² + Bx2² + Cx1x2 + Dx1 + Ex2 + F
interface FunctionCoeffs {
  A: string
  B: string
  C: string
  D: string
  E: string
  F: string
}

// Коэффициенты ограничения: ax1² + bx2² + cx1x2 + dx1 + ex2 + f = 0
interface ConstraintCoeffs {
  a: string
  b: string
  c: string
  d: string
  e: string
  f: string
}

type GeometryProblemType = "cylinder" | "box" | "custom"

interface GeometryProblem {
  type: GeometryProblemType
  name: string
  description: string
  objective: string
  constraint: string
  constraintValue: number
  icon: React.ReactNode
}

interface GeometrySolutionResult {
  problem: string
  variables: string[]
  objectiveFunction: string
  constraintFunction: string
  lagrangian: string
  partialDerivatives: string[]
  systemSolution: string[]
  criticalPoint: {
    vars: Record<string, number>
    lambda: number
    fValue: number
    type: "min" | "max"
  } | null
  hessianAnalysis: string[]
  conclusion: string
}

// Пресеты из конспектов
const PRESETS = [
  {
    name: "f = 5 - 3x₁ - 4x₂, x₁² + x₂² = 25",
    func: { A: "0", B: "0", C: "0", D: "-3", E: "-4", F: "5" },
    constraint: { a: "1", b: "1", c: "0", d: "0", e: "0", f: "-25" },
    type: "extr" as const,
  },
  {
    name: "f = 1 - 4x₁ - 8x₂, x₁² - 8x₂² = 2",
    func: { A: "0", B: "0", C: "0", D: "-4", E: "-8", F: "1" },
    constraint: { a: "1", b: "-8", c: "0", d: "0", e: "0", f: "-2" },
    type: "extr" as const,
  },
  {
    name: "f = 16x₁ + x₁²x₂, x₁ + x₂ = 400",
    func: { A: "0", B: "0", C: "0", D: "16", E: "0", F: "0" },
    constraint: { a: "0", b: "0", c: "0", d: "1", e: "1", f: "-400" },
    type: "extr" as const,
  },
  {
    name: "f = 2x₁ + 4x₂, x₁² + 4x₂² = 8",
    func: { A: "0", B: "0", C: "0", D: "2", E: "4", F: "0" },
    constraint: { a: "1", b: "4", c: "0", d: "0", e: "0", f: "-8" },
    type: "extr" as const,
  },
]

const GEOMETRY_PRESETS: GeometryProblem[] = [
  {
    type: "cylinder",
    name: "Оптимальный цилиндр",
    description: "Минимизировать площадь поверхности цилиндра при заданном объёме",
    objective: "S = 2πR² + 2πRh → min",
    constraint: "V = πR²h",
    constraintValue: 403,
    icon: <TbCylinder className="w-5 h-5" />,
  },
  {
    type: "box",
    name: "Оптимальный ящик",
    description: "Минимизировать площадь поверхности открытого ящика при заданном объёме",
    objective: "S = xy + 2xz + 2yz → min",
    constraint: "V = xyz",
    constraintValue: 32,
    icon: <TbBox className="w-5 h-5" />,
  },
]

export default function LagrangeCalculator() {
  const [activeTab, setActiveTab] = useState<"quadratic" | "geometry">("quadratic")

  const [funcCoeffs, setFuncCoeffs] = useState<FunctionCoeffs>(PRESETS[0].func)
  const [constraintCoeffs, setConstraintCoeffs] = useState<ConstraintCoeffs>(PRESETS[0].constraint)
  const [result, setResult] = useState<SolutionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    lagrangian: true,
    derivatives: true,
    system: true,
    analysis: true,
  })

  const [geometryType, setGeometryType] = useState<GeometryProblemType>("cylinder")
  const [constraintValue, setConstraintValue] = useState<string>("403")
  const [geometryResult, setGeometryResult] = useState<GeometrySolutionResult | null>(null)

  const parseCoeffs = (c: FunctionCoeffs) => ({
    A: new Fraction(c.A || "0"),
    B: new Fraction(c.B || "0"),
    C: new Fraction(c.C || "0"),
    D: new Fraction(c.D || "0"),
    E: new Fraction(c.E || "0"),
    F: new Fraction(c.F || "0"),
  })

  const parseConstraint = (c: ConstraintCoeffs) => ({
    a: new Fraction(c.a || "0"),
    b: new Fraction(c.b || "0"),
    c: new Fraction(c.c || "0"),
    d: new Fraction(c.d || "0"),
    e: new Fraction(c.e || "0"),
    f: new Fraction(c.f || "0"),
  })

  // Формула целевой функции
  const getFuncString = () => {
    const c = parseCoeffs(funcCoeffs)
    const parts: string[] = []
    if (!c.A.isZero()) parts.push(`${c.A.toString() === "1" ? "" : c.A.toString() === "-1" ? "-" : c.A.toString()}x₁²`)
    if (!c.B.isZero()) {
      const s = c.B.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s === "1" ? "" : s === "-1" ? "-" : s}x₂²`)
    }
    if (!c.C.isZero()) {
      const s = c.C.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s === "1" ? "" : s === "-1" ? "-" : s}x₁x₂`)
    }
    if (!c.D.isZero()) {
      const s = c.D.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s === "1" ? "" : s === "-1" ? "-" : s}x₁`)
    }
    if (!c.E.isZero()) {
      const s = c.E.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s === "1" ? "" : s === "-1" ? "-" : s}x₂`)
    }
    if (!c.F.isZero()) {
      const s = c.F.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s}`)
    }
    return parts.join(" ") || "0"
  }

  // Формула ограничения
  const getConstraintString = () => {
    const g = parseConstraint(constraintCoeffs)
    const parts: string[] = []
    if (!g.a.isZero()) parts.push(`${g.a.toString() === "1" ? "" : g.a.toString() === "-1" ? "-" : g.a.toString()}x₁²`)
    if (!g.b.isZero()) {
      const s = g.b.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s === "1" ? "" : s === "-1" ? "-" : s}x₂²`)
    }
    if (!g.c.isZero()) {
      const s = g.c.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s === "1" ? "" : s === "-1" ? "-" : s}x₁x₂`)
    }
    if (!g.d.isZero()) {
      const s = g.d.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s === "1" ? "" : s === "-1" ? "-" : s}x₁`)
    }
    if (!g.e.isZero()) {
      const s = g.e.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s === "1" ? "" : s === "-1" ? "-" : s}x₂`)
    }
    if (!g.f.isZero()) {
      const s = g.f.toString()
      const prefix = s.startsWith("-") ? "" : parts.length ? "+" : ""
      parts.push(`${prefix}${s}`)
    }
    return (parts.join(" ") || "0") + " = 0"
  }

  const calculateGeometry = () => {
    setGeometryResult(null)
    setError(null)

    try {
      const V = Number.parseFloat(constraintValue)
      if (isNaN(V) || V <= 0) {
        setError("Введите корректное положительное значение ограничения")
        return
      }

      if (geometryType === "cylinder") {
        // Задача: S = 2πR² + 2πRh → min при πR²h = V
        const variables = ["R (радиус)", "h (высота)"]
        const objectiveFunction = "S(R, h) = 2πR² + 2πRh"
        const constraintFunction = `g(R, h) = πR²h - ${V} = 0`

        const lagrangian = `L(R, h, λ) = 2πR² + 2πRh + λ(πR²h - ${V})`

        const partialDerivatives = [
          "∂L/∂R = 4πR + 2πh + 2πRhλ = 0",
          "∂L/∂h = 2πR + πR²λ = 0",
          `∂L/∂λ = πR²h - ${V} = 0`,
        ]

        const systemSolution: string[] = []
        systemSolution.push("Из уравнения (2): 2πR + πR²λ = 0")
        systemSolution.push("πR(2 + Rλ) = 0")
        systemSolution.push("Так как R > 0: λ = -2/R")
        systemSolution.push("")
        systemSolution.push("Подставляем λ = -2/R в уравнение (1):")
        systemSolution.push("4πR + 2πh + 2πRh·(-2/R) = 0")
        systemSolution.push("4πR + 2πh - 4πh = 0")
        systemSolution.push("4πR - 2πh = 0")
        systemSolution.push("2R = h")
        systemSolution.push("")
        systemSolution.push(`Подставляем h = 2R в ограничение πR²h = ${V}:`)
        systemSolution.push(`πR²·(2R) = ${V}`)
        systemSolution.push(`2πR³ = ${V}`)
        systemSolution.push(`R³ = ${V}/(2π) = ${(V / (2 * Math.PI)).toFixed(4)}`)

        const R = Math.pow(V / (2 * Math.PI), 1 / 3)
        const h = 2 * R
        const lambda = -2 / R
        const S = 2 * Math.PI * R * R + 2 * Math.PI * R * h

        systemSolution.push(`R = ∛(${V}/(2π)) ≈ ${R.toFixed(4)}`)
        systemSolution.push(`h = 2R ≈ ${h.toFixed(4)}`)
        systemSolution.push(`λ = -2/R ≈ ${lambda.toFixed(4)}`)

        const hessianAnalysis: string[] = []
        hessianAnalysis.push("Проверка условий второго порядка:")
        hessianAnalysis.push("∂²L/∂R² = 4π + 2πhλ")
        hessianAnalysis.push("∂²L/∂h² = 0")
        hessianAnalysis.push("∂²L/∂R∂h = 2π + 2πRλ = 2π(1 + Rλ) = 2π(1 - 2) = -2π")
        hessianAnalysis.push("")
        hessianAnalysis.push(`При R = ${R.toFixed(4)}, h = ${h.toFixed(4)}, λ = ${lambda.toFixed(4)}:`)
        const d2L_dR2 = 4 * Math.PI + 2 * Math.PI * h * lambda
        hessianAnalysis.push(`∂²L/∂R² = 4π + 2π·${h.toFixed(2)}·(${lambda.toFixed(4)}) = ${d2L_dR2.toFixed(4)}`)
        hessianAnalysis.push("")
        hessianAnalysis.push("Окаймлённый Гессиан:")
        hessianAnalysis.push("     | 0    gR    gh  |")
        hessianAnalysis.push("H̄ = | gR   LRR   LRh |")
        hessianAnalysis.push("     | gh   LhR   Lhh |")
        hessianAnalysis.push("")
        const gR = 2 * Math.PI * R * h
        const gh = Math.PI * R * R
        hessianAnalysis.push(`gR = ∂g/∂R = 2πRh = ${gR.toFixed(4)}`)
        hessianAnalysis.push(`gh = ∂g/∂h = πR² = ${gh.toFixed(4)}`)
        const detH = -(gR * gR * 0 - 2 * gR * gh * (-2 * Math.PI) + gh * gh * d2L_dR2)
        hessianAnalysis.push("")
        hessianAnalysis.push(`det(H̄) = -gR²·Lhh + 2·gR·gh·LRh - gh²·LRR`)
        hessianAnalysis.push(
          `det(H̄) = 2·${gR.toFixed(2)}·${gh.toFixed(2)}·(-2π) - ${(gh * gh).toFixed(2)}·${d2L_dR2.toFixed(4)}`,
        )
        hessianAnalysis.push(`det(H̄) ≈ ${detH.toFixed(4)}`)
        hessianAnalysis.push("")
        if (detH > 0) {
          hessianAnalysis.push("det(H̄) > 0 при n-m = 1 нечётное ⟹ МИНИМУМ")
        } else {
          hessianAnalysis.push("det(H̄) < 0 ⟹ требуется дополнительный анализ")
        }

        setGeometryResult({
          problem: `Минимизация площади поверхности цилиндра при V = ${V}`,
          variables,
          objectiveFunction,
          constraintFunction,
          lagrangian,
          partialDerivatives,
          systemSolution,
          criticalPoint: {
            vars: { R, h },
            lambda,
            fValue: S,
            type: "min",
          },
          hessianAnalysis,
          conclusion: `Оптимальные размеры цилиндра:\nR ≈ ${R.toFixed(4)}\nh ≈ ${h.toFixed(4)}\nМинимальная площадь S ≈ ${S.toFixed(4)}`,
        })
      } else if (geometryType === "box") {
        // Задача: S = xy + 2xz + 2yz → min при xyz = V (открытый ящик)
        const variables = ["x (длина)", "y (ширина)", "z (высота)"]
        const objectiveFunction = "S(x, y, z) = xy + 2xz + 2yz"
        const constraintFunction = `g(x, y, z) = xyz - ${V} = 0`

        const lagrangian = `L(x, y, z, λ) = xy + 2xz + 2yz + λ(xyz - ${V})`

        const partialDerivatives = [
          "∂L/∂x = y + 2z + λyz = 0",
          "∂L/∂y = x + 2z + λxz = 0",
          "∂L/∂z = 2x + 2y + λxy = 0",
          `∂L/∂λ = xyz - ${V} = 0`,
        ]

        const systemSolution: string[] = []
        systemSolution.push("Из симметрии уравнений (1) и (2):")
        systemSolution.push("y + 2z + λyz = x + 2z + λxz")
        systemSolution.push("y + λyz = x + λxz")
        systemSolution.push("y(1 + λz) = x(1 + λz)")
        systemSolution.push("Если 1 + λz ≠ 0, то x = y")
        systemSolution.push("")
        systemSolution.push("Подставляем x = y в уравнение (1):")
        systemSolution.push("x + 2z + λxz = 0  →  x(1 + λz) = -2z")
        systemSolution.push("")
        systemSolution.push("Подставляем x = y в уравнение (3):")
        systemSolution.push("2x + 2x + λx² = 0  →  4x + λx² = 0  →  x(4 + λx) = 0")
        systemSolution.push("Так как x > 0: λ = -4/x")
        systemSolution.push("")
        systemSolution.push("Подставляем λ = -4/x в x(1 + λz) = -2z:")
        systemSolution.push("x(1 - 4z/x) = -2z")
        systemSolution.push("x - 4z = -2z")
        systemSolution.push("x = 2z")
        systemSolution.push("")
        systemSolution.push(`Подставляем x = y и x = 2z в ограничение xyz = ${V}:`)
        systemSolution.push(`x · x · (x/2) = ${V}`)
        systemSolution.push(`x³/2 = ${V}`)
        systemSolution.push(`x³ = ${2 * V}`)

        const x = Math.pow(2 * V, 1 / 3)
        const y = x
        const z = x / 2
        const lambda = -4 / x
        const S = x * y + 2 * x * z + 2 * y * z

        systemSolution.push(`x = ∛(${2 * V}) ≈ ${x.toFixed(4)}`)
        systemSolution.push(`y = x ≈ ${y.toFixed(4)}`)
        systemSolution.push(`z = x/2 ≈ ${z.toFixed(4)}`)
        systemSolution.push(`λ = -4/x ≈ ${lambda.toFixed(4)}`)

        const hessianAnalysis: string[] = []
        hessianAnalysis.push("Условия второго порядка для задачи с 3 переменными")
        hessianAnalysis.push("и 1 ограничением проверяются через окаймлённый Гессиан.")
        hessianAnalysis.push("")
        hessianAnalysis.push("Так как задача — минимизация площади при фиксированном")
        hessianAnalysis.push("объёме, и найденная точка единственная стационарная,")
        hessianAnalysis.push("а при x,y,z → 0 или → ∞ площадь S → ∞,")
        hessianAnalysis.push("то найденная точка — глобальный минимум.")

        setGeometryResult({
          problem: `Минимизация площади открытого ящика при V = ${V}`,
          variables,
          objectiveFunction,
          constraintFunction,
          lagrangian,
          partialDerivatives,
          systemSolution,
          criticalPoint: {
            vars: { x, y, z },
            lambda,
            fValue: S,
            type: "min",
          },
          hessianAnalysis,
          conclusion: `Оптимальные размеры ящика:\nx ≈ ${x.toFixed(4)}\ny ≈ ${y.toFixed(4)}\nz ≈ ${z.toFixed(4)}\nМинимальная площадь S ≈ ${S.toFixed(4)}`,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка вычислений")
    }
  }

  const calculate = () => {
    setResult(null)
    setError(null)

    try {
      const f = parseCoeffs(funcCoeffs)
      const g = parseConstraint(constraintCoeffs)

      // Строим функцию Лагранжа: L = f + λg
      const lagrangian = `L(x₁, x₂, λ) = ${getFuncString()} + λ(${getConstraintString().replace(" = 0", "")})`

      const partialDerivatives: string[] = []

      // dL/dx1
      const dLdx1_parts: string[] = []
      if (!f.A.isZero()) dLdx1_parts.push(`${f.A.mul(2).toString()}x₁`)
      if (!f.C.isZero()) dLdx1_parts.push(`${f.C.toString()}x₂`)
      if (!f.D.isZero()) dLdx1_parts.push(`${f.D.toString()}`)

      const dLdx1_lambda: string[] = []
      if (!g.a.isZero()) dLdx1_lambda.push(`${g.a.mul(2).toString()}x₁`)
      if (!g.c.isZero()) dLdx1_lambda.push(`${g.c.toString()}x₂`)
      if (!g.d.isZero()) dLdx1_lambda.push(`${g.d.toString()}`)

      const dLdx1_str = `∂L/∂x₁ = ${dLdx1_parts.join(" + ").replace(/\+ -/g, "- ") || "0"} + λ(${dLdx1_lambda.join(" + ").replace(/\+ -/g, "- ") || "0"}) = 0`
      partialDerivatives.push(dLdx1_str)

      // dL/dx2
      const dLdx2_parts: string[] = []
      if (!f.B.isZero()) dLdx2_parts.push(`${f.B.mul(2).toString()}x₂`)
      if (!f.C.isZero()) dLdx2_parts.push(`${f.C.toString()}x₁`)
      if (!f.E.isZero()) dLdx2_parts.push(`${f.E.toString()}`)

      const dLdx2_lambda: string[] = []
      if (!g.b.isZero()) dLdx2_lambda.push(`${g.b.mul(2).toString()}x₂`)
      if (!g.c.isZero()) dLdx2_lambda.push(`${g.c.toString()}x₁`)
      if (!g.e.isZero()) dLdx2_lambda.push(`${g.e.toString()}`)

      const dLdx2_str = `∂L/∂x₂ = ${dLdx2_parts.join(" + ").replace(/\+ -/g, "- ") || "0"} + λ(${dLdx2_lambda.join(" + ").replace(/\+ -/g, "- ") || "0"}) = 0`
      partialDerivatives.push(dLdx2_str)

      // dL/dlambda
      partialDerivatives.push(`∂L/∂λ = ${getConstraintString()}`)

      const systemSolution: string[] = []
      const criticalPoints: CriticalPoint[] = []

      // Проверяем тип задачи
      const isLinearF = f.A.isZero() && f.B.isZero() && f.C.isZero()
      const isQuadraticG = !g.a.isZero() || !g.b.isZero()
      const isLinearG = g.a.isZero() && g.b.isZero() && g.c.isZero()

      if (isLinearF && isQuadraticG && g.c.isZero() && g.d.isZero() && g.e.isZero()) {
        systemSolution.push("Тип задачи: линейная ЦФ с квадратичным ограничением")
        systemSolution.push(`Из ∂L/∂x₁ = 0: ${f.D.toString()} + ${g.a.mul(2).toString()}λx₁ = 0`)
        systemSolution.push(`x₁ = ${f.D.neg().toString()}/(${g.a.mul(2).toString()}λ)`)
        systemSolution.push(`Из ∂L/∂x₂ = 0: ${f.E.toString()} + ${g.b.mul(2).toString()}λx₂ = 0`)
        systemSolution.push(`x₂ = ${f.E.neg().toString()}/(${g.b.mul(2).toString()}λ)`)

        const D2_a = f.D.pow(2).div(g.a)
        const E2_b = f.E.pow(2).div(g.b)
        const sum = D2_a.add(E2_b)
        const rhs = g.f.neg().mul(4)

        systemSolution.push(`Подставляем в ограничение:`)
        systemSolution.push(
          `${g.a.toString()}·(${f.D.neg().toString()}/(${g.a.mul(2).toString()}λ))² + ${g.b.toString()}·(${f.E.neg().toString()}/(${g.b.mul(2).toString()}λ))² = ${g.f.neg().toString()}`,
        )
        systemSolution.push(
          `(${f.D.pow(2).toString()}/${g.a.mul(4).toString()} + ${f.E.pow(2).toString()}/${g.b.mul(4).toString()}) / λ² = ${g.f.neg().toString()}`,
        )

        const lambda2 = sum.div(rhs)
        systemSolution.push(`λ² = ${lambda2.toString()}`)

        const lambdaVal = Math.sqrt(Math.abs(lambda2.toNumber()))
        systemSolution.push(`λ = ±${lambdaVal.toFixed(4)}`)

        for (const sign of [1, -1]) {
          const lambda = new Fraction(sign * lambdaVal)
          const x1 = f.D.neg().div(g.a.mul(2).mul(lambda))
          const x2 = f.E.neg().div(g.b.mul(2).mul(lambda))

          const fValue = f.D.mul(x1).add(f.E.mul(x2)).add(f.F)

          const d2L_x1 = g.a.mul(2).mul(lambda)
          const d2L_x2 = g.b.mul(2).mul(lambda)

          const hessianAnalysis: string[] = []
          hessianAnalysis.push(`λ = ${lambda.toString()}`)
          hessianAnalysis.push(`∂²L/∂x₁² = 2a·λ = ${d2L_x1.toString()}`)
          hessianAnalysis.push(`∂²L/∂x₂² = 2b·λ = ${d2L_x2.toString()}`)

          let type: "max" | "min" | "saddle" | "unknown" = "unknown"
          const d2LStr = `d²L = ${d2L_x1.toString()}dx₁² + ${d2L_x2.toString()}dx₂²`

          if (d2L_x1.isPositive() && d2L_x2.isPositive()) {
            type = "min"
            hessianAnalysis.push(`d²L > 0 при всех dx ≠ 0 ⟹ минимум`)
          } else if (d2L_x1.isNegative() && d2L_x2.isNegative()) {
            type = "max"
            hessianAnalysis.push(`d²L < 0 при всех dx ≠ 0 ⟹ максимум`)
          } else {
            const ratio = g.a.mul(x1).div(g.b.mul(x2)).neg()
            const d2L_constrained = d2L_x1.add(d2L_x2.mul(ratio.pow(2)))
            hessianAnalysis.push(`d²L_constrained = ${d2L_constrained.toString()}`)

            if (d2L_constrained.isPositive()) {
              type = "min"
              hessianAnalysis.push("d²L_constrained > 0 ⟹ минимум")
            } else if (d2L_constrained.isNegative()) {
              type = "max"
              hessianAnalysis.push("d²L_constrained < 0 ⟹ максимум")
            } else {
              hessianAnalysis.push("d²L_constrained = 0 ⟹ седловая точка")
            }
          }

          criticalPoints.push({
            x1,
            x2,
            lambda,
            type,
            fValue,
            d2L: d2LStr,
            hessianAnalysis,
          })
        }
      }

      setResult({
        lagrangian,
        partialDerivatives,
        systemSolution,
        criticalPoints,
        conclusion: criticalPoints.length > 0 ? "Критические точки найдены" : "Нет критических точек",
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка вычислений")
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex justify-center items-center mb-6">
          <Link
            href="/math-methods"
            className="text-purple-600 hover:text-purple-800 transition"
            title="Назад к методам"
          >
            <TbSmartHome className="text-3xl mr-2" />
          </Link>
          <h1 className="text-xl md:text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Метод множителей Лагранжа
          </h1>
        </div>

        {/* Tab Switcher - ZLO style centered buttons */}
        <div className="flex text-xs sm:text-sm md:text-base font-bold gap-1 sm:gap-3 flex-wrap justify-center">
          <button
            onClick={() => setActiveTab("quadratic")}
            className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg min-h-[44px] flex-1 sm:flex-none transition-colors ${
              activeTab === "quadratic"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Квадратичные задачи
          </button>
          <button
            onClick={() => setActiveTab("geometry")}
            className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg min-h-[44px] flex-1 sm:flex-none transition-colors ${
              activeTab === "geometry"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Геометрические задачи
          </button>
        </div>

        {/* Quadratic Tab Content */}
        {activeTab === "quadratic" && (
          <div className="space-y-6">
            {/* Input Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  1
                </span>
                Ввод данных
              </h2>

              {/* Presets */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Готовые примеры:</label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setFuncCoeffs(preset.func)
                        setConstraintCoeffs(preset.constraint)
                        setResult(null)
                        setError(null)
                      }}
                      className="px-3 py-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full transition-colors border border-purple-200"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Function */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Целевая функция f(x₁, x₂) = Ax₁² + Bx₂² + Cx₁x₂ + Dx₁ + Ex₂ + F → extr
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {(["A", "B", "C", "D", "E", "F"] as const).map((key) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{key}</label>
                      <input
                        type="text"
                        value={funcCoeffs[key]}
                        onChange={(e) => setFuncCoeffs({ ...funcCoeffs, [key]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm text-purple-600 font-medium">f(x₁, x₂) = {getFuncString()} → extr</div>
              </div>

              {/* Constraint */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Ограничение g(x₁, x₂) = ax₁² + bx₂² + cx₁x₂ + dx₁ + ex₂ + f = 0
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {(["a", "b", "c", "d", "e", "f"] as const).map((key) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{key}</label>
                      <input
                        type="text"
                        value={constraintCoeffs[key]}
                        onChange={(e) => setConstraintCoeffs({ ...constraintCoeffs, [key]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm text-purple-600 font-medium">g(x₁, x₂) = {getConstraintString()}</div>
              </div>

              <button
                onClick={calculate}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Решить методом Лагранжа
              </button>

              {error && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">{error}</div>}
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {/* Lagrangian */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <button
                    onClick={() => setExpandedSteps((prev) => ({ ...prev, lagrangian: !prev.lagrangian }))}
                    className="w-full flex items-center justify-between"
                  >
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        2
                      </span>
                      Функция Лагранжа
                    </h2>
                    <span className="text-purple-500">{expandedSteps.lagrangian ? "▼" : "▶"}</span>
                  </button>
                  {expandedSteps.lagrangian && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-xl font-mono text-sm">{result.lagrangian}</div>
                  )}
                </div>

                {/* Partial Derivatives */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <button
                    onClick={() => setExpandedSteps((prev) => ({ ...prev, derivatives: !prev.derivatives }))}
                    className="w-full flex items-center justify-between"
                  >
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        3
                      </span>
                      Частные производные (условия первого порядка)
                    </h2>
                    <span className="text-purple-500">{expandedSteps.derivatives ? "▼" : "▶"}</span>
                  </button>
                  {expandedSteps.derivatives && (
                    <div className="mt-4 space-y-2">
                      {result.partialDerivatives.map((pd, i) => (
                        <div key={i} className="p-3 bg-purple-50 rounded-lg font-mono text-sm">
                          {pd}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Solution */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <button
                    onClick={() => setExpandedSteps((prev) => ({ ...prev, system: !prev.system }))}
                    className="w-full flex items-center justify-between"
                  >
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        4
                      </span>
                      Решение системы
                    </h2>
                    <span className="text-purple-500">{expandedSteps.system ? "▼" : "▶"}</span>
                  </button>
                  {expandedSteps.system && (
                    <div className="mt-4 space-y-1">
                      {result.systemSolution.map((line, i) => (
                        <div key={i} className={`font-mono text-sm ${line === "" ? "h-2" : "p-2 bg-gray-50 rounded"}`}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Critical Points Analysis */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <button
                    onClick={() => setExpandedSteps((prev) => ({ ...prev, analysis: !prev.analysis }))}
                    className="w-full flex items-center justify-between"
                  >
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        5
                      </span>
                      Анализ критических точек (условия второго порядка)
                    </h2>
                    <span className="text-purple-500">{expandedSteps.analysis ? "▼" : "▶"}</span>
                  </button>
                  {expandedSteps.analysis && (
                    <div className="mt-4 space-y-4">
                      {result.criticalPoints.map((cp, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border-2 ${
                            cp.type === "max"
                              ? "bg-green-50 border-green-300"
                              : cp.type === "min"
                                ? "bg-blue-50 border-blue-300"
                                : cp.type === "saddle"
                                  ? "bg-yellow-50 border-yellow-300"
                                  : "bg-gray-50 border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-gray-800">
                              Точка {idx + 1}: ({cp.x1.toString()}, {cp.x2.toString()})
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-bold ${
                                cp.type === "max"
                                  ? "bg-green-200 text-green-800"
                                  : cp.type === "min"
                                    ? "bg-blue-200 text-blue-800"
                                    : cp.type === "saddle"
                                      ? "bg-yellow-200 text-yellow-800"
                                      : "bg-gray-200 text-gray-800"
                              }`}
                            >
                              {cp.type === "max"
                                ? "МАКСИМУМ"
                                : cp.type === "min"
                                  ? "МИНИМУМ"
                                  : cp.type === "saddle"
                                    ? "СЕДЛОВАЯ"
                                    : "НЕ ОПРЕДЕЛЕНО"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div className="p-2 bg-white/50 rounded-lg">
                              <span className="text-gray-500">λ = </span>
                              <span className="font-mono">{cp.lambda.toString()}</span>
                            </div>
                            <div className="p-2 bg-white/50 rounded-lg">
                              <span className="text-gray-500">f(x*) = </span>
                              <span className="font-mono">{cp.fValue.toString()}</span>
                            </div>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="font-medium text-gray-600">Анализ d²L:</div>
                            {cp.hessianAnalysis.map((line, i) => (
                              <div key={i} className="font-mono text-xs p-1 bg-white/50 rounded">
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Conclusion */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
                  <h2 className="text-lg font-semibold mb-2">Ответ</h2>
                  <p className="text-purple-100">{result.conclusion}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Geometry Tab Content */}
        {activeTab === "geometry" && (
          <div className="space-y-6">
            {/* Input Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  1
                </span>
                Выбор задачи
              </h2>

              {/* Geometry Presets */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {GEOMETRY_PRESETS.map((preset) => (
                  <button
                    key={preset.type}
                    onClick={() => {
                      setGeometryType(preset.type)
                      setConstraintValue(preset.constraintValue.toString())
                      setGeometryResult(null)
                      setError(null)
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      geometryType === preset.type
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2 rounded-lg ${geometryType === preset.type ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"}`}
                      >
                        {preset.icon}
                      </div>
                      <span className="font-semibold text-gray-800">{preset.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{preset.description}</p>
                    <div className="text-xs font-mono text-purple-600">
                      <div>{preset.objective}</div>
                      <div>{preset.constraint} = V</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Constraint Value Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Значение объёма V:</label>
                <input
                  type="number"
                  value={constraintValue}
                  onChange={(e) => setConstraintValue(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Введите значение V"
                />
              </div>

              <button
                onClick={calculateGeometry}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Решить методом Лагранжа
              </button>

              {error && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">{error}</div>}
            </div>

            {/* Geometry Results */}
            {geometryResult && (
              <div className="space-y-4">
                {/* Problem Statement */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      2
                    </span>
                    Постановка задачи
                  </h2>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="p-3 bg-purple-50 rounded-lg">{geometryResult.objectiveFunction}</div>
                    <div className="p-3 bg-purple-50 rounded-lg">{geometryResult.constraintFunction}</div>
                  </div>
                </div>

                {/* Lagrangian */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      3
                    </span>
                    Функция Лагранжа
                  </h2>
                  <div className="p-4 bg-purple-50 rounded-xl font-mono text-sm">{geometryResult.lagrangian}</div>
                </div>

                {/* Partial Derivatives */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      4
                    </span>
                    Частные производные
                  </h2>
                  <div className="space-y-2">
                    {geometryResult.partialDerivatives.map((pd, i) => (
                      <div key={i} className="p-3 bg-purple-50 rounded-lg font-mono text-sm">
                        {pd}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Solution Steps */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      5
                    </span>
                    Решение системы
                  </h2>
                  <div className="space-y-1">
                    {geometryResult.systemSolution.map((line, i) => (
                      <div key={i} className={`font-mono text-sm ${line === "" ? "h-2" : "p-2 bg-gray-50 rounded"}`}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hessian Analysis */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      6
                    </span>
                    Анализ условий второго порядка
                  </h2>
                  <div className="space-y-1">
                    {geometryResult.hessianAnalysis.map((line, i) => (
                      <div key={i} className={`font-mono text-sm ${line === "" ? "h-2" : "p-2 bg-gray-50 rounded"}`}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Critical Point Result */}
                {geometryResult.criticalPoint && (
                  <div
                    className={`rounded-2xl shadow-xl p-6 ${
                      geometryResult.criticalPoint.type === "min"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600"
                        : "bg-gradient-to-r from-green-600 to-emerald-600"
                    } text-white`}
                  >
                    <h2 className="text-lg font-semibold mb-4">Оптимальное решение</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(geometryResult.criticalPoint.vars).map(([key, value]) => (
                        <div key={key} className="p-3 bg-white/20 rounded-xl">
                          <span className="text-white/80">{key} = </span>
                          <span className="font-mono font-bold">{value.toFixed(4)}</span>
                        </div>
                      ))}
                      <div className="p-3 bg-white/20 rounded-xl">
                        <span className="text-white/80">λ = </span>
                        <span className="font-mono font-bold">{geometryResult.criticalPoint.lambda.toFixed(4)}</span>
                      </div>
                      <div className="p-3 bg-white/20 rounded-xl">
                        <span className="text-white/80">f(x*) = </span>
                        <span className="font-mono font-bold">{geometryResult.criticalPoint.fValue.toFixed(4)}</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-white/20 rounded-xl">
                      <span className="font-semibold">{geometryResult.conclusion}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
