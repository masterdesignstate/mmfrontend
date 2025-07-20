'use client';

export default function TestIcons() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">FontAwesome Icon Test</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-bold mb-2">Basic Icons:</h2>
          <div className="flex space-x-4 text-2xl">
            <i className="fas fa-user text-blue-500"></i>
            <i className="fas fa-users text-green-500"></i>
            <i className="fas fa-heart text-red-500"></i>
            <i className="fas fa-chart-bar text-purple-500"></i>
          </div>
        </div>

        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-bold mb-2">Dashboard Icons:</h2>
          <div className="flex space-x-4 text-2xl">
            <i className="fas fa-user text-[#672DB7]"></i>
            <i className="fas fa-user-plus text-green-600"></i>
            <i className="fas fa-heart text-blue-600"></i>
            <i className="fas fa-chart-line text-yellow-600"></i>
          </div>
        </div>

        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="font-bold mb-2">Icon in Circle (like dashboard):</h2>
          <div className="flex space-x-4">
            <div className="p-3 rounded-full bg-[#672DB7] bg-opacity-10 flex items-center justify-center w-12 h-12">
              <i className="fas fa-user text-[#672DB7] text-xl"></i>
            </div>
            <div className="p-3 rounded-full bg-green-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-user-plus text-green-600 text-xl"></i>
            </div>
            <div className="p-3 rounded-full bg-blue-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-heart text-blue-600 text-xl"></i>
            </div>
            <div className="p-3 rounded-full bg-yellow-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-chart-line text-yellow-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 