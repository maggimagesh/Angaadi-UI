import { useState, useRef, useEffect, useCallback } from 'react';
import './DualScrollPage.css';

// Generates mock job data
const generateJobs = (prefix: string, count: number, isRightColumn: boolean, startIndex: number = 0) => {
  return Array.from({ length: count }).map((_, idx) => {
    const i = startIndex + idx;
    return {
      id: `${prefix}-${i}`,
      title: isRightColumn 
        ? (i % 3 === 0 ? 'Security Analyst' : i % 2 === 0 ? 'AI Applied Engineer' : 'Data Scientist')
        : (i % 3 === 0 ? 'Software Developer Python (m/w/d)' : i % 2 === 0 ? 'UX / Fullstack Developer' : 'Senior Data Engineer'),
      location: isRightColumn ? 'San Francisco, CA, US' : 'Bremen, Berlin, Leipzig, Remote',
      time: isRightColumn ? `${Math.max(1, Math.floor(i / 3))}d ago` : `${Math.floor(Math.random() * 59) + 1}m ago`,
      tags: isRightColumn ? '[EN][Full Time]' : '[MI][Full Time]',
      salary: isRightColumn ? 'USD 111K-185K' : 'EUR 48K-65K',
      salaryClass: isRightColumn ? 'salary-green' : 'salary-gray',
    };
  });
};

const MOCK_JOBS_LEFT = generateJobs('left', 50, false);
const INITIAL_JOBS_RIGHT = generateJobs('right', 30, true);

export default function DualScrollPage() {
  const [activeLeftTab, setActiveLeftTab] = useState('Latest');
  const [activeRightTab, setActiveRightTab] = useState('Top');
  const [rightJobs, setRightJobs] = useState(INITIAL_JOBS_RIGHT);
  const [loading, setLoading] = useState(false);

  // Refs for scrollable containers
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load more items for infinite scroll
  const loadMoreJobs = useCallback(() => {
    if (loading) return;
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      setRightJobs((prev) => [
        ...prev, 
        ...generateJobs('right', 20, true, prev.length)
      ]);
      setLoading(false);
    }, 500);
  }, [loading]);

  // Handle right column infinite scroll detection
  const handleRightScroll = () => {
    if (!rightScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = rightScrollRef.current;
    
    // Load more when scrolled within 100px of the bottom
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadMoreJobs();
    }
  };

  // Synchronize keyboard navigation across both columns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process vertical arrows
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      const leftEl = leftScrollRef.current;
      const rightEl = rightScrollRef.current;
      if (!leftEl || !rightEl) return;

      // Prevent default page scroll to handle our own programmatic scroll
      e.preventDefault();

      const scrollAmount = 40; // Pixels to scroll per key press
      // ArrowDown should scroll down (increase scrollTop)
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      const delta = scrollAmount * direction;

      // Scroll both columns simultaneously
      leftEl.scrollTop += delta;
      rightEl.scrollTop += delta;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="dual-scroll-container" ref={containerRef} tabIndex={0}>
      
      {/* Sidebar (Fixed) */}
      <div className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title hover-underline">foo /~all coding</div>
          <div className="sidebar-title">&gt; All</div>
          <div className="sidebar-subtitle mt-1">230,891 new jobs found (80d)</div>
        </div>
        
        <div className="sidebar-section nav-links">
          <div className="nav-link">Topics»</div>
          <div className="nav-link">Regions»</div>
          <div className="nav-link">Filters»</div>
          <div className="nav-link">Settings»</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-subtitle mb-2">Export as CSV · JSON</div>
          <div className="sidebar-subtitle mb-1">New - past 7d</div>
          <div className="stat-badge stat-red">-25.08%</div>
          <div className="divider"></div>
          
          <div className="sidebar-subtitle mt-3 mb-1">New - past 4w</div>
          <div className="stat-badge stat-green">+64.01%</div>
          <div className="divider"></div>
        </div>

        <div className="sidebar-footer border-t">
          <p className="footer-link">ChangeLog · Billing · About · Terms</p>
          <p className="footer-link">Privacy · API</p>
          <p className="footer-link">X · LI · RDT · GH</p>
          <p>v1.1.5 · Made with - ❤️</p>
        </div>
      </div>

      {/* Main Container - Two Scrollable Columns */}
      <div className="main-content">
        
        {/* Column 1 (Scrolls independently) */}
        <div className="scroll-column border-r relative-col">
          {/* Header Tabs (Sticky to top of column 1) */}
          <div className="tabs-header">
            {['Latest', 'Followed', 'Saved', 'Companies', 'Following'].map(tab => (
              <span 
                key={tab}
                onClick={() => setActiveLeftTab(tab)}
                className={`tab-item ${activeLeftTab === tab ? 'tab-active' : 'tab-inactive'}`}
              >
                {tab}
              </span>
            ))}
          </div>
          
          {/* Scrollable Content 1 (Finite) */}
          <div 
            className="scrollable-content content-offset custom-scrollbar"
            ref={leftScrollRef}
          >
            {MOCK_JOBS_LEFT.map((job) => (
              <div key={job.id} className="job-card group">
                <div className="job-header">
                  <div className="job-title group-hover-white">{job.title}</div>
                  <div className="job-time">{job.time}</div>
                </div>
                <div className="job-footer mt-1">
                  <div className="job-tags">
                    <span className="tag-gold">{job.tags}</span>
                    <span className={`salary-tag ${job.salaryClass}`}>{job.salary}</span>
                  </div>
                  <div className="job-location">{job.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 (Scrolls independently) */}
        <div className="scroll-column relative-col">
          {/* Header Tabs (Sticky to top of column 2) */}
          <div className="tabs-header">
            {['Viewed', 'Applied', 'Top'].map(tab => (
              <span 
                key={tab}
                onClick={() => setActiveRightTab(tab)}
                className={`tab-item ${activeRightTab === tab ? 'tab-active' : 'tab-inactive'}`}
              >
                {tab}
              </span>
            ))}
          </div>
          
          {/* Scrollable Content 2 (Infinite) */}
          <div 
            className="scrollable-content content-offset custom-scrollbar"
            ref={rightScrollRef}
            onScroll={handleRightScroll}
          >
            {rightJobs.map((job) => (
              <div key={job.id} className="job-card group">
                <div className="job-header">
                  <div className="job-title group-hover-white">{job.title}</div>
                  <div className="job-time">{job.time}</div>
                </div>
                <div className="job-footer mt-1">
                  <div className="job-tags">
                    <span className="tag-gold">{job.tags}</span>
                    <span className={`salary-tag text-black font-semibold ${job.salaryClass}`}>{job.salary}</span>
                  </div>
                  <div className="job-location">{job.location}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="p-4 text-center text-[#5c9ccc] font-bold">
                Loading more items...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
