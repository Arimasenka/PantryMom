import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { buildEdges, ingredientIcon } from "@/lib/ingredient-data";

const NODE_SIZE = 46;
const HIT_RADIUS = 34;
const REST_LENGTH = 105;
const REPULSION = 3200;
const SPRING = 0.025;
const GRAVITY = 0.006;
const DAMPING = 0.82;

type SimNode = { id: string; x: number; y: number; vx: number; vy: number; pinned: boolean };

// Obsidian-style palette (graph view is always dark).
const BG = "#1e1e1e";
const LINK = "#5a5a5a";
const NODE_FILL = "#2f2f34";
const NODE_BORDER = "#8b6cef";
const LABEL = "#dadada";

export function IngredientGraph({ ingredients }: { ingredients: string[] }) {
  const [, setTick] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const nodes = useRef<Map<string, SimNode>>(new Map());
  const sizeRef = useRef(size);
  const alpha = useRef(1);
  const raf = useRef<number | null>(null);
  const dragging = useRef<SimNode | null>(null);

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

    const r = NODE_SIZE / 2 + 4;
    for (const n of list) {
      if (n.pinned) { n.vx = 0; n.vy = 0; continue; }
      n.vx += (width / 2 - n.x) * GRAVITY * a;
      n.vy += (height / 2 - n.y) * GRAVITY * a;
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x = Math.min(Math.max(n.x + n.vx, r), Math.max(width - r, r));
      n.y = Math.min(Math.max(n.y + n.vy, r), Math.max(height - r - 18, r));
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
    setSize({ width, height });
    kick();
  }

  // Drag a node around; the rest of the graph reacts.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) => hitTest(e.nativeEvent.locationX, e.nativeEvent.locationY) !== null,
      onPanResponderGrant: (e) => {
        const n = hitTest(e.nativeEvent.locationX, e.nativeEvent.locationY);
        if (!n) return;
        n.pinned = true;
        dragging.current = n;
        kick();
      },
      onPanResponderMove: (e) => {
        const n = dragging.current;
        if (!n) return;
        n.x = e.nativeEvent.locationX;
        n.y = e.nativeEvent.locationY;
        kick();
      },
      onPanResponderRelease: endDrag,
      onPanResponderTerminate: endDrag,
    }),
  ).current;

  function hitTest(x: number, y: number): SimNode | null {
    let best: SimNode | null = null;
    let bestD = HIT_RADIUS;
    for (const n of nodes.current.values()) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  function endDrag() {
    if (dragging.current) dragging.current.pinned = false;
    dragging.current = null;
    kick();
  }

  const placed = ingredients.map((id) => nodes.current.get(id)).filter((n): n is SimNode => !!n);

  return (
    <View style={styles.container} onLayout={onLayout} {...pan.panHandlers}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {edges.map((e) => {
          const p = nodes.current.get(e.a), q = nodes.current.get(e.b);
          if (!p || !q) return null;
          return (
            <Line key={`${e.a}|${e.b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
              stroke={LINK} strokeWidth={1.5} />
          );
        })}
      </Svg>
      {placed.map((n) => {
        const icon = ingredientIcon(n.id);
        return (
          <View key={n.id} pointerEvents="none"
            style={[styles.node, { left: n.x - NODE_SIZE / 2, top: n.y - NODE_SIZE / 2 }]}>
            <View style={styles.circle}>
              <Text style={styles.icon}>{icon ?? n.id.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.label} numberOfLines={1}>{n.id}</Text>
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
  container: { flex: 1, backgroundColor: BG, borderRadius: 12, overflow: "hidden", marginTop: 12 },
  node: { position: "absolute", width: NODE_SIZE, alignItems: "center" },
  circle: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    backgroundColor: NODE_FILL, borderWidth: 2, borderColor: NODE_BORDER,
    alignItems: "center", justifyContent: "center",
  },
  icon: { fontSize: 22, color: LABEL },
  label: { width: 90, marginTop: 3, fontSize: 12, color: LABEL, textAlign: "center" },
  empty: { position: "absolute", alignSelf: "center", top: "45%", color: "#777" },
});
