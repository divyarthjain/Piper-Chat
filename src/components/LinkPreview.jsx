import { useState, useEffect } from 'react';

const SERVER_URL = `http://${window.location.hostname}:3001`;

function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${SERVER_URL}/api/preview?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Failed to load preview');
        
        const data = await response.json();
        if (isMounted) {
            if (data.title || data.description || data.image) {
                setPreview(data);
            } else {
                setError(true);
            }
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPreview();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return null; 
  if (error || !preview) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block mt-2 mb-1 bg-black/20 hover:bg-black/30 border border-white/10 rounded-lg overflow-hidden transition-colors no-underline group"
    >
      <div className="flex flex-col sm:flex-row max-w-full">
        {preview.image && (
          <div className="sm:w-32 h-32 sm:h-auto shrink-0 bg-black/40 relative">
            <img 
              src={preview.image} 
              alt="" 
              className="w-full h-full object-cover absolute inset-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
          <h4 className="text-sm font-bold text-white/90 truncate leading-snug mb-1 group-hover:text-violet-400 transition-colors">
            {preview.title || url}
          </h4>
          {preview.description && (
            <p className="text-xs text-white/70 line-clamp-2 mb-2 leading-relaxed">
              {preview.description}
            </p>
          )}
          <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
            {preview.domain}
          </div>
        </div>
      </div>
    </a>
  );
}

export default LinkPreview;
