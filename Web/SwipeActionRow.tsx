"use client";

import React, { useRef, useState, useEffect, ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  PanInfo,
} from "framer-motion";

export interface SwipeAction {
  id?: string;
  title: string;
  icon?: ReactNode;
  tint: string; // Background color for the tile block
  ink?: string; // Text & icon color (defaults to #141414)
  role?: "destructive" | "default";
  onAction: () => void;
}

export interface SwipeActionRowStyle {
  surface?: string;
  tileInk?: string;
  cornerRadius?: number;
  tileWidth?: number;
  tileGap?: number;
}

export interface SwipeActionRowProps {
  id?: string | number;
  leading?: SwipeAction[];
  trailing?: SwipeAction[];
  openId?: string | number | null;
  onOpenChange?: (id: string | number | null) => void;
  background?: string;
  style?: SwipeActionRowStyle;
  children: ReactNode;
  className?: string;
}

const defaultStyle: Required<SwipeActionRowStyle> = {
  surface: "var(--card, #ffffff)",
  tileInk: "#141414",
  cornerRadius: 26,
  tileWidth: 78,
  tileGap: 6,
};

export const SwipeActionRow: React.FC<SwipeActionRowProps> = ({
  id,
  leading = [],
  trailing = [],
  openId,
  onOpenChange,
  background,
  style: userStyle,
  children,
  className = "",
}) => {
  const style = { ...defaultStyle, ...userStyle };
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState<number>(360);
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const internalId = useRef<string>(id?.toString() || Math.random().toString());

  const currentId = id ?? internalId.current;
  const isOpen = openId === currentId;

  const x = useMotionValue(0);

  // Measure row width
  useEffect(() => {
    if (rowRef.current) {
      setRowWidth(rowRef.current.offsetWidth);
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setRowWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(rowRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const totalLeadingWidth = leading.length * (style.tileWidth + style.tileGap);
  const totalTrailingWidth = trailing.length * (style.tileWidth + style.tileGap);
  // Require deliberate extreme drag (>80% row width or total actions + 90px) to trigger full-swipe
  const extremeThreshold = Math.max(rowWidth * 0.80, Math.max(totalLeadingWidth, totalTrailingWidth) + 90);

  // Sync external open state
  useEffect(() => {
    if (!isDragging) {
      if (openId === currentId) {
        // Default reveal to trailing actions if present, otherwise leading
        const target = trailing.length > 0 ? -totalTrailingWidth : totalLeadingWidth;
        animate(x, target, { type: "spring", stiffness: 450, damping: 35 });
      } else {
        animate(x, 0, { type: "spring", stiffness: 450, damping: 35 });
      }
    }
  }, [openId, currentId, totalLeadingWidth, totalTrailingWidth, isDragging, x, trailing.length]);

  // Rubber-band resistance curve
  const rubberBand = (distance: number) => {
    const limit = 40;
    return limit * (1 - 1 / (1 + distance / limit));
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(true);
    let targetX = info.offset.x;

    // Apply rubber banding if swiping toward an edge with no actions
    if (targetX > 0 && leading.length === 0) {
      targetX = rubberBand(targetX);
    } else if (targetX < 0 && trailing.length === 0) {
      targetX = -rubberBand(-targetX);
    }

    x.set(targetX);

    // Check armed state: only at extreme drag does it arm
    const armedNow =
      (targetX > extremeThreshold && leading.length > 0) ||
      (targetX < -extremeThreshold && trailing.length > 0);

    if (armedNow !== isArmed) {
      setIsArmed(armedNow);
      if (armedNow && typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(14);
        } catch (_) {}
      }
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const currentX = x.get();
    const velocity = info.velocity.x;

    // 1. Extreme swipe trigger if armed
    if (isArmed) {
      setIsArmed(false);
      animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
      onOpenChange?.(null);

      if (currentX > extremeThreshold && leading.length > 0) {
        leading[0].onAction();
      } else if (currentX < -extremeThreshold && trailing.length > 0) {
        trailing[0].onAction();
      }
      return;
    }

    setIsArmed(false);

    // 2. Normal ~50% swipe: Hold open firmly revealing all actions (e.g. Snooze and Delete)
    if (leading.length > 0 && (currentX > 40 || velocity > 350)) {
      animate(x, totalLeadingWidth, { type: "spring", stiffness: 400, damping: 32 });
      onOpenChange?.(currentId);
    } else if (
      trailing.length > 0 &&
      (currentX < -45 || velocity < -350)
    ) {
      animate(x, -totalTrailingWidth, { type: "spring", stiffness: 400, damping: 32 });
      onOpenChange?.(currentId);
    } else {
      // Settle closed
      animate(x, 0, { type: "spring", stiffness: 450, damping: 35 });
      if (openId === currentId) {
        onOpenChange?.(null);
      }
    }
  };

  const handleCardClick = () => {
    if (x.get() !== 0) {
      animate(x, 0, { type: "spring", stiffness: 450, damping: 35 });
      onOpenChange?.(null);
    }
  };

  // Dynamic Lift Shadow based on offset
  const shadow = useTransform(x, (val) => {
    if (background === "transparent") return "none";
    const lift = Math.min(1, Math.abs(val) / 40);
    const dir = val > 0 ? -3 : 3;
    return `0px ${4 * lift}px ${16 * lift}px rgba(0,0,0,${0.14 * lift}), ${dir * lift}px 0px 8px rgba(0,0,0,${0.08 * lift})`;
  });

  return (
    <div
      ref={rowRef}
      className={`relative select-none overflow-hidden touch-pan-y ${className}`}
      style={{
        borderRadius: style.cornerRadius,
        WebkitUserSelect: "none",
      }}
    >
      {/* Behind Layer: Action Tile Bars */}
      <div className="absolute inset-0 flex items-stretch justify-between pointer-events-auto">
        {/* Leading Tiles (Revealed by swiping right) */}
        {leading.length > 0 && (
          <ActionTileBar
            actions={leading}
            edge="leading"
            offsetValue={x}
            style={style}
            isArmed={isArmed}
            onSelect={(act) => {
              animate(x, 0, { type: "spring", stiffness: 450, damping: 35 });
              onOpenChange?.(null);
              act.onAction();
            }}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Trailing Tiles (Revealed by swiping left) */}
        {trailing.length > 0 && (
          <ActionTileBar
            actions={trailing}
            edge="trailing"
            offsetValue={x}
            style={style}
            isArmed={isArmed}
            onSelect={(act) => {
              animate(x, 0, { type: "spring", stiffness: 450, damping: 35 });
              onOpenChange?.(null);
              act.onAction();
            }}
          />
        )}
      </div>

      {/* Front Layer: Sliding Row Card */}
      <motion.div
        style={{
          x,
          boxShadow: shadow,
          backgroundColor: background || style.surface,
          borderRadius: style.cornerRadius,
        }}
        drag="x"
        dragDirectionLock
        dragElastic={0.08}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        className="relative z-10 cursor-grab active:cursor-grabbing w-full"
      >
        {children}
      </motion.div>
    </div>
  );
};

interface ActionTileBarProps {
  actions: SwipeAction[];
  edge: "leading" | "trailing";
  offsetValue: any;
  style: Required<SwipeActionRowStyle>;
  isArmed: boolean;
  onSelect: (action: SwipeAction) => void;
}

const ActionTileBar: React.FC<ActionTileBarProps> = ({
  actions,
  edge,
  offsetValue,
  style,
  isArmed,
  onSelect,
}) => {
  // Revealed width
  const revealedWidth = useTransform(offsetValue, (v: number) => {
    return edge === "leading" ? Math.max(0, v) : Math.max(0, -v);
  });

  const totalWidth = actions.length * (style.tileWidth + style.tileGap);
  const orderedActions = edge === "leading" ? actions : [...actions].reverse();
  const firstAction = actions[0];

  return (
    <motion.div
      style={{
        width: revealedWidth,
      }}
      className={`relative h-full flex items-center overflow-hidden ${
        edge === "leading" ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className="flex items-center h-full"
        style={{
          gap: isArmed ? 0 : style.tileGap,
          paddingLeft: edge === "trailing" ? style.tileGap : 0,
          paddingRight: edge === "leading" ? style.tileGap : 0,
        }}
      >
        {orderedActions.map((action) => {
          const isEdgeAction = action.id === firstAction.id;
          return (
            <ActionTileButton
              key={action.id || action.title}
              action={action}
              style={style}
              isArmed={isArmed}
              isEdgeAction={isEdgeAction}
              totalActions={actions.length}
              revealedWidth={revealedWidth}
              totalWidth={totalWidth}
              onSelect={() => onSelect(action)}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

interface ActionTileButtonProps {
  action: SwipeAction;
  style: Required<SwipeActionRowStyle>;
  isArmed: boolean;
  isEdgeAction: boolean;
  totalActions: number;
  revealedWidth: any;
  totalWidth: number;
  onSelect: () => void;
}

const ActionTileButton: React.FC<ActionTileButtonProps> = ({
  action,
  style,
  isArmed,
  isEdgeAction,
  totalActions,
  revealedWidth,
  totalWidth,
  onSelect,
}) => {
  // Calculate dynamic reveal progress [0...1]
  const revealProgress = useTransform(revealedWidth, (w: number) => {
    return Math.min(1, Math.max(0, w / totalWidth));
  });

  // Icon scaling: 0.55 up to 1.0 (with extra bounce if armed)
  const iconScale = useTransform(revealProgress, (p: number) => {
    return isArmed && isEdgeAction ? 1.15 : 0.55 + 0.45 * p;
  });

  // Label opacity: fades in after 0.45 reveal
  const labelOpacity = useTransform(revealProgress, (p: number) => {
    return Math.max(0, (p - 0.45) / 0.55);
  });

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      animate={{
        width: isArmed
          ? isEdgeAction
            ? "100%"
            : 0
          : style.tileWidth,
        opacity: isArmed && !isEdgeAction ? 0 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 450,
        damping: 32,
      }}
      style={{
        backgroundColor: action.tint,
        color: action.ink || style.tileInk,
        borderRadius: style.cornerRadius,
        minWidth: isArmed && !isEdgeAction ? 0 : undefined,
      }}
      className="h-full flex flex-col items-center justify-center font-medium overflow-hidden active:scale-95 transition-transform"
    >
      <motion.div
        style={{ scale: iconScale }}
        className="flex items-center justify-center text-xl font-bold"
      >
        {action.icon}
      </motion.div>
      <motion.span
        style={{ opacity: labelOpacity }}
        className="text-[11px] font-semibold tracking-tight mt-1 line-clamp-1"
      >
        {action.title}
      </motion.span>
    </motion.button>
  );
};
