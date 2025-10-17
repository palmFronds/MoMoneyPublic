import React from "react";

export default function LevelNode({ node, onClick }) {
  const getNodeIcon = (type) => {
    switch (type) {
      case 'microlearning': return '📚';
      case 'quiz': return '✍️';
      case 'checkpoint': return '🏆';
      default: return '📝';
    }
  };

  const classes = [
    "node",
    node.type,
    node.completed ? "completed" : "",
    node.unlocked ? "unlocked" : "locked",
  ].join(" ");

  const style = {
    position: "absolute",
    top: node.position.top,
    left: node.position.left,
    transform: "translate(-50%, -50%)"
  };

  const handleClick = () => {
    console.log('LevelNode clicked:', node);
    console.log('Node unlocked:', node.unlocked);
    if (node.unlocked && onClick) {
      onClick(node);
    }
  };

  return (
    <div
      className={classes}
      style={style}
      onClick={handleClick}
    >
      <div className="node-socket">
        <div className="node-inner">
          <div className="node-icon">{getNodeIcon(node.type)}</div>
          <div className="node-label">{node.label}</div>
          {node.completed && <div className="completion-check">✓</div>}
        </div>
      </div>
    </div>
  );
}
