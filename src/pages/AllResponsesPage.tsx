import { useEffect } from 'react';

export default function AllResponsesPage() {
  useEffect(() => {
    // JSON Request via fetch
    fetch('https://jsonplaceholder.typicode.com/todos/1')
      .catch(err => console.error('Failed to fetch JSON', err));
    
    // XML Request via fetch
    fetch('https://www.w3schools.com/xml/note.xml')
      .catch(err => console.error('Failed to fetch XML', err));
  }, []);

  return (
    <div className="container mx-auto p-8" style={{ fontFamily: "'CustomTestFont', sans-serif" }}>
      {/* CSS Request */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />

      {/* Font Request */}
      <style>
        {`
          @font-face {
            font-family: 'CustomTestFont';
            src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf') format('truetype');
          }
        `}
      </style>

      <h1 className="text-3xl font-bold mb-4 animate__animated animate__fadeInDown">Network Requests Test Page</h1>
      <p className="mb-4">
        This page automatically triggers network requests for different content types.
        Open your browser's Developer Tools (Network tab) to verify.
      </p>
      
      {/* Media Request (Image) */}
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Media Request (Image)</h2>
        <img src="https://picsum.photos/200/300" alt="Test Random Media" className="max-w-xs border border-gray-300 rounded shadow-sm" />
      </div>

      {/* Media Request (Video) */}
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Media Request (Video)</h2>
        <video src="https://www.w3schools.com/html/mov_bbb.mp4" controls width="320" height="240" className="bg-black rounded shadow" />
      </div>

      <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded border border-blue-200">
        <h3 className="font-semibold mb-2">Requests Triggered:</h3>
        <ul className="list-disc ml-6 mt-2">
          <li><strong>XML:</strong> Fetching note.xml from w3schools</li>
          <li><strong>JSON:</strong> Fetching a todo from jsonplaceholder</li>
          <li><strong>Media:</strong> Loading an image (picsum.photos) and video (w3schools)</li>
          <li><strong>CSS:</strong> Loading animate.css via link tag</li>
          <li><strong>Fonts:</strong> Loading Roboto font via style tag (@font-face)</li>
        </ul>
      </div>
    </div>
  );
}
