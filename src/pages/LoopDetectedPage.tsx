import React, { useEffect, useState } from 'react';

const LoopDetectedPage: React.FC = () => {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('trigger') === 'true') {
      setIsLooping(true);
      // Infinite redirect loop
      window.location.href = window.location.pathname + '?trigger=true&t=' + Date.now();
    }
  }, []);

  const fetchLoopApi = async () => {
    try {
      const response = await fetch('/api/v1/loop');
      const data = await response.json();
      setApiResponse({
        status: response.status,
        statusText: response.statusText,
        data: data
      });
    } catch (error) {
      setApiResponse({
        error: 'Failed to fetch API',
        details: error
      });
    }
  };

  const startRedirectLoop = () => {
    window.location.href = window.location.pathname + '?trigger=true';
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        508 Loop Detected Simulation
      </h1>
      
      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-xl mb-8">
        <p className="text-lg text-gray-300 mb-6">
          This page demonstrates a "Loop Detected" scenario. You can either trigger a client-side redirect loop or fetch a status 508 from the backend API.
        </p>

        <div className="flex flex-col gap-4">
          <button 
            onClick={fetchLoopApi}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl font-semibold text-white shadow-lg"
          >
            Fetch 508 Loop Detected API
          </button>

          <button 
            onClick={startRedirectLoop}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 transition-colors rounded-xl font-semibold text-white shadow-lg"
          >
            Start Client-Side Redirect Loop
          </button>
        </div>
      </div>

      {isLooping && (
        <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl text-red-200 animate-pulse mb-8 text-center font-bold">
          LOOPING... The browser should eventually stop this redirect loop.
        </div>
      )}

      {apiResponse && (
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl">
          <h2 className="text-xl font-bold mb-4 text-blue-400">API Response:</h2>
          <pre className="text-sm font-mono overflow-auto bg-black/50 p-4 rounded-lg text-green-400">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
          <div className="mt-4 text-right">
             <span className={`px-3 py-1 rounded-full text-xs font-bold ${apiResponse.status === 508 ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                Status: {apiResponse.status || 'Error'}
             </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoopDetectedPage;
