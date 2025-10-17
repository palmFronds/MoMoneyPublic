import LevelNode from './LevelNode.jsx';
import React, { useEffect, useRef, useContext } from 'react';
import { AuthContext } from "./context/AuthContext";
import { useNavigate } from 'react-router-dom';

export default function ProgressMap({ nodes, unit }) {
  const { user } = useContext(AuthContext);
  const userID = user?.uid;

  const pathRef = useRef(null);
  const navigate = useNavigate();
  const pathWidth = 600;
  const nodeHeight = 100;
  const topPadding = 40;
  const bottomPadding = 40;
  const minSpacing = 80;
  const maxSpacing = 120;
  const maxOffset = 120;

  const HandleOnClick = (node) => {
    console.log('ProgressMap HandleOnClick called with node:', node);
    // Navigate to separate React components based on lesson type
    if (node.type === 'quiz') {
      navigate(`/quiz/${node.id}/${unit}`);
    } else if (node.type === 'microlearning') {
      navigate(`/microlearning/${node.id}/${unit}`);
    } else {
      // Fallback for other types (like 'checkpoint')
      console.log('Unknown level type:', node.type);
    }
  };

  const calculateNodePositions = (nodes) => {
    const n = nodes.length;
    if (n === 0) return [];

    const pathHeight = n > 1
      ? Math.max((n - 1) * maxSpacing + nodeHeight + topPadding + bottomPadding, 400)
      : nodeHeight + topPadding + bottomPadding;

    const verticalSpacing = n > 1
      ? Math.min(maxSpacing, Math.max(minSpacing, (pathHeight - topPadding - bottomPadding - nodeHeight) / (n - 1)))
      : 0;

    const center = pathWidth / 2;
    const offset = Math.max(60, maxOffset - Math.floor(n / 6) * 20);

    return nodes.map((node, i) => {
      let x = (i % 2 === 0) ? center - offset : center + offset;
      if (i === n - 1 && n % 2 !== 0) x = center;
      const y = topPadding + i * verticalSpacing;

      return {
        ...node,
        x,
        y,
        position: {
          left: `${x}px`,
          top: `${y}px`
        }
      };
    });
  };

  const spacedNodes = calculateNodePositions(nodes);

  useEffect(() => {
    if (!pathRef.current) return;

    const canvas = pathRef.current;
    const ctx = canvas.getContext('2d');
    const n = spacedNodes.length;

    const pathHeight = n > 1
      ? Math.max((n - 1) * maxSpacing + nodeHeight + topPadding + bottomPadding, 400)
      : nodeHeight + topPadding + bottomPadding;

    canvas.width = pathWidth;
    canvas.height = pathHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Teal glow road
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < spacedNodes.length; i++) {
      const { x, y } = spacedNodes[i];
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.bezierCurveTo(prevX, prevY + 40, x, y - 40, x, y);
      }
      var prevX = x, prevY = y;
    }
    ctx.shadowColor = '#00ffd5';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = '#00ffd5';
    ctx.lineWidth = 20;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < spacedNodes.length; i++) {
      const { x, y } = spacedNodes[i];
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.bezierCurveTo(prevX, prevY + 40, x, y - 40, x, y);
      }
      var prevX = x, prevY = y;
    }
    ctx.strokeStyle = '#2be0c9';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }, [spacedNodes]);

  const pathHeight = spacedNodes.length > 1
    ? Math.max((spacedNodes.length - 1) * maxSpacing + nodeHeight + topPadding + bottomPadding, 400)
    : nodeHeight + topPadding + bottomPadding;

  return (
    <div className="unit-wrapper">
      <div className="unit-path" style={{ width: pathWidth, height: pathHeight, position: 'relative' }}>
        <canvas ref={pathRef} className="path-lines" />
        {spacedNodes.map((node, i) => (
          <LevelNode
            key={`${node.id}-${i}`}
            node={{ ...node, label: `${i + 1}` }}
            onClick={HandleOnClick}
          />
        ))}
      </div>
    </div>
  );
}
