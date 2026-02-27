import { useState, useRef, useEffect, useCallback } from 'react';

// Generates mock product data for the infinite scroll
const generateProducts = (count: number, startIndex: number = 0) => {
  return Array.from({ length: count }).map((_, idx) => {
    const i = startIndex + idx;
    return {
      id: `prod-${i}`,
      title: `Product ${i + 1}`,
      description: `This is a detailed description for product number ${i + 1}. It contains information about the features and benefits.`,
      price: `$${(29.99 + (i * 5)).toFixed(2)}`,
      category: i % 3 === 0 ? 'Electronics' : i % 2 === 0 ? 'Clothing' : 'Home Goods',
      rating: (4 + Math.random()).toFixed(1)
    };
  });
};

const INITIAL_PRODUCTS = generateProducts(20);

export default function MouseOnlyScrollPage() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Load more items for infinite scroll
  const loadMoreProducts = useCallback(() => {
    if (loading) return;
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      setProducts((prev) => [
        ...prev, 
        ...generateProducts(15, prev.length)
      ]);
      setLoading(false);
    }, 600);
  }, [loading]);

  // Handle infinite scroll detection via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          loadMoreProducts();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, loadMoreProducts]);

  // Block ALL keyboard scrolling mechanisms
  useEffect(() => {
    const preventKeyboardScroll = (e: KeyboardEvent) => {
      const scrollKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'PageUp', 'PageDown', 'Home', 'End', ' ' // Spacebar
      ];
      
      if (scrollKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // We add to the window to ensure it's blocked everywhere on this page
    window.addEventListener('keydown', preventKeyboardScroll, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', preventKeyboardScroll, { capture: true });
    };
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#fdf8ff] text-[#1c1b1f] font-sans p-8 overflow-hidden">
      
      <div className="mb-6 shrink-0 text-center">
        <h1 className="text-3xl font-bold text-[#6750a4] mb-2">Mouse-Only Infinite Scroll</h1>
        <p className="text-[#4a4458] max-w-2xl mx-auto">
          This container only responds to mouse wheel and trackpad scroll actions. 
          Try pressing <kbd className="bg-gray-200 px-1 rounded text-gray-800">ArrowDown</kbd>, 
          <kbd className="bg-gray-200 px-1 rounded text-gray-800">PageDown</kbd>, or 
          <kbd className="bg-gray-200 px-1 rounded text-gray-800">Space</kbd> - they are completely blocked.
        </p>
      </div>

      {/* Main Scroll Container */}
      <div 
        className="flex-1 w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-[#d8cfe5] overflow-y-auto outline-none p-6 flex flex-col gap-4"
        tabIndex={0} // Make focusable to capture local keyboard events if needed, though window capture handles most
      >
        {products.map((product) => (
          <div 
            key={product.id} 
            className="p-5 rounded-lg border border-[#e7e0ec] bg-[#fdf8ff] hover:shadow-md transition-shadow flex justify-between items-center"
          >
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-lg text-[#1c1b1f]">{product.title}</h3>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-[#eaddff] text-[#4f378b]">
                  {product.category}
                </span>
              </div>
              <p className="text-[#4a4458] text-sm">{product.description}</p>
            </div>
            
            <div className="flex flex-col items-end shrink-0 pl-6 border-l border-[#e7e0ec]">
              <div className="text-xl font-bold text-[#386a20] mb-1">{product.price}</div>
              <div className="text-sm font-medium flex items-center gap-1 text-[#b27300]">
                ★ {product.rating}
              </div>
            </div>
          </div>
        ))}

        {/* Sentinel for infinite scrolling */}
        <div ref={sentinelRef} className="py-2 w-full">
          {loading && (
            <div className="py-4 flex justify-center items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[#6750a4] border-t-transparent animate-spin"></div>
              <span className="text-[#6750a4] font-semibold">Loading more products...</span>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
