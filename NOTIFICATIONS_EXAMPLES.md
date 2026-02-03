# Exemples d'Utilisation - Système de Notifications Groupées

## Table des matières
1. [Créer des notifications](#créer-des-notifications)
2. [Récupérer et grouper](#récupérer-et-grouper)
3. [Marquer comme lu](#marquer-comme-lu)
4. [Recherche avancée](#recherche-avancée)
5. [Composants UI](#composants-ui)
6. [Cas d'usage métier](#cas-dusage-métier)

---

## Créer des Notifications

### Exemple 1: Notification lors d'une nouvelle idée approuvée

**Backend (NestJS Service)**

```typescript
// ideas/ideas.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IdeasService {
  constructor(
    private notificationsService: NotificationsService,
    private db: Database
  ) {}

  async approveIdea(ideaId: string, approverId: string) {
    // Approuver l'idée
    const idea = await this.db
      .update(ideas)
      .set({ status: 'approved' })
      .where(eq(ideas.id, ideaId))
      .returning();

    // Notifier l'auteur de l'idée
    if (idea[0]) {
      await this.notificationsService.createNotification({
        userId: idea[0].proposedBy, // Email de l'auteur
        type: 'idea_approved',
        title: `✅ Votre idée a été approuvée: "${idea[0].title}"`,
        body: `Félicitations! Votre idée a été examinée et approuvée.`,
        icon: '✅',
        entityType: 'idea',
        entityId: ideaId,
        metadata: {
          projectId: idea[0].projectId, // Si applicable
          priority: 'high',
          tags: ['idea', 'approved'],
        },
      });

      // Notifier aussi les admins
      const admins = await this.db
        .select()
        .from(admins)
        .where(eq(admins.role, 'super_admin'));

      for (const admin of admins) {
        await this.notificationsService.createNotification({
          userId: admin.email,
          type: 'idea_approved_admin',
          title: `Idée approuvée: ${idea[0].title}`,
          body: `L'idée de ${idea[0].proposedBy} a été approuvée par ${approverId}`,
          entityType: 'idea',
          entityId: ideaId,
          metadata: {
            projectId: idea[0].projectId,
            priority: 'normal',
            tags: ['admin', 'idea'],
          },
        });
      }
    }
  }
}
```

### Exemple 2: Notification lors d'un nouvel événement

```typescript
// events/events.service.ts

async createEvent(eventData: CreateEventDto, createdBy: string) {
  const event = await this.db
    .insert(events)
    .values({ ...eventData, createdBy })
    .returning();

  // Notifier tous les membres
  const members = await this.db
    .select()
    .from(members)
    .where(eq(members.status, 'active'));

  for (const member of members) {
    await this.notificationsService.createNotification({
      userId: member.email,
      type: 'event_created',
      title: `📅 Nouvel événement: ${event[0].title}`,
      body: `${event[0].description}\n📍 ${event[0].location}\n🕐 ${new Date(event[0].startDate).toLocaleDateString('fr-FR')}`,
      icon: '📅',
      entityType: 'event',
      entityId: event[0].id,
      metadata: {
        projectId: event[0].projectId,
        offerId: event[0].offerId,
        priority: 'normal',
        tags: ['event', 'new'],
      },
    });
  }

  return event[0];
}
```

---

## Récupérer et Grouper

### Exemple 3: Récupérer notifications par projet

**Backend (GET endpoint)**

```typescript
// Controller utilisé par le frontend
// GET /api/notifications/project/proj-123

