'use client';

import { useState } from 'react';
import { Graphviz } from 'graphviz-react';
import { TbSmartHome } from 'react-icons/tb';
import Link from 'next/link';

type Graph = Record<string, Record<string, number>>;
type Distances = Record<string, number>;
type Predecessors = Record<string, string | null>;
type Step = { node: string; distances: Distances };

export default function DijkstraProver() {
  const [graphInput, setGraphInput] = useState('1-2 7, 1-3 9, 1-6 14, 2-3 10, 2-4 15, 3-4 11, 3-6 2, 4-5 6, 5-6 9');
  const [startNode, setStartNode] = useState('1');
  const [endNode, setEndNode] = useState('6');
  const [output, setOutput] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [graphViz, setGraphViz] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [tableData, setTableData] = useState<{ headers: string[]; rows: string[][] }>({ headers: [], rows: [] });

  const parseGraph = (input: string): Graph => {
    const graph: Graph = {};

    if (!input.trim()) {
      throw new Error('Введите граф в формате: вершина1-вершина2 вес, ...');
    }

    const edges = input.split(',');
    if (edges.length === 0) {
      throw new Error('Граф должен содержать хотя бы одно ребро');
    }

    edges.forEach(edge => {
      const trimmed = edge.trim();
      if (!trimmed) return;

      const parts = trimmed.split(/\s+/);
      if (parts.length !== 2) {
        throw new Error(`Неверный формат ребра: "${trimmed}". Используйте: вершина1-вершина2 вес`);
      }

      const [nodes, weightStr] = parts;
      const [node1, node2] = nodes.split('-');

      if (!node1 || !node2) {
        throw new Error(`Неверный формат вершин: "${nodes}". Используйте: вершина1-вершина2`);
      }

      const weight = parseInt(weightStr);
      if (isNaN(weight)) {
        throw new Error(`Неверный вес ребра: "${weightStr}". Должно быть число`);
      }

      if (!graph[node1]) graph[node1] = {};
      if (!graph[node2]) graph[node2] = {};

      graph[node1][node2] = weight;
      graph[node2][node1] = weight;
    });

    return graph;
  };

  const generateGraphViz = (graph: Graph) => {
    let dot = 'graph G {\n';
    dot += '  layout=neato;\n';
    dot += '  node [shape=circle];\n';

    const addedEdges = new Set<string>();

    for (const node1 in graph) {
      for (const node2 in graph[node1]) {
        const edgeKey = [node1, node2].sort().join('-');
        if (!addedEdges.has(edgeKey)) {
          dot += `  ${node1} -- ${node2} [label="${graph[node1][node2]}"];\n`;
          addedEdges.add(edgeKey);
        }
      }
    }

    dot += '}';
    return dot;
  };

  const dijkstra = (graph: Graph, start: string) => {
    if (!graph[start]) {
      throw new Error(`Начальная вершина "${start}" не найдена в графе`);
    }

    const distances: Distances = {};
    const predecessors: Predecessors = {};
    const visited = new Set<string>();
    const queue: [number, string][] = [];
    const steps: Step[] = [];

    Object.keys(graph).forEach(node => {
      distances[node] = node === start ? 0 : Infinity;
      predecessors[node] = null;
      queue.push([distances[node], node]);
    });

    queue.sort((a, b) => a[0] - b[0]);

    let iterations = 0;
    const maxIterations = 1000;

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      queue.sort((a, b) => a[0] - b[0]);
      const [currentDistance, currentNode] = queue.shift()!;

      if (visited.has(currentNode)) continue;
      visited.add(currentNode);

      steps.push({ node: currentNode, distances: { ...distances } });

      for (const neighbor in graph[currentNode]) {
        const distance = currentDistance + graph[currentNode][neighbor];

        if (distance < distances[neighbor]) {
          distances[neighbor] = distance;
          predecessors[neighbor] = currentNode;
          queue.push([distance, neighbor]);
        }
      }
    }

    if (iterations >= maxIterations) {
      throw new Error('Превышено максимальное количество итераций');
    }

    return { distances, predecessors, steps };
  };


  const reconstructPath = (predecessors: Predecessors, endNode: string) => {
    const path = [];
    let currentNode: string | null = endNode;

    if (!predecessors[currentNode] && currentNode !== startNode) {
      throw new Error(`Путь до вершины ${endNode} не существует`);
    }

    while (currentNode !== null) {
      path.unshift(currentNode);
      currentNode = predecessors[currentNode];
    }

    return path;
  };

  const formatTableData = (steps: Step[], nodes: string[]) => {
    const headers = ['Шаг', ...nodes];
    const rows = steps.map((step, stepIndex) => {
      return [
        stepIndex.toString(),
        ...nodes.map(node => step.distances[node] === Infinity ? '∞' : step.distances[node].toString())
      ];
    });
    return { headers, rows };
  };

  const handleProve = () => {
    try {
      setIsCalculating(true);
      setOutput('Вычисляем...');

      setTimeout(() => {
        try {
          const graph = parseGraph(graphInput);
          setGraphViz(generateGraphViz(graph));

          const { distances, predecessors, steps } = dijkstra(graph, startNode);
          setSteps(steps);
          const path = reconstructPath(predecessors, endNode);
          const nodes = Object.keys(graph).sort();

          setTableData(formatTableData(steps, nodes));

          let result = `Алгоритм Дейкстры\n\n`;
          result += `Граф: ${graphInput}\n`;
          result += `Начальная вершина: ${startNode}\n`;
          result += `Конечная вершина: ${endNode}\n\n`;
          result += `Кратчайший путь: ${path.join(' → ')}\n`;
          result += `Длина пути: ${distances[endNode]}\n`;

          setOutput(result);
        } catch (e) {
          setOutput(`Ошибка: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
        } finally {
          setIsCalculating(false);
        }
      }, 100);
    } catch (e) {
      setOutput(`Ошибка: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
      setIsCalculating(false);
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
          Алгоритм Дейкстры
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label className="block mb-2 font-medium">Примеры графов:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {[
                '1-2 7, 1-3 9, 1-6 14, 2-3 10, 2-4 15, 3-4 11, 3-6 2, 4-5 6, 5-6 9',
                'A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3',
                '1-2 2, 1-3 4, 2-4 7, 3-5 3, 4-6 1, 5-6 2, 5-4 2',
                '1-2 6, 2-5 5, 1-3 7, 1-4 8, 3-4 4, 3-5 9, 5-6 4, 3-6 10, 4-6 9'
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setGraphInput(ex)}
                  className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm truncate"
                  title={ex}
                >
                  {ex.split(',').slice(0, 2).join(',')}...
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Введите граф:</label>
            <input
              value={graphInput}
              onChange={(e) => setGraphInput(e.target.value)}
              className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Формат: вершина1-вершина2 вес, ..."
            />
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-2 font-medium">Начальная вершина:</label>
              <input
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
                className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Конечная вершина:</label>
              <input
                value={endNode}
                onChange={(e) => setEndNode(e.target.value)}
                className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleProve}
            disabled={isCalculating}
            className={`w-full py-3 px-4 rounded-lg shadow transition-colors mb-6 ${isCalculating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {isCalculating ? 'Вычисляем...' : 'Найти кратчайший путь'}
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          {graphViz && (
            <Graphviz
              dot={graphViz}
              options={{ height: '300px', width: '100%' }}
              className="border rounded-lg"
            />
          )}
        </div>
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
        <pre className="whitespace-pre-wrap text-sm font-mono">
          {output || 'Результат появится здесь...'}
        </pre>

        {tableData.headers.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3">Шаги выполнения алгоритма</h2>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                    <tr className="bg-gray-100">
                        {tableData.headers.map((header, index) => (
                        <th
                            key={index}
                            className={`p-3 border text-left ${index === 0 ? 'sticky left-0 bg-gray-100' : ''}`}
                        >
                            {header}
                        </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {(() => {
                        const seenNodes = new Set<string>(); // Хранит вершины, для которых уже обработаны значения
                        return tableData.rows.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                            {row.map((cell, cellIndex) => {
                            const isHeaderColumn = cellIndex === 0; // Первая колонка — это "Шаг"
                            const nodeName = tableData.headers[cellIndex]; // Имя вершины
                            const isCurrentNode = steps[rowIndex]?.node === nodeName; // Текущая вершина

                            // Если это заголовок, просто отображаем его
                            if (isHeaderColumn) {
                                return (
                                <td key={cellIndex} className="p-3 border font-medium sticky left-0 bg-white">
                                    {cell}
                                </td>
                                );
                            }

                            // Если вершина уже обработана, скрываем значения для нее
                            if (seenNodes.has(nodeName)) {
                                return <td key={cellIndex} className="p-3 border"></td>;
                            }

                            // Если это текущая вершина, добавляем её в список обработанных
                            if (isCurrentNode) {
                                seenNodes.add(nodeName);
                            }

                            return (
                                <td
                                key={cellIndex}
                                className={`p-3 border ${
                                    isCurrentNode ? 'bg-blue-50 font-semibold' : ''
                                }`}
                                >
                                {cell}
                                </td>
                            );
                            })}
                        </tr>
                        ));
                    })()}
                    </tbody>
                </table>
                </div>
          </div>
        )}
      </div>
    </div>
  );
}
