import type { CellValue, Step, StepDetail, TechniqueName } from '../candidates.js';
import { english } from '../locales.js';

/** A step with its English reason, built from the same detail every locale reads. */
export function makeStep(
  technique: TechniqueName,
  placements: readonly CellValue[],
  eliminations: readonly CellValue[],
  detail: StepDetail,
): Step {
  return {
    technique,
    placements,
    eliminations,
    detail,
    reason: english.reason({ technique, detail }),
  };
}
