"use client";

import { GetAssesmentMetricsQueryType } from "../Types";

interface Props {
  data: GetAssesmentMetricsQueryType[];
}

export default function PrintAssessmentTemplate({ data }: Props) {
  return (
    <div className="hidden print:block p-8 bg-white text-black min-h-screen">
      <div className="mb-8 text-center border-b pb-4">
        <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">
          Assessment Template
        </h1>
        <div className="flex justify-between items-center text-sm mt-6 mb-2">
          <div className="flex gap-2 items-end">
            <span className="font-semibold">Athlete Name:</span>
            <div className="border-b border-black w-64"></div>
          </div>
          <div className="flex gap-2 items-end">
            <span className="font-semibold">Date:</span>
            <div className="border-b border-black w-40"></div>
          </div>
        </div>
        <div className="flex justify-between items-center text-sm mt-4">
          <div className="flex gap-2 items-end">
            <span className="font-semibold">Coach:</span>
            <div className="border-b border-black w-64"></div>
          </div>
          <div className="flex gap-2 items-end">
            <span className="font-semibold">Training Session:</span>
            <div className="border-b border-black w-40"></div>
          </div>
        </div>
      </div>

      <div className="mb-4 text-sm mt-6">
        <h2 className="font-bold underline mb-2">Grading Scale:</h2>
        <ul className="flex justify-between border p-3 rounded bg-gray-50">
          <li>
            <strong>1</strong> - Below Standard
          </li>
          <li>
            <strong>2</strong> - Needs Work
          </li>
          <li>
            <strong>3</strong> - Good
          </li>
          <li>
            <strong>4</strong> - Very Good
          </li>
          <li>
            <strong>5</strong> - Excellent
          </li>
        </ul>
      </div>

      <div className="space-y-8 mt-8">
        {data.map((section, sIdx) => (
          <div key={section.id} className="break-inside-avoid">
            <h3 className="text-lg font-bold bg-gray-200 p-2 mb-2">
              {sIdx + 1}. {section.name}
            </h3>
            <table className="w-full border-collapse border border-gray-400 mb-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-2 text-left w-2/5">
                    Metric
                  </th>
                  <th
                    className="border border-gray-400 p-2 text-center"
                    colSpan={5}
                    style={{ width: "20%" }}
                  >
                    Grade (1-5)
                  </th>
                  <th
                    className="border border-gray-400 p-2 text-left"
                    style={{ width: "36%" }}
                  >
                    Coach Notes / Comments
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.metrics.length > 0 ? (
                  section.metrics.map((metric) => (
                    <tr key={metric.id}>
                      <td className="border border-gray-400 p-2 font-medium">
                        {metric.label}
                      </td>
                      <td className="border border-gray-400 p-2 text-center w-8 text-gray-300">
                        1
                      </td>
                      <td className="border border-gray-400 p-2 text-center w-8 text-gray-300">
                        2
                      </td>
                      <td className="border border-gray-400 p-2 text-center w-8 text-gray-300">
                        3
                      </td>
                      <td className="border border-gray-400 p-2 text-center w-8 text-gray-300">
                        4
                      </td>
                      <td className="border border-gray-400 p-2 text-center w-8 text-gray-300">
                        5
                      </td>
                      <td className="border border-gray-400 p-2 h-10">
                        {/* blank notes field */}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-gray-400 p-2 text-center text-gray-500 italic"
                    >
                      No metrics defined for this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="mt-12 break-inside-avoid">
        <h3 className="text-lg font-bold mb-2">Overall Comments & Notes:</h3>
        <div className="border border-gray-400 h-40 w-full p-2"></div>
      </div>
    </div>
  );
}
