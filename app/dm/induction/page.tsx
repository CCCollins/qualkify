'use client';

import { useState } from 'react';
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import nerdamer from 'nerdamer';
import 'nerdamer/Algebra';
import 'nerdamer/Calculus';
import 'nerdamer/Solve';
import { TbSmartHome } from 'react-icons/tb';
import Link from 'next/link';

const validateExpression = (expr: string): void => {
  // Проверка баланса скобок
  const stack = [];
  for (const char of expr) {
    if (char === '(') stack.push(char);
    if (char === ')') {
      if (stack.length === 0) throw new Error('Несбалансированные скобки');
      stack.pop();
    }
  }
  if (stack.length > 0) throw new Error('Несбалансированные скобки');

  // Более гибкая проверка переменных
  const hasVariable =
    expr.includes('n') ||
    expr.includes('k') ||
    expr.includes('делится на') ||
    expr.includes('≥') ||
    expr.includes('>=');

  if (!hasVariable) {
    throw new Error('Выражение должно содержать переменную (n или k) или знак сравнения (≥, >=)');
  }
};

const preprocess = (expr: string): string => {
  // Отделяем основное выражение от условий
  const [mainExpr] = expr.split(' для ');
  validateExpression(mainExpr);

  return mainExpr
    .replace(/\s+/g, '')
    .replace(/\^/g, '**')
    .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
    .replace(/([a-zA-Z)])(\d)/g, '$1*$2')
    .replace(/([a-zA-Z)])([a-zA-Z(])/g, '$1*$2')
    .replace(/\.\.\./g, '');
};

const proveSum = (expr: string): string => {
  const [left, right] = expr.split('=').map(s => preprocess(s.trim()));
  const terms = left.split('+').map(t => t.trim().replace('...', ''));
  const generalTerm = terms[terms.length - 1]; // Общий член ряда (например, (2n-1))

  // Шаг 1: База индукции (n=1)
  const baseLeft = nerdamer(generalTerm.replace(/n/g, '1')).evaluate().text();
  const baseRight = nerdamer(right.replace(/n/g, '1')).evaluate().text();
  const baseValid = baseLeft === baseRight;

  // Шаг 2: Предположение индукции (n=k)
  const sumToK = terms.map(t => t.replace(/n/g, 'k')).join('+');
  const assumedRight = right.replace(/n/g, 'k');

  // Шаг 3: Индукционный переход (n=k+1)
  const nextTerm = generalTerm.replace(/n/g, '(k+1)');
  const leftForK1 = `(${assumedRight})+(${nextTerm})`;
  const rightForK1 = right.replace(/n/g, '(k+1)');

  // @ts-expect-error: Метод simplify отсутствует в типах nerdamer, но он существует в runtime
  const difference = nerdamer(leftForK1).subtract(rightForK1).simplify();
  const stepValid = difference.toString() === '0';

  return `
Доказательство для: ${expr}

1️⃣ База индукции (n=1):
   • Вычисляем сумму: ${generalTerm.replace(/n/g, '1')} = ${baseLeft}
   • Правая часть: ${right.replace(/n/g, '1')} = ${baseRight}
   ${baseValid ? '✅ Равенство выполняется' : '❌ Ошибка: равенство неверно'}

2️⃣ Предположение индукции:
   Допустим, для n=k верно:
   ${sumToK} = ${assumedRight}

3️⃣ Индукционный переход (n=k+1):
   • Добавляем следующий член: ${nextTerm}
   • Левая часть: ${sumToK} + ${nextTerm} = ${leftForK1}
   • Правая часть: ${rightForK1}
   • Разность: ${difference.toString()}
   ${stepValid ? '✅ Упрощается до 0' : '❌ Не упрощается до 0'}

${baseValid && stepValid
      ? '📌 Утверждение доказано для всех натуральных n'
      : '⚠️ Доказательство не завершено (проверьте шаги)'}
`;
};



const proveDivisibility = (expr: string): string => {
  // Извлекаем выражение и делитель
  const match = expr.match(/(.+)\s*делится\s*на\s*(\d+)/);
  if (!match) {
    throw new Error("Неверный формат задачи на делимость. Пример: 'n^3 - n делится на 3'");
  }

  const expression = match[1].trim();
  const divisor = parseInt(match[2].trim(), 10);

  // Обрабатываем выражение
  const processed = preprocess(expression);

  // Шаг 1: База индукции (n=0)
  const baseExpr = nerdamer(processed.replace(/n/g, '1')).evaluate().text();
  const baseMod = nerdamer(`mod(${baseExpr}, ${divisor})`).evaluate().text();
  const baseValid = baseMod === '0';

  // Шаг 2: Предположение индукции (n=k)
  const f_k = processed.replace(/n/g, 'k');

  // Шаг 3: Проверка для n=k+1
  const f_k1 = processed.replace(/n/g, '(k+1)');
  const f_k1_expanded = nerdamer(f_k1).expand().text();

  // Разность f(k+1) - f(k)
  const difference = nerdamer(f_k1).subtract(f_k).expand();
  const differenceMod = nerdamer(`mod(${difference}, ${divisor})`).evaluate().text();
  const stepValid = differenceMod === '0';

  // Формируем результат
  let resultText = `Доказательство делимости: ${expr}\n\n`;

  // Шаг 1: База индукции
  resultText += `1️⃣ База индукции (n=1):\n`;
  resultText += `   • f(1) = ${baseExpr}\n`;
  resultText += `   • Остаток от деления на ${divisor}: ${baseMod}\n`;
  resultText += baseValid ? `   ✅ Делится без остатка\n\n` : `   ❌ Не делится\n\n`;

  // Шаг 2: Предположение индукции
  resultText += `2️⃣ Предположение индукции (n=k):\n`;
  resultText += `   • f(k) = ${f_k}\n`;
  resultText += `   • Предполагаем, что f(k) делится на ${divisor}\n\n`;

  // Шаг 3: Проверка для n=k+1
  resultText += `3️⃣ Проверка при n=k+1:\n`;
  resultText += `   • f(k+1) = ${f_k1}\n`;
  resultText += `   • Раскрытие f(k+1): ${f_k1_expanded}\n`;
  resultText += `   • Разность f(k+1) - f(k) = ${difference}\n\n`;

  // Итог
  resultText += baseValid && stepValid
    ? `📌 Утверждение доказано по индукции для всех n ∈ ℕ`
    : `⚠️ Доказательство не завершено. Осталось выделить f(k) из f(k+1) и проверить делимость полученных коэффициентов`;

  return resultText;
};



