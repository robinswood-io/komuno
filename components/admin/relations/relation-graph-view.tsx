'use client';

import React, { useState } from 'react';
import { GraphCanvas, darkTheme, lightTheme } from 'reagraph';
import { useTheme } from 'next-themes';
import { type GraphNode, type GraphEdge } from '@/hooks/use-relation-graph';

interface RelationGraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeSelect: (email: string) => void;
  selectedNode?: string;
}

/**
 * Composant principal pour afficher le graphe avec Reagraph
 */
export function RelationGraphView({
  nodes,
  edges,
  onNodeSelect,
  selectedNode,
}: RelationGraphViewProps) {
  const { theme } = useTheme();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const handleNodeClick = (node: { id: string }) => {
    onNodeSelect(node.id);
  };

  const handleNodePointerOver = (node: { id: string }) => {
    setHoveredNode(node.id);
  };

  const handleNodePointerOut = () => {
    setHoveredNode(null);
  };

  // Choisir le thème Reagraph selon le thème de l'app
  const graphTheme = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <div className="w-full h-[600px] rounded-lg border border-input overflow-hidden bg-background">
      {nodes.length > 0 ? (
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          layoutType="forceDirected2d"
          theme={graphTheme}
          onNodeClick={handleNodeClick}
          onNodePointerOver={handleNodePointerOver}
          onNodePointerOut={handleNodePointerOut}
          cameraMode="pan"
          // Configuration de la simulation force-directed
          // @ts-expect-error - Reagraph types may be incomplete
          springConfig={{
            strength: 0.1,
            distance: 120,
            friction: 0.85,
          }}
          // Activer les labels
          labelType="all"
          // Zoom et pan
          minDistance={5}
          maxDistance={500}
          // Drag nodes
          draggable
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium">Aucune donnée à afficher</p>
            <p className="text-sm mt-2">
              Ajustez les filtres ou créez des relations pour voir le graphe
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
