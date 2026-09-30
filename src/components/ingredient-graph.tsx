import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { buildEdges, ingredientIcon } from "@/lib/ingredient-data";

const NODE_SIZE = 46;
const REST_LENGTH = 105;
const REPULSION = 3200;
const SPRING = 0.025;
const GRAVITY = 0.006;
const DAMPING = 0.82;

const MIN_SCALE = 0.02; // effectively unlimited zoom-out
const MAX_SCALE = 4;
const ZOOM_SENSITIVITY = 0.5; // <1 = gentler than the raw finger spread

type SimNode = { id: string; x: number; y: number; vx: number; vy: number; pinned: boolean };
type Mode = "none" | "node" | "pan" | "pinch";
type Touch = { locationX: number; locationY: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// Obsidian-style palette (graph view is always dark).
const BG = "#1e1e1e";
const LINK = "#5a5a5a";
const NODE_FILL = "#2f2f34";
const NODE_BORDER = "#8b6cef";
const LABEL = "#dadada";

export function IngredientGraph({ ingredients }: { ingredients: string[] }) {
  const [, setTick] = useState(0);

  const nodes = useRef<Map<string, SimNode>>(new Map());
  const sizeRef = useRef({ width: 0, height: 0 });
  const alpha = useRef(1);
  const raf = useRef<number | null>(null);
  const dragging = useRef<SimNode | null>(null);
  // Camera: screen = world * scale + (tx, ty). Simulation runs in world space.
  const view = useRef({ scale: 1, tx: 0, ty: 0 });
  const gesture = useRef({
    mode: "none" as Mode,
    lastX: 0, lastY: 0,
    startDist: 1, startScale: 1, worldX: 0, worldY: 0,
  });

  const edges = useMemo(() => buildEdges(ingredients), [ingredients]);
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  function step() {
    const list = [...nodes.current.values()];
    const { width, height } = sizeRef.current;
    const a = alpha.current;

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i], q = list[j];
        let dx = q.x - p.x, dy = q.y - p.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const d = Math.sqrt(d2);
        const f = (REPULSION / d2) * a;
        p.vx -= (dx / d) * f; p.vy -= (dy / d) * f;
        q.vx += (dx / d) * f; q.vy += (dy / d) * f;
      }
    }

    for (const e of edgesRef.current) {
      const p = nodes.current.get(e.a), q = nodes.current.get(e.b);
      if (!p || !q) continue;
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - REST_LENGTH) * SPRING * a;
      p.vx += (dx / d) * f; p.vy += (dy / d) * f;
      q.vx -= (dx / d) * f; q.vy -= (dy / d) * f;
    }

    for (const n of list) {
      if (n.pinned) { n.vx = 0; n.vy = 0; continue; }
      n.vx += (width / 2 - n.x) * GRAVITY * a;
      n.vy += (height / 2 - n.y) * GRAVITY * a;
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    }

    alpha.current = Math.max(alpha.current * 0.992, 0);
  }

  function loop() {
    step();
    setTick((t) => t + 1);
    if (alpha.current > 0.02 || dragging.current) {
      raf.current = requestAnimationFrame(loop);
    } else {
      raf.current = null;
    }
  }

  function kick() {
    alpha.current = 1;
    if (raf.current === null) raf.current = requestAnimationFrame(loop);
  }

  // Sync simulation nodes with the ingredient list; new ones spawn near the center.
  useEffect(() => {
    const map = nodes.current;
    const { width, height } = sizeRef.current;
    for (const id of [...map.keys()]) if (!ingredients.includes(id)) map.delete(id);
    for (const id of ingredients) {
      if (!map.has(id)) {
        map.set(id, {
          id,
          x: width / 2 + (Math.random() - 0.5) * 80,
          y: height / 2 + (Math.random() - 0.5) * 80,
          vx: 0, vy: 0, pinned: false,
        });
      }
    }
    kick();
  }, [ingredients]);

  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { width, height };
    kick();
  }

  // Hit test in screen space so small (zoomed-out) nodes stay easy to grab.
  function hitTest(x: number, y: number): SimNode | null {
    const { scale, tx, ty } = view.current;
    const radius = Math.max((NODE_SIZE * scale) / 2 + 10, 22);
    let best: SimNode | null = null;
    let bestD = radius;
    for (const n of nodes.current.values()) {
      const d = Math.hypot(n.x * scale + tx - x, n.y * scale + ty - y);
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  function releaseNode() {
    if (dragging.current) dragging.current.pinned = false;
    dragging.current = null;
  }

  function beginSingle(touches: readonly Touch[], panOnly = false) {
    const g = gesture.current;
    const x = touches[0].locationX, y = touches[0].locationY;
    g.lastX = x; g.lastY = y;
    const n = panOnly ? null : hitTest(x, y);
    if (n) {
      n.pinned = true;
      dragging.current = n;
      g.mode = "node";
      kick();
    } else {
      g.mode = "pan";
    }
  }

  function endGesture() {
    releaseNode();
    gesture.current.mode = "none";
    kick();
  }

  // One finger: drag a node, or pan the map if you miss. Two fingers: pinch-zoom + pan.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => beginSingle(e.nativeEvent.touches),
      onPanResponderMove: (e) => {
        const t = e.nativeEvent.touches;
        const g = gesture.current;
        const v = view.current;
        if (t.length >= 2) {
          const dist = Math.hypot(t[0].locationX - t[1].locationX, t[0].locationY - t[1].locationY);
          const mx = (t[0].locationX + t[1].locationX) / 2;
          const my = (t[0].locationY + t[1].locationY) / 2;
          if (g.mode !== "pinch") {
            releaseNode();
            g.mode = "pinch";
            g.startDist = Math.max(dist, 1);
            g.startScale = v.scale;
            g.worldX = (mx - v.tx) / v.scale;
            g.worldY = (my - v.ty) / v.scale;
          }
          const ratio = Math.pow(dist / g.startDist, ZOOM_SENSITIVITY);
          v.scale = clamp(g.startScale * ratio, MIN_SCALE, MAX_SCALE);
          // Keep the world point under the fingers fixed (this also pans).
          v.tx = mx - g.worldX * v.scale;
          v.ty = my - g.worldY * v.scale;
          setTick((n) => n + 1);
          return;
        }
        if (g.mode === "pinch") { beginSingle(t, true); return; }
        const x = t[0].locationX, y = t[0].locationY;
        if (g.mode === "node" && dragging.current) {
          dragging.current.x = (x - v.tx) / v.scale;
          dragging.current.y = (y - v.ty) / v.scale;
          kick();
        } else if (g.mode === "pan") {
          v.tx += x - g.lastX;
          v.ty += y - g.lastY;
          g.lastX = x; g.lastY = y;
          setTick((n) => n + 1);
        }
      },
      onPanResponderRelease: endGesture,
      onPanResponderTerminate: endGesture,
    }),
  ).current;

  const placed = ingredients.map((id) => nodes.current.get(id)).filter((n): n is SimNode => !!n);
  const { scale, tx, ty } = view.current;
  const nodeSize = Math.max(NODE_SIZE * scale, 8);
  const labelOpacity = clamp((scale - 0.5) / 0.4, 0, 1); // labels fade out when zoomed out
  const iconOpacity = clamp((nodeSize - 14) / 10, 0, 1); // icons fade into plain dots

  return (
    <View style={styles.container} onLayout={onLayout} {...pan.panHandlers}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {edges.map((e) => {
          const p = nodes.current.get(e.a), q = nodes.current.get(e.b);
          if (!p || !q) return null;
          return (
            <Line key={`${e.a}|${e.b}`}
              x1={p.x * scale + tx} y1={p.y * scale + ty}
              x2={q.x * scale + tx} y2={q.y * scale + ty}
              stroke={LINK} strokeWidth={clamp(1.5 * scale, 0.5, 1.5)} />
          );
        })}
      </Svg>
      {placed.map((n) => {
        const icon = ingredientIcon(n.id);
        return (
          <View key={n.id} pointerEvents="none"
            style={[styles.node, {
              width: nodeSize,
              left: n.x * scale + tx - nodeSize / 2,
              top: n.y * scale + ty - nodeSize / 2,
            }]}>
            <View style={[styles.circle, {
              width: nodeSize, height: nodeSize, borderRadius: nodeSize / 2,
              borderWidth: nodeSize > 14 ? 2 : 1,
            }]}>
              <Text style={[styles.icon, { fontSize: nodeSize * 0.48, opacity: iconOpacity }]}>
                {icon ?? n.id.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.label, { top: nodeSize + 3, opacity: labelOpacity }]} numberOfLines={1}>
              {n.id}
            </Text>
          </View>
        );
      })}
      {ingredients.length === 0 && (
        <Text style={styles.empty}>Add an ingredient to start your pantry map</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, overflow: "hidden", marginTop: 12 },
  node: { position: "absolute", alignItems: "center" },
  circle: {
    backgroundColor: NODE_FILL, borderColor: NODE_BORDER,
    alignItems: "center", justifyContent: "center",
  },
  icon: { color: LABEL },
  label: { position: "absolute", width: 90, fontSize: 12, color: LABEL, textAlign: "center" },
  empty: { position: "absolute", alignSelf: "center", top: "45%", color: "#777" },
});