const proveInequality = (expr: string): string => {
  const [inequality, condition] = expr.split(' для ');
  const sign = inequality.match(/[<>≥≤=]+/)?.[0] || '≥';
  const [left, right] = inequality.split(sign).map(s => preprocess(s.trim()));

  // Проверка базы индукции (символьно)
  const baseN = condition?.match(/n\s*[<>≥≤=]+\s*(\d+)/)?.[1] || '1';
  const baseLeft = left.replace(/n/g, baseN);
  const baseRight = right.replace(/n/g, baseN);

  // Символьная проверка базы
  // @ts-expect-error: Метод simplify отсутствует в типах nerdamer, но он существует в runtime
  const baseSymbolicCheck = nerdamer.simplify(`(${baseLeft})-(${baseRight})`).toString();
  const baseValid = baseSymbolicCheck === '0' ||
    (sign === '≥' && !baseSymbolicCheck.includes('-'));

  // Индукционный переход
  const kLeft = left.replace(/n/g, 'k');
  const kRight = right.replace(/n/g, 'k');
  const k1Left = left.replace(/n/g, '(k+1)');
  const k1Right = right.replace(/n/g, '(k+1)');

  // Проверка условия
  let conditionCheck = '';
  if (condition) {
    conditionCheck = `\nУсловие: ${condition}`;
  }

  return `
Доказательство неравенства: ${inequality}
${conditionCheck}

1️⃣ База индукции (n=${baseN}):
   • Левая часть: ${baseLeft} = ${nerdamer(baseLeft).toString()}
   • Правая часть: ${baseRight} = ${nerdamer(baseRight).toString()}
   • Разность: ${baseSymbolicCheck}
   ${baseValid ? '✅ Неравенство выполняется' : '❌ Требуется проверка'}

2️⃣ Индукционное предположение:
   Пусть для n=k (k≥${baseN}) верно:
   ${kLeft} ${sign} ${kRight}

3️⃣ Индукционный переход:
   Требуется доказать:
   ${k1Left} ${sign} ${k1Right}

Шаги доказательства:
1️⃣ Умножьте обе части предположения на (1+x)
   ${kLeft}*(1+x) ${sign} ${kRight}*(1+x)
2️⃣ Преобразуйте правую часть:
   ${kRight}*(1+x) = ${nerdamer(`${kRight}*(1+x)`).expand().toString()}
3️⃣ Используйте условие ${condition || 'x ≥ -1'}
4️⃣ Докажите, что ${k1Left} ${sign} ${nerdamer(`${kRight}*(1+x)`).expand().toString()}

⚠️ Примечание: Для полного доказательства требуется:
- Проверить выполнение условия ${condition}
- Убедиться, что (1+x) ≥ 0 (это важно при умножении неравенства)
`;
};



export default function InductionProver() {
  const [input, setInput] = useState('1+3+5+...+(2n-1)=n^2');
  const [output, setOutput] = useState('');

  const formatOutput = (text: string): string => {
    // Заменяем ** (степень) на ^
    const formatted = text.replace(/\*\*/g, '^');
    return formatted;
  };

  const handleProve = () => {
    try {
      let result;
      if (input.includes('делится на')) {
        result = proveDivisibility(input);
      } else if (input.includes('≥')) {
        result = proveInequality(input);
      } else {
        result = proveSum(input);
      }
      setOutput(formatOutput(result));
    } catch (e) {
      setOutput(
        formatOutput(
          `Ошибка: ${
            e instanceof Error ? e.message : 'Неизвестная ошибка'
          }\n\nПроверьте правильность ввода выражения.`
        )
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-center items-center mb-6">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 transition"
          title="Домашняя страница"
        >
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Доказательство по индукции
        </h1>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Примеры для проверки:</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          {[
            '1+3+5+...+(2n-1)=n^2',
            'n^3-n делится на 3',
            '(1+x)^n≥1+n*x для x≥-1',
            '1+2+...+n=n(n+1)/2',
            '5^n-4n+15 делится на 16',
            '2^n≥n^2 для n≥4',
          ].map((ex, i) => (
            <button
              key={i}
              onClick={() => setInput(ex)}
              className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm truncate"
              title={ex}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium">Введите выражение:</label>
        <div className="flex items-center border rounded-md overflow-hidden">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleProve();
            }}
            className="w-full p-3 text-lg border-none focus:ring-0"
            placeholder="Примеры: 1+2+...+n=n(n+1)/2, n^3-n делится на 3, (1+x)^n≥1+n*x"
          />
          <button
            onClick={handleProve}
            className="bg-blue-600 text-white rounded-full px-2 py-2 mr-2 ml-2 hover:bg-blue-700 transition"
          >
            <FaRegArrowAltCircleRight className="text-lg" />
          </button>
        </div>
      </div>

      <pre
        className="bg-gray-50 p-4 rounded-lg border overflow-auto text-sm whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: output || 'Результат появится здесь...' }}
      />
    </div>
  );
}
