/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface SegmentOption<T> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T> {
  id: string;
  options: SegmentOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
}

export default function SegmentedControl<T extends string | number>({
  id,
  options,
  selectedValue,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      id={id}
      className="relative flex w-full bg-[#E3E3E9] p-0.5 rounded-xl select-none"
    >
      {options.map((option) => {
        const isActive = selectedValue === option.value;
        return (
          <button
            key={option.value}
            id={`${id}-opt-${option.value}`}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors z-10 cursor-pointer ${
              isActive ? 'text-black' : 'text-[#7C7C83]'
            }`}
          >
            {option.icon && <span className="opacity-90">{option.icon}</span>}
            <span>{option.label}</span>

            {/* iOS sliding indicator */}
            {isActive && (
              <motion.div
                layoutId={`active-pill-${id}`}
                className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 38,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
