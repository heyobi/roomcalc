// Ask for an App Store rating at a good moment: when the user comes back to the app after measuring rooms.
// iOS decides whether the prompt actually appears (at most 3 times a year), so asking is cheap.
import { InAppReview } from '@capacitor-community/in-app-review';
import { native } from './ui';

const KEY = 'rc-review';
const STEPS = [3, 12, 40];

export function reviewMoment() {
  if (!native) return;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{"n":0,"asked":0}') as { n: number; asked: number };
    s.n++;
    if (STEPS.includes(s.n) && Date.now() - s.asked > 30 * 864e5) {
      s.asked = Date.now();
      setTimeout(() => void InAppReview.requestReview().catch(() => {}), 1500);
    }
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* storage unavailable: skip */ }
}
