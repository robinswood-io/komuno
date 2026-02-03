# Notifications Groupement par Projet/Offre - Guide Implémentation

## Vue d'ensemble

Implémentation complète du groupement de notifications par projet/offre avec:
- Table PostgreSQL `notifications` avec colonnes metadata JSONB
- Service NestJS avec méthodes de groupement et filtrage
- Endpoints API REST pour accéder aux notifications groupées
- Composants React avec tabs et accordions pour l'affichage
- Hook personnalisé pour l'intégration dans les composants existants

## Architecture

### Base de données

**Table: `notifications`**
```sql
CREATE TABLE notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',  -- {projectId?, offerId?, taskId?, priority?, tags?}
  entity_type TEXT,              -- "idea", "event", "loan_item", etc.
  entity_id VARCHAR,
  related_project_id VARCHAR,    -- Direct foreign key if needed
  related_offer_id VARCHAR,      -- Direct foreign key if needed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour performances
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_type_idx ON notifications(type);
CREATE INDEX notifications_is_read_idx ON notifications(is_read);
CREATE INDEX notifications_entity_idx ON notifications(entity_type, entity_id);
CREATE INDEX notifications_project_id_idx ON notifications(related_project_id);
CREATE INDEX notifications_offer_id_idx ON notifications(related_offer_id);
CREATE INDEX notifications_metadata_project_idx ON notifications USING GIN (metadata);
CREATE INDEX notifications_metadata_offer_idx ON notifications USING GIN (metadata);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
```

### Metadata Structure

```typescript
interface NotificationMetadata {
  projectId?: string;     // UUID of related project
  offerId?: string;       // UUID of related offer
  taskId?: string;        // UUID of related task
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];        // Custom tags for filtering
}
```

## API Endpoints

### 1. Get All Notifications
```http
GET /api/notifications?limit=20&offset=0
Response: {
  notifications: Notification[],
  total: number
}
```

### 2. Get Grouped Notifications
```http
GET /api/notifications/grouped?by=project|offer|entity
Response: [
  {
    groupId: string,
    count: number,
    unreadCount: number,
    notifications: Notification[]
  }
]
```

### 3. Get Notifications by Project
```http
GET /api/notifications/project/:projectId
Response: {
  projectId: string,
  notifications: Notification[],
  unreadCount: number
}
```

### 4. Get Notifications by Offer
```http
GET /api/notifications/offer/:offerId
Response: {
  offerId: string,
  notifications: Notification[],
  unreadCount: number
}
```

### 5. Search Notifications
```http
GET /api/notifications/search?type=idea_update&isRead=false&projectId=...&limit=20
Response: {
  notifications: Notification[],
  total: number
}
```

### 6. Mark as Read
```http
PUT /api/notifications/:id
Body: { isRead: true }
Response: Notification
```

### 7. Mark Multiple as Read
```http
POST /api/notifications/read-bulk
Body: { ids: string[] }
Response: { marked: number }
```

### 8. Mark All as Read
```http
POST /api/notifications/read-all
Response: { marked: number }
```

### 9. Mark Project as Read
```http
PUT /api/notifications/project/:projectId/read
Response: { marked: number }
```

### 10. Delete Notification
```http
DELETE /api/notifications/:id
Response: 204 No Content
```

### 11. Get Unread Count
```http
GET /api/notifications/unread
Response: { unreadCount: number }
```

### 12. Cleanup Old Notifications
```http
POST /api/notifications/cleanup?days=30
Response: { deleted: number }
```

## Utilisation Frontend

### 1. Composant NotificationsCenter

```tsx
import { NotificationsCenter } from '@/components/notifications/NotificationsCenter';

export default function MyPage() {
  return (
    <NotificationsCenter
      userId="user-123"
      onNotificationRead={(id) => console.log('Read:', id)}
      refreshInterval={30000}
    />
  );
}
```

### 2. Hook useNotificationsGrouped

