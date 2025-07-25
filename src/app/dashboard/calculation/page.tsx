'use client';

import { useState } from 'react';

// Mock data for people
const mockPeople = [
  { id: 1, name: 'Tasha Copeland' },
  { id: 2, name: 'Karen Fillipelli' },
  { id: 3, name: 'John Smith' },
  { id: 4, name: 'Sarah Johnson' },
  { id: 5, name: 'Mike Wilson' },
  { id: 6, name: 'Lisa Davis' },
  { id: 7, name: 'David Brown' },
  { id: 8, name: 'Emma Taylor' }
];

// Mock questions with their data - more realistic with different values
const mockQuestions = [
  {
    id: 1,
    question: "What type of relationship are you seeking?",
    p1Seek: 1,
    p1Self: 3,
    p2Seek: 2,
    p2Self: 1,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 2,
    question: "What gender do you identify with?",
    p1Seek: 4,
    p1Self: 3,
    p2Seek: 3,
    p2Self: 5,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 3,
    question: "Do you have kids?",
    p1Seek: 6,
    p1Self: 5,
    p2Seek: 5,
    p2Self: 6,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 4,
    question: "Do you want kids?",
    p1Seek: 3,
    p1Self: 2,
    p2Seek: 4,
    p2Self: 3,
    p1Multiplier: 5,
    p2Multiplier: 5
  },
  {
    id: 5,
    question: "How significant is religion in your life?",
    p1Seek: 4,
    p1Self: 3,
    p2Seek: 2,
    p2Self: 4,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 6,
    question: "What is the highest level of formal education you have completed?",
    p1Seek: 4,
    p1Self: 3,
    p2Seek: 5,
    p2Self: 4,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 7,
    question: "Do you eat meat?",
    p1Seek: 1,
    p1Self: 5,
    p2Seek: 3,
    p2Self: 1,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 8,
    question: "How often do you exercise?",
    p1Seek: 3,
    p1Self: 1,
    p2Seek: 4,
    p2Self: 3,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 9,
    question: "How often do you drink alcohol?",
    p1Seek: 1,
    p1Self: 4,
    p2Seek: 2,
    p2Self: 1,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 10,
    question: "How often do you use tobacco?",
    p1Seek: 6,
    p1Self: 3,
    p2Seek: 1,
    p2Self: 6,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 11,
    question: "How often do you vape?",
    p1Seek: 1,
    p1Self: 5,
    p2Seek: 1,
    p2Self: 1,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 12,
    question: "What is your political leaning?",
    p1Seek: 3,
    p1Self: 4,
    p2Seek: 2,
    p2Self: 3,
    p1Multiplier: 1,
    p2Multiplier: 1
  },
  {
    id: 13,
    question: "Where do you stand on personal gun ownership?",
    p1Seek: 3,
    p1Self: 1,
    p2Seek: 2,
    p2Self: 3,
    p1Multiplier: 5,
    p2Multiplier: 5
  },
  {
    id: 14,
    question: "What is your position on abortion?",
    p1Seek: 1,
    p1Self: 3,
    p2Seek: 2,
    p2Self: 1,
    p1Multiplier: 7,
    p2Multiplier: 7
  }
];

interface CalculationResult {
  question: string;
  p1LookingFor: number;
  p2Me: number;
  p1Multiplier: number;
  delta: number;
  adj: number;
  max: number;
}

