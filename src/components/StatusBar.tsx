/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Wifi, Signal, Battery } from 'lucide-react';

export default function StatusBar() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="ios-status-bar" className="w-full flex justify-between items-center px-6 py-2 msg-ios-status select-none text-black bg-transparent text-[13px] font-semibold tracking-tight z-50">
      {/* Time */}
      <div className="flex items-center space-x-1">
        <span>{time || "09:41"}</span>
      </div>
      
      {/* Dynamic Island Spacer / Sensor bar (Optional subtle pill) */}
      <div className="hidden sm:block w-24 h-5.5 bg-black rounded-full absolute left-1/2 -translate-x-1/2 shadow-inner border border-zinc-900"></div>

      {/* Connectivity + Battery */}
      <div className="flex items-center space-x-2">
        <Signal className="w-4 h-4 text-black cursor-pointer" strokeWidth={2.5} />
        <span className="text-[11px] font-bold">5G</span>
        <Wifi className="w-4 h-4 text-black" strokeWidth={2.5} />
        <div className="flex items-center space-x-1 scale-95 origin-right">
          <span className="text-[11px] font-bold">100%</span>
          <Battery className="w-5 h-5 text-black" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
