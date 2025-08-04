import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, Heart, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FamilyMemberData {
  name: string;
  relationship: string;
  photo_url?: string;
  birth_date?: string;
  bio?: string;
  isAncestor?: boolean;
  generation?: number;
}

interface FamilyMemberNodeProps {
  data: FamilyMemberData;
  id: string;
}

const FamilyMemberNode: React.FC<FamilyMemberNodeProps> = memo(({ data, id }) => {
  const getRelationshipColor = (relationship: string) => {
    const colors: Record<string, string> = {
      parent: 'bg-blue-100 text-blue-800',
      grandparent: 'bg-purple-100 text-purple-800',
      sibling: 'bg-green-100 text-green-800',
      child: 'bg-yellow-100 text-yellow-800',
      grandchild: 'bg-orange-100 text-orange-800',
      spouse: 'bg-pink-100 text-pink-800',
      aunt_uncle: 'bg-indigo-100 text-indigo-800',
      cousin: 'bg-teal-100 text-teal-800',
      friend: 'bg-gray-100 text-gray-800',
      other: 'bg-slate-100 text-slate-800',
    };
    return colors[relationship] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).getFullYear();
  };

  const isRootNode = data.generation === 0;
  const nodeStyle = data.isAncestor 
    ? 'border-2 border-primary shadow-lg' 
    : 'border border-border';

  return (
    <div className={`
      family-member-node
      bg-background rounded-lg p-4 min-w-[200px] max-w-[250px]
      ${nodeStyle}
      hover:shadow-md transition-shadow
      ${isRootNode ? 'ring-2 ring-primary ring-opacity-50' : ''}
    `}>
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-border border-2 border-background"
      />

      {/* Photo and Basic Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0">
          {data.photo_url ? (
            <img
              src={data.photo_url}
              alt={data.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{data.name}</h3>
          {data.birth_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(data.birth_date)}
            </div>
          )}
        </div>
      </div>

      {/* Relationship Badge */}
      <div className="mb-2">
        <Badge 
          variant="secondary" 
          className={`text-xs ${getRelationshipColor(data.relationship)}`}
        >
          {data.relationship.replace('_', '/').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      </div>

      {/* Bio Preview */}
      {data.bio && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {data.bio}
        </p>
      )}

      {/* Special Indicator */}
      {isRootNode && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Heart className="h-3 w-3 fill-current" />
          <span>You</span>
        </div>
      )}

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-border border-2 border-background"
      />

      {/* Left Handle for spouses/siblings */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 bg-border border-2 border-background"
      />

      {/* Right Handle for spouses/siblings */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 bg-border border-2 border-background"
      />
    </div>
  );
});

FamilyMemberNode.displayName = 'FamilyMemberNode';

export default FamilyMemberNode;