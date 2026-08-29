import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  clampStageRange,
  computeStagePlan,
  getCurMaxLevelEx,
  getQualityMaxStage,
  getQualityNeedLevel,
  isStageStepBlocked,
  type StageUpHeroData,
  type StageUpLadders,
} from './compute-stage-plan.ts'

const LADDERS: StageUpLadders = {
  stageMaxLevels: [
    10, 20, 30, 40, 40, 50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 100, 100, 110, 110, 120, 120,
    130, 130, 140, 140, 150, 150, 160, 160, 170, 170, 180, 180, 190, 190, 200, 200, 210, 210,
    220, 220, 230, 230, 240, 240, 250, 250, 260, 260, 270, 270, 280, 280, 290, 290, 300, 300,
    310, 310, 320, 320, 330, 330,
  ],
  minQualityToLeave: [
    2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
    4, 4, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11,
    12, 12, 12, 12, 13,
  ],
  qualityMaxStage: [1, 5, 12, 32, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70, 74],
  qualityNeedLevel: {
    1: [1, 1, 80, 170, 190, 210, 230, 250, 270, 290, 310, 330, 350, 370, 390],
    2: [1, 50, 80, 170, 190, 210, 230, 250, 270, 290, 310, 330, 350, 370, 390],
  },
}

function hero(partial: Partial<StageUpHeroData> = {}): StageUpHeroData {
  const stageConsumeIds = Array.from({ length: 63 }, (_, i) => 1011 + i)
  const stageConsumes: StageUpHeroData['stageConsumes'] = {}
  for (const id of stageConsumeIds) {
    stageConsumes[id] = {
      consume: [{ num: 1, sid: 40101, type: 'prop' }],
      consumeCurrency: [{ num: 1200, type: 'role_money' }],
    }
  }
  const qualityConsumeIds = [11, 12, 13, 14]
  return {
    heroId: 1001,
    baseQuality: 2,
    baseStage: 0,
    maxStage: 62,
    maxQuality: 15,
    orgQualityId: 2,
    stageConsumeIds,
    qualityConsumeIds,
    stageConsumes,
    qualityConsumes: {
      11: { consume: [], consumeCurrency: [] },
      12: {
        consume: [{ num: 2, sid: 40061, type: 'prop' }],
        consumeCurrency: [{ num: 15000, type: 'role_money' }],
      },
      13: {
        consume: [{ num: 40, sid: 40062, type: 'prop' }],
        consumeCurrency: [{ num: 150000, type: 'role_money' }],
      },
    },
    ...partial,
  }
}

test('clampStageRange swaps inverted bounds and keeps a 1-step gap', () => {
  assert.deepEqual(clampStageRange(13, 5, 62), { from: 5, to: 13 })
  assert.deepEqual(clampStageRange(5, 5, 62), { from: 5, to: 6 })
  assert.deepEqual(clampStageRange(62, 62, 62), { from: 61, to: 62 })
  assert.deepEqual(clampStageRange(0, 0, 0), { from: 0, to: 0 })
})

test('0→1 uses the first consume id', () => {
  const plan = computeStagePlan(hero(), LADDERS, { fromStage: 0, toStage: 1, currentQuality: 2 })
  assert.equal(plan.stageSteps.length, 1)
  assert.equal(plan.stageSteps[0]?.consumeId, 1011)
  assert.equal(plan.stageSteps[0]?.blocked, false)
  assert.equal(plan.stageSteps[0]?.levelCapFrom, 10)
  assert.equal(plan.stageSteps[0]?.levelCapTo, 20)
  assert.equal(plan.stageSteps[0]?.minQuality, 2)
})

test('R cannot leave +5 without SR', () => {
  assert.equal(getQualityMaxStage(LADDERS, 2), 5)
  assert.equal(isStageStepBlocked(LADDERS, 4, 2), false)
  assert.equal(isStageStepBlocked(LADDERS, 5, 2), true)
  const plan = computeStagePlan(hero(), LADDERS, { fromStage: 0, toStage: 12, currentQuality: 2 })
  const unlocked = plan.stageSteps.filter((s) => !s.blocked)
  const blocked = plan.stageSteps.filter((s) => s.blocked)
  assert.equal(unlocked.at(-1)?.toStage, 5)
  assert.equal(blocked[0]?.fromStage, 5)
  assert.equal(plan.qualitySteps[0]?.fromQuality, 2)
  assert.equal(plan.qualitySteps[0]?.toQuality, 3)
})

test('R→SR needs Lv 50 when hero_quality_condition is 2', () => {
  assert.equal(getQualityNeedLevel(LADDERS, 2, 2), 50)
  assert.equal(getQualityNeedLevel(LADDERS, 1, 2), 1)
  const plan = computeStagePlan(hero(), LADDERS, { fromStage: 0, toStage: 12, currentQuality: 2 })
  assert.equal(plan.qualitySteps[0]?.needLv, 50)
  assert.equal(plan.qualitySteps[0]?.minStageForNeedLv, 5)
})

test('level cap at +5 is 50', () => {
  assert.equal(getCurMaxLevelEx(LADDERS, 5), 50)
  const plan = computeStagePlan(hero(), LADDERS, { fromStage: 5, toStage: 5, currentQuality: 2 })
  assert.equal(plan.levelCapFrom, 50)
  assert.equal(plan.stageSteps.length, 0)
})

test('1001 and 1003 can use different consume tracks', () => {
  const a = hero({
    heroId: 1001,
    stageConsumeIds: [1011, 1012],
    stageConsumes: {
      1011: {
        consume: [{ num: 3, sid: 40101, type: 'prop' }],
        consumeCurrency: [{ num: 1200, type: 'role_money' }],
      },
    },
  })
  const b = hero({
    heroId: 1003,
    stageConsumeIds: [1021, 1022],
    stageConsumes: {
      1021: {
        consume: [{ num: 3, sid: 40106, type: 'prop' }],
        consumeCurrency: [{ num: 1200, type: 'role_money' }],
      },
    },
  })
  const planA = computeStagePlan(a, LADDERS, { fromStage: 0, toStage: 1, currentQuality: 2 })
  const planB = computeStagePlan(b, LADDERS, { fromStage: 0, toStage: 1, currentQuality: 2 })
  assert.equal(planA.stageSteps[0]?.consumeId, 1011)
  assert.equal(planB.stageSteps[0]?.consumeId, 1021)
  assert.notEqual(planA.stageSteps[0]?.materials[0]?.sid, planB.stageSteps[0]?.materials[0]?.sid)
})
