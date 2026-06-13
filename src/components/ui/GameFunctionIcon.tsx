'use client'

import GameImage from '@/components/ui/GameImage'
import {
  FUN_OPEN_ICON_NATIVE_SIZE,
  getFunOpenIconPath,
  type FunOpenIconKey,
} from '@/lib/game/fun-open-icons'

type GameFunctionIconProps = {
  icon: FunOpenIconKey
  /** Display size in CSS pixels (native asset is 128×128). */
  size?: number
  className?: string
  alt?: string
}

export function GameFunctionIcon({
  icon,
  size = 32,
  className = '',
  alt = '',
}: GameFunctionIconProps) {
  const src = getFunOpenIconPath(icon)

  return (
    <GameImage
      src={src}
      rawSrc={src}
      alt={alt}
      width={FUN_OPEN_ICON_NATIVE_SIZE}
      height={FUN_OPEN_ICON_NATIVE_SIZE}
      draggable={false}
      className={`game-fun-icon shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