export default function CalculationPage() {
  const [person1, setPerson1] = useState<number | ''>('');
  const [person2, setPerson2] = useState<number | ''>('');
  const [calculationResults1, setCalculationResults1] = useState<CalculationResult[]>([]);
  const [calculationResults2, setCalculationResults2] = useState<CalculationResult[]>([]);
  const [totalAdj1, setTotalAdj1] = useState(0);
  const [totalMax1, setTotalMax1] = useState(0);
  const [totalAdj2, setTotalAdj2] = useState(0);
  const [totalMax2, setTotalMax2] = useState(0);
  const [compatibilityPercentage1, setCompatibilityPercentage1] = useState(0);
  const [compatibilityPercentage2, setCompatibilityPercentage2] = useState(0);
  const [overallCompatibility, setOverallCompatibility] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const calculateCompatibility = () => {
    if (!person1 || !person2) return;

    // Calculate from Person 1's perspective (Person 1's Looking For vs Person 2's Me)
    const results1: CalculationResult[] = mockQuestions.map(q => {
      const delta = Math.abs(q.p1Seek - q.p2Self);
      const max = 4 * q.p1Multiplier;
      const adj = max - (delta * q.p1Multiplier);
      
      return {
        question: q.question,
        p1LookingFor: q.p1Seek,
        p2Me: q.p2Self,
        p1Multiplier: q.p1Multiplier,
        delta,
        adj,
        max
      };
    });

    // Calculate from Person 2's perspective (Person 2's Looking For vs Person 1's Me)
    const results2: CalculationResult[] = mockQuestions.map(q => {
      const delta = Math.abs(q.p2Seek - q.p1Self);
      const max = 4 * q.p2Multiplier;
      const adj = max - (delta * q.p2Multiplier);
      
      return {
        question: q.question,
        p1LookingFor: q.p2Seek,
        p2Me: q.p1Self,
        p1Multiplier: q.p2Multiplier,
        delta,
        adj,
        max
      };
    });

    const totalAdjValue1 = results1.reduce((sum, r) => sum + r.adj, 0);
    const totalMaxValue1 = results1.reduce((sum, r) => sum + r.max, 0);
    const percentage1 = totalMaxValue1 > 0 ? Math.round((totalAdjValue1 / totalMaxValue1) * 100) : 0;

    const totalAdjValue2 = results2.reduce((sum, r) => sum + r.adj, 0);
    const totalMaxValue2 = results2.reduce((sum, r) => sum + r.max, 0);
    const percentage2 = totalMaxValue2 > 0 ? Math.round((totalAdjValue2 / totalMaxValue2) * 100) : 0;

    // Calculate overall compatibility (median of both percentages)
    const overall = Math.round((percentage1 + percentage2) / 2);

    setCalculationResults1(results1);
    setCalculationResults2(results2);
    setTotalAdj1(totalAdjValue1);
    setTotalMax1(totalMaxValue1);
    setTotalAdj2(totalAdjValue2);
    setTotalMax2(totalMaxValue2);
    setCompatibilityPercentage1(percentage1);
    setCompatibilityPercentage2(percentage2);
    setOverallCompatibility(overall);
    setShowResults(true);
  };

  const resetCalculation = () => {
    setPerson1('');
    setPerson2('');
    setCalculationResults1([]);
    setCalculationResults2([]);
    setTotalAdj1(0);
    setTotalMax1(0);
    setTotalAdj2(0);
    setTotalMax2(0);
    setCompatibilityPercentage1(0);
    setCompatibilityPercentage2(0);
    setOverallCompatibility(0);
    setShowResults(false);
  };

  const getPersonName = (id: number) => {
    return mockPeople.find(p => p.id === id)?.name || '';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <span>Individual Calculation</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">Compatibility Calculator</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Calculation</h1>
          <p className="text-gray-600 mt-2">Calculate compatibility between two individuals</p>
        </div>
      </div>

      {/* Person Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Person 01*
            </label>
            <select
              value={person1}
              onChange={(e) => setPerson1(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900"
            >
              <option value="">Select Person 01</option>
              {mockPeople.map(person => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Person 02*
            </label>
            <select
              value={person2}
              onChange={(e) => setPerson2(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900"
            >
              <option value="">Select Person 02</option>
              {mockPeople.map(person => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={resetCalculation}
            className="bg-[#672DB7] text-white px-6 py-2 rounded-lg hover:bg-[#5a2a9e] transition-colors duration-200 font-medium cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

             {/* Calculate Button */}
       {person1 && person2 && (
         <div className="flex justify-center">
           <button
             onClick={calculateCompatibility}
             className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium cursor-pointer"
           >
             <i className="fas fa-calculator mr-2"></i>
             Calculate Compatibility
           </button>
         </div>
       )}

             {/* Calculation Results - Person 1's Perspective */}
       {showResults && calculationResults1.length > 0 && (
         <div className="bg-white rounded-lg shadow overflow-hidden">
           <div className="p-6 border-b border-gray-200">
             <h2 className="text-xl font-semibold text-gray-900">
               {getPersonName(Number(person1))}
             </h2>
             <p className="text-sm text-gray-600 mt-1">
               Compatibility calculation from {getPersonName(Number(person1))}'s perspective
             </p>
           </div>

           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Question
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Looking For
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Me
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Multiplier
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Delta
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Adj
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Max
                   </th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {calculationResults1.map((result, index) => (
                   <tr key={index} className="hover:bg-gray-50">
                     <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                       <div className="truncate">{result.question}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.p1LookingFor}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.p2Me}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.p1Multiplier}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.delta}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.adj}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.max}
                     </td>
                   </tr>
                 ))}
                 {/* Summary Row */}
                 <tr className="bg-gray-50 font-medium">
                   <td className="px-6 py-4 text-sm text-gray-900">
                     Summary
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     -
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     -
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     -
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     -
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {totalAdj1}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {totalMax1}
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>

           {/* Compatibility Result */}
           <div className="p-6 bg-gray-50 border-t border-gray-200">
             <div className="text-center">
               <h3 className="text-lg font-semibold text-gray-900">
                 {getPersonName(Number(person2))}'s compatibility w.r.t {getPersonName(Number(person1))}: {compatibilityPercentage1}%
               </h3>
               <p className="text-sm text-gray-600 mt-1">
                 Based on {calculationResults1.length} questions
               </p>
             </div>
           </div>
         </div>
       )}

       {/* Calculation Results - Person 2's Perspective */}
       {showResults && calculationResults2.length > 0 && (
         <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
           <div className="p-6 border-b border-gray-200">
             <h2 className="text-xl font-semibold text-gray-900">
               {getPersonName(Number(person2))}
             </h2>
             <p className="text-sm text-gray-600 mt-1">
               Compatibility calculation from {getPersonName(Number(person2))}'s perspective
             </p>
           </div>

           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Question
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Looking For
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Me
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Multiplier
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Delta
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Adj
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Max
                   </th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {calculationResults2.map((result, index) => (
                   <tr key={index} className="hover:bg-gray-50">
                     <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                       <div className="truncate">{result.question}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.p1LookingFor}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.p2Me}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.p1Multiplier}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.delta}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.adj}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {result.max}
                     </td>
                   </tr>
                 ))}
                 {/* Summary Row */}
                 <tr className="bg-gray-50 font-medium">
                   <td className="px-6 py-4 text-sm text-gray-900">
                     Summary
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     -
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     -
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     -
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     -
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {totalAdj2}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {totalMax2}
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>

           {/* Compatibility Result */}
           <div className="p-6 bg-gray-50 border-t border-gray-200">
             <div className="text-center">
               <h3 className="text-lg font-semibold text-gray-900">
                 {getPersonName(Number(person1))}'s compatibility w.r.t {getPersonName(Number(person2))}: {compatibilityPercentage2}%
               </h3>
                                <p className="text-sm text-gray-600 mt-1">
                   Based on {calculationResults2.length} questions
                 </p>
             </div>
           </div>
         </div>
       )}

       {/* Overall Compatibility */}
       {showResults && (
         <div className="bg-white rounded-lg shadow p-6">
           <div className="text-center">
             <h3 className="text-xl font-semibold text-gray-900 mb-2">
               Overall Compatibility
             </h3>
             <div className="text-3xl font-bold text-[#672DB7]">
               {overallCompatibility}%
             </div>
             <p className="text-sm text-gray-600 mt-2">
               Median compatibility between {getPersonName(Number(person1))} and {getPersonName(Number(person2))}
             </p>
           </div>
         </div>
       )}
    </div>
  );
} 