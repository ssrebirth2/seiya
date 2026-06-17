/**
 * UISkillItem — skill row layers (bottom → top):
 * icon → border (_1 | _3) → select glow when active
 */
import { spriteManifestPath } from '@/lib/game/hero-ui-sprites'

export const SKILL_BORDER_NORMAL = 'ty_box_jinengdikuang_1' as const
export const SKILL_BORDER_AWAKEN = 'ty_box_jinengdikuang_3' as const
export const SKILL_FRAME_SELECT = 'ty_box_jinengdikuang_xuanzhong' as const

export const SKILL_SLOT_SIZE = 148
export const SKILL_BORDER_NORMAL_SIZE = 148
/** Native ty_box_jinengdikuang_3.png — do not stretch to square */
export const SKILL_BORDER_AWAKEN_WIDTH = 176
export const SKILL_BORDER_AWAKEN_HEIGHT = 152

export const SKILL_ROW_ITEM_SCALE = 0.8

export function getSkillBorderPath(isAwaken: boolean): string {
  return spriteManifestPath(
    isAwaken ? SKILL_BORDER_AWAKEN : SKILL_BORDER_NORMAL,
    'UI/Sprites/Common'
  )
}

export function getSkillSelectPath(): string {
  return spriteManifestPath(SKILL_FRAME_SELECT, 'UI/Sprites/Common')
}

export function isAwakenSkillRow(skill: { skill_awken?: unknown }): boolean {
  return Number(skill.skill_awken) === 1
}