async getProjectNotifications(
  req: AuthRequest,
  projectId: string
) {
  const userId = req.user?.userId;
  const notifications = await this.notificationsService
    .getNotificationsByProject(userId, projectId);

  const unreadCount = await this.notificationsService
    .getUnreadCountByProject(userId, projectId);

  // Enrichir avec les infos du projet
  const project = await this.getProjectDetails(projectId);

  return {
    project,
    notifications,
    unreadCount,
    stats: {
      total: notifications.length,
      unread: unreadCount,
      byType: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}
```

### Exemple 4: Récupérer notifications groupées pour le dashboard

**Frontend (React Component)**

```typescript
// components/dashboard/NotificationDashboard.tsx

import { useNotificationsGrouped } from '@/hooks/use-notifications-grouped';

export function NotificationDashboard() {
  const {
    groupedByProject,
    groupedByOffer,
    unreadCount,
    loading,
  } = useNotificationsGrouped({
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
  });

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Dashboard par projet */}
      <div className="col-span-2">
        <h2 className="text-lg font-bold mb-4">Notifications par Projet</h2>
        <div className="space-y-3">
          {groupedByProject.map((group) => (
            <div key={group.groupId} className="border rounded-lg p-4">
              <h3 className="font-semibold flex items-center justify-between">
                {group.groupId}
                <span className="text-sm bg-blue-100 px-2 py-1 rounded">
                  {group.unreadCount} non lu(s)
                </span>
              </h3>
              <div className="mt-2 text-sm text-gray-600">
                {group.count} notification(s) au total
              </div>
              <div className="mt-3">
                {group.notifications.slice(0, 3).map((notif) => (
                  <div key={notif.id} className="text-xs py-1 border-t">
                    {notif.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistiques */}
      <div className="col-span-1">
        <h3 className="font-bold mb-4">Résumé</h3>
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="text-red-900 font-semibold">{unreadCount}</div>
            <div className="text-red-600 text-xs">Non lues</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-blue-900 font-semibold">
              {groupedByProject.length}
            </div>
            <div className="text-blue-600 text-xs">Projets actifs</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-green-900 font-semibold">
              {groupedByOffer.length}
            </div>
            <div className="text-green-600 text-xs">Offres actives</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Marquer comme lu

### Exemple 5: Marquer une notification comme lue

```typescript
// Hook personnalisé

const { markAsRead } = useNotificationsGrouped();

// Usage
const handleNotificationClick = async (notificationId: string) => {
  const success = await markAsRead(notificationId);
  if (success) {
    console.log('Notification marked as read');
  }
};
```

### Exemple 6: Marquer toutes les notifications d'un projet comme lues

```typescript
// Component

async function handleProjectRead(projectId: string) {
  const marked = await markProjectAsRead(projectId);
  toast.success(`${marked} notification(s) marquée(s) comme lue(s)`);
}

return (
  <button
    onClick={() => handleProjectRead('proj-123')}
    className="text-sm text-blue-600 hover:underline"
  >
    Marquer tout comme lu
  </button>
);
```

---

## Recherche Avancée

### Exemple 7: Filtrer par type et statut de lecture

```typescript
// Component

const [filters, setFilters] = useState({
  type: 'idea_update',
  isRead: false,
  limit: 20,
});

const { search } = useNotificationsGrouped();

const handleSearch = async () => {
  const results = await search({
    type: filters.type,
    isRead: filters.isRead,
    limit: filters.limit,
  });

  console.log(`Found ${results.total} notifications`);
  setNotifications(results.notifications);
};
```

### Exemple 8: Recherche combinée avec plusieurs critères

```typescript
async function advancedSearch() {
  const results = await search({
    type: 'idea_update',
    isRead: false,
    projectId: 'proj-123',
    limit: 50,
    offset: 0,
  });

  // Grouper les résultats par date
  const grouped = results.notifications.reduce((acc, notif) => {
    const date = new Date(notif.createdAt).toLocaleDateString('fr-FR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(notif);
    return acc;
  }, {} as Record<string, typeof results.notifications>);

  return grouped;
}
```

---

## Composants UI

### Exemple 9: Widget unread count

```typescript
// components/layout/NotificationBadge.tsx

export function NotificationBadge() {
  const { unreadCount, refresh } = useNotificationsGrouped({
    refreshInterval: 20000, // Chaque 20s
  });

  return (
    <div className="relative">
      <button className="p-2 hover:bg-gray-100 rounded">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
```

### Exemple 10: Liste filtrable avec pagination

```typescript
// components/notifications/NotificationsList.tsx

export function NotificationsList() {
  const [page, setPage] = useState(0);
  const [type, setType] = useState<string | undefined>(undefined);

  const { allNotifications, search } = useNotificationsGrouped();

  const results = await search({
    type,
    limit: 20,
    offset: page * 20,
  });

  return (
    <div>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="">Tous les types</option>
        <option value="idea_update">Idées</option>
        <option value="event_created">Événements</option>
        <option value="offer_update">Offres</option>
      </select>

      <div className="space-y-2">
        {results.notifications.map((notif) => (
          <NotificationItem key={notif.id} notification={notif} />
        ))}
      </div>

      <div className="flex justify-between mt-4">
        <button
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Précédent
        </button>
        <span>{page + 1} / {Math.ceil(results.total / 20)}</span>
        <button
          disabled={page >= Math.ceil(results.total / 20) - 1}
          onClick={() => setPage(page + 1)}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
```

---

## Cas d'Utilisation Métier

### Exemple 11: Workflow complet - Proposition sponsorium

```typescript
// patrons/patrons.service.ts

async proposePatronIdea(
  patronId: string,
  ideaId: string,
  userId: string
) {
  // Créer la proposition
  const proposal = await this.db
    .insert(ideaPatronProposals)
    .values({
      patronId,
      ideaId,
      proposedBy: userId,
    })
    .returning();

  // Notifier le patron
  const patron = await this.db
    .select()
    .from(patrons)
    .where(eq(patrons.id, patronId));

  const idea = await this.db
    .select()
    .from(ideas)
    .where(eq(ideas.id, ideaId));

  await this.notificationsService.createNotification({
    userId: patron[0].email,
    type: 'proposal_received',
    title: `💼 Nouvelle proposition de sponsoring`,
    body: `L'idée "${idea[0].title}" vous a été proposée comme opportunité de sponsoring.`,
    icon: '💼',
    entityType: 'proposal',
    entityId: proposal[0].id,
    metadata: {
      projectId: idea[0].projectId,
      offerId: patronId, // Utiliser l'ID du patron comme offerId
      priority: 'high',
      tags: ['patron', 'sponsoring'],
    },
  });

  // Notifier l'initiateur
  await this.notificationsService.createNotification({
    userId,
    type: 'proposal_sent',
    title: `📤 Proposition envoyée au sponsor`,
    body: `Votre idée "${idea[0].title}" a été proposée à ${patron[0].firstName} ${patron[0].lastName}`,
    entityType: 'proposal',
    entityId: proposal[0].id,
    metadata: {
      projectId: idea[0].projectId,
      offerId: patronId,
      priority: 'normal',
    },
  });

  return proposal[0];
}
```

### Exemple 12: Email digest via cron

```typescript
// notifications/notifications.service.ts (ajout)

async sendDailyDigest(userId: string) {
  // Récupérer les notifications non lues de 24h
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const unread = await this.db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        sql`${notifications.createdAt} > ${yesterday}`
      )
    );

  if (unread.length === 0) return;

  // Grouper par projet
  const grouped = unread.reduce((acc, notif) => {
    const projectId = notif.metadata?.projectId || 'general';
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(notif);
    return acc;
  }, {} as Record<string, typeof unread>);

  // Envoyer email
  const html = Object.entries(grouped)
    .map(
      ([projectId, notifs]) => `
    <h2>${projectId}</h2>
    <ul>
      ${notifs.map((n) => `<li>${n.title}</li>`).join('')}
    </ul>
  `
    )
    .join('');

  await this.emailService.send({
    to: userId,
    subject: `[CJD] Résumé de vos notifications - ${new Date().toLocaleDateString('fr-FR')}`,
    html,
  });

  // Marquer comme lues après envoi
  await this.markMultipleAsRead(unread.map((n) => n.id));
}
```

---

## Summary

| Feature | Status | Example |
|---------|--------|---------|
| ✅ Groupement par projet | Implémenté | Exemple 4 |
| ✅ Groupement par offre | Implémenté | Exemple 4 |
| ✅ Création notifications | Implémenté | Exemple 1, 2, 11 |
| ✅ Marquer comme lu | Implémenté | Exemple 5, 6 |
| ✅ Recherche avancée | Implémenté | Exemple 7, 8 |
| ✅ UI avec tabs | Implémenté | Exemple 10 |
| ✅ Widget badge | Implémenté | Exemple 9 |
| 🚀 Email digest | À implémenter | Exemple 12 |
| 🚀 Web push | À implémenter | - |

---

**Version**: 1.0
**Dernier update**: 2026-01-31
