import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  MiniMap,
  ConnectionMode,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import FamilyMemberNode from './FamilyMemberNode';
import FamilyTreeControls from './FamilyTreeControls';
import { AddFamilyMemberForm } from '@/components/AddFamilyMemberForm';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  photo_url?: string;
  birth_date?: string;
  bio?: string;
  created_at: string;
}

// Calculate positions using a hierarchical layout
const calculateNodePositions = (members: FamilyMember[], currentUserId?: string) => {
  const generations: { [key: number]: FamilyMember[] } = {};
  
  // Sort members by relationship hierarchy
  const generationMap: { [key: string]: number } = {
    'grandparent': -2,
    'parent': -1,
    'other': 0, // Use 'other' for self/root node
    'spouse': 0,
    'sibling': 0,
    'child': 1,
    'grandchild': 2,
    'aunt_uncle': -1,
    'cousin': 0,
    'friend': 0,
  };

  // Group by generations
  members.forEach(member => {
    const generation = generationMap[member.relationship] || 0;
    if (!generations[generation]) {
      generations[generation] = [];
    }
    generations[generation].push(member);
  });

  const nodes: Node[] = [];
  const verticalSpacing = 200;
  const horizontalSpacing = 280;

  Object.entries(generations).forEach(([gen, genMembers]) => {
    const generation = parseInt(gen);
    const y = generation * verticalSpacing;
    
    genMembers.forEach((member, index) => {
      const x = (index - (genMembers.length - 1) / 2) * horizontalSpacing;
      
      nodes.push({
        id: member.id,
        type: 'familyMember',
        position: { x, y },
        data: {
          ...member,
          generation,
          isAncestor: generation < 0,
        },
        draggable: true,
      });
    });
  });

  return nodes;
};

const generateEdges = (members: FamilyMember[]): Edge[] => {
  const edges: Edge[] = [];
  
  // Simple relationship connections - you can enhance this based on your relationship model
  members.forEach(member => {
    if (member.relationship === 'child') {
      // Find parents and connect (including the root 'other' node for self)
      const parents = members.filter(m => 
        m.relationship === 'parent' || 
        (m.name.toLowerCase().includes('you') || m.name.toLowerCase().includes('self'))
      );
      parents.forEach(parent => {
        edges.push({
          id: `${parent.id}-${member.id}`,
          source: parent.id,
          target: member.id,
          type: 'smoothstep',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
          },
          style: {
            stroke: '#8b5cf6',
            strokeWidth: 2,
          },
        });
      });
    }
    
    // Connect spouses horizontally
    if (member.relationship === 'spouse') {
      const self = members.find(m => 
        m.name.toLowerCase().includes('you') || 
        m.name.toLowerCase().includes('self')
      );
      if (self) {
        edges.push({
          id: `${self.id}-${member.id}`,
          source: self.id,
          target: member.id,
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'straight',
          style: {
            stroke: '#ec4899',
            strokeWidth: 3,
          },
          label: '💕',
          labelStyle: { fontSize: 16 },
        });
      }
    }
  });

  return edges;
};

const nodeTypes = {
  familyMember: FamilyMemberNode,
};

const FamilyTreeFlow: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Calculate nodes and edges from family members
  const initialNodes = useMemo(() => {
    return calculateNodePositions(familyMembers, user?.id);
  }, [familyMembers, user?.id]);

  const initialEdges = useMemo(() => {
    return generateEdges(familyMembers);
  }, [familyMembers]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when family members change
  useEffect(() => {
    const newNodes = calculateNodePositions(familyMembers, user?.id);
    const newEdges = generateEdges(familyMembers);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [familyMembers, user?.id, setNodes, setEdges]);

  const fetchFamilyMembers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching family members:', error);
        return;
      }

      // Add self as the root node if not present
      const hasUser = data?.some(member => member.name.toLowerCase().includes('you') || member.name.toLowerCase().includes('self'));
      const userEmail = user.email?.split('@')[0] || 'You';
      const membersWithSelf = hasUser ? data : [
        {
          id: `self-${user.id}`,
          name: userEmail,
          relationship: 'other' as const, // Use 'other' from enum since 'self' doesn't exist
          user_id: user.id,
          created_at: new Date().toISOString(),
          photo_url: null,
          birth_date: null,
          bio: 'This is you - the center of your family tree',
        },
        ...(data || [])
      ];

      setFamilyMembers(membersWithSelf);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load family members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const handleAddMember = () => {
    setShowAddForm(true);
  };

  const handleMemberAdded = () => {
    setShowAddForm(false);
    fetchFamilyMembers();
  };

  const handleExport = () => {
    toast({
      title: 'Export Feature',
      description: 'Export functionality coming soon!',
    });
  };

  const handleShare = () => {
    toast({
      title: 'Share Feature',
      description: 'Share functionality coming soon!',
    });
  };

  const generationCount = Math.max(...familyMembers.map(m => {
    const generationMap: { [key: string]: number } = {
      'grandparent': -2, 'parent': -1, 'other': 0, 'spouse': 0, 'sibling': 0,
      'child': 1, 'grandchild': 2, 'aunt_uncle': -1, 'cousin': 0, 'friend': 0,
    };
    return Math.abs(generationMap[m.relationship] || 0);
  }), 0) + 1;

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading family tree...</p>
        </div>
      </div>
    );
  }

  if (showAddForm) {
    return (
      <div className="w-full h-screen p-4">
        <AddFamilyMemberForm
          onSuccess={handleMemberAdded}
          onCancel={() => setShowAddForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        attributionPosition="bottom-left"
        className="bg-gradient-to-br from-primary/5 via-background to-secondary/5"
      >
        <Background 
          gap={20} 
          size={1} 
          color="hsl(var(--border))" 
        />
        <MiniMap 
          nodeColor="#8b5cf6"
          maskColor="rgb(240, 240, 240, 0.8)"
          position="bottom-right"
          style={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
          }}
        />
        
        {/* Move controls INSIDE ReactFlow */}
        <FamilyTreeControls
          onAddMember={handleAddMember}
          onExport={handleExport}
          onShare={handleShare}
          familyMemberCount={familyMembers.length}
          generationCount={generationCount}
        />
      </ReactFlow>
    </div>
  );
};

export default FamilyTreeFlow;