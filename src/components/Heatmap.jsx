import React from 'react';

function Heatmap() {
  // Generate mock data for the last year (or enough to fill the width)
  // Sidebar is ~250px wide. Each cell 10px + 2px gap = 12px.
  // 250 / 12 = ~20 columns.
  const generateData = () => {
    const data = [];
    // 20 weeks * 7 days = 140 days
    for (let i = 0; i < 20 * 7; i++) {
      // Skew towards lower activity to look realistic
      const rand = Math.random();
      let intensity = 0;
      if (rand > 0.8) intensity = 1;
      if (rand > 0.9) intensity = 2;
      if (rand > 0.95) intensity = 3;
      if (rand > 0.98) intensity = 4;
      data.push(intensity); 
    }
    return data;
  };

  const data = generateData();
  
  // GitHub dark mode green palette as requested
  // Level 0 (inactive), 1, 2, 3, 4
  const colors = [
    'bg-[#161b22]', // Inactive
    'bg-[#0e4429]', // Level 1 (Darkest green)
    'bg-[#006d32]', // Level 2
    'bg-[#26a641]', // Level 3
    'bg-[#39d353]'  // Level 4 (Brightest)
  ];

  // Using the specific requested palette which looks like light mode greens or legacy:
  // #216e39, #30a14e, #40c463, #9be9a8
  // Let's use these for levels 1-4.
  const requestedColors = [
    'bg-[#161b22]', // Inactive
    'bg-[#216e39]', 
    'bg-[#30a14e]', 
    'bg-[#40c463]', 
    'bg-[#9be9a8]'
  ];

  return (
    <div className="mx-2 mt-auto pt-4 border-t border-github-border/50">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[10px] font-semibold text-github-text-secondary uppercase tracking-wider">Contribution Activity</h3>
        <div className="flex items-center gap-1 text-[10px] text-github-text-secondary">
          <span>Less</span>
          <div className="flex gap-[1px]">
            <div className={`w-2 h-2 rounded-[1px] ${requestedColors[0]}`}></div>
            <div className={`w-2 h-2 rounded-[1px] ${requestedColors[2]}`}></div>
            <div className={`w-2 h-2 rounded-[1px] ${requestedColors[4]}`}></div>
          </div>
          <span>More</span>
        </div>
      </div>
      
      <div className="flex justify-center w-full overflow-hidden">
        <div className="grid grid-rows-7 grid-flow-col gap-[2px]">
          {data.map((intensity, i) => (
            <div
              key={i}
              className={`w-[10px] h-[10px] rounded-[2px] ${requestedColors[intensity]} hover:ring-1 hover:ring-white/50 transition-all cursor-pointer`}
              title={`${intensity === 0 ? 'No' : intensity * 3} contributions`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Heatmap;
