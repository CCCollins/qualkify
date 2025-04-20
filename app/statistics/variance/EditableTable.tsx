'use client';

type Props = {
  table: (number | string)[][];
  setTable: (t: (number | string)[][]) => void;
  rowLabels: string[];
  setRowLabels: (labels: string[]) => void;
  colLabels: string[];
  setColLabels: (labels: string[]) => void;
  onCalculate: () => void;
};

export default function EditableTable({
  table,
  setTable,
  rowLabels,
  setRowLabels,
  colLabels,
  setColLabels,
  onCalculate,
}: Props) {
    const handleInputChange = (row: number, col: number, value: string) => {
        const updated = [...table];
      
        // Преобразуем значение в строку и сохраняем только цифры или точку
        updated[row][col] = value.replace(/[^\d,\.]/g, ''); // Разрешаем только цифры, запятую и точку
      
        setTable(updated);
      };
      
      const handleBlur = (row: number, col: number) => {
        const updated = [...table];
        const value = updated[row][col];
      
        // Убедимся, что значение - это строка
        if (typeof value === "string") {
          // Нормализуем введенное значение, заменяя запятую на точку
          const normalized = value.replace(',', '.').replace(/\s+/g, '');
      
          const parsed = parseFloat(normalized);
      
          if (!isNaN(parsed)) {
            // Сохраняем значение как число с точкой
            updated[row][col] = parsed;
          } else {
            // Если введено некорректное значение, очищаем ячейку
            updated[row][col] = '';
          }
        }
      
        setTable(updated);
      };
      
      const handleFirstBlur = (index: number) => {
        const updated = [...rowLabels];
        const value = updated[index];
      
        // Убедимся, что значение - это строка
        if (typeof value === "string") {
          // Нормализуем введенное значение, заменяя запятую на точку
          const normalized = value.replace(',', '.').replace(/\s+/g, '');
          const parsed = parseFloat(normalized);
      
          if (!isNaN(parsed)) {
            // Сохраняем значение как строку с числом
            updated[index] = String(parsed);
          } else {
            // Если введено некорректное значение, очищаем ячейку
            updated[index] = '';
          }
        }

        setRowLabels(updated);
      };

  const addRow = () => {
    setTable([...table, Array(table[0].length).fill(0)]);
    setRowLabels([...rowLabels, `${rowLabels.length + 1}`]);
  };

  const removeRow = () => {
    if (table.length > 1) {
      setTable(table.slice(0, -1));
      setRowLabels(rowLabels.slice(0, -1));
    }
  };

  const addColumn = () => {
    setTable(table.map((row) => [...row, 0]));
    setColLabels([...colLabels, `#${colLabels.length + 1}`]);
  };

  const removeColumn = () => {
    if (table[0].length > 1) {
      setTable(table.map((row) => row.slice(0, -1)));
      setColLabels(colLabels.slice(0, -1));
    }
  };

  const parseNumber = (val: string | number) => {
    const num = parseFloat(String(val));
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="text-sm">
        <div className="overflow-x-auto rounded-xl shadow-md bg-white">
            <table className="min-w-full text-sm text-gray-800">
                <thead className="bg-gray-100">
                <tr>
                    <th className="px-4 py-2 text-center font-medium text-gray-700 border border-gray-300">
                    Признак \ Группа
                    </th>
                    {colLabels.map((label, i) => (
                    <th
                        key={i}
                        className="px-4 py-2 text-center font-medium text-gray-700 border border-gray-300"
                    >
                        <input
                        value={label}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                            const updated = [...colLabels];
                            updated[i] = e.target.value;
                            setColLabels(updated);
                        }}
                        className="w-full text-center bg-transparent font-semibold outline-none focus:ring-2 focus:ring-blue-300 rounded"
                        />
                    </th>
                    ))}
                    <th className="px-4 py-2 text-center font-bold text-gray-700 border border-gray-300 bg-blue-50">
                    Σ
                    </th>
                </tr>
                </thead>
                <tbody>
                {table.map((row, i) => {
                    const rowSum = row.reduce((sum, val) => Number(sum) + parseNumber(val), 0);
                    const roundedRowSum = Number(rowSum).toFixed(2); // Округляем сумму строки до 2 знаков
                    return (
                    <tr key={i} className="even:bg-gray-50">
                        <td className="border px-4 py-2 font-semibold">
                        <input
                            value={rowLabels[i]}
                            onChange={(e) => {
                            const updated = [...rowLabels];
                            updated[i] = e.target.value;
                            setRowLabels(updated);
                            }}
                            onBlur={() => handleFirstBlur(i)}
                            onFocus={(e) => e.target.select()}
                            className="w-full text-center bg-transparent outline-none focus:ring-2 focus:ring-blue-300 rounded"
                        />
                        </td>
                        {row.map((val, j) => (
                        <td key={j} className="border px-2 py-2">
                            <input
                            value={val}
                            onChange={(e) => handleInputChange(i, j, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleBlur(i, j)}
                            className="w-full text-center bg-transparent outline-none focus:ring-2 focus:ring-blue-300 rounded"
                            />
                        </td>
                        ))}
                        <td className="border px-4 py-2 font-bold text-right bg-gray-100">{roundedRowSum}</td>
                    </tr>
                    );
                })}

                {/* Строка с суммой по столбцам */}
                <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-2 text-center font-bold text-gray-700 border border-gray-300 bg-blue-50">Σ</td>
                    {colLabels.map((_, j) => {
                    const colSum = table.reduce((sum, row) => sum + parseNumber(row[j]), 0);
                    const roundedColSum = colSum.toFixed(2); // Округляем сумму столбца до 2 знаков
                    return (
                        <td key={j} className="border px-4 py-2 text-right">
                        {roundedColSum}
                        </td>
                    );
                    })}
                    <td className="border px-4 py-2 text-right bg-blue-50">
                    {table.reduce((total: number, row) => {
                        const rowSum = row.reduce((sum: number, val) => sum + parseNumber(val), 0);
                        return total + rowSum;
                    }, 0).toFixed(2)} {/* Округляем общую сумму до 2 знаков */}
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-6">
            <button onClick={addRow} className="bg-green-200 text-green-800 px-4 py-2 rounded hover:bg-green-300 transition">
            ＋ Признак
            </button>
            <button onClick={removeRow} className="bg-red-200 text-red-800 px-4 py-2 rounded hover:bg-red-300 transition">
            － Признак
            </button>
            <button onClick={addColumn} className="bg-green-200 text-green-800 px-4 py-2 rounded hover:bg-green-300 transition">
            ＋ Группа
            </button>
            <button onClick={removeColumn} className="bg-red-200 text-red-800 px-4 py-2 rounded hover:bg-red-300 transition">
            － Группа
            </button>
        </div>

        <div className="flex justify-center sm:justify-end mt-3 mb-3">
            <button
            onClick={onCalculate}
            className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
            Рассчитать дисперсии
            </button>
        </div>
    </div>
  );
}