```tsx
import { useNotificationsGrouped } from '@/hooks/use-notifications-grouped';

export default function MyComponent() {
  const {
    allNotifications,
    groupedByProject,
    groupedByOffer,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    markProjectAsRead,
    deleteNotification,
    search
  } = useNotificationsGrouped({
    userId: 'user-123',
    autoRefresh: true,
    refreshInterval: 30000
  });

  // Utiliser les données
  return (
    <div>
      <p>Unread: {unreadCount}</p>
      <button onClick={() => markAllAsRead()}>Mark All</button>
      <button onClick={() => refresh()}>Refresh</button>
    </div>
  );
}
```

### 3. Recherche Avancée

```tsx
const results = await search({
  type: 'idea_update',
  isRead: false,
  projectId: 'proj-123',
  limit: 20,
  offset: 0
});
```

## Intégration avec les Entités Existantes

### Création de notification lors d'un événement

```typescript
// Dans un service NestJS quelconque

constructor(
  private notificationsService: NotificationsService,
  private db: Database
) {}

async createIdeaNotification(userId: string, idea: Idea, projectId?: string) {
  await this.notificationsService.createNotification({
    userId,
    type: 'idea_update',
    title: `Nouvelle idée: ${idea.title}`,
    body: idea.description,
    entityType: 'idea',
    entityId: idea.id,
    relatedProjectId: projectId,
    metadata: {
      projectId,
      priority: 'normal',
      tags: ['idea', 'new']
    }
  });
}
```

## Backward Compatibility

- **Métadata optionnelle**: Les notifications sans metadata fonctionnent normalement
- **Entités supprimées**: Utiliser `entity_type` et `entity_id` permet de gérer les entités supprimées gracefully
- **Migration progressive**: Ajouter `projectId`/`offerId` au metadata graduellement

## Performance Considerations

1. **Indexes JSONB**: Les indexes GIN permettent des requêtes rapides sur `metadata->>'projectId'`
2. **Pagination**: Utiliser `limit` et `offset` pour les grandes listes
3. **Cleanup régulier**: Exécuter `/api/notifications/cleanup` régulièrement
4. **Cache Redis**: Peut être ajouté pour les unread counts (optionnel)

## Tests

### Unit Tests Backend
```typescript
describe('NotificationsService', () => {
  it('should group notifications by project', async () => {
    // Test groupedByProject()
  });

  it('should mark multiple notifications as read', async () => {
    // Test markMultipleAsRead()
  });

  it('should filter by metadata', async () => {
    // Test search() avec filters
  });
});
```

### E2E Tests Frontend
```typescript
// Playwright/Cypress
test('should display grouped notifications', async ({ page }) => {
  await page.goto('/notifications');

  // Vérifier les tabs
  await expect(page.locator('[role="tab"]')).toContainText('Par Projet');

  // Cliquer sur un groupe
  await page.locator('button:has-text("Project 1")').click();

  // Vérifier l'expansion
  await expect(page.locator('text=Notification 1')).toBeVisible();
});
```

## Roadmap Futur

1. **Web Push Notifications**: Envoyer les notifications vers le navigateur
2. **Email Digests**: Résumés email quotidiens/hebdo par projet
3. **WebSocket Real-time**: Mises à jour en temps réel
4. **Notification Preferences**: Paramètres par utilisateur (opt-in/out par type)
5. **Analytics**: Dashboard de notifications (most read, categories, etc.)

## Files Structure

```
/srv/workspace/cjd80/
├── shared/schema.ts                                    # Table + Zod schemas
├── server/src/notifications/
│   ├── notifications.module.ts                        # NestJS module
│   ├── notifications.controller.ts                    # API endpoints
│   └── notifications.service.ts                       # Business logic
├── components/notifications/
│   └── NotificationsCenter.tsx                        # React component
├── hooks/
│   └── use-notifications-grouped.tsx                  # Custom hook
└── NOTIFICATIONS_GROUPING_GUIDE.md                    # This file
```

## Notes d'Implémentation

- **Auth Guard**: Les endpoints utilisent `AuthGuard('jwt')` - vérifier que l'user est authentifié
- **RBAC**: Peut ajouter des guards pour Admin-only endpoints (cleanup, delete others)
- **Error Handling**: Les erreurs sont loggées et retournent des réponses HTTP appropriées
- **Type Safety**: Utiliser les types Zod pour la validation à la fois côté client et serveur

---

**Status**: ✅ Implémentation complète - Prêt pour les tests et la production
