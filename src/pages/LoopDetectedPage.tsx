import React, { useEffect, useState } from 'react';

const LoopDetectedPage: React.FC = () => {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [iteration, setIteration] = useState(0);

  useEffect(() => {
    // 1. Get iteration count from sessionStorage
    const storedCount = sessionStorage.getItem('loopIterationCount');
    const currentCount = storedCount ? parseInt(storedCount) : 0;
    setIteration(currentCount);

    const performAutomaticLoop = async () => {
      // 2. Fetch the 508 API
      try {
        const response = await fetch('/api/loop');
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

      // 3. Increment iteration in sessionStorage
      sessionStorage.setItem('loopIterationCount', (currentCount + 1).toString());

      // 4. Wait 1 second and then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    performAutomaticLoop();
  }, []);

  return (
    <div className="container mx-auto p-8 max-w-2xl min-h-screen flex flex-col justify-center items-center text-center">
      <h1 className="text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 animate-pulse">
        AUTOMATIC LOOP DETECTED
      </h1>
      
      <div className="bg-red-600/20 backdrop-blur-xl border-4 border-red-500 p-10 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] mb-8 w-full">
        <div className="text-6xl font-mono font-bold text-white mb-4">
          Iteration: {iteration}
        </div>
        <p className="text-xl text-red-200 font-semibold italic">
          Clean URL Mode (no query params). Looping indefinitely...
        </p>
      </div>

      {apiResponse && (
        <div className="bg-black/80 border-2 border-red-800 p-8 rounded-2xl shadow-2xl w-full text-left">
          <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            Last API Status: {apiResponse.status}
          </h2>
          <pre className="text-sm font-mono overflow-auto bg-red-950/30 p-4 rounded-lg text-red-300 border border-red-900/50">
            {JSON.stringify(apiResponse.data || apiResponse, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-12 text-red-500/50 text-sm font-mono uppercase tracking-widest">
        System Status: 508 Loop Detected | Mode: Autonomous | URL: Clean
      </div>
    </div>
  );
};

export default LoopDetectedPage;
