'use client';

import { createContext } from 'react';

export const TemperatureUnitContext = createContext<'C' | 'F'>('C');
