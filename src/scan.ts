// Bridge to the native LiDAR room scanner (Apple RoomPlan), implemented in ios/App/App/SceneDelegate.swift.
import { registerPlugin } from '@capacitor/core';
import { native } from './ui';

export interface ScanResult {
  cancelled?: boolean;
  floorArea: number;
  perimeter: number;
  height: number;
  walls: { w: number; h: number }[];
  doors: { w: number; h: number }[];
  windows: { w: number; h: number }[];
}

const RoomScan = registerPlugin<{
  isSupported(): Promise<{ supported: boolean }>;
  scan(): Promise<ScanResult>;
}>('RoomScan');

let supported: boolean | null = null;

/** True on iPhones and iPads with a LiDAR sensor (Pro models). `?scan` in the URL fakes support for tests. */
export async function scanSupported(): Promise<boolean> {
  if (supported !== null) return supported;
  if (!native) return (supported = new URLSearchParams(location.search).has('scan'));
  try { supported = (await RoomScan.isSupported()).supported; } catch { supported = false; }
  return supported;
}

/** A fake 4.2 × 3.4 m bedroom for browser tests. */
const DEMO: ScanResult = {
  floorArea: 14.28, perimeter: 15.2, height: 2.5,
  walls: [{ w: 4.2, h: 2.5 }, { w: 3.4, h: 2.5 }, { w: 4.2, h: 2.5 }, { w: 3.4, h: 2.5 }],
  doors: [{ w: 0.82, h: 2.03 }], windows: [{ w: 1.4, h: 1.3 }],
};

export async function scanRoom(): Promise<ScanResult | null> {
  if (!native) return DEMO;
  const r = await RoomScan.scan();
  return r.cancelled ? null : r;
}
