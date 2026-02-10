import React from 'react';

function Heatmap() {
  // Generate mock data for a 52-week year (GitHub style)
  const generateData = () => {
    const data = [];
    for (let i = 0; i < 52 * 7; i++) {
      data.push(Math.floor(Math.random() * 5)); // 0-4 intensity
    }
    return data;
  };

  const data = generateData();
  const colors = ['bg-[#161b22]', 'bg-[#0e4429]', 'bg-[#006d32]', 'bg-[#26a641]', 'bg-[#39d353]'];

  return (
    <div className="p-4 bg-github-bg-secondary rounded-md border border-github-border mt-4">
      <h3 className="text-github-text-secondary text-xs font-medium mb-3 uppercase tracking-wider">Activity Overview</h3>
      <div className="flex gap-1 overflow-hidden">
        <div className="grid grid-rows-7 grid-flow-col gap-1">
          {data.map((intensity, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-sm ${colors[intensity]} hover:ring-1 hover:ring-white/20 transition-all`}
              title={`${intensity * 2} messages`}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 text-[10px] text-github-text-secondary">
        <span>Less</span>
        <div className="flex gap-1">
          {colors.map((c, i) => <div key={i} className={`w-2 h-2 rounded-sm ${c}`} />)}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default Heatmap;
