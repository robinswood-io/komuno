'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { type Member, type MemberRelation } from '@/hooks/use-relation-graph';

interface MemberDetailPanelProps {
  memberEmail: string | null;
  members: Member[];
  relations: MemberRelation[];
  onEgoNetworkClick: (email: string) => void;
  onClose: () => void;
}

const RELATION_TYPE_LABELS: Record<MemberRelation['relationType'], string> = {
  sponsor: 'Parrain/marraine',
  team: 'Équipe/collègue',
  custom: 'Personnalisé',
};

const RELATION_TYPE_ICONS: Record<MemberRelation['relationType'], string> = {
  sponsor: '👤',
  team: '🤝',
  custom: '💼',
};

/**
 * Panneau latéral affichant les détails d'un membre sélectionné
 */
export function MemberDetailPanel({
  memberEmail,
  members,
  relations,
  onEgoNetworkClick,
  onClose,
}: MemberDetailPanelProps) {
  const memberDetails = useMemo(() => {
    if (!memberEmail) return null;

    const member = members.find((m) => m.email === memberEmail);
    if (!member) return null;

    // Grouper les relations par type
    const relationsGrouped = {
      sponsor: [] as MemberRelation[],
      team: [] as MemberRelation[],
      custom: [] as MemberRelation[],
    };

    relations.forEach((rel) => {
      if (rel.memberEmail === memberEmail || rel.relatedMemberEmail === memberEmail) {
        relationsGrouped[rel.relationType].push(rel);
      }
    });

    return { member, relationsGrouped };
  }, [memberEmail, members, relations]);

  if (!memberDetails) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Détails du membre</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un membre dans le graphe pour voir ses détails
          </p>
        </CardContent>
      </Card>
    );
  }

  const { member, relationsGrouped } = memberDetails;
  const totalConnections = Object.values(relationsGrouped).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            {member.firstName} {member.lastName}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Statut */}
        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
          {member.status === 'active' ? '✓ Actif' : '✗ Inactif'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations de base */}
        <div className="space-y-2">
          <div className="text-sm">
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{member.email}</p>
          </div>

          {member.company && (
            <div className="text-sm">
              <p className="text-muted-foreground">Entreprise</p>
              <p className="font-medium">{member.company}</p>
            </div>
          )}

          {member.role && (
            <div className="text-sm">
              <p className="text-muted-foreground">Fonction</p>
              <p className="font-medium">{member.role}</p>
            </div>
          )}

          {member.cjdRole && (
            <div className="text-sm">
              <p className="text-muted-foreground">Rôle CJD</p>
              <p className="font-medium">{member.cjdRole}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Score d'engagement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium">Engagement</p>
            <p className="text-muted-foreground">{member.engagementScore}/100</p>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${member.engagementScore}%` }}
            />
          </div>
        </div>

        <Separator />

        {/* Connexions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Connexions</p>
            <Badge variant="outline">{totalConnections}</Badge>
          </div>

          {totalConnections > 0 ? (
            <div className="space-y-3">
              {Object.entries(relationsGrouped).map(([type, rels]) => {
                if (rels.length === 0) return null;
                const relationType = type as MemberRelation['relationType'];

                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{RELATION_TYPE_ICONS[relationType]}</span>
                      <span className="font-medium text-muted-foreground">
                        {RELATION_TYPE_LABELS[relationType]} ({rels.length})
                      </span>
                    </div>
                    <ul className="space-y-1 pl-6">
                      {rels.map((rel) => {
                        const otherMemberEmail =
                          rel.memberEmail === memberEmail
                            ? rel.relatedMemberEmail
                            : rel.memberEmail;
                        const otherMember = members.find(
                          (m) => m.email === otherMemberEmail
                        );

                        return (
                          <li key={rel.id} className="text-xs text-muted-foreground">
                            {otherMember
                              ? `${otherMember.firstName} ${otherMember.lastName}`
                              : otherMemberEmail}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune connexion</p>
          )}
        </div>

        {/* Actions */}
        {totalConnections > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => memberEmail && onEgoNetworkClick(memberEmail)}
              >
                Voir Ego Network
              </Button>
            </div>
          </>
        )}

        {/* Activité */}
        {member.lastActivityAt && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground">
              <p>
                Dernière activité:{' '}
                {new Date(member.lastActivityAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
